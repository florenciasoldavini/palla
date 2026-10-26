import {
  getAuthProfileNames,
  getMissingAuthProfileNames
} from "@/features/auth/profile-names";
import { describe, expect, it } from "vitest";

const incomplete = {
  first_name: null,
  last_name: null,
  onboarding_completed_at: null
};

describe("Google onboarding name prefill", () => {
  it("prefers explicit Google given/family names over a display name", () => {
    expect(
      getAuthProfileNames({
        user_metadata: { full_name: "Different display name" },
        identities: [
          {
            provider: "google",
            identity_data: {
              given_name: " María José ",
              family_name: " García López "
            }
          }
        ]
      })
    ).toEqual({ first_name: "María José", last_name: "García López" });
  });
  it("handles names provided in user metadata and ignores blank aliases", () => {
    expect(
      getAuthProfileNames({
        user_metadata: {
          first_name: " ",
          given_name: "Florencia",
          last_name: "",
          family_name: "Soldavini"
        }
      })
    ).toEqual({ first_name: "Florencia", last_name: "Soldavini" });
  });
  it("uses the Google full name when split names are unavailable", () => {
    expect(
      getAuthProfileNames({
        user_metadata: {},
        identities: [
          {
            provider: "google",
            identity_data: { name: "Florencia García López" }
          }
        ]
      })
    ).toEqual({ first_name: "Florencia", last_name: "García López" });
  });
  it("leaves missing names empty instead of using an email address", () => {
    expect(
      getAuthProfileNames({ user_metadata: { email: "flor@example.com" } })
    ).toEqual({ first_name: null, last_name: null });
    expect(
      getAuthProfileNames({ user_metadata: { name: "Florencia" } }).last_name
    ).toBeNull();
  });
  it("backfills only missing names in an incomplete profile", () => {
    expect(
      getMissingAuthProfileNames(
        { ...incomplete, first_name: "Chosen name" },
        {
          user_metadata: {
            given_name: "Google first",
            family_name: "Google last"
          }
        }
      )
    ).toEqual({ last_name: "Google last" });
  });
  it("preserves completed profiles even when the last name is absent", () => {
    expect(
      getMissingAuthProfileNames(
        {
          ...incomplete,
          first_name: "Chosen",
          onboarding_completed_at: "2026-10-13T16:00:00Z"
        },
        {
          user_metadata: {
            given_name: "Google first",
            family_name: "Google last"
          }
        }
      )
    ).toEqual({});
  });
});

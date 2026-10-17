import { organizerDetailsSchema } from "@/features/organizer/domain";
import { entityIdSchema } from "@/types/domain-schema";
import {
  fetchOrganizerProfile,
  persistOrganizerDetails,
  fetchLinkedIdentities
} from "../repositories/organizer-profile.repository";

export const getOrganizerProfile = (id: string) =>
  fetchOrganizerProfile(entityIdSchema.parse(id));
export const updateOrganizerDetails = (id: string, input: unknown) =>
  persistOrganizerDetails(
    entityIdSchema.parse(id),
    organizerDetailsSchema.parse(input)
  );
export const getLinkedIdentities = () => fetchLinkedIdentities();

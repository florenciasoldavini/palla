import {
  categoryShape,
  categoryIsConsistent
} from "@/features/profile/playing-category";
import { z } from "zod";

export const onboardingSchema = z
  .object({
    ...categoryShape,
    firstName: z
      .string()
      .trim()
      .min(1, "Enter your first name")
      .max(80, "Use 80 characters or fewer"),
    lastName: z.string().trim().max(80, "Use 80 characters or fewer"),
    mode: z.enum(["player", "organizer"], {
      error: "Choose player or organizer"
    })
  })
  .refine(categoryIsConsistent, {
    path: ["playingCategory"],
    message: "Choose your category"
  })
  .refine((v) => v.mode === "organizer" || v.categoryStatus !== null, {
    path: ["categoryStatus"],
    message: "Choose an option to continue"
  })
  .refine((v) => v.mode === "organizer" || v.categoryStatus !== "not_playing", {
    path: ["categoryStatus"],
    message: "Choose your playing category or Not sure yet"
  });
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type UserMode = OnboardingInput["mode"];

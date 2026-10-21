import { dominantHandSchema, courtSideSchema } from "./player-traits";
import { categoryShape, categoryIsConsistent } from "./playing-category";
import { resetPasswordSchema } from "@/features/auth/validation";
import { z } from "zod";

export const profileInfoSchema = z
  .object({
    ...categoryShape,
    avatar: z.string(),
    dominantHand: dominantHandSchema.nullable(),
    preferredCourtSide: courtSideSchema.nullable(),
    bio: z
      .string()
      .trim()
      .max(500, "Keep your bio to 500 characters or fewer."),
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string(),
    phoneNumber: z.string()
  })
  .refine(categoryIsConsistent, {
    path: ["playingCategory"],
    message: "Choose your category"
  })
  .refine((v) => v.categoryStatus !== null, {
    path: ["categoryStatus"],
    message: "Choose an option"
  });

export const profilePasswordSchema = resetPasswordSchema;

export type ProfileInfoInput = z.infer<typeof profileInfoSchema>;
export type ProfilePasswordInput = z.infer<typeof profilePasswordSchema>;

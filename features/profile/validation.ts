import { resetPasswordSchema } from "@/schemas/auth";
import { z } from "zod";

export const profileInfoSchema = z.object({
  avatar: z.string(),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string(),
  phoneNumber: z.string()
});

export const profilePasswordSchema = resetPasswordSchema;

export type ProfileInfoInput = z.infer<typeof profileInfoSchema>;
export type ProfilePasswordInput = z.infer<typeof profilePasswordSchema>;

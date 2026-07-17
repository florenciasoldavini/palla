import { z } from "zod";
import { emailSchema, passwordSchema } from "./fields";

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required")
});

export const emailSignupSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

// Signup schema (with confirm password)
export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password")
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match"
  });

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: emailSchema
});

// Reset password schema (with confirm)
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password")
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match"
  });

// Types for convenience
export type LoginInput = z.infer<typeof loginSchema>;
export type EmailSignupInput = z.infer<typeof emailSignupSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

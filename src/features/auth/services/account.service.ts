import {
  createEmailAccount,
  signInToEmailAccount
} from "@/features/auth/repositories/account.repository";
import {
  emailSignupSchema,
  loginSchema,
  type EmailSignupInput,
  type LoginInput
} from "@/features/auth/validation";

export function signUpWithEmail(input: EmailSignupInput) {
  const { email, password } = emailSignupSchema.parse(input);
  return createEmailAccount(email.trim().toLowerCase(), password);
}
export function signInWithEmail(input: LoginInput) {
  const { email, password } = loginSchema.parse(input);
  return signInToEmailAccount(email.trim().toLowerCase(), password);
}

import { invokeWelcomeToPallaEmail } from "@/repositories/email.repository";

type SendWelcomeToPallaEmailInput = {
  name?: string;
};

export async function sendWelcomeToPallaEmail(
  input: SendWelcomeToPallaEmailInput = {}
) {
  return invokeWelcomeToPallaEmail({
    name: input.name?.trim() || undefined
  });
}

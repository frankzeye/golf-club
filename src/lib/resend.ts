import { Resend } from "resend";

/**
 * Resend client. Set `RESEND_API_KEY` in `.env` — replace `re_xxxxxxxxx` with your real API key from https://resend.com/api-keys
 */
export function createResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }
  return new Resend(apiKey);
}

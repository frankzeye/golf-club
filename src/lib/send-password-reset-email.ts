import { sendTemplatedEmail } from "@/lib/send-templated-email";
import { escapeHtmlAttr } from "@/lib/email-from";

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  const safeHref = escapeHtmlAttr(resetUrl);
  await sendTemplatedEmail("password_reset", to, { resetUrl: safeHref });
}

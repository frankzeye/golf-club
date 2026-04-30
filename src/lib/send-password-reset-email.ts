import { createResendClient } from "@/lib/resend";

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/'/g, "&#39;");
}

/** RFC-style From so clients show a name, not only the address. */
function formatFromWithDisplayName(email: string, displayName: string): string {
  const escaped = displayName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}" <${email}>`;
}

function resolveFromHeader(): string {
  const raw = process.env.EMAIL_FROM?.trim();
  if (!raw) {
    throw new Error("Missing EMAIL_FROM");
  }
  if (/<[^<\s]+@[^>]+\s*>$/.test(raw)) {
    return raw;
  }
  const name = process.env.EMAIL_FROM_NAME?.trim();
  if (name) {
    return formatFromWithDisplayName(raw, name);
  }
  return raw;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  const from = resolveFromHeader();

  const safeHref = escapeHtmlAttr(resetUrl);
  const resend = createResendClient();
  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: "Reset your Spencer's Crossing Golf Club password",
    html: `
      <p>You asked to reset your password.</p>
      <p><a href="${safeHref}">Set a new password</a></p>
      <p>This link expires in one hour. If you did not request this, you can ignore this email.</p>
    `,
  });

  if (error) {
    const msg =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
    throw new Error(msg || "Resend returned an error");
  }
}

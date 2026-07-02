/** Escape text for HTML body content. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape text for use inside HTML attributes (e.g. href). */
export function escapeHtmlAttr(value: string): string {
  return escapeHtml(value);
}

function formatFromWithDisplayName(email: string, displayName: string): string {
  const escaped = displayName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}" <${email}>`;
}

export function resolveEmailFromHeader(): string {
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

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

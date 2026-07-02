import { getSiteBaseUrl } from "@/lib/site-url";

const BRAND = {
  emerald: "#059669",
  emeraldDark: "#047857",
  text: "#1a1a1a",
  textBody: "#333333",
  textMuted: "#666666",
  textLight: "#888888",
  background: "#f5f3ef",
  white: "#ffffff",
  divider: "#ebe8e3",
};

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif';
const FONT = `font-family:${FONT_FAMILY};`;

const LEGACY_SERIF_FONT_PATTERNS = [
  /font-family\s*:\s*Georgia,\s*&quot;Times New Roman&quot;,\s*Times,\s*serif\s*;/gi,
  /font-family\s*:\s*Georgia,\s*"Times New Roman",\s*Times,\s*serif\s*;/gi,
  /font-family\s*:\s*Georgia,\s*'Times New Roman',\s*Times,\s*serif\s*;/gi,
];

/** Replace legacy serif inline styles so layout typography wins in preview and sent mail. */
export function normalizeEmailTemplateFonts(html: string): string {
  let result = html;
  for (const pattern of LEGACY_SERIF_FONT_PATTERNS) {
    result = result.replace(pattern, FONT);
  }
  return result;
}

const LOGO_INTRINSIC_WIDTH = 1650;
const LOGO_INTRINSIC_HEIGHT = 600;
const LOGO_DISPLAY_HEIGHT = 80;

function emailBrandHeader(baseUrl: string): string {
  const logoUrl = `${baseUrl.replace(/\/$/, "")}/logo.png`;
  const displayWidth = Math.round(
    (LOGO_INTRINSIC_WIDTH / LOGO_INTRINSIC_HEIGHT) * LOGO_DISPLAY_HEIGHT
  );

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td align="center" style="padding:0 0 36px 0;">
      <img
        src="${logoUrl}"
        alt="Spencer's Crossing Golf Club"
        width="${displayWidth}"
        height="${LOGO_DISPLAY_HEIGHT}"
        style="display:block;margin:0 auto;height:${LOGO_DISPLAY_HEIGHT}px;width:auto;max-width:440px;border:0;outline:none;text-decoration:none;"
      />
    </td>
  </tr>
</table>`;
}

/** Wrap template body HTML in a clean, card-style layout. */
export function wrapEmailLayout(
  innerHtml: string,
  options?: { preheader?: string; baseUrl?: string }
): string {
  const baseUrl = options?.baseUrl ?? getSiteBaseUrl();
  const preheader = options?.preheader?.trim() ?? "";
  const bodyHtml = normalizeEmailTemplateFonts(innerHtml);
  const preheaderBlock = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Spencer's Crossing Golf Club</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.background};${FONT}color:${BRAND.textBody};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheaderBlock}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.background};${FONT}">
    <tr>
      <td align="center" style="padding:48px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background-color:${BRAND.white};border-radius:12px;${FONT}">
          <tr>
            <td style="padding:48px 48px 40px;${FONT}">
              ${emailBrandHeader(baseUrl)}
              ${bodyHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:40px;${FONT}">
                <tr>
                  <td style="border-top:1px solid ${BRAND.divider};padding-top:24px;font-size:12px;line-height:1.6;color:${BRAND.textLight};text-align:left;${FONT}">
                    Spencer's Crossing Golf Club
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailTitle(text: string): string {
  return `<p style="margin:0 0 20px;font-size:22px;font-weight:700;line-height:1.35;color:${BRAND.text};${FONT}">${text}</p>`;
}

export function emailGreeting(name?: string): string {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return `<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${BRAND.textBody};${FONT}">${greeting}</p>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:${BRAND.textBody};${FONT}">${text}</p>`;
}

export function emailMuted(text: string): string {
  return `<p style="margin:28px 0 0;font-size:14px;line-height:1.65;color:${BRAND.textMuted};${FONT}">${text}</p>`;
}

export function emailBulletList(items: string[]): string {
  const rows = items
    .map(
      (item) => `<tr>
        <td style="padding:0 0 8px 0;font-size:15px;line-height:1.65;color:${BRAND.textBody};vertical-align:top;width:16px;${FONT}">
          &ndash;
        </td>
        <td style="padding:0 0 8px 8px;font-size:15px;line-height:1.65;color:${BRAND.textBody};${FONT}">
          ${item}
        </td>
      </tr>`
    )
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;${FONT}">
    ${rows}
  </table>`;
}

export function emailLink(href: string, label: string): string {
  return `<a href="${href}" target="_blank" style="color:${BRAND.emerald};font-weight:600;text-decoration:underline;${FONT}">${label}</a>`;
}

export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;${FONT}">
  <tr>
    <td align="left" style="border-radius:4px;background-color:${BRAND.emerald};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:400;color:${BRAND.white};text-decoration:none;border-radius:4px;${FONT}">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

/** @deprecated Use emailBulletList for the minimalist style. Kept for custom admin templates. */
export function emailHeading(text: string): string {
  return emailTitle(text);
}

/** @deprecated Use emailBulletList for the minimalist style. Kept for custom admin templates. */
export function emailDetailCard(rows: Array<{ label: string; value: string }>): string {
  return emailBulletList(rows.map((row) => `<strong>${row.label}:</strong> ${row.value}`));
}

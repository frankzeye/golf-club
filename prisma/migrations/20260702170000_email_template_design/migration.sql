-- Refresh email templates with the new branded inner HTML design.
UPDATE "EmailTemplate"
SET
  "description" = 'Sent when a member requests a password reset. Use {{resetUrl}} for the button link. Content appears inside the club email layout.',
  "htmlBody" = '<h2 style="margin:0 0 16px;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;font-size:24px;font-weight:600;line-height:1.3;color:#1c1917;">Reset your password</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#57534e;">We received a request to reset the password for your Spencer''s Crossing Golf Club account.</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#57534e;">Tap the button below to choose a new password. This link is valid for one hour.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;">
  <tr>
    <td align="center" style="border-radius:10px;background-color:#059669;">
      <a href="{{resetUrl}}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
        Set a new password
      </a>
    </td>
  </tr>
</table>
<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#78716c;">If you didn''t request a password reset, you can safely ignore this email. Your password won''t change unless you use the link above.</p>',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'password_reset';

UPDATE "EmailTemplate"
SET
  "description" = 'Sent when a member is invited to a social round. Placeholders: {{inviteeName}}, {{organizerName}}, {{course}}, {{date}}, {{outingUrl}}. Content appears inside the club email layout.',
  "htmlBody" = '<h2 style="margin:0 0 16px;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;font-size:24px;font-weight:600;line-height:1.3;color:#1c1917;">You''re invited to play</h2>
<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#57534e;">Hi {{inviteeName}},</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#57534e;"><strong>{{organizerName}}</strong> invited you to join a social round.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0 8px;background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;">
  <tr>
    <td style="padding:20px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding:0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#78716c;width:96px;vertical-align:top;">Course</td>
          <td style="padding:0 0 0 16px;font-size:15px;font-weight:600;line-height:1.45;color:#1c1917;vertical-align:top;">{{course}}</td>
        </tr>
        <tr>
          <td style="padding:12px 0 0 0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#78716c;width:96px;vertical-align:top;">Date</td>
          <td style="padding:12px 0 0 16px;font-size:15px;font-weight:600;line-height:1.45;color:#1c1917;vertical-align:top;">{{date}}</td>
        </tr>
        <tr>
          <td style="padding:12px 0 0 0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#78716c;width:96px;vertical-align:top;">Organizer</td>
          <td style="padding:12px 0 0 16px;font-size:15px;font-weight:600;line-height:1.45;color:#1c1917;vertical-align:top;">{{organizerName}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;">
  <tr>
    <td align="center" style="border-radius:10px;background-color:#059669;">
      <a href="{{outingUrl}}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
        View outing &amp; respond
      </a>
    </td>
  </tr>
</table>
<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#78716c;">Open the link above to accept or decline from the club website or mobile app.</p>',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'outing_invite';

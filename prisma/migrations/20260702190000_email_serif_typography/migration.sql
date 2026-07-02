-- Update stored templates to serif typography and solid CTA buttons.

UPDATE "EmailTemplate"
SET
  "htmlBody" = '<p style="margin:0 0 20px;font-size:22px;font-weight:700;line-height:1.35;color:#1a1a1a;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">Reset your password</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#333333;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">Hi,</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#333333;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">We received a request to reset the password for your <strong>Spencer''s Crossing Golf Club</strong> account.</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#333333;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">Use the button below to choose a new password. This link expires in <strong>one hour</strong>.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">
  <tr>
    <td align="left" style="border-radius:4px;background-color:#059669;">
      <a href="{{resetUrl}}" target="_blank" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:400;color:#ffffff;text-decoration:none;border-radius:4px;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">Set a new password</a>
    </td>
  </tr>
</table>
<p style="margin:28px 0 0;font-size:14px;line-height:1.65;color:#666666;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">If you didn''t request a password reset, you can safely ignore this email. Your password won''t change unless you use the link above.</p>',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'password_reset';

UPDATE "EmailTemplate"
SET
  "htmlBody" = '<p style="margin:0 0 20px;font-size:22px;font-weight:700;line-height:1.35;color:#1a1a1a;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">You''re invited to play</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#333333;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">Hi {{inviteeName}},</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#333333;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;"><strong>{{organizerName}}</strong> invited you to a social round. Here are the details:</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">
  <tr><td style="padding:0 0 8px 0;font-size:15px;line-height:1.65;color:#333333;vertical-align:top;width:16px;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">&ndash;</td><td style="padding:0 0 8px 8px;font-size:15px;line-height:1.65;color:#333333;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;"><strong>Course:</strong> {{course}}</td></tr>
  <tr><td style="padding:0 0 8px 0;font-size:15px;line-height:1.65;color:#333333;vertical-align:top;width:16px;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">&ndash;</td><td style="padding:0 0 8px 8px;font-size:15px;line-height:1.65;color:#333333;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;"><strong>Date:</strong> {{date}}</td></tr>
  <tr><td style="padding:0 0 8px 0;font-size:15px;line-height:1.65;color:#333333;vertical-align:top;width:16px;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">&ndash;</td><td style="padding:0 0 8px 8px;font-size:15px;line-height:1.65;color:#333333;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;"><strong>Organizer:</strong> {{organizerName}}</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">
  <tr>
    <td align="left" style="border-radius:4px;background-color:#059669;">
      <a href="{{outingUrl}}" target="_blank" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:400;color:#ffffff;text-decoration:none;border-radius:4px;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">View outing and respond</a>
    </td>
  </tr>
</table>
<p style="margin:28px 0 0;font-size:14px;line-height:1.65;color:#666666;font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;">You can accept or decline the invite from the club website or mobile app.</p>',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'outing_invite';

-- Refresh email templates to minimalist card style (ExpressVPN-inspired layout).

UPDATE "EmailTemplate"
SET
  "description" = 'Sent when a member requests a password reset. Use {{resetUrl}} for the link. Content appears inside the club email layout.',
  "htmlBody" = '<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333333;">Hi,</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#333333;">We received a request to reset the password for your <strong>Spencer''s Crossing Golf Club</strong> account.</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#333333;">Use the link below to choose a new password. This link expires in <strong>one hour</strong>.</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#333333;"><a href="{{resetUrl}}" target="_blank" style="color:#059669;font-weight:600;text-decoration:underline;">Set a new password</a></p>
<p style="margin:28px 0 0;font-size:14px;line-height:1.65;color:#666666;">If you didn''t request a password reset, you can safely ignore this email. Your password won''t change unless you use the link above.</p>',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'password_reset';

UPDATE "EmailTemplate"
SET
  "description" = 'Sent when a member is invited to a social round. Placeholders: {{inviteeName}}, {{organizerName}}, {{course}}, {{date}}, {{outingUrl}}. Content appears inside the club email layout.',
  "htmlBody" = '<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333333;">Hi {{inviteeName}},</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#333333;"><strong>{{organizerName}}</strong> invited you to a social round. Here are the details:</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">
  <tr><td style="padding:0 0 8px 0;font-size:15px;line-height:1.65;color:#333333;vertical-align:top;width:16px;">&ndash;</td><td style="padding:0 0 8px 8px;font-size:15px;line-height:1.65;color:#333333;"><strong>Course:</strong> {{course}}</td></tr>
  <tr><td style="padding:0 0 8px 0;font-size:15px;line-height:1.65;color:#333333;vertical-align:top;width:16px;">&ndash;</td><td style="padding:0 0 8px 8px;font-size:15px;line-height:1.65;color:#333333;"><strong>Date:</strong> {{date}}</td></tr>
  <tr><td style="padding:0 0 8px 0;font-size:15px;line-height:1.65;color:#333333;vertical-align:top;width:16px;">&ndash;</td><td style="padding:0 0 8px 8px;font-size:15px;line-height:1.65;color:#333333;"><strong>Organizer:</strong> {{organizerName}}</td></tr>
</table>
<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#333333;"><a href="{{outingUrl}}" target="_blank" style="color:#059669;font-weight:600;text-decoration:underline;">View outing and respond</a></p>
<p style="margin:28px 0 0;font-size:14px;line-height:1.65;color:#666666;">You can accept or decline the invite from the club website or mobile app.</p>',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'outing_invite';

-- Seed outing invite email template
INSERT INTO "EmailTemplate" ("id", "slug", "name", "description", "subject", "htmlBody", "createdAt", "updatedAt")
VALUES (
    'emailtpl_outing_invite',
    'outing_invite',
    'Outing invite',
    'Sent when a member is invited to a social round. Placeholders: {{inviteeName}}, {{organizerName}}, {{course}}, {{date}}, {{outingUrl}}.',
    '{{organizerName}} invited you to play at {{course}}',
    '<p>Hi {{inviteeName}},</p>
<p><strong>{{organizerName}}</strong> invited you to a social round at <strong>{{course}}</strong> on {{date}}.</p>
<p><a href="{{outingUrl}}">View outing and respond</a></p>
<p>You can accept or decline the invite from the club website or mobile app.</p>',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

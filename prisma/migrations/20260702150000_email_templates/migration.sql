-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_slug_key" ON "EmailTemplate"("slug");

-- Seed default password reset template
INSERT INTO "EmailTemplate" ("id", "slug", "name", "description", "subject", "htmlBody", "createdAt", "updatedAt")
VALUES (
    'emailtpl_password_reset',
    'password_reset',
    'Password reset',
    'Sent when a member requests a password reset. Use {{resetUrl}} in links (e.g. href="{{resetUrl}}").',
    'Reset your Spencer''s Crossing Golf Club password',
    '<p>You asked to reset your password.</p>
<p><a href="{{resetUrl}}">Set a new password</a></p>
<p>This link expires in one hour. If you did not request this, you can ignore this email.</p>',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

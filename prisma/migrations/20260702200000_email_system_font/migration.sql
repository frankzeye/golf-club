-- Switch stored email templates from serif to system sans-serif stack.

UPDATE "EmailTemplate"
SET
  "htmlBody" = REPLACE(
    "htmlBody",
    'font-family:Georgia, &quot;Times New Roman&quot;, Times, serif;',
    'font-family:-apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, &quot;Roboto&quot;, &quot;Oxygen&quot;, &quot;Ubuntu&quot;, &quot;Cantarell&quot;, &quot;Fira Sans&quot;, &quot;Droid Sans&quot;, &quot;Helvetica Neue&quot;, sans-serif;'
  ),
  "updatedAt" = CURRENT_TIMESTAMP;

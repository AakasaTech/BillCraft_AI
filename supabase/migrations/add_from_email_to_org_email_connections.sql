-- Lets an org override the "From" address used when sending through a
-- connected Google/Microsoft mailbox, instead of always using the address
-- that completed OAuth (connected_email). This only works if the connected
-- mailbox is actually allowed to send as that address:
--   - Gmail: the address must be added as a verified "Send mail as" alias
--     under the connected account's Gmail settings.
--   - Microsoft 365: the connected account needs "Send As" (or "Send on
--     Behalf") delegate permission on that mailbox, granted in Exchange
--     admin center — typically used for a shared mailbox.
-- Null means "use connected_email" (unchanged default behavior).

ALTER TABLE public.org_email_connections
  ADD COLUMN IF NOT EXISTS from_email TEXT;

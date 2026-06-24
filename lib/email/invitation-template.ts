export function buildInvitationEmail(
  inviteeEmail: string,
  orgName: string,
  inviterName: string,
  role: string,
  acceptUrl: string,
): { subject: string; html: string; text: string } {
  const subject = `You've been invited to join ${orgName} on BillCraft AI`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${subject}</title>
<style>
  body { margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .header  { background: #6366f1; padding: 32px 40px; }
  .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; }
  .header p  { margin: 6px 0 0; color: #c7d2fe; font-size: 14px; }
  .body    { padding: 32px 40px; }
  .role-badge { display: inline-block; background: #ede9fe; color: #5b21b6; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; text-transform: capitalize; margin-top: 4px; }
  .footer { padding: 20px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  .btn { display: inline-block; margin: 28px 0 8px; background: #6366f1; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; }
  .url-fallback { font-size: 12px; color: #94a3b8; word-break: break-all; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>BillCraft AI</h1>
    <p>Team invitation</p>
  </div>
  <div class="body">
    <p style="font-size:16px;color:#0f172a;margin-top:0">Hi there,</p>
    <p style="font-size:14px;color:#475569">
      <strong>${inviterName}</strong> has invited you to join
      <strong>${orgName}</strong> on BillCraft AI as a
      <span class="role-badge">${role}</span>.
    </p>
    <p style="font-size:14px;color:#475569">
      Click the button below to accept your invitation. This link expires in <strong>7 days</strong>.
    </p>

    <div style="text-align:center">
      <a href="${acceptUrl}" class="btn">Accept invitation</a>
    </div>
    <p class="url-fallback">Or copy this link into your browser:<br/>${acceptUrl}</p>

    <p style="font-size:13px;color:#64748b;margin-top:24px">
      If you did not expect this invitation, you can safely ignore this email.
    </p>
  </div>
  <div class="footer">
    You were invited to ${orgName} · Powered by BillCraft AI<br/>
    Please do not reply to this email.
  </div>
</div>
</body>
</html>`

  const text = `You've been invited to join ${orgName} on BillCraft AI

Hi,

${inviterName} has invited you to join ${orgName} as a ${role}.

Accept your invitation here:
${acceptUrl}

This link expires in 7 days.

If you did not expect this invitation, you can safely ignore this email.

— BillCraft AI`

  return { subject, html, text }
}

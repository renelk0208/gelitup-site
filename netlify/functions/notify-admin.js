/**
 * Netlify function: notify-admin
 *
 * When a client hits a B2B login problem, this fires three parallel alerts:
 *   1. Email to admin via SMTP
 *   2. GitHub Issue in the repo (can be assigned to Copilot for a fix)
 *   3. GitHub Actions workflow_dispatch for automated diagnostics
 *
 * Netlify env vars (Site → Environment variables):
 *   NOTIFY_SMTP_SERVER        e.g. smtp.gmail.com
 *   NOTIFY_SMTP_PORT          e.g. 587
 *   NOTIFY_SMTP_USERNAME
 *   NOTIFY_SMTP_PASSWORD
 *   NOTIFY_ADMIN_EMAIL        (default: rene@gelitup.com)
 *   NOTIFY_GITHUB_TOKEN       GitHub PAT with repo + workflow scopes
 *   NOTIFY_GITHUB_REPO        (default: renelk0208/gelitup-site)
 */

import nodemailer from 'nodemailer'

const ADMIN_EMAIL = process.env.NOTIFY_ADMIN_EMAIL   || 'rene@gelitup.com'
const SMTP_SERVER = process.env.NOTIFY_SMTP_SERVER   || ''
const SMTP_PORT   = parseInt(process.env.NOTIFY_SMTP_PORT || '587', 10)
const SMTP_USER   = process.env.NOTIFY_SMTP_USERNAME || ''
const SMTP_PASS   = process.env.NOTIFY_SMTP_PASSWORD || ''
const GH_TOKEN    = process.env.NOTIFY_GITHUB_TOKEN  || ''
const GH_REPO     = process.env.NOTIFY_GITHUB_REPO   || 'renelk0208/gelitup-site'

const ISSUE_LABELS = {
  pending_approval: 'Pending Approval',
  rejected:         'Application Rejected',
  login_blocked:    'Login Blocked',
  bad_password:     'Wrong Password',
  unexpected_error: 'Technical Error',
}

// ─── 1. Email ─────────────────────────────────────────────────────────────────
async function sendEmail(email, issueLabel, message, now) {
  if (!SMTP_SERVER || !SMTP_USER || !SMTP_PASS) return { skipped: 'smtp_not_configured' }

  const transporter = nodemailer.createTransport({
    host: SMTP_SERVER,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  await transporter.sendMail({
    from:    `GEL.IT.UP Portal <${SMTP_USER}>`,
    to:      ADMIN_EMAIL,
    subject: `⚠️ B2B Login Issue — ${issueLabel} (${email})`,
    text: [
      `A client experienced a login problem on the GEL.IT.UP portal.`,
      ``,
      `Email:   ${email}`,
      `Issue:   ${issueLabel}`,
      `Detail:  ${message}`,
      `Time:    ${now}`,
      ``,
      `View and resolve in the admin dashboard:`,
      `https://gelitup.com/portal/admin-login`,
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;font-size:14px;color:#333;max-width:480px">
        <p style="font-size:16px;font-weight:bold;margin-bottom:12px">⚠️ B2B Portal Login Issue</p>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap">Client email</td><td style="padding:6px 0"><strong>${email}</strong></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap">Issue type</td><td style="padding:6px 0"><strong>${issueLabel}</strong></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap">Detail</td><td style="padding:6px 0">${message}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap">Time</td><td style="padding:6px 0">${now}</td></tr>
        </table>
        <p style="margin-top:20px">
          <a href="https://gelitup.com/portal/admin-login"
             style="background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:bold">
            Open Admin Dashboard →
          </a>
        </p>
        <p style="margin-top:16px;font-size:12px;color:#aaa">Sent by GEL.IT.UP portal — gelitup.com</p>
      </div>
    `,
  })

  return { ok: true }
}

// ─── 2. GitHub Issue ──────────────────────────────────────────────────────────
async function createGitHubIssue(email, issueType, issueLabel, message, now) {
  if (!GH_TOKEN) return { skipped: 'github_token_not_configured' }

  const issueBody = [
    `### B2B Portal Login Issue`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| **Client email** | \`${email}\` |`,
    `| **Issue type** | ${issueLabel} |`,
    `| **Detail** | ${message} |`,
    `| **Detected** | ${now} |`,
    ``,
    `---`,
    ``,
    `**Next steps:**`,
    `- Check the client's approval status in the [Admin Dashboard](https://gelitup.com/portal/admin-login)`,
    `- Contact the client directly if their application is stuck`,
    issueType === 'unexpected_error'
      ? `- This looks like a **code bug** — assign Copilot to investigate and propose a fix`
      : `- If this is a recurring pattern, review the relevant portal logic`,
  ].join('\n')

  const res = await fetch(`https://api.github.com/repos/${GH_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `[B2B Login] ${issueLabel} – ${email}`,
      body:  issueBody,
      labels: ['b2b-portal', 'bug'],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub Issues API ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  return { ok: true, issueUrl: data.html_url, issueNumber: data.number }
}

// ─── 3. GitHub Actions workflow_dispatch ─────────────────────────────────────
async function triggerWorkflow(email, issueType, issueLabel, message, issueUrl, issueNumber) {
  if (!GH_TOKEN) return { skipped: 'github_token_not_configured' }

  const res = await fetch(
    `https://api.github.com/repos/${GH_REPO}/actions/workflows/b2b-login-issue.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          email,
          issue_type:       issueType,
          issue_label:      issueLabel,
          message,
          github_issue_url: issueUrl    || '',
          github_issue_num: String(issueNumber || ''),
        },
      }),
    }
  )

  // 204 = accepted, no body
  if (!res.ok && res.status !== 204) {
    const text = await res.text()
    throw new Error(`GitHub Actions dispatch ${res.status}: ${text.slice(0, 200)}`)
  }

  return { ok: true }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const email     = String(body.email     || '').trim().toLowerCase().slice(0, 254)
  const issueType = String(body.issueType || 'unknown').slice(0, 50)
  const message   = String(body.message   || '').slice(0, 500)

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email' }) }
  }

  const issueLabel = ISSUE_LABELS[issueType] || issueType
  const now = new Date().toUTCString()

  // Email + GitHub Issue fire in parallel
  const [emailResult, issueResult] = await Promise.allSettled([
    sendEmail(email, issueLabel, message, now),
    createGitHubIssue(email, issueType, issueLabel, message, now),
  ])

  if (emailResult.status === 'rejected') {
    console.error('[notify-admin] email error:', emailResult.reason?.message)
  }

  // Extract issue details for the workflow dispatch
  const issueUrl    = issueResult.status === 'fulfilled' ? (issueResult.value?.issueUrl    || '') : ''
  const issueNumber = issueResult.status === 'fulfilled' ? (issueResult.value?.issueNumber || 0)  : 0
  if (issueResult.status === 'rejected') {
    console.error('[notify-admin] GitHub Issue error:', issueResult.reason?.message)
  }

  // Workflow dispatch (sequential — needs issueUrl from above)
  const workflowResult = await triggerWorkflow(email, issueType, issueLabel, message, issueUrl, issueNumber)
    .catch((err) => { console.error('[notify-admin] workflow dispatch error:', err.message) })

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok:       true,
      email:    emailResult.status === 'fulfilled'  ? emailResult.value  : { error: emailResult.reason?.message },
      issue:    issueResult.status === 'fulfilled'  ? issueResult.value  : { error: issueResult.reason?.message },
      workflow: workflowResult || { skipped: true },
    }),
  }
}

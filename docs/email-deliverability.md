# Email sender and DNS setup (SPF/DKIM)

Use sender:

- From: distributors@gelitup.com
- Reply-To: distribution@gelitup.com

## 1) Verify domain in your email provider

In Resend (or your chosen provider), add and verify `gelitup.com`.

## 2) Add SPF record

If you use only Resend for sending, set/merge SPF to include:

- Type: TXT
- Host/Name: @
- Value example: `v=spf1 include:spf.resend.com ~all`

If an SPF TXT already exists, do **not** create another SPF record. Merge includes into a single SPF record.

## 3) Add DKIM records

Your provider will generate DKIM records (usually CNAME/TXT). Add exactly what provider gives you.

Example format (placeholders only):

- Type: CNAME
- Host/Name: `resend._domainkey`
- Value: `<provider-target>`

Some providers generate multiple DKIM selectors; add all required records.

## 4) Optional DMARC

Recommended starter record:

- Type: TXT
- Host/Name: `_dmarc`
- Value: `v=DMARC1; p=none; rua=mailto:postmaster@gelitup.com`

You can later tighten to `p=quarantine` or `p=reject` after monitoring.

## 5) Validate DNS

After DNS propagation, verify in provider dashboard and send test emails to Gmail/Outlook.

## 6) App wiring

Set frontend env values:

- `VITE_EMAIL_WEBHOOK_URL`
- `VITE_EMAIL_FROM=distributors@gelitup.com`
- `VITE_EMAIL_REPLY_TO=distribution@gelitup.com`

The portal sends:

- application received email on submit
- personalized approval/rejection email on admin action

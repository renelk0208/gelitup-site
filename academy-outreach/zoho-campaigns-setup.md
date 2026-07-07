# Zoho Campaigns — First-Time Setup Guide (GEL.IT.UP Academy Campaign)

Follow top to bottom. ~30 minutes total.

## Part 1 — Create the mailing list
1. Left sidebar → **Contacts** → **Manage Lists** → **Create List**
2. Name: `Academy Nurture — EU`
   Description: `Opted-in academies: sample kit claimants and registered academy accounts`
3. Opt-in type: **Double opt-in** (bulletproof consent for DE/AT)
4. Save.

## Part 2 — Authenticate the domain (most important for deliverability)
1. **⚙ Settings** (top right) → **Domains / Domain Authentication** (under Deliverability)
2. **Add Domain** → `gelitup.com`
3. Zoho shows SPF (TXT) + DKIM (CNAME/TXT) records
4. Add them in the DNS manager where gelitup.com is hosted (same place as website DNS)
5. Back in Zoho → **Verify** (retry after 30–60 min if DNS hasn't propagated)

## Part 3 — Sender address
1. Settings → **Sender Addresses** → **Add** → `rene@gelitup.com`
2. Click the verification link Zoho sends to that inbox.

## Part 4 — Import contacts (opted-in ONLY — never the cold lead list)
1. CSV columns: Email, First Name, Academy Name, Country, Students Per Season
2. Contacts → Academy Nurture — EU → **Import Contacts** → upload
3. Map columns; create custom fields for Academy Name + Students Per Season
4. Confirm consent (captured via /academy-kit form checkbox)

## Part 5 — Welcome workflow
Automation → Workflows → Create → name `Sample Kit Welcome`
- Trigger: contact joins **Academy Nurture — EU**
- Email 1 (immediately) — Subject: "Your GEL.IT.UP sample kit is being prepared 📦"
  Body: kit confirmed & being prepared; tracking to follow; contents recap (shades, base/top, SDS+CPNP pack); "reply — a real person reads this". Sign: Rene.
- Wait: 7 days
- Email 2 — Subject: "Did your instructors get their hands on it?"
  Body: ask how the gel handled; next step = Academy Starter Kit at wholesale, no MOQ, free EU shipping; reply for pricing or gelitup.com/for-academies. Sign: Rene.
- Use Zoho merge tag for First Name via the editor's personalisation button.
- **Save and Activate.**

## Part 6 — First bi-weekly campaign (DRAFT only)
1. Campaigns → Create Campaign → Regular email
2. Name `Academy #1 — Compliance Corner`; subject: `One year after the TPO ban — is your classroom clean?`
3. List: Academy Nurture — EU; simple one-column template
4. Content: theme #1 from `nurture-email-calendar.md` (ask Claude for full copy)
5. **Save as draft** — send only after domain verified + test email to yourself looks right.

## Ongoing rhythm
- Every second Tuesday, 12:00–14:00 CET, next theme from `nurture-email-calendar.md`
- A/B test subject lines; alternate plain-text vs designed template
- Watch open rate (subject health) + reply/click rate (content health)

## Later (plumbing)
- Auto-sync kit claimants: Supabase function → Zoho Campaigns API (token from Zoho developer console). Ask Claude to build when list is live.

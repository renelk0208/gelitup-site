// Single source of truth for the GEL.IT.UP Ambassador Agreement.
// Rendered both as the summary panel on the application form and as the full
// /ambassador-agreement page. Bump AGREEMENT_VERSION whenever the terms change
// so stored consents stay traceable to the exact wording that was agreed.

export const AGREEMENT_VERSION = 'v4-2026-08'

// Minimum content commitment. Change this number to adjust the requirement
// everywhere it appears (summary, full terms, and helper copy).
export const POST_MIN_PER_MONTH = 10

// Minimum videos/reels required each month.
export const VIDEO_MIN_PER_MONTH = 4

// Where ambassadors must send their content for our library.
export const CONTENT_SUBMISSION_NUMBER = '+30 694 071 5234'

// The discount their personal code gives to their nail-tech followers.
export const FOLLOWER_DISCOUNT_PCT = 20

// Short bullets shown inside the form's scrollable agreement panel.
export const AGREEMENT_SUMMARY = [
  `Post at least ${POST_MIN_PER_MONTH} pieces of your own content each month using GEL.IT.UP products, including at least ${VIDEO_MIN_PER_MONTH} videos/reels across Instagram and TikTok (if you have a TikTok account).`,
  'Every post must include #gelitup and mention @gelitupinternational on Instagram or @gelitupofficial on TikTok.',
  'Disclose the partnership where advertising rules require it (e.g. #ad / “gifted”).',
  `Send the content you create to our official WhatsApp/Viber number (${CONTENT_SUBMISSION_NUMBER}) so we can save it to our library.`,
  'You are welcome to add GEL.IT.UP as a collaborator on your Instagram and TikTok posts so they are shared to our profiles too.',
  `Your personal code gives genuine nail-technician followers a flat ${FOLLOWER_DISCOUNT_PCT}% off.`,
  'You may share your code publicly, but any link used with it must lead only to www.gelitup.com — never to coupon, deal or reseller sites.',
  'You will receive a GEL.IT.UP Portal B2B account automatically (gelitup.com/portal/login), with activation sent by email.',
  'Commission from orders placed with your code is added as account credit toward your next order: 10% by default, 15% once total referred orders reach €1,000, and 20% once they reach €2,000.',
  'Represent GEL.IT.UP professionally — use the products as directed, keep your content and conduct in line with our brand and reputation, and never resell, relabel or make misleading claims about them.',
  'Let GEL.IT.UP save, repost, feature and reuse your content — including what you send us and what you tag — across our channels, marketing and other platforms, credited with your social media tags.',
  'Your content may also be shared to a central drive used by GEL.IT.UP teams in other countries, who may repost it to local social media with credit to your own handles.',
  'You keep ownership of your work.',
  'PR packages are sent about once a month — sometimes more often around new product drops — as gifts to support your content, depending on you keeping up your monthly posts.',
  'Non-exclusive and month-to-month — you can work with others, and either side can end it anytime.',
]

// Full agreement, section by section. Kept short, warm and plain — a friendly
// one-page working agreement rather than dense legalese.
export const AGREEMENT_SECTIONS = [
  {
    heading: 'Welcome',
    points: [
      'This is a friendly working agreement between you and GEL.IT.UP (GIUP®) as part of our Ambassador Programme — a collaboration between professionals, not a job. Here’s what we each do.',
    ],
  },
  {
    heading: 'Who this is for',
    points: [
      'The Ambassador Programme is exclusively for qualified nail technicians. To be accepted, every applicant must meet all three of these requirements — they are firm and non-negotiable:',
      'You are a qualified nail technician, holding a recognised nail qualification or certification.',
      'You actively show your own nail work on your public social profiles — sets you have created yourself, not reposted.',
      'You have more than 500 followers on the profile where you post your nail work.',
      'Becoming an ambassador is a serious professional collaboration, not general influencer promotion. Applicants who do not meet all three requirements can’t be accepted.',
    ],
  },
  {
    heading: 'What you do',
    points: [
      `Share at least ${POST_MIN_PER_MONTH} pieces of your own content each month using GEL.IT.UP products, including at least ${VIDEO_MIN_PER_MONTH} videos/reels across Instagram and TikTok (if you hold a TikTok account).`,
      'Every post must include the hashtag #gelitup, and mention @gelitupinternational on Instagram or @gelitupofficial on TikTok.',
      `Send the content you create to our WhatsApp/Viber (${CONTENT_SUBMISSION_NUMBER}) so we can save and feature it.`,
      'You are also welcome to add GEL.IT.UP as a collaborator on your Instagram and TikTok posts, so they are shared directly to our profiles too.',
      'Where the rules ask (e.g. because a product was gifted), simply mark it as a partnership — #ad or “gifted”.',
    ],
  },
  {
    heading: 'Your discount code & earnings',
    points: [
      `You get a personal discount code to give to your followers who are genuine nail technicians, so they can buy GEL.IT.UP at a flat ${FOLLOWER_DISCOUNT_PCT}% off.`,
      'You are welcome to share and post your code publicly. Any link you use alongside it must lead only to www.gelitup.com — never to coupon, deal or reseller sites. Codes that are misused will be switched off.',
      'You are automatically given a B2B account on the GEL.IT.UP Portal (gelitup.com/portal/login) — no separate registration needed. You will receive an email to activate your account and set your password.',
      'Every order placed with your code earns commission as account credit, automatically applied toward your own next order. Commission starts at 10%, rises to 15% once total orders placed through your code reach €1,000, and 20% once they reach €2,000.',
    ],
  },
  {
    heading: 'Representing us well',
    points: [
      'As an ambassador you’re a face of GEL.IT.UP, so we ask that everything you do with our products reflects the brand well.',
      'Use the products professionally and as directed, following correct application and safety guidance. Don’t resell, decant, relabel or tamper with them, and don’t make medical or misleading claims.',
      'Keep your content and public conduct respectful and on-brand — nothing that could reasonably harm GEL.IT.UP’s name or reputation. If something you post is off-brand, we may ask you to adjust or remove it, and we can end the partnership if the brand is being misrepresented.',
    ],
  },
  {
    heading: 'What we do',
    points: [
      'Feature your work on our channels and give you your personal discount code to share.',
      'Send you PR packages to create with — usually about once a month, and sometimes more often when there’s a new product drop. These are gifts to support your content, not a sale, and depend on you meeting your monthly posting minimums above. This is fair given the quality of the kits we provide — if these minimums are not being met, we can end the collaboration with immediate effect.',
    ],
  },
  {
    heading: 'Using your content',
    points: [
      'You let us save, repost, edit for format and reuse the content you send us or tag us in — across our channels, website, marketing and other platforms, always credited with your tags.',
      'Your content may also be uploaded to a shared central drive accessible by GEL.IT.UP teams in other countries, who may repost it to their own local social media, provided they credit you using your own social media handles.',
      'The work must be your own; you keep ownership, and this stays true for anything already shared even if you later stop.',
    ],
  },
  {
    heading: 'The simple stuff',
    points: [
      'You’re free to work with other brands — this isn’t employment and there’s no guaranteed payment.',
      'It runs month to month and either of us can stop anytime. If you stop, your discount code is switched off; permission for content already shared continues.',
    ],
  },
  {
    heading: 'Your signature',
    points: [
      'By ticking the box and submitting your application, you agree to this. Your typed name is your signature, dated the day you apply.',
    ],
  },
]

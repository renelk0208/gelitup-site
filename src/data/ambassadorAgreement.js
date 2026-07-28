// Single source of truth for the GEL.IT.UP® Ambassador Agreement.
// Rendered both as the summary panel on the application form and as the full
// /ambassador-agreement page. Bump AGREEMENT_VERSION whenever the terms change
// so stored consents stay traceable to the exact wording that was agreed.

export const AGREEMENT_VERSION = 'v2-2026-07'

// Minimum content commitment. Change this number to adjust the requirement
// everywhere it appears (summary, full terms, and helper copy).
export const POST_MIN_PER_MONTH = 4

// Where ambassadors must send their content for our library.
export const CONTENT_SUBMISSION_NUMBER = '+30 694 071 5234'

// Short bullets shown inside the form's scrollable agreement panel.
export const AGREEMENT_SUMMARY = [
  `Post at least ${POST_MIN_PER_MONTH} pieces of your own content each month (at least one a video/reel) using GEL.IT.UP® and tagging #gelitup and @gelitup.`,
  'Disclose the partnership where advertising rules require it (e.g. #ad / “gifted”).',
  `Send the content you create to our official WhatsApp/Viber number (${CONTENT_SUBMISSION_NUMBER}) so we can save it to our library.`,
  'Use your personal discount code genuinely — for yourself and real clients/followers, never on coupon or reseller sites.',
  'Let GEL.IT.UP® save, repost, feature and reuse your content — including what you send us and what you tag — across our channels, marketing and other platforms, credited with your social media tags. You keep ownership.',
  'Free product drops are gifts to support your content, not a sale, and depend on you keeping up the monthly posts.',
  'Non-exclusive and month-to-month — you can work with others, and either side can end it anytime.',
]

// Full agreement, section by section. Kept short, warm and plain — a friendly
// one-page working agreement rather than dense legalese.
export const AGREEMENT_SECTIONS = [
  {
    heading: 'Welcome',
    points: [
      'This is a friendly working agreement between you and GEL.IT.UP® (GIUP®) as part of our Ambassador Programme — a collaboration between professionals, not a job. Here’s what we each do.',
    ],
  },
  {
    heading: 'What you do',
    points: [
      `Share at least ${POST_MIN_PER_MONTH} pieces of your own content each month using GEL.IT.UP® products, tagging #gelitup and @gelitup — with at least one video/reel.`,
      `Send the content you create to our WhatsApp/Viber (${CONTENT_SUBMISSION_NUMBER}) so we can save and feature it.`,
      'Use your personal discount code just for you and your real clients and followers — not on coupon or reseller sites.',
      'Where the rules ask (e.g. because a product was gifted), simply mark it as a partnership — #ad or “gifted”.',
    ],
  },
  {
    heading: 'What we do',
    points: [
      'Feature your work on our channels, give you a personal discount code, and send occasional free product drops to create with. Free products are gifts to support your content and depend on you keeping up your monthly posts.',
    ],
  },
  {
    heading: 'Using your content',
    points: [
      'You let us save, repost, edit for format and reuse the content you send us or tag us in — across our channels, website, marketing and other platforms — always credited with your tags. The work must be your own; you keep ownership, and this stays true for anything already shared even if you later stop.',
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

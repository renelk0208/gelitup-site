// Single source of truth for the GEL.IT.UP Ambassador Agreement.
// Rendered both as the summary panel on the application form and as the full
// /ambassador-agreement page. Bump AGREEMENT_VERSION whenever the terms change
// so stored consents stay traceable to the exact wording that was agreed.

export const AGREEMENT_VERSION = 'v3-2026-07'

// Minimum content commitment. Change this number to adjust the requirement
// everywhere it appears (summary, full terms, and helper copy).
export const POST_MIN_PER_MONTH = 4

// Where ambassadors must send their content for our library.
export const CONTENT_SUBMISSION_NUMBER = '+30 694 071 5234'

// The discount their personal code gives to their nail-tech followers.
export const FOLLOWER_DISCOUNT_PCT = 20

// Short bullets shown inside the form's scrollable agreement panel.
export const AGREEMENT_SUMMARY = [
  `Post at least ${POST_MIN_PER_MONTH} pieces of your own content each month (at least one a video/reel) using GEL.IT.UP and tagging #gelitup and @gelitup.`,
  'Disclose the partnership where advertising rules require it (e.g. #ad / “gifted”).',
  `Send the content you create to our official WhatsApp/Viber number (${CONTENT_SUBMISSION_NUMBER}) so we can save it to our library.`,
  `Your personal code gives your followers who are genuine nail technicians ${FOLLOWER_DISCOUNT_PCT}% off. Share it privately with them — don’t publish it openly, and never post it on coupon or reseller sites.`,
  'Represent GEL.IT.UP professionally — use the products as directed, keep your content and conduct in line with our brand and reputation, and never resell, relabel or make misleading claims about them.',
  'Let GEL.IT.UP save, repost, feature and reuse your content — including what you send us and what you tag — across our channels, marketing and other platforms, credited with your social media tags. You keep ownership.',
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
      `Share at least ${POST_MIN_PER_MONTH} pieces of your own content each month using GEL.IT.UP products, tagging #gelitup and @gelitup — with at least one video/reel.`,
      `Send the content you create to our WhatsApp/Viber (${CONTENT_SUBMISSION_NUMBER}) so we can save and feature it.`,
      'Where the rules ask (e.g. because a product was gifted), simply mark it as a partnership — #ad or “gifted”.',
    ],
  },
  {
    heading: 'Your discount code',
    points: [
      `You get a personal discount code to give to your followers who are genuine nail technicians, so they can buy GEL.IT.UP at ${FOLLOWER_DISCOUNT_PCT}% off.`,
      'The code is for private sharing with real, professional followers — please don’t publish it openly (in captions, bios or public posts) and never list it on coupon, deal or reseller sites. Codes that are leaked or misused will be switched off.',
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
      'Send you PR packages to create with — usually about once a month, and sometimes more often when there’s a new product drop. These are gifts to support your content, not a sale, and depend on you keeping up your monthly posts.',
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

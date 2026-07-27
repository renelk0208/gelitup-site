// Single source of truth for the GEL.IT.UP® Ambassador Agreement.
// Rendered both as the summary panel on the application form and as the full
// /ambassador-agreement page. Bump AGREEMENT_VERSION whenever the terms change
// so stored consents stay traceable to the exact wording that was agreed.

export const AGREEMENT_VERSION = 'v1-2026-07'

// Minimum content commitment. Change this number to adjust the requirement
// everywhere it appears (summary, full terms, and helper copy).
export const POST_MIN_PER_MONTH = 4

// Short bullets shown inside the form's scrollable agreement panel.
export const AGREEMENT_SUMMARY = [
  `Post at least ${POST_MIN_PER_MONTH} pieces of your own content each month (at least one a video/reel) using GEL.IT.UP® and tagging #gelitup and @gelitup.`,
  'Disclose the partnership where advertising rules require it (e.g. #ad / “gifted”).',
  'Use your personal discount code genuinely — for yourself and real clients/followers, never on coupon or reseller sites.',
  'Let GEL.IT.UP® repost, feature and reuse content you tag us in, across our channels and marketing, with credit. You keep ownership.',
  'Free product drops are gifts to support your content, not a sale, and depend on you keeping up the monthly posts.',
  'Non-exclusive and month-to-month — you can work with others, and either side can end it anytime.',
]

// Full agreement, section by section, for the standalone page.
export const AGREEMENT_SECTIONS = [
  {
    heading: 'Who this is for',
    points: [
      'The GEL.IT.UP® Ambassador Programme is for serious nail professionals and artists who genuinely create with our products. It is a working collaboration — not a casual influencer arrangement.',
    ],
  },
  {
    heading: 'Your commitments',
    points: [
      `Publish a minimum of ${POST_MIN_PER_MONTH} pieces of original content (photos or videos) every calendar month that feature GEL.IT.UP® products, and tag #gelitup and @gelitup. At least one of these must be a video/reel.`,
      'Genuinely use GEL.IT.UP® products in the work you post.',
      'Represent the brand honestly and professionally. Where advertising or consumer rules require it — including because you received free product — clearly disclose the partnership (e.g. #ad, #ambassador or “gifted”).',
      'Use your personal discount code only for yourself and your genuine clients and followers. Do not post it on coupon, deal or reseller sites, or use it to resell for profit.',
      'Keep your content original and your own. Do not post anything unlawful, offensive, or that infringes anyone else’s rights.',
    ],
  },
  {
    heading: 'Permission to feature your content',
    points: [
      'You grant GEL.IT.UP® (GIUP®) a non-exclusive, royalty-free, worldwide licence to repost, reproduce, resize/edit for format, feature and reuse any content you tag with @gelitup or #gelitup — across our social channels, website and marketing materials — with credit to your handle.',
      'You keep full ownership of your content. This permission for already-shared posts continues even after the partnership ends.',
    ],
  },
  {
    heading: 'What GEL.IT.UP® provides',
    points: [
      'Featuring your tagged work on our channels, including @gelitup.',
      'A personal discount code for you and to share with your genuine followers.',
      'Periodic free product drops, sent at our discretion to support your content. Free products are gifts provided for content creation, not a sale, and are conditional on you meeting the monthly posting commitment.',
    ],
  },
  {
    heading: 'The relationship',
    points: [
      'This is a non-exclusive collaboration — you are free to work with other brands.',
      'Nothing here creates employment, an agency relationship, or any guaranteed payment. You are responsible for any taxes due on benefits you receive.',
      'The arrangement runs on a rolling month-to-month basis.',
    ],
  },
  {
    heading: 'Ending the partnership',
    points: [
      'Either side may end the partnership at any time, for any reason, by email or direct message.',
      'If you repeatedly miss the monthly posting minimum, we may pause or end your ambassador status and deactivate your discount code.',
      'When the partnership ends, you stop using your discount code and any active “ambassador” claims. The permission for content you already shared continues as set out above.',
    ],
  },
  {
    heading: 'Your signature',
    points: [
      'By ticking the agreement box and submitting your application, you confirm you have read and agree to this Agreement. Your typed name is your electronic signature, dated on the day you submit.',
    ],
  },
]

// Single source of truth for the GEL.IT.UP Ambassador Guidelines — an advisory
// on how we expect ambassadors to present GEL.IT.UP and themselves (formerly
// called the "Ambassador Agreement"; file and export names kept for history).
// Rendered both as the summary panel on the application form and as the full
// /ambassador-agreement page. Bump AGREEMENT_VERSION whenever the terms change
// so stored consents stay traceable to the exact wording that was agreed.

export const AGREEMENT_VERSION = 'v10-2026-11'

// Minimum content commitment. Change this number to adjust the requirement
// everywhere it appears (summary, full terms, and helper copy).
export const POST_MIN_PER_MONTH = 5

// No separate video minimum any more (kept for older imports).
export const VIDEO_MIN_PER_MONTH = 0

// Kept for older imports; content now goes to the Google Drive folder below.
export const CONTENT_SUBMISSION_NUMBER = '+30 694 071 5234'

// Ambassadors upload original, full-quality videos to their personal folder here.
export const CONTENT_DRIVE_URL = 'https://drive.google.com/drive/folders/1VKpSyxpEaKW3n4czWdAL5INUdOQ0mBWe?usp=sharing'

// Minimum followers to join.
export const FOLLOWER_MIN = '1,000'

// Credit on her own orders, by total orders placed with her code.
export const CREDIT_LEVELS = [
  { from: 0, pct: 20 },
  { from: 500, pct: 25 },
  { from: 1500, pct: 30 },
]

// The discount their personal code gives to their nail-tech followers.
export const FOLLOWER_DISCOUNT_PCT = 20

// Short bullets shown inside the application form's guidelines panel.
export const AGREEMENT_SUMMARY = [
  'GEL.IT.UP ambassadors help the brand grow in their country — more nail technicians, salons and academies using our products — not only follower numbers.',
  `Share at least ${POST_MIN_PER_MONTH} quality feed posts, reels or carousels a month made with GEL.IT.UP products. Stories don't count.`,
  'Add @gelitupinternational as a Collab collaborator on these posts, use #gelitup, and mention @gelitupofficial on TikTok.',
  'Create content good enough for our YouTube channel — mini tutorials, "how to" videos and product presentations — and upload the original files to your personal Google Drive folder.',
  `Put your personal code in your captions and your personal link in your bio. Your followers get ${FOLLOWER_DISCOUNT_PCT}% off at shop.gelitup.com.`,
  'Review every product you receive on shop.gelitup.com and confirm every package on your ambassador page.',
  'STRICT — NO EXCEPTIONS: no other nail brand’s products in the same photo, video or post as GEL.IT.UP.',
  'Use only the official GEL.IT.UP logos, unchanged. Never make your own.',
  'Earn credit on your own orders for every order placed with your code: 20%, rising to 25% from €500 and 30% from €1,500.',
  'Your best work is shared internationally on our YouTube channel and social media, always credited to you.',
  'Packages and giveaways go to active ambassadors. Non-exclusive and month to month — either side can stop at any time.',
]

// Full guidelines, section by section. Warm, plain and short.
//
// A section may set `strict: true` to mark it as a firm, non-negotiable rule.
// Renderers (the guidelines page and the PDF) style `strict` sections in
// bold + underline + a red highlight so they stand out.
export const AGREEMENT_SECTIONS = [
  {
    heading: 'Welcome',
    points: [
      'A GEL.IT.UP ambassador is a qualified nail technician who helps the brand grow in her country, through professional content, real results and a good name for GEL.IT.UP. It is a professional partnership between professionals, not general influencer promotion. These guidelines explain how we present GEL.IT.UP, and ourselves, together.',
    ],
  },
  {
    heading: 'Why the programme exists',
    points: [
      'We measure an ambassador by how she helps GEL.IT.UP expand, not by her follower count.',
      'New countries and new customers: ambassadors make GEL.IT.UP known among nail professionals where we are not yet strong, so salons, academies and nail technicians start ordering.',
      'Distribution: interest built by ambassadors helps us find and support distributors, so the brand can grow in each market.',
      'Trust: honest reviews and real work by qualified technicians show other professionals what our products can do.',
      'Content for the whole brand: the best ambassador content is shared internationally on our YouTube channel and all our social media platforms, in every country GEL.IT.UP works in.',
    ],
  },
  {
    heading: 'Who can become an ambassador',
    points: [
      'The programme is for qualified nail technicians only. Every applicant meets all three requirements:',
      'You hold a recognised nail qualification or certification.',
      'You show your own nail work on your public social profiles, not reposts.',
      `You have more than ${FOLLOWER_MIN} followers on the profile where you post your nail work.`,
    ],
  },
  {
    heading: 'What we expect from you',
    points: [
      `At least ${POST_MIN_PER_MONTH} quality posts a month: share at least ${POST_MIN_PER_MONTH} feed posts, reels or carousels made with GEL.IT.UP products each month. Your first package holds 10 to 15 products and later packages add more, so there is plenty to create with. Stories don't count towards the ${POST_MIN_PER_MONTH}.`,
      'Quality first: clean, professional photos and videos of your own work — well lit, in focus, with the products clearly shown.',
      'GEL.IT.UP products only in any post that features GEL.IT.UP (see the strict rule below).',
      'Tag us every time: use #gelitup and add @gelitupinternational as a Collab collaborator on each of these posts, so they also appear on our profile. Only Collab posts count. On TikTok, mention @gelitupofficial.',
      'Your code in every post: mention your personal code in your captions and keep your personal link in your bio (shop.gelitup.com/discount/YOURCODE). Add it as a link sticker on stories that show GEL.IT.UP.',
      'Review what you receive: leave an honest review on shop.gelitup.com for every product you are sent.',
      'Confirm every package on your ambassador page as soon as it arrives.',
      'Mark the partnership where advertising rules ask for it, e.g. #ad or "gifted".',
    ],
  },
  {
    heading: 'Content good enough for our YouTube channel',
    points: [
      'Your best videos are shown internationally, on the GEL.IT.UP YouTube channel and all our social media platforms, always credited to you.',
      'What we love to receive: mini nail art tutorials, "how to" videos (how to apply or use a product) and presentations of GEL.IT.UP products.',
      'The standard: good light, a steady camera, clean hands and nails, the products clearly visible, and no text on the video. Photos carry minimal text, with the product name or number in the description.',
      'Name your files by colour name and number, or by the key product.',
      `Post on Instagram, then upload the original: Instagram lowers the quality, so please upload the original, full-quality file to your personal folder in the GEL.IT.UP Google Drive (${CONTENT_DRIVE_URL}).`,
      'Shared across countries: GEL.IT.UP teams in other countries may repost your content, always tagging you. Your discount code does not apply in those countries.',
    ],
  },
  {
    heading: 'What you gain',
    points: [
      'International exposure: your work, credited to you, in front of nail professionals in every country GEL.IT.UP works in.',
      'Growth as a professional: creating tutorials and product content builds your skills, your portfolio and your name as an educator.',
      'PR packages of professional GEL.IT.UP products to create with. They are gifts, not a sale, and go to ambassadors who stay active: posting quality content, using their code, reviewing and confirming their packages.',
      `Your personal code: your followers get ${FOLLOWER_DISCOUNT_PCT}% off at shop.gelitup.com.`,
      'Credit on your own orders for every order placed with your code: 20% from the first order, 25% once total orders with your code reach €500, and 30% once they reach €1,500.',
      'Giveaways: active ambassadors who review their products and send a quality video can host an official GEL.IT.UP giveaway as a Collab with @gelitup. We supply and ship the prize.',
      'A GEL.IT.UP Portal account (gelitup.com/portal/login?portal=ambassador), where you see your packages, reviews, code orders and credit.',
    ],
  },
  {
    heading: 'NO OTHER BRANDS IN YOUR CONTENT — STRICT, NO EXCEPTIONS',
    strict: true,
    points: [
      'No product from any other nail brand may appear in any photo, video, frame, reel or post that shows GEL.IT.UP — not in the foreground, not in the background, not on a table or shelf in shot.',
      'Your followers ask what products are being used, and we cannot have another company named, shown or implied alongside our brand.',
      'You are free to use other brands in your own separate content — just never together with GEL.IT.UP in the same piece of content.',
      'Content that mixes brands is never featured, and repeated breaches may end the collaboration.',
    ],
  },
  {
    heading: 'Firm rules',
    points: [
      'Official logos only: use the black and white GEL.IT.UP logos we give you, unchanged, and only on media made with GEL.IT.UP products. Never make your own logo. Anything uploaded with our logo becomes the property of GEL.IT.UP by GIUP®, a registered trademark.',
      'Your code belongs on shop.gelitup.com: any link you share with it leads only to shop.gelitup.com, never to coupon, deal or reseller sites. Misused codes are switched off.',
      'Use the products professionally, as directed and safely. Never resell, decant, relabel or alter them, and never make medical or misleading claims.',
      'Represent GEL.IT.UP well: keep your content and public conduct respectful and on-brand. We may ask you to adjust or remove off-brand content.',
    ],
  },
  {
    heading: 'How we review activity',
    points: [
      "We look at ambassadors' Instagram accounts regularly, along with their reviews, code orders and confirmed packages.",
      'Your next package is sent only after you confirm the last one arrived.',
      "If we see no activity, we may pause the collaboration. Paused ambassadors receive no new packages and can't host giveaways.",
      'You can pause or end the collaboration yourself at any time from your ambassador page.',
      'The partnership is non-exclusive and runs month to month. You are free to work with other brands, in separate content.',
      'You keep ownership of your work. If you stop, your code is switched off, and GEL.IT.UP may keep using content already shared, with credit to you.',
    ],
  },
  {
    heading: 'Your confirmation',
    points: [
      'By ticking the box and submitting your application, you confirm you have read these guidelines and will present GEL.IT.UP, and yourself, in this way. Your typed name and the date you apply are recorded with your application.',
    ],
  },
]

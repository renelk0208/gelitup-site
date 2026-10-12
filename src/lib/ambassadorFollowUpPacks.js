// What goes in a follow-up PR package (every package after the first), by
// ambassador type. Used by the admin and by the daily job that fills in the
// next package automatically. Extreme ambassadors get no follow-up package.
export const AMBASSADOR_FOLLOW_UP_PACKS_BY_TYPE = {
  standard_ambassador: {
    items: [
      '1x Pink Buffer',
      '1 x Purple Buffer',
      '3 x Autumn / Winter Colours',
      'Blossom',
      '1 x Glitter Gel',
    ],
  },
  super_ambassador: {
    items: [
      'New Dual Forms',
      '1 x roll of Gelitup Nail Forms',
      '1 Pink Buffer',
      '1 x Purple Buffer',
      '1 Line it up Black',
      '1 Line it up White',
      '5 x Autumn / Winter Colours',
      '1 Glitter Builder Gel',
    ],
  },
}

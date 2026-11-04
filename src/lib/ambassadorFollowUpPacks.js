// What goes in a follow-up PR package (the second package), by ambassador
// type — one line per product (see ambassadorPacks.js). Used by the admin and
// by the daily job that fills in the next package automatically. Extreme
// ambassadors get no follow-up package.
import { SPLIT_FOLLOW_UP_PACKS } from './ambassadorPacks.js'

export const AMBASSADOR_FOLLOW_UP_PACKS_BY_TYPE = {
  standard_ambassador: { items: SPLIT_FOLLOW_UP_PACKS.standard_ambassador },
  super_ambassador: { items: SPLIT_FOLLOW_UP_PACKS.super_ambassador },
}

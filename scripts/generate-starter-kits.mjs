/**
 * generate-starter-kits.mjs
 * Reads Starter-kit-colour-collection-.xlsx (one sheet per kit) and produces
 * public/gelitup-content/starter-kits.json — the data-driven config that powers
 * the catalogue "Starter Kits / Packages" section.
 *
 * Kit rules (all kits): 3 auto must-haves (No Wipe Top Coat, 5-in-1 Superior Base
 * Clear, Superbond without Acid) + a FREE 100ml All-In-One Liquid are always
 * included. The customer chooses N colours from the kit's list; extra colours can
 * be added at the current website price. Only the final kit price is shown.
 */
import ExcelJS from 'exceljs';
import fs from 'fs';

const XLSX = 'Starter-kit-colour-collection-.xlsx';
const OUT = 'public/gelitup-content/starter-kits.json';

// Per-sheet kit config (confirmed by owner 2026-07-08)
const KIT_CONFIG = {
  'Beginner Colour Kit': { id: 'beginner', name: 'Beginner Colour Kit', price: 59.45, choose: 0, chooseLabel: '', extraFrom: 'gel-polish' },
  'Gel Polish Package': { id: 'gel-polish', name: 'Gel Polish Kit', price: 96.45, choose: 10, chooseLabel: 'gel polish colours', infoKeys: ['COLORS::ALL'] },
  'BIAB and Lquid Polygel Clear': { id: 'biab-polygel', name: 'BIAB & Liquid Polygel Kit', price: 49.95, choose: 0, chooseLabel: '', extraFrom: 'gel-polish', infoKeys: ['BUILDER GEL SYSTEMS::BRUSH ON BUILDER', 'BUILDER GEL SYSTEMS::LIQUID POLYGEL'] },
  'Premium Fibreglass Builder Kit': { id: 'premium-builder', name: 'Premium Fibreglass Builder Kit', price: 49.0, choose: 1, chooseLabel: 'builder gel shade', exclude: /premium builder gel (blue|mint|purple)\b/i, extraFrom: 'gel-polish', infoKeys: ['BUILDER GEL SYSTEMS::PREMIUM BUILDER'] },
  'Multmix Synthogel': { id: 'multimix', name: 'Multimix Synthogel (Polygel) Kit', price: 55.95, choose: 1, chooseLabel: 'Multimix shade', extraFrom: 'gel-polish', infoKeys: ['BUILDER GEL SYSTEMS::MULTIMIX'], groups: [{ key: 'dualforms', label: 'Choose 1 box of Dual Form tips', choose: 1, match: 'dual' }, { key: 'multimix', label: 'Choose 1 Multimix Synthogel shade', choose: 1, match: 'multimix' }] },
  'Full Starter': { id: 'full-starter', name: 'Full Starter Pack', price: 167.45, choose: 10, chooseLabel: 'colours', infoKeys: [], groups: [{ key: 'dualforms', label: 'Choose 1 box of Dual Form tips', choose: 1, pathMatch: /DUAL FORMS/i }, { key: 'colours', label: 'Choose your 10 colours', choose: 10, pathMatch: /\/COLORS\//i }] },
};

const MUST = ['No Wipe Top Coat', '5-in-1 Superior Base Clear', 'Superbond without Acid'];
const FREE_GIFT = 'Free 100ml All-In-One Liquid';

// "Complete your kit" upsell strip — shown on every kit builder. Edit freely; each
// item is added to the basket at its normal website price (charged separately).
const ADD_ONS = [
  { name: 'Chilled Melon Cuticle Oil 100ml -HTF', label: 'Chilled Melon Cuticle Oil 100ml', blurb: 'Nourishing cuticle oil to finish and hydrate every set.' },
  { name: 'Cooling Coconut Cuticle Oil 100ml -HTF', label: 'Cooling Coconut Cuticle Oil 100ml', blurb: 'Fresh coconut cuticle oil that conditions skin and nails.' },
  { name: 'Nail Files With Back Glue 180 Packet of 10', label: 'Nail Files 180 (pack of 10)', blurb: 'Fine 180-grit files — the everyday shaping essential.' },
  { name: 'Polygel Brush and Spatula Rose Gold', label: 'Polygel Brush & Spatula', blurb: 'Dual-ended brush and spatula for sculpting Polygel & Synthogel.' },
  { name: 'Super Fan Top Coat 11ml FAN12 -HTF', label: 'Super Fan Top Coat 11ml', blurb: 'High-gloss top coat with a wide fan brush for fast, even coverage.' },
  { name: 'Almond Cuticle Scrub Remover 100ml -HTF', label: 'Almond Cuticle Scrub Remover 100ml', blurb: 'Gently softens and removes cuticles for a clean, prepped nail.' },
];

// Short product descriptions shown in the kit builder (data-driven — edit freely).
const DESCRIPTIONS = {
  'No Wipe Top Coat': 'High-shine, no-wipe top coat that seals and protects your work — no sticky layer to remove.',
  '5-in-1 Superior Base Clear': 'Multi-function clear base coat for adhesion, strengthening and long-lasting wear.',
  'Superbond without Acid': 'Acid-free primer that boosts adhesion and gently dehydrates the nail — no curing needed.',
  'Free 100ml All-In-One Liquid': 'Multi-purpose liquid for cleansing, brush care and slip — included free with every kit.',
  'Brush on Builder Gel Clear 15ml -HTF': 'Builder-in-a-bottle (BIAB) — self-levelling clear builder to strengthen and shape natural nails.',
  'Liquid Polygel #LPG1 -HTF': 'Liquid-form Polygel — medium viscosity, self-levelling; strengthens and extends with easy control.',
};
const describe = (name) => DESCRIPTIONS[name] || DESCRIPTIONS[displayName(name)] || '';

// Explicit images for the always-included must-haves (their names don't map cleanly).
const MUSTHAVE_IMAGE = {
  'No Wipe Top Coat': '/gelitup-content/product-images/TOPS/Classic Top Coats/non-wipe-top-coat.webp',
  '5-in-1 Superior Base Clear': '/gelitup-content/product-images/BASES/5IN1 SUPERIOR BASE/5-in-1-GIUP-SBCCLR.webp',
};
const isMust = (s) => MUST.some((m) => s.toLowerCase() === m.toLowerCase());
const norm = (s) => String(s || '').toLowerCase().replace(/-htf\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const codeOf = (s) => { const m = String(s).match(/^([A-Za-z]{0,3}\d+[A-Za-z]?)\b/); return m ? m[1].toUpperCase() : null; };

const map = JSON.parse(fs.readFileSync('public/gelitup-content/product-image-map.json', 'utf8'));
const byKeyNorm = new Map();
for (const [k, v] of Object.entries(map)) { if (typeof v === 'string') byKeyNorm.set(norm(k), v); }
const byCode = new Map();
for (const [k, v] of Object.entries(map)) {
  if (typeof v !== 'string') continue;
  const file = v.split('/').pop().replace(/\.[^.]+$/, '');
  const c = codeOf(file.replace(/^GIUP[-_ ]?/i, '')) || codeOf(k.replace(/^GIUP[-_ ]?/i, ''));
  if (c && !byCode.has(c)) byCode.set(c, v);
}
const pl = JSON.parse(fs.readFileSync('public/gelitup-content/b2b-price-list.json', 'utf8'));
const plList = pl.products || pl.items || (Array.isArray(pl) ? pl : []);
const priceByNorm = new Map();
for (const it of plList) { if (it && it.name) priceByNorm.set(norm(it.name), Number(it.price)); }

// Prefer the primary "A" image over a "_B"/"_C" gallery variant. Handles both
// "name_B.webp" and size-suffixed "name_B-60gr.webp" naming.
const VARIANT_RE = /_(?:B|C)(?=(?:[-_]\d+gr?)?\.[A-Za-z]+$)/i;
const SIZE_EXT_RE = /((?:[-_]\d+gr?)?\.[A-Za-z]+)$/i;
function primaryOf(p) {
  if (!p) return p;
  const primary = p.replace(VARIANT_RE, '');
  if (primary !== p && fs.existsSync('public' + primary)) return primary;
  return p;
}
// The matching "_B"/"_C" gallery image for a primary path, if it exists.
function variantOf(p, letter) {
  if (!p) return null;
  const v = p.replace(SIZE_EXT_RE, `_${letter}$1`);
  return v !== p && fs.existsSync('public' + v) ? v : null;
}
const bOf = (p) => variantOf(p, 'B');
const cOf = (p) => variantOf(p, 'C');

function resolveImage(name) {
  const n = norm(name);
  let hit = null;
  if (byKeyNorm.has(n)) hit = byKeyNorm.get(n);
  if (!hit) { const c = codeOf(name); if (c && byCode.has(c)) hit = byCode.get(c); }
  if (!hit) {
    const rMatch = name.match(/\bR0*(\d+)\b/i);
    if (rMatch) {
      const num = rMatch[1];
      for (const cand of [num, num.padStart(2, '0'), num.padStart(3, '0')]) {
        const p = `/gelitup-content/product-images/COLORS/RONE/GIUP-R${cand}.webp`;
        if (fs.existsSync('public' + p)) { hit = p; break; }
      }
    }
  }
  // Multimix "Light Lilac" / "Lilac" both use the lilac 60gr image.
  if (!hit && /multimix.*\blilac\b/i.test(name)) {
    const p = '/gelitup-content/product-images/MULTIMIX/60gr/multimix_lilac_color-60gr.webp';
    if (fs.existsSync('public' + p)) hit = p;
  }
  // Premium Builder: match by shade word (40g only). 20g are a different product/price
  // and must NEVER be used here, so 20g/20gr image files are excluded.
  if (!hit && /premium builder|premium plus/i.test(name)) {
    const dir = 'public/gelitup-content/product-images/BUILDER GEL/PREMIUM BUILDER/40g-premium-builder-gel';
    const webDir = '/gelitup-content/product-images/BUILDER GEL/PREMIUM BUILDER/40g-premium-builder-gel';
    try {
      const files = fs.readdirSync(dir).filter((f) => !/_[BC]\.[A-Za-z]+$/i.test(f) && !/\b20\s?gr?\b|_20g|-20g/i.test(f));
      if (/premium plus|fiber ?glass|clear plus/i.test(name)) {
        const f = files.find((x) => /clear[_-]plus/i.test(x));
        if (f) hit = `${webDir}/${f}`;
      }
      if (!hit) {
        const shade = norm(name)
          .replace(/\b(3 in 1|gelitup|premium plus fiber glass builder gel|premium builder gel|premium plus|40gr|40g|20gr|20g|htf)\b/g, '')
          .replace(/\s+/g, ' ').trim();
        const found = shade && files.find((f) => norm(f).includes(shade) && shade.length > 2);
        if (found) hit = `${webDir}/${found}`;
      }
    } catch { /* ignore */ }
  }
  if (!hit && !/premium/i.test(name)) { for (const [kn, v] of byKeyNorm) { if (kn && n.length > 4 && (kn.includes(n) || n.includes(kn))) { hit = v; break; } } }
  return primaryOf(hit);
}
// Some kit item names differ from the price-list entry. Map to the exact
// price-list name so their individual retail price resolves correctly.
const PRICE_ALIAS = {
  'No Wipe Top Coat': 'Non Wipe Top Coat 15ml -HTF',
  '5-in-1 Superior Base Clear': '5-in-1 Superior Base 15ml Clear -HTF',
  'Superbond without Acid': 'Superbond Nail Dehydrator 11ml - Acid Free -HTF',
};
function resolvePrice(name) {
  const alias = PRICE_ALIAS[name];
  const n = norm(alias || name);
  if (priceByNorm.has(n)) return priceByNorm.get(n);
  for (const [pn, p] of priceByNorm) { if (pn && n.length > 4 && (pn.includes(n) || n.includes(pn))) return p; }
  return null;
}
const displayName = (raw) => String(raw).replace(/\s*-HTF\b/gi, '').trim();

// Colour family from the image path so kit colours can be grouped (French, Nude, Red, ...)
const FAMILY_LABEL = {
  RONE: 'GIUP1 Collection', FRENCH: 'French', NUDE: 'Nude', PASTEL: 'Pastel',
  GLITTERS: 'Glitters', 'CAT EYE': 'Cat Eye', 'GLASS EFFECT': 'Glass Effect',
  THERMO: 'Thermo', 'SHIMMER COLORS': 'Shimmer', SNOWFLAKE: 'Snowflake', PEARL: 'Pearl',
  JELLY: 'Jelly', 'METALLIC COLLECTION': 'Metallic', 'NEW YORK': 'New York', PMA: 'PMA',
};
const titleCase = (s) => String(s).toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
function familyOf(imagePath) {
  if (!imagePath) return 'Other';
  const parts = imagePath.split('/');
  const ci = parts.indexOf('COLORS');
  if (ci === -1) return 'Other';
  const sub = (parts[ci + 1] || '').toUpperCase();
  if (sub === 'SOLID GEL POLISH' && parts.length > ci + 3) return titleCase(parts[ci + 2]);
  return FAMILY_LABEL[sub] || titleCase(sub || 'Other');
}

// Product descriptions + application instructions, pulled from the catalogue's product-info.json.
const productInfo = JSON.parse(fs.readFileSync('src/data/product-info.json', 'utf8'));
const INFO_LABELS = {
  'COLORS::ALL': 'Gel Polish',
  'BUILDER GEL SYSTEMS::BRUSH ON BUILDER': 'Brush On Builder (BIAB)',
  'BUILDER GEL SYSTEMS::LIQUID POLYGEL': 'Liquid Polygel',
  'BUILDER GEL SYSTEMS::PREMIUM BUILDER': 'Premium Fibreglass Builder Gel',
  'BUILDER GEL SYSTEMS::MULTIMIX': 'Multimix Synthogel (Polygel)',
};
const isApp = (s) => /^Application\s*[—-]\s*/i.test(String(s));
function buildGuides(keys = []) {
  return keys.map((k) => {
    const info = productInfo[k];
    if (!info) return null;
    const items = Array.isArray(info.listItems) ? info.listItems : [];
    return {
      title: INFO_LABELS[k] || k,
      paragraphs: (info.paragraphs || []).filter(Boolean).map((p) => String(p).replace(/\*\*/g, '').trim()),
      application: items.filter(isApp).map((s) => String(s).replace(/^Application\s*[—-]\s*/i, '').replace(/\*\*/g, '').trim()),
      points: items.filter((s) => !isApp(s)).map((s) => String(s).replace(/\*\*/g, '').trim()),
    };
  }).filter(Boolean);
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(XLSX);

const kits = [];
const unmatched = [];
for (const ws of wb.worksheets) {
  const cfg = KIT_CONFIG[ws.name];
  if (!cfg) { console.warn('No config for sheet:', ws.name); continue; }
  const items = [];
  ws.eachRow((row) => { const a = row.getCell(1).value; if (a && String(a).trim() && String(a).trim() !== 'Price') items.push(String(a).trim()); });
  const choose = items.filter((x) => !isMust(x) && !(cfg.exclude && cfg.exclude.test(x)));
  const colours = choose.map((raw) => {
    const image = resolveImage(raw);
    const listPrice = resolvePrice(raw);
    if (!image) unmatched.push(`${ws.name}: ${raw}`);
    return { name: displayName(raw), sku: raw, code: codeOf(raw) || null, image: image || null, imageB: bOf(image), imageC: cOf(image), listPrice: listPrice ?? null, family: familyOf(image), description: describe(raw) };
  });
  const included = [
    ...MUST.map((m) => ({ name: m, image: MUSTHAVE_IMAGE[m] || resolveImage(m), description: describe(m), listPrice: resolvePrice(m) ?? null })),
    { name: FREE_GIFT, image: resolveImage('All In One Liquid 100ml -HTF') || resolveImage('All In One Liquid 200ml -HTF'), description: describe(FREE_GIFT), free: true, listPrice: null },
  ];
  const matchesGroup = (g, c) => (g.pathMatch && c.image && g.pathMatch.test(c.image)) || (g.match && (new RegExp(g.match, 'i').test(c.name) || new RegExp(g.match, 'i').test(c.sku)));
  const groups = (cfg.groups || []).map((g) => ({
    key: g.key,
    label: g.label,
    choose: g.choose || 1,
    colours: colours.filter((c) => matchesGroup(g, c)),
  }));
  // In grouped kits, any colour not in a choice group is a fixed included product
  // (shown in the yellow "included" panel).
  if (groups.length) {
    const grouped = new Set(groups.flatMap((g) => g.colours.map((c) => c.sku)));
    for (const c of colours) {
      if (!grouped.has(c.sku)) included.push({ name: c.name, image: c.image, description: c.description || '', listPrice: c.listPrice ?? null });
    }
  }
  // Retail value: what the same contents would cost bought individually at website
  // prices (fixed included items + the colour slots priced at the kit's average).
  const avgPrice = (arr) => { const v = arr.map((c) => Number(c.listPrice)).filter(Number.isFinite); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0; };
  const includedRetail = included.reduce((s, i) => s + (i.free ? 0 : (Number(i.listPrice) || 0)), 0);
  let coloursRetail = 0;
  if (groups.length) { for (const g of groups) coloursRetail += g.choose * avgPrice(g.colours); }
  else if (cfg.choose > 0) { coloursRetail = cfg.choose * avgPrice(colours); }
  else { coloursRetail = colours.reduce((s, c) => s + (Number(c.listPrice) || 0), 0); }
  const retailValue = Number((includedRetail + coloursRetail).toFixed(2));
  // All kits are priced at a uniform 5% saving vs buying the items individually
  // (rounded to the nearest €0.05 for a tidy price point).
  const round05 = (x) => Number((Math.round(x / 0.05) * 0.05).toFixed(2));
  const price = round05(retailValue * 0.95);
  const savings = Number((retailValue - price).toFixed(2));
  const savingsPct = retailValue > 0 ? Math.round((savings / retailValue) * 100) : 0;
  kits.push({
    id: cfg.id,
    name: cfg.name,
    price,
    retailValue,
    savings,
    savingsPct,
    choose: cfg.choose,
    chooseLabel: cfg.chooseLabel,
    mustHaves: MUST.slice(),
    freeGift: FREE_GIFT,
    included,
    guides: buildGuides(cfg.infoKeys || []),
    groups,
    // Cover image: drop a file at /gelitup-media/starter-kits/<id>.webp (or .jpg) to
    // override. If missing, the UI falls back to the first colour image below.
    coverImage: `/gelitup-media/starter-kits/${cfg.id}.webp`,
    colours,
  });
}

// Attach a wider "add more" colour range where configured (e.g. the Beginner kit
// draws extras from the full Gel Polish range, excluding its own included colours).
for (const [, cfg] of Object.entries(KIT_CONFIG)) {
  if (!cfg.extraFrom) continue;
  const kit = kits.find((k) => k.id === cfg.id);
  const source = kits.find((k) => k.id === cfg.extraFrom);
  if (!kit || !source) continue;
  const own = new Set(kit.colours.map((c) => c.sku));
  kit.extraColours = source.colours.filter((c) => !own.has(c.sku));
}

const payload = {
  _meta: { generated: new Date().toISOString(), source: XLSX, note: 'Data-driven kit config. Regenerate with: node scripts/generate-starter-kits.mjs' },
  shipping: { note: 'Flat shipping added at checkout by delivery zone.', zone23: 15, zone456: 22, excluded: ['Italy', 'Bulgaria'] },
  addOns: ADD_ONS.map((a) => {
    const image = resolveImage(a.name);
    const listPrice = resolvePrice(a.name);
    return { name: a.label || displayName(a.name), sku: a.name, code: codeOf(a.name) || null, image: image || null, listPrice: listPrice ?? null, blurb: a.blurb || '' };
  }).filter((a) => a.image && a.listPrice != null),
  kits,
};
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`Wrote ${OUT} — ${kits.length} kits, ${kits.reduce((s, k) => s + k.colours.length, 0)} colours.`);
if (unmatched.length) { console.log(`\n${unmatched.length} colours with no image (will need manual mapping):`); unmatched.forEach((u) => console.log('  ', u)); }

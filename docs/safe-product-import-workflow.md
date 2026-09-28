# Safe Product Import Workflow

This project must treat the live B2B catalogue as the source of truth for pricing. Do not replace the current catalogue with a fresh CSV export unless you intentionally want to overwrite existing price logic.

## 1) Use the correct file for incremental additions

Use:

- `products_export_1.csv` or a similar Shopify export when you only need to add missing products
- `src/data/productAliases.generated.js` for alias logic generated from checked data

Do not use a full export as a blind replacement for:

- `public/gelitup-content/b2b-price-list.json`
- the live portal catalogue state

The safe rule is:

- add only missing products
- preserve all existing prices already approved in the portal
- do not regenerate the entire price list from scratch unless the task explicitly says to reset pricing

## 2) The script that preserves existing prices

The project already includes the safe sync flow in:

- `scripts/sync-shopify-prices-and-aliases.mjs`

That script intentionally filters out:

- products marked discontinued in `public/gelitup-content/product-status.csv`
- products listed in `public/gelitup-content/hidden-products.json`
- duplicate bare-code entries that are already covered by a fuller product name

This is the protection layer that prevents accidental catalogue pollution.

## 3) Required pre-flight checks before importing new products

Before importing any CSV rows:

1. Check `public/gelitup-content/product-status.csv` for discontinued products.
2. Check `public/gelitup-content/hidden-products.json` for hidden items.
3. Check whether a product is a bare code duplicate like `2B`, `2037`, or `GIUP 2B` that matches a fuller named product.
4. Confirm the product is genuinely new and not already present in the live list.

If a product is already in the live catalogue, do not re-import it just because it appears in a CSV export.

## 4) New product image requirement

New products must also have:

- an image file under `public/gelitup-content/product-images/...`
- an entry in `public/gelitup-content/product-image-map.json`
- a size entry in `public/gelitup-content/product-sizes.json`

Without a valid image mapping and size metadata, the generated product manifest will fail or hide the item in the app.

## 5) Import workflow to follow

Recommended sequence:

1. prepare the CSV with only the truly new product rows
2. confirm those rows are not discontinued or hidden
3. run the sync script
4. review the generated diff to ensure existing prices remain untouched
5. add any missing image files and map them
6. add any missing size metadata
7. regenerate the product manifest if required
8. run the catalogue validation guardrails

## 6) Validation command

Run:

```bash
npm run guardrails:catalogue
```

This confirms the catalogue still satisfies the project invariants before shipping.

## 7) Important rule for this project

The rule for this repo is:

- the CSV import is for adding missing products
- the price list is not a reset sheet
- existing portal pricing must be preserved
- only new, valid, non-discontinued rows should be merged

## 8) Example of the correct mindset

When a user says “I want to add new colours for 2617–2630”:

- first confirm they are not already present
- confirm they are not discontinued/duplicate
- add their image files and mappings
- insert their size metadata
- merge only the valid new rows
- do not overwrite the rest of the B2B price list

This keeps the live portal stable while allowing new stock to appear without damaging existing pricing data.

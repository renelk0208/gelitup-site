# Agent Guardrails

These rules are mandatory for all automated edits in this repository.

## Sensitive Files (require explicit user approval before editing)
- src/App.jsx
- public/gelitup-content/product-image-map.json
- public/gelitup-content/b2b-price-list.json
- public/gelitup-content/catalog-order.json
- public/gelitup-content/out-of-stock.json

## Safety Rules
- Do not change category remapping, price fallback, or product grouping logic unless the user explicitly requests that exact change.
- Before editing any sensitive file, list the intended file changes and wait for explicit confirmation.
- Never run broad staging commands like `git add -A` unless the user explicitly asks to include all changes.
- Prefer file-scoped commits (stage only intended files).
- If unrelated files become modified unexpectedly, stop and ask the user how to proceed.

## Required Validation After Sensitive Changes
- Run: npm run guardrails:catalogue
- If check fails, do not proceed with commit/push until resolved or user approves override.

## Commit Hygiene
- Keep commit messages specific to the user request.
- Avoid bundling diagnostics/report artifacts with product logic changes unless requested.

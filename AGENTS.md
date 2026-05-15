# Agent Guardrails

These rules are mandatory for all automated edits in this repository.

## Core Rule — Changes Only On Explicit Instruction
- **Do not edit, create, or delete any file unless the user explicitly requests that specific change.**
- Do not make "improvements", refactors, or cleanup beyond exactly what was asked.
- Do not touch files adjacent to the requested file unless directly required.
- Do not auto-commit or auto-push unless the user explicitly says "commit" or "push".
- Before making any edit, state which files will be changed and what exactly will change. Wait for confirmation if unclear.

## Sensitive Files (require explicit user approval before editing)
- src/App.jsx
- public/gelitup-content/product-image-map.json
- public/gelitup-content/b2b-price-list.json
- public/gelitup-content/catalog-order.json
- public/gelitup-content/out-of-stock.json

For sensitive files: list every intended change with file path and a one-line summary, then wait for explicit "yes / go ahead" before proceeding.

## Safety Rules
- Do not change category remapping, price fallback, or product grouping logic unless the user explicitly requests that exact change.
- Never run broad staging commands like `git add -A` unless the user explicitly asks to include all changes.
- Prefer file-scoped commits (stage only intended files).
- If unrelated files become modified unexpectedly, stop and ask the user how to proceed.
- Do not revert or overwrite previous changes when fixing something new — check git diff before editing.

## Required Validation After Sensitive Changes
- Run: npm run guardrails:catalogue
- If check fails, do not proceed with commit/push until resolved or user approves override.

## Commit Hygiene
- Keep commit messages specific to the user request.
- Avoid bundling diagnostics/report artifacts with product logic changes unless requested.
- Never amend published commits or force-push without explicit user approval.

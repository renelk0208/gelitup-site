#!/usr/bin/env python3
"""
manage-pods.py
==============
Manage the contents of any pod in package-pods.json.

Run from public/gelitup-content/

  python manage-pods.py list                      # list all pods + item counts
  python manage-pods.py show pod_1                # show all items in pod_1
  python manage-pods.py show pod_seasonal         # show seasonal pod

  python manage-pods.py add pod_seasonal 2113S    # add colour code 2113S to pod
  python manage-pods.py add pod_seasonal 2113S "My Custom Name" --category Flash

  python manage-pods.py remove pod_seasonal 2113S  # remove by code
  python manage-pods.py remove pod_seasonal 3       # remove by list position

  python manage-pods.py move pod_seasonal pod_1 2113S  # move item between pods

  python manage-pods.py search "pistachio"         # search price list by name/code

  python manage-pods.py clear pod_seasonal --confirm  # wipe a pod entirely

Changes are written directly to package-pods.json (a backup is saved as package-pods.json.bak).
"""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

PODS_FILE       = Path("package-pods.json")
PRICE_LIST_FILE = Path("b2b-price-list.json")
BACKUP_FILE     = Path("package-pods.json.bak")

ALL_PODS = ('pod_1', 'pod_2', 'pod_3', 'pod_4', 'pod_seasonal')

TECHNICAL_KEYWORDS = re.compile(
    r'top coat|base coat|base \d|superior base|superbond|builder gel|'
    r'brush on builder|3-in-1 builder|premium builder|crystal clear builder|'
    r'cool care|premium plus|shimmery builder|polygel|synthogel|syntholiquid|'
    r'multimix|cleanser|nail dehydrator|wipe off|satin matt|aurora flakes|'
    r'non wipe|shimmer top fairy',
    re.IGNORECASE
)

# ── Helpers ──────────────────────────────────────────────────────────────────

def load_pods() -> dict:
    if not PODS_FILE.exists():
        sys.exit(f"ERROR: {PODS_FILE} not found. Run from public/gelitup-content/")
    with open(PODS_FILE, encoding='utf-8') as f:
        return json.load(f)


def save_pods(data: dict) -> None:
    if PODS_FILE.exists():
        shutil.copy2(PODS_FILE, BACKUP_FILE)
    with open(PODS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  OK Saved -> {PODS_FILE}  (backup: {BACKUP_FILE})")


def load_price_list() -> list[dict]:
    if not PRICE_LIST_FILE.exists():
        sys.exit(f"ERROR: {PRICE_LIST_FILE} not found.")
    with open(PRICE_LIST_FILE, encoding='utf-8') as f:
        return json.load(f)['items']


def normalise_code(raw: str) -> str:
    """Strip GIUP-COL- prefix if present."""
    return re.sub(r'^GIUP-COL-', '', raw.strip(), flags=re.IGNORECASE)


def find_in_price_list(price_list: list[dict], query: str) -> list[dict]:
    """Return price list items whose name or derived code contains query."""
    q = query.lower()
    results = []
    for item in price_list:
        name = item.get('name', '')
        clean = re.sub(r'\s*-HTF\s*$', '', name).strip()
        code = clean.split()[0] if clean.split() else ''
        if q in clean.lower() or q == code.lower():
            results.append({**item, '_clean': clean, '_code': code})
    return results


def parse_price_list_entry(item: dict) -> dict:
    """Turn a raw price list item into a pod entry dict."""
    clean = re.sub(r'\s*-HTF\s*$', '', item.get('name', '')).strip()
    m = re.match(r'^([A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*)\s+(.+)$', clean)
    if m:
        code = m.group(1)
        name = m.group(2).strip()
    else:
        code = clean.split()[0] if clean.split() else clean
        name = clean
    return {
        'sku':  f'GIUP-COL-{code}',
        'code': code,
        'name': name,
    }


def pod_contains(pod: list, code: str) -> bool:
    code = normalise_code(code)
    return any(normalise_code(x.get('code', '')) == code for x in pod)


def find_in_pod(pod: list, code: str) -> int | None:
    code = normalise_code(code)
    for i, item in enumerate(pod):
        if normalise_code(item.get('code', '')) == code:
            return i
    return None


# ── Commands ─────────────────────────────────────────────────────────────────

def cmd_list(args) -> None:
    data = load_pods()
    print()
    total = 0
    for pod_name in ALL_PODS:
        pod = data.get(pod_name, [])
        total += len(pod)
        status = f"{len(pod):>4} items"
        note = ""
        if pod_name == 'pod_seasonal' and data.get('_meta_seasonal'):
            note = f"  [{data['_meta_seasonal'].get('season','')}]"
        print(f"  {pod_name:<14} {status}{note}")
    print(f"  {'-'*28}")
    print(f"  {'TOTAL':<14} {total:>4} items")
    print()


def cmd_show(args) -> None:
    pod_name = args.pod
    data = load_pods()
    pod = data.get(pod_name, [])
    if not pod:
        print(f"\n  {pod_name} is empty or does not exist.\n")
        return

    print(f"  {pod_name} - {len(pod)} items\n")
    # Group by category
    by_cat: dict[str, list] = {}
    for item in pod:
        cat = item.get('category', '—')
        by_cat.setdefault(cat, []).append(item)

    idx = 1
    for cat in sorted(by_cat):
        print(f"  -- {cat}")
        for item in by_cat[cat]:
            print(f"    {idx:>3}. {item.get('code',''):<14} {item.get('name','')}")
            idx += 1
    print()


def cmd_search(args) -> None:
    price_list = load_price_list()
    results = find_in_price_list(price_list, args.query)
    if not results:
        print(f"\n  No results for {args.query!r}\n")
        return

    # Show which pods each result already belongs to
    data = load_pods()
    print(f"\n  Search results for {args.query!r}:\n")
    print(f"  {'#':<4} {'Code':<14} {'Name':<40} {'Price':>9}  {'In pods'}")
    print(f"  {'-'*4} {'-'*14} {'-'*40} {'-'*9}  {'-'*20}")
    for i, item in enumerate(results[:40], 1):
        code = item['_code']
        in_pods = [p for p in ALL_PODS if pod_contains(data.get(p, []), code)]
        print(
            f"  {i:<4} {code:<14} {item['_clean'][:40]:<40} "
            f"EUR{item.get('price',0):>5.2f}  {', '.join(in_pods) or '-'}"
        )
    if len(results) > 40:
        print(f"\n  … {len(results)-40} more results. Narrow your search.")
    print()


def cmd_add(args) -> None:
    pod_name = args.pod
    code     = normalise_code(args.code)
    data     = load_pods()
    pod      = data.setdefault(pod_name, [])

    if pod_contains(pod, code):
        print(f"\n  X {code} is already in {pod_name}.\n")
        return

    # Try to resolve from price list
    price_list = load_price_list()
    matches    = find_in_price_list(price_list, code)

    if matches:
        entry = parse_price_list_entry(matches[0])
    else:
        # Not in price list — use supplied name or prompt
        name = args.name or input(f"  Name for {code} (not found in price list): ").strip()
        entry = {'sku': f'GIUP-COL-{code}', 'code': code, 'name': name}

    entry['category'] = args.category or entry.get('category', 'Trends')
    entry['group']    = pod_name.replace('_', ' ').title().replace(' ', '_')

    # If multiple price-list matches, let user pick
    if len(matches) > 1:
        print(f"\n  Multiple matches for {code!r}:")
        for i, m in enumerate(matches[:10], 1):
            print(f"    {i}. {m['_clean']}")
        try:
            choice = input("  Pick number (or ENTER for first): ").strip()
            if choice.isdigit():
                entry = parse_price_list_entry(matches[int(choice) - 1])
                entry['category'] = args.category or 'Trends'
                entry['group']    = pod_name.replace('_', ' ').title().replace(' ', '_')
        except (KeyboardInterrupt, EOFError):
            print("\n  Cancelled.\n")
            return

    pod.append(entry)
    print(f"\n  + Added  {entry['code']:<14} {entry['name']}  ->  {pod_name}  (total: {len(pod)})")
    save_pods(data)
    print()


def cmd_remove(args) -> None:
    pod_name = args.pod
    ref      = args.code_or_position
    data     = load_pods()
    pod      = data.get(pod_name, [])

    if not pod:
        print(f"\n  {pod_name} is empty.\n")
        return

    # Numeric position (1-based)
    if ref.isdigit():
        idx = int(ref) - 1
        if idx < 0 or idx >= len(pod):
            print(f"\n  X Position {ref} is out of range (1-{len(pod)}).\n")
            return
        removed = pod.pop(idx)
    else:
        idx = find_in_pod(pod, ref)
        if idx is None:
            print(f"\n  X Code {ref!r} not found in {pod_name}.\n")
            return
        removed = pod.pop(idx)

    data[pod_name] = pod
    print(f"\n  - Removed  {removed.get('code',''):<14} {removed.get('name','')}  from  {pod_name}  (remaining: {len(pod)})")
    save_pods(data)
    print()


def cmd_move(args) -> None:
    src  = args.src_pod
    dst  = args.dst_pod
    code = normalise_code(args.code)
    data = load_pods()

    src_pod = data.get(src, [])
    idx     = find_in_pod(src_pod, code)
    if idx is None:
        print(f"\n  X Code {code!r} not found in {src}.\n")
        return

    dst_pod = data.setdefault(dst, [])
    if pod_contains(dst_pod, code):
        print(f"\n  X {code} is already in {dst}.\n")
        return

    item         = src_pod.pop(idx)
    item['group'] = dst.replace('_', ' ').title().replace(' ', '_')
    dst_pod.append(item)
    data[src] = src_pod
    data[dst] = dst_pod

    print(f"\n  >> Moved  {item.get('code',''):<14} {item.get('name','')}  {src} -> {dst}")
    save_pods(data)
    print()


def cmd_clear(args) -> None:
    pod_name = args.pod
    if not args.confirm:
        print(f"\n  Add --confirm to wipe {pod_name}. This cannot be undone (except via the backup).\n")
        return
    data = load_pods()
    n    = len(data.get(pod_name, []))
    data[pod_name] = []
    print(f"\n  X Cleared {n} items from {pod_name}.")
    save_pods(data)
    print()


# ── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        prog='manage-pods',
        description='GEL.IT.UP — Manage distributor package pod contents.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python manage-pods.py list
  python manage-pods.py show pod_seasonal
  python manage-pods.py search "pistachio"
  python manage-pods.py add pod_seasonal 2113S
  python manage-pods.py remove pod_seasonal 2113S
  python manage-pods.py remove pod_seasonal 12
  python manage-pods.py move pod_seasonal pod_1 2113S
  python manage-pods.py clear pod_seasonal --confirm
""",
    )
    sub = parser.add_subparsers(dest='command', required=True)

    # list
    sub.add_parser('list', help='List all pods and item counts')

    # show
    p_show = sub.add_parser('show', help='Show items in a pod')
    p_show.add_argument('pod', choices=ALL_PODS)

    # search
    p_search = sub.add_parser('search', help='Search price list by name or code')
    p_search.add_argument('query')

    # add
    p_add = sub.add_parser('add', help='Add a colour to a pod')
    p_add.add_argument('pod', choices=ALL_PODS)
    p_add.add_argument('code', help='Colour code, e.g. 2113S or GCE01')
    p_add.add_argument('name', nargs='?', default=None, help='Override name (optional)')
    p_add.add_argument('--category', default=None, help='Override category (optional)')

    # remove
    p_remove = sub.add_parser('remove', help='Remove a colour from a pod')
    p_remove.add_argument('pod', choices=ALL_PODS)
    p_remove.add_argument('code_or_position', help='Colour code or list position number')

    # move
    p_move = sub.add_parser('move', help='Move a colour from one pod to another')
    p_move.add_argument('src_pod', choices=ALL_PODS)
    p_move.add_argument('dst_pod', choices=ALL_PODS)
    p_move.add_argument('code')

    # clear
    p_clear = sub.add_parser('clear', help='Remove all items from a pod')
    p_clear.add_argument('pod', choices=ALL_PODS)
    p_clear.add_argument('--confirm', action='store_true')

    args = parser.parse_args()

    dispatch = {
        'list':   cmd_list,
        'show':   cmd_show,
        'search': cmd_search,
        'add':    cmd_add,
        'remove': cmd_remove,
        'move':   cmd_move,
        'clear':  cmd_clear,
    }
    dispatch[args.command](args)


if __name__ == '__main__':
    main()


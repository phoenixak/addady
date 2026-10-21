#!/usr/bin/env sh
# Fails if any private term (SANITIZE.md) appears in the repo.
# The list is never stored in this repo:
#   CI:    PRIVATE_TERMS secret (newline-separated)
#   local: PRIVATE_TERMS_FILE=<path outside the repo>
set -eu

terms=$(mktemp)
trap 'rm -f "$terms"' EXIT

if [ -n "${PRIVATE_TERMS:-}" ]; then
  printf '%s\n' "$PRIVATE_TERMS" > "$terms"
elif [ -n "${PRIVATE_TERMS_FILE:-}" ] && [ -f "$PRIVATE_TERMS_FILE" ]; then
  cat "$PRIVATE_TERMS_FILE" > "$terms"
else
  echo "check-private-terms: set PRIVATE_TERMS or PRIVATE_TERMS_FILE" >&2
  exit 2
fi

# Drop blank lines and comments, so an empty line can't match everything.
grep -v -e '^[[:space:]]*$' -e '^[[:space:]]*#' "$terms" > "$terms.clean" || true
mv "$terms.clean" "$terms"
if [ ! -s "$terms" ]; then
  echo "check-private-terms: term list is empty" >&2
  exit 2
fi

# -l prints file names only, never the matched term.
if grep -rliF -f "$terms" \
  --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.expo \
  --exclude-dir=android --exclude-dir=ios --exclude-dir=coverage --exclude-dir=dist \
  --exclude-dir=release \
  --exclude='*.ttf' --exclude='*.png' . ; then
  echo "private term found in the files above" >&2
  exit 1
fi
echo "check-private-terms: clean"

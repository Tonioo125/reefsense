#!/usr/bin/env bash
# Commit and push data files refreshed by .github/workflows/data-sync.yml.
# usage: commit-data.sh "<commit message>" <path>...
# Missing paths are ignored; nothing is committed when no listed file changed.
set -euo pipefail

message="$1"
shift

for path in "$@"; do
  if [ -e "$path" ]; then
    git add -- "$path"
  else
    echo "skipping missing $path"
  fi
done

if git diff --cached --quiet; then
  echo "No data changes to commit."
  exit 0
fi

bot=(-c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com")
git "${bot[@]}" commit -m "$message"
# The other job of the same run (or a manual run) may have pushed first.
git "${bot[@]}" pull --rebase origin "$GITHUB_REF_NAME"
git push origin "HEAD:$GITHUB_REF_NAME"

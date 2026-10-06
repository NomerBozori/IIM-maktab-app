#!/usr/bin/env bash
# ============================================================
#  GitHubga yuklash yordamchisi
#  Ishlatish:
#     ./githubga-yukla.sh <repo-url> [branch]
#  Misol:
#     ./githubga-yukla.sh https://github.com/ismingiz/intellekt-maktabi.git
# ============================================================
set -euo pipefail

REPO_URL="${1:-}"
BRANCH="${2:-main}"

if [ -z "$REPO_URL" ]; then
  echo "❌ Repo URL manzilini kiriting."
  echo "   Ishlatish: ./githubga-yukla.sh https://github.com/<username>/<repo>.git"
  exit 1
fi

cd "$(dirname "$0")"

echo "==> 1/4 Repo holatini tekshirish"
if [ ! -d .git ]; then
  echo "    git init qilinmoqda..."
  git init -q
  git checkout -q -b "$BRANCH" 2>/dev/null || git symbolic-ref HEAD refs/heads/"$BRANCH"
fi

echo "==> 2/4 O'zgarishlarni qo'shish"
git add -A

if git diff --cached --quiet; then
  echo "    O'zgarish yo'q — commit qilinmaydi."
else
  git -c user.name="${GIT_NAME:-Intellekt Maktabi}" \
      -c user.email="${GIT_EMAIL:-intellekt@maktabi.uz}" \
      commit -q -m "Intellekt Innovatsion Maktabi — maktab boshqaruv tizimi"
  echo "    Commit qilindi."
fi

echo "==> 3/4 Remote ulanmasini sozlash"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi
echo "    origin -> $REPO_URL"

echo "==> 4/4 GitHubga yuklash"
git push -u origin "$BRANCH"

echo ""
echo "✅ Tayyor! Repo yuklandi:"
echo "   $REPO_URL"

#!/usr/bin/env sh
# Opens wizardle.html in your default browser.
# Usage:  ./play.sh
set -e

DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
GAME="$DIR/wizardle.html"

if [ ! -f "$GAME" ]; then
  echo "Can't find wizardle.html next to this script (looked in $DIR)." >&2
  exit 1
fi

# Pick whichever opener this machine actually has.
if command -v open >/dev/null 2>&1; then
  open "$GAME"                      # macOS
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$GAME"                  # most Linux desktops
elif command -v wslview >/dev/null 2>&1; then
  wslview "$GAME"                   # WSL
elif command -v powershell.exe >/dev/null 2>&1; then
  powershell.exe -c "Start-Process '$GAME'"   # Git Bash on Windows
else
  echo "No browser opener found. Open this file yourself:" >&2
  echo "  $GAME" >&2
  exit 1
fi

echo "Wizardle is open in your browser."

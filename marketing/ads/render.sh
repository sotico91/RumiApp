#!/usr/bin/env bash
# Renders every ad (or the ids passed as arguments) to out/<id>.mp4, 1080x1920.
set -euo pipefail
cd "$(dirname "$0")"
ids=("$@")
[[ ${#ids[@]} -gt 0 ]] || ids=(anota-es pregunta-es hormiga-es todo-es billeteras-es privacidad-es rumi-habla-es)
for id in "${ids[@]}"; do
  npx remotion render src/index.ts "$id" "out/$id.mp4" --codec h264 --log error
done

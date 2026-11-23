#!/usr/bin/env bash
# Renders every ad (or the ids passed as arguments) to out/<id>.mp4, 1080x1920.
set -euo pipefail
cd "$(dirname "$0")"
ids=("$@")
[[ ${#ids[@]} -gt 0 ]] || ids=(anota-es pregunta-es hormiga-es todo-es billeteras-es privacidad-es rumi-habla-es rumi-recuerda-es rumi-pruebame-es rumi-lanzamiento-es rumi-habla-play-es rumi-recuerda-play-es rumi-tintos-es rumi-quincena-es rumi-alcanza-es rumi-banco-es rumi-prima-es rumi-reto-enero-es rumi-metas-es rumi-iphone-es rumi-dictar-es rumi-deudas-es rumi-excel-es rumi-diapago-es rumi-coffee-en rumi-coffee-15-en rumi-nobank-en rumi-afford-en rumi-where-money-en rumi-small-spends-en rumi-card-en rumi-bills-en rumi-january-en rumi-goal-en rumi-tarjeta-es rumi-recibo-es rumi-enero-es rumi-meta-es)
for id in "${ids[@]}"; do
  npx remotion render src/index.ts "$id" "out/$id.mp4" --codec h264 --log error
done

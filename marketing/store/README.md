# Capturas para las tiendas

- `ios/` — App Store, iPhone 6.9" (1320×2868), tomadas en el simulador iPhone 17 Pro Max en español con los datos de demo de `../flows/seed.yaml`, `rec-todo.yaml` y `rec-billeteras.yaml`, más topes en Mercado, Café, Domicilio y Almuerzo. Barra de estado a las 9:41 (`xcrun simctl status_bar … override`).
- `ios-en/` — lo mismo en inglés y **dólares**: simulador en en-US, cuenta nueva con USD (`../flows/seed-en.yaml`: $2,450.75 en el banco y gastos con centavos), más un salario de $3,200, un crédito "Car loan" ($3,800, cuota $389 pagada) y topes en Groceries, Coffee, Delivery y Lunch.
- `ios-es-usd/` — en **español y dólares**, para quien está en EE. UU. con el teléfono en español (ficha es-US de Play). Simulador iPhone 17 Pro Max en es-US: `../flows/seed-es-usd.yaml`, luego `seed-es-usd-extra.yaml` (salario de $3,200, préstamo del carro de $3,800 con la cuota de $389 pagada, topes en Café, Domicilio y Mercado) y `shots-es-usd.yaml`, que toma las 6 capturas (se copian de `~/.maestro/tests/<run>/shots-es-usd/takeScreenshot/`). `play-es-usd/` y `play-feature-es-usd.png` son sus versiones para Play (`play-esus-*` y `play-feature-esus` en `StoreShot.tsx`).
- `ios-6.3/` e `ios-en-6.3/` — las mismas en 1206×2622 JPG sin transparencia, el tamaño que App Store Connect pide ahora primero (iPhone con Dynamic Island, pantalla mediana). Se sacan de `ios/` con `sips -z 2622 1206` y `sips -s format jpeg`.
- `play/` y `play-en/` — Google Play, teléfono (1080×1920): cada captura con un título encima. Los textos están en `../ads/src/StoreShot.tsx`.

Volver a generar las de Play después de cambiar una captura o un texto:

```sh
cd marketing/ads
for id in $(grep -oE "'play-[a-z0-9-]+'" src/StoreShot.tsx | tr -d "'"); do
  case $id in play-en-*) out=../store/play-en/${id#play-en-}.png;; *) out=../store/play/${id#play-}.png;; esac
  npx remotion still src/index.ts $id $out --public-dir ../store
done
```

- `play-feature-es.png` / `play-feature-en.png` — gráfico destacado de Play (1024×500): ícono, nombre, lema y la parte de arriba de Inicio (`FeatureGraphic` en `../ads/src/StoreShot.tsx`, usa `icon.png` de esta carpeta). Se generan con el mismo bucle cambiando el patrón a `'play-feature-[a-z]+'` y la salida a `../store/$id.png`.

No hacen falta las de iPad: `supportsTablet` está apagado.

## Video (vista previa de la App Store, en inglés y dólares)

- `preview-en.mp4`: 29,8 s, 886×1920, H.264 + AAC estéreo (Apple pide 15–30 s, solo imágenes de la app; los títulos encima están permitidos). Escenas: Inicio, anotar un gasto, el mosaico "Where your money goes" y Pregúntale a Rumi.
- Se graba en el simulador iPhone 17 Pro Max en en-US después de `../flows/seed-en.yaml`: `../flows/preview-en/record.sh <id del simulador> <carpeta>` graba las 4 escenas (cada una arranca con unos 20–30 s de calentamiento de Maestro). Los clips van, convertidos a 744 px de ancho, a `../ads/public/clips/preview-en/` (no se suben a git) y los segundos usados están en `appPreviews` de `../ads/src/AppPreview.tsx`.
- Render: `cd marketing/ads && npx remotion render src/index.ts preview-en out/preview-en.mp4 --codec h264 --enforce-audio-track --audio-codec aac`.
- App Store: se sube con la próxima versión enviada a revisión (en-US y los ingleses nuevos). Google Play solo acepta un enlace de YouTube: hay que subirlo a un canal y pegar la URL en la ficha.


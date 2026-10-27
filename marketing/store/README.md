# Capturas para las tiendas

- `ios/` — App Store, iPhone 6.9" (1320×2868), tomadas en el simulador iPhone 17 Pro Max en español con los datos de demo de `../flows/seed.yaml`, `rec-todo.yaml` y `rec-billeteras.yaml`, más topes en Mercado, Café, Domicilio y Almuerzo. Barra de estado a las 9:41 (`xcrun simctl status_bar … override`).
- `ios-en/` — lo mismo en inglés y **dólares**: simulador en en-US, cuenta nueva con USD (`../flows/seed-en.yaml`: $2,450.75 en el banco y gastos con centavos), más un salario de $3,200, un crédito "Car loan" ($3,800, cuota $389 pagada) y topes en Groceries, Coffee, Delivery y Lunch.
- `play/` y `play-en/` — Google Play, teléfono (1080×1920): cada captura con un título encima. Los textos están en `../ads/src/StoreShot.tsx`.

Volver a generar las de Play después de cambiar una captura o un texto:

```sh
cd marketing/ads
for id in $(grep -oE "'play-[a-z0-9-]+'" src/StoreShot.tsx | tr -d "'"); do
  case $id in play-en-*) out=../store/play-en/${id#play-en-}.png;; *) out=../store/play/${id#play-}.png;; esac
  npx remotion still src/index.ts $id $out --public-dir ../store
done
```

Faltan: gráfico destacado de Play (1024×500) y, si se mantiene `supportsTablet`, las de iPad 13".

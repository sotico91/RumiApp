# Capturas para las tiendas

- `ios/` — App Store, iPhone 6.9" (1320×2868), tomadas en el simulador iPhone 17 Pro Max en español con los datos de demo de `../flows/seed.yaml`, `rec-todo.yaml` y `rec-billeteras.yaml`, más topes en Mercado, Café, Domicilio y Almuerzo. Barra de estado a las 9:41 (`xcrun simctl status_bar … override`).
- `play/` — Google Play, teléfono (1080×1920): cada captura de `ios/` con un título encima. Los textos están en `../ads/src/StoreShot.tsx`.

Volver a generar las de Play después de cambiar una captura o un texto:

```sh
cd marketing/ads
for id in play-1-inicio play-2-agregar play-3-plan play-4-pregunta play-5-patrimonio play-6-actividad; do
  npx remotion still src/index.ts $id ../store/play/${id#play-}.png --public-dir ../store/ios
done
```

Faltan: gráfico destacado de Play (1024×500), capturas en inglés y, si se mantiene `supportsTablet`, las de iPad 13".

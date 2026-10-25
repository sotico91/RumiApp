# Anuncios de Rumi

Videos verticales (1080x1920, 15 s aprox.) hechos con [Remotion](https://remotion.dev) a partir de grabaciones reales de la app.

1. `npm install`
2. `./record.sh` graba las escenas en el simulador de iOS encendido (con la app instalada y en español). **Borra los datos de la app en ese simulador** y carga datos de demo (`../flows/seed.yaml`). `SCENES="ask"` graba solo una; `SKIP_SEED=1` no recarga los datos.
3. `npm run studio` para ver y ajustar; `npm run render` deja los videos en `out/`.

**Sonido:** música de fondo y efectos (toques con el click de la app, tecleo, cambio de texto, guardado, cierre) sintetizados por `python3 sound/make_sounds.py` en `public/music/` y `public/sfx/`; no hay audio con licencia de terceros.

Textos, tramos de la grabación y momentos de cada sonido: `src/ads.ts` (en segundos de la grabación). Diseño: `src/Ad.tsx`, con los colores y fuentes de la app (`src/brand.ts`).

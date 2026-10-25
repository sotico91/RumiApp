# Anuncios de Rumi

Videos verticales (1080x1920, 15 s aprox.) hechos con [Remotion](https://remotion.dev) a partir de grabaciones reales de la app.

1. `npm install` y `./sound/fetch.sh`
2. `./record.sh` graba las escenas en el simulador de iOS encendido (con la app instalada y en español). **Borra los datos de la app en ese simulador** y carga datos de demo (`../flows/seed.yaml`). `SCENES="ask"` graba solo una; `SKIP_SEED=1` no recarga los datos.
3. `npm run studio` para ver y ajustar; `npm run render` deja los videos en `out/`.

**Sonido:** música y efectos de [Mixkit](https://mixkit.co) (licencia gratuita de Mixkit: permite anuncios en línea, sin atribución obligatoria; no se pueden redistribuir sueltos, por eso no están en git). `./sound/fetch.sh` los descarga en `public/music/` y `public/sfx/`.

| Archivo | Pista | Autor |
|---|---|---|
| `happy-times.mp3` | Happy Times | Alejandro Magaña (A. M.) |
| `im-fine.mp3` | I'm Fine | Michael Ramir C. |
| `pop-track-03.mp3` | Pop Track 03 | Lily J |
| `its-a-cool-thing.mp3` | It's A Cool Thing | Michael Ramir C. |

Efectos: Select click, Smartphone typing, Explainer video pops whoosh light pop, Fast whoosh transition, Confirmation tone, Bubble pop up alert notification, Happy bells notification.

Textos, tramos de la grabación y momentos de cada sonido: `src/ads.ts` (en segundos de la grabación). Diseño: `src/Ad.tsx`, con los colores y fuentes de la app (`src/brand.ts`).

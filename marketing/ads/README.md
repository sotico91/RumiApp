# Anuncios de Rumi

Videos verticales (1080x1920, 15 s aprox.) hechos con [Remotion](https://remotion.dev) a partir de grabaciones reales de la app.

1. `npm install`, `./sound/fetch.sh` y `node --experimental-strip-types voice/make.ts` (voz)
2. `./record.sh` graba las escenas en el simulador de iOS encendido (con la app instalada y en español). **Borra los datos de la app en ese simulador** y carga datos de demo (`../flows/seed.yaml`). `SCENES="ask"` graba solo una; `SKIP_SEED=1` no recarga los datos. `privacidad` va al final porque empieza de cero (muestra el registro sin cuenta) y se graba con `../flows/rec-privacidad.sh`, que responde Face ID en el simulador entre las partes de Maestro.
3. `npm run studio` para ver y ajustar; `npm run render` deja los videos en `out/`.

**Sonido:** música y efectos de [Mixkit](https://mixkit.co) (licencia gratuita de Mixkit: permite anuncios en línea, sin atribución obligatoria; no se pueden redistribuir sueltos, por eso no están en git). `./sound/fetch.sh` los descarga en `public/music/` y `public/sfx/`.

**Voz:** cada paso lleva un `say` en `src/ads.ts`. `voice/make.ts` lo convierte en audio (`public/voice/`, fuera de git) con [edge-tts](https://github.com/rany2/edge-tts), voz `es-CO-SalomeNeural` un 8 % más lenta, y guarda en `src/voice.json` cuánto dura cada frase. Si la frase dura más que su parte de la grabación, el video se queda quieto en el último cuadro hasta que ella termina. edge-tts sirve de borrador: para pautar con dinero, usa la misma voz con Azure Speech (licencia comercial) o una locución grabada, guardando los archivos con los mismos nombres.

| Archivo | Pista | Autor |
|---|---|---|
| `happy-times.mp3` | Happy Times | Alejandro Magaña (A. M.) |
| `im-fine.mp3` | I'm Fine | Michael Ramir C. |
| `pop-track-03.mp3` | Pop Track 03 | Lily J |
| `its-a-cool-thing.mp3` | It's A Cool Thing | Michael Ramir C. |

Efectos: Select click, Smartphone typing, Explainer video pops whoosh light pop, Fast whoosh transition, Confirmation tone, Bubble pop up alert notification, Happy bells notification.

Textos, tramos de la grabación y momentos de cada sonido: `src/ads.ts` (en segundos de la grabación). Diseño: `src/Ad.tsx`, con los colores y fuentes de la app (`src/brand.ts`).

## Rumi habla (`rumi-habla-es`)

Animación sin grabación: el billete coral del icono como personaje que habla a cámara (parpadea, saluda y mueve la boca al ritmo de su voz) y presenta, escena por escena, anotar en segundos, topes al mes, gastos hormiga, Pregúntale a Rumi, el pronóstico de fin de mes y la privacidad. Textos y frases: `src/mascot-scenes.ts`; diseño: `src/Mascot.tsx`. `node --experimental-strip-types voice/mascot.ts` genera la voz y la apertura de la boca por cuadro (`src/mascot-voice.json`); `npm run render -- rumi-habla-es` → `out/rumi-habla-es.mp4` (~56 s).

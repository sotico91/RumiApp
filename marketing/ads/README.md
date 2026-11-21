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

Con la misma mascota (`mascotVideos` en `src/mascot-scenes.ts`; `voice/mascot.ts` genera las frases de todos):

- **Rumi te recuerda (`rumi-recuerda-es`, ~43 s):** recordatorios de recibos (día y hora de cada mes), cuotas de créditos con aviso un día antes, las notificaciones con el texto real de la app y las sugerencias de recordatorio.
- **Pruébame (`rumi-pruebame-es`, ~65 s):** invita a la prueba cerrada de Google Play (Android en Colombia o EE. UU., cuenta de Google, 14 días), los cuatro pasos de `probar.html` (escanear, unirse al grupo, aceptar la invitación, instalar), qué cumple Rumi de lo que Google pide (política de privacidad pública, seguridad de los datos declarada, sin anuncios, cifrado), cómo reportar un error y que iPhone llega pronto. El QR (`public/qr-probar.png`) abre `docs/probar.html`. Al salir a producción, cambiar sus textos y el QR por el enlace de la ficha.
- **Lanzamiento (`rumi-lanzamiento-es`, ~50 s):** "¡Ya estoy en Google Play!" con confeti, gracias a los testers (4,7/5), qué hace, privacidad, gratis + Rumi Pro, la búsqueda "Rumi" en Play y el QR (`public/qr-play.png`, abre la ficha). Publicarlo solo cuando Play apruebe producción.
- **Con final de Play (`rumi-habla-play-es`, `rumi-recuerda-play-es`):** los mismos videos, que ahora cierran con "Ya en Google Play" y el QR de la ficha en vez de "Muy pronto en tu tienda".
- **Tintos (`rumi-tintos-es`, ~29 s):** gancho corto para Reels/TikTok: un tinto de $4.500 al día son $99.000 al mes y $1.188.000 al año; luego los gastos hormiga y el cierre con el QR de Play. Publicarlo cuando la ficha sea pública.
- **Ganchos cortos (~20 a 30 s, todos cierran con el QR de Play):** `rumi-quincena-es` (el saldo se va del 15 al 20 y "¿Cómo voy a cerrar el mes?"), `rumi-alcanza-es` ("¿Me alcanza para unos tenis de 300 mil?" e invita a comentar), `rumi-banco-es` (privacidad: sin banco, cifrado, huella, sin anuncios), `rumi-prima-es` (topes para la prima y una meta de ahorro para enero) y `rumi-reto-enero-es` (31 días anotando todo). Las respuestas de Rumi en el chat (`chat` en la escena) copian el texto real de la app.
- **Metas de ahorro (`rumi-metas-es`, ~51 s):** el flujo real de Patrimonio: + Meta (para qué, cuánto, para cuándo y su bolsillo), "Aparta $200.000 al mes para llegar en…", Aportar (Mover al bolsillo) y "¡Meta cumplida! 🎉"; la primera meta es gratis y con Pro no tienen límite.
- **Imágenes de perfil y portadas** (`social-avatar`, `social-youtube-banner`, `social-facebook-cover` en `src/SocialKit.tsx`): ver `../redes/README.md`.
- **Rumi en iPhone (`rumi-iphone-es`, ~35 s):** cómo instalar desde la App Store: buscar "Rumi gastos", "Obtener", confirmar con Face ID; privacidad y el QR.
- **Las dos tiendas (2026-11-13):** los videos con final de tienda dicen "Gratis en Google Play y en la App Store", el botón "Android y iPhone" y usan `public/qr-descargar.png`, que abre `docs/descargar.html`: esa página manda a Google Play en Android y a la App Store en iPhone. El QR viejo (`qr-play.png`, solo Play) queda para referencia.
- **Cuatro funciones (2026-11-13):** `rumi-dictar-es` (Díctaselo a Rumi: la frase llena monto, categoría, cuenta y fecha), `rumi-deudas-es` (plan para salir de deudas: la fecha gratis, el abono extra con meses antes, intereses y orden en Pro), `rumi-excel-es` (Exportar a Excel por año, Pro) y `rumi-diapago-es` ("Mi mes empieza el día"). Los textos de las tarjetas son los de la app; los montos son de ejemplo.

## Tutorial "Cómo configurar Rumi" (`tutorial-es`, 16:9, ~5 min)

Video largo para YouTube con capítulos: cuentas (Patrimonio), conceptos y topes (Plan), registrar un gasto, un ingreso, mover dinero y deudas (dónde se registran y cómo se paga una cuota). Es el enlace para quien pregunta cómo se usa la app.

1. Guion y pasos: `src/tutorial.ts`. Cada paso es una frase de voz, un texto al lado del teléfono y, si la pantalla cambia, los comandos de Maestro que la cambian.
2. `node --experimental-strip-types tutorial/record.ts` graba un clip por paso en el simulador encendido (**borra los datos de la app**: arranca con `../flows/seed.yaml`) y guarda en `src/tutorial-clips.json` dónde se mueve cada clip. `DRY=1` solo corre los pasos para revisar los selectores; `FROM=<capítulo>` con `SKIP_SEED=1` sigue desde un capítulo.
3. `EDGE_TTS=~/.venvs/edge-tts/bin/edge-tts node --experimental-strip-types voice/tutorial.ts` genera la voz (`src/tutorial-voice.json`).
4. `npx remotion render src/index.ts tutorial-es out/tutorial-es.mp4 --codec h264`.
5. `node --experimental-strip-types tutorial/chapters.ts` imprime los capítulos para la descripción de YouTube.

**Shorts por capítulo** (`tutorial-cuentas-es`, `tutorial-conceptos-es`, `tutorial-gasto-es`, `tutorial-ingreso-es`, `tutorial-mover-es`, `tutorial-deudas-es`; verticales, 30 a 70 s): los mismos clips y la misma voz, con un gancho al inicio y el QR al final (`src/TutorialShort.tsx`).

Cada paso dura lo que su clip o lo que tarda su frase, lo que sea más largo; si la frase es más larga, el último cuadro se queda quieto, y si el clip es mucho más largo (escribir un formulario) se acelera hasta 2×. El simulador solo graba cuadros cuando la pantalla cambia, así que un clip termina en su último movimiento. Diseño: `src/TutorialVideo.tsx`; tiempos: `src/tutorial-timeline.ts`.

Estrategia para llegar a más gente e ideas para los próximos videos: `../ESTRATEGIA.md`.

## Llegó la prima (`rumi-prima-promo-es`, 16:9, ~73 s)

Promo de diciembre para YouTube y el video de la ficha de Google Play: anotar la prima como ingreso (Bonos), crear una meta y aportarle, preguntarle a Rumi si alcanza para unos tenis y ver a dónde se va la plata. Una mano 👆 toca en el teléfono donde se toca en cada paso. Guion: `src/prima.ts`; video: `src/PrimaVideo.tsx`.

1. `SCRIPT=prima EDGE_TTS=… node --experimental-strip-types voice/tutorial.ts` (voz → `src/prima-voice.json`)
2. `SCRIPT=prima node --experimental-strip-types tutorial/record.ts` graba cada paso en el simulador (borra sus datos y carga `../flows/seed.yaml`) y guarda en `src/prima-clips.json` el tramo útil y, en los pasos con `hand: true`, dónde está el primer `tapOn` (con `maestro hierarchy`). Revisa ese punto en un cuadro del clip: si la pantalla se mueve antes del toque, corrígelo a mano en el JSON.
3. `npm run render -- rumi-prima-promo-es` (o `npx remotion render src/index.ts rumi-prima-promo-es out/rumi-prima-promo-es.mp4`).


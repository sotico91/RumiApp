# Google Play — lo que se pega en Play Console

Textos y respuestas para crear Rumi en Play Console y abrir la prueba cerrada. Pasos en orden en `STORE_CHECKLIST.md`.

## Crear la app

| Campo | Valor |
|---|---|
| Nombre de la app | Rumi |
| Idioma predeterminado | Español (Latinoamérica) – es-419 |
| App o juego | App |
| Gratis o de pago | Gratis (no se puede cambiar a pago después) |
| Paquete | `com.sotico91.rumiapp` (lo toma del primer AAB) |
| Categoría | Finanzas |
| Correo de contacto | edavidvelascop@gmail.com |
| Sitio web | https://sotico91.github.io/RumiApp/ |
| Política de privacidad | https://sotico91.github.io/RumiApp/privacy-policy.html |

## Ficha de la tienda

### Español (es-419)

**Nombre (≤30):** Rumi: gastos y presupuesto

**Descripción breve (≤80):** Anota gastos en segundos, pon topes y mira tu mes. Tus datos, en tu teléfono.

**Descripción completa:**

> Rumi te ayuda a saber en qué se te va la plata, sin hojas de cálculo y sin conectar tu banco.
>
> ANOTA EN SEGUNDOS
> Escribe cuánto y en qué ("almuerzo", "uber", "mercado") y Rumi lo pone en su categoría. También puedes dictarlo: "gasté veinte mil en almuerzo con Nequi ayer".
>
> TOPES QUE TE CUIDAN
> Ponle un tope al mes a lo que quieras cuidar y mira cuánto te queda en cada categoría antes de pasarte.
>
> GASTOS HORMIGA
> El café, el domicilio, la suscripción: Rumi te muestra cuánto suman esos gastos pequeños que se repiten.
>
> PREGÚNTALE A RUMI
> "¿Cuánto gasté en café este mes?", "¿puedo comprar algo de 200 mil?". Rumi responde con tus números y te muestra los movimientos detrás de la respuesta.
>
> RECORDATORIOS DE PAGOS
> Te avisa el día de pagar la luz, el internet o el arriendo, y un día antes de cada cuota de tus créditos.
>
> TODO TU DINERO EN UN LUGAR
> Efectivo, bancos, billeteras como Nequi, ahorros, inversiones, tarjetas y créditos, con tu patrimonio neto y el pronóstico de cómo cierras el mes.
>
> TUS DATOS SON TUYOS
> Sin cuenta ni correo, sin servidor y sin anuncios. Todo se guarda cifrado en tu teléfono y puedes bloquear la app con huella o rostro. Exporta un respaldo cuando quieras.
>
> Funciona en pesos colombianos y en dólares.

### English (en-US)

**Name (≤30):** Rumi: spending & budget

**Short description (≤80):** Log spending in seconds, set limits, see your month. Data stays on your phone.

**Full description:**

> Rumi shows you where your money goes, with no spreadsheets and no bank connection.
>
> LOG IN SECONDS
> Type how much and what for ("lunch", "uber", "groceries") and Rumi files it. Or say it: "spent twelve fifty on lunch yesterday".
>
> LIMITS THAT LOOK OUT FOR YOU
> Set a monthly limit on what you want to watch and see what's left in every category.
>
> SMALL SPENDS
> Coffee, delivery, subscriptions: Rumi adds up the small spends that keep coming back.
>
> ASK RUMI
> "How much did I spend on coffee this month?", "can I buy something for $200?". Rumi answers with your numbers and shows the transactions behind it.
>
> PAYMENT REMINDERS
> A heads-up on the day your power, internet or rent is due, and a day before each loan installment.
>
> ALL YOUR MONEY IN ONE PLACE
> Cash, banks, wallets like PayPal, savings, investments, cards and loans, with your net worth and a month-end forecast.
>
> YOUR DATA IS YOURS
> No account, no server, no ads. Everything is stored encrypted on your phone, and you can lock the app with your fingerprint or face. Export a backup anytime.
>
> Works in US dollars and Colombian pesos.

### Gráficos

| Elemento | Archivo |
|---|---|
| Ícono 512×512 | `marketing/store/play-icon-512.png` |
| Gráfico destacado 1024×500 | `marketing/store/play-feature-es.png` / `play-feature-en.png` |
| Capturas de teléfono | `marketing/store/play/` (es) y `marketing/store/play-en/` (en), las 6 |

## Contenido de la app (Política → Contenido de la app)

- **Política de privacidad:** la URL de arriba.
- **Anuncios:** No, la app no contiene anuncios.
- **Acceso a la app:** Toda la funcionalidad está disponible sin restricciones (no hay inicio de sesión).
- **Clasificación de contenido (IARC):** categoría "Todas las demás apps" / utilidad. Sin violencia, sexo, lenguaje, drogas ni apuestas; no hay interacción entre usuarios, no comparte ubicación, no hay compras digitales. Resultado esperado: Para todos / PEGI 3.
- **Público objetivo:** 18 años o más (también vale 13+; la política dice que no está dirigida a menores de 13). No atrae a niños.
- **Funciones financieras:** "Mi app no ofrece ninguna función financiera". La lista de Play solo tiene servicios (préstamos, banca, pagos, billeteras, cripto, bolsa, seguros, asesoría, crédito); no hay opción de finanzas personales y Rumi no presta, no mueve dinero ni se conecta a bancos. No marcar "Otro" (pide documentación) ni "Asesoramiento financiero".
- **App de noticias / salud / gobierno / COVID:** No.
- **Seguridad de los datos:**
  - ¿Recopila o comparte datos de usuario? **No.** Todo se guarda y procesa en el teléfono; no se envía nada a servidores.
  - Si pregunta por cifrado: los datos se cifran en el dispositivo.
  - Eliminación: "Borrar todos los datos" en Ajustes, o desinstalar.
  - Micrófono: el audio no se graba ni se guarda; cuando el teléfono no tiene el idioma instalado, el reconocedor de voz del sistema (Google) lo pasa a texto. No se declara recopilación de audio.
- **Alarmas exactas (`SCHEDULE_EXACT_ALARM`):** si lo pide, "Recordatorios que el usuario programa para pagar recibos y cuotas a una hora exacta".

## Prueba cerrada

- **Pista:** Prueba cerrada → crear pista (o usar "Alpha").
- **Testers:** Grupos de Google → `rumiapptester@googlegroups.com`.
- **Comentarios de los testers:** edavidvelascop@gmail.com.
- **Países:** Colombia y Estados Unidos (se pueden agregar más).
- **Notas de la versión (es-419):**
  > Primera versión de prueba de Rumi. Anota gastos, pon topes, recibe recordatorios de pagos y pregúntale a Rumi. Si algo falla, cuéntanos en Ajustes → Reportar un error. ¡Gracias por probar!
- **Release notes (en-US):**
  > First test release of Rumi. Log spending, set limits, get payment reminders and ask Rumi. If something breaks, tell us in Settings → Report a problem. Thanks for testing!
- **Enlace para los testers:** https://play.google.com/apps/testing/com.sotico91.rumiapp (también en https://sotico91.github.io/RumiApp/probar.html).

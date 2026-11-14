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
- **Público objetivo:** 13-15, 16-17 y 18+ (nada menor de 13, que es lo que dice la política). Solo 18+ hace que Play restrinja la disponibilidad. No atrae a niños; no entra en la sección de familias.
- **Funciones financieras:** "Mi app no ofrece ninguna función financiera". La lista de Play solo tiene servicios (préstamos, banca, pagos, billeteras, cripto, bolsa, seguros, asesoría, crédito); no hay opción de finanzas personales y Rumi no presta, no mueve dinero ni se conecta a bancos. No marcar "Otro" (pide documentación) ni "Asesoramiento financiero".
- **App de noticias / salud / gobierno / COVID:** No.
- **ID de publicidad:** No. El AAB no declara `com.google.android.gms.permission.AD_ID` (sin anuncios ni analítica).
- **Seguridad de los datos:**
  - Desde la 1.2.0 (Rumi Pro), **Sí** recopila (declarado en Play Console el 2026-11-14): RevenueCat recibe la compra y un id anónimo. Los movimientos siguen solo en el teléfono. Guía de RevenueCat: revenuecat.com/docs → "Google Play's Data Safety".
  - **Información financiera → Historial de compras:** recopilado, no compartido, no efímero, obligatorio; fines: Funcionalidad de la app y Estadísticas.
  - **IDs de dispositivo u otros:** recopilado (el id anónimo de RevenueCat), no compartido, no efímero, obligatorio; fin: Funcionalidad de la app. RevenueCat dice que solo hace falta con ids de publicidad (Rumi los tiene apagados); se declara igual porque la política de privacidad lo menciona.
  - Cifrado en tránsito: Sí. Cuentas: la app no crea cuentas.
  - Eliminación: Sí, con enlace https://sotico91.github.io/RumiApp/privacy-policy.html#borrar-datos (pasos en el punto 8 de la política, plazo 30 días): se pide por correo (Ajustes → Reportar un error) y se borra el cliente en RevenueCat. Los datos del teléfono: "Borrar todos los datos" en Ajustes, o desinstalar.
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

## Solicitud de acceso a producción

Se pide desde **Panel → Solicitar acceso a producción** cuando la prueba cerrada cumple 12 testers durante 14 días seguidos (día 7 el 2026-11-05, así que desde el ~2026-11-12). Google lee las respuestas con cuidado: si suenan genéricas o la prueba se ve poco usada, rechaza y pide otros 14 días. Las partes entre **[COMPLETAR: …]** son lo que solo tú sabes; sin datos reales, mejor decir poco que inventar.

### Antes de enviarla

- Que la prueba cerrada siga con **12 o más** testers inscritos ese día.
- Que haya comentarios reales. Unos días antes, manda a los testers este mensaje:
  > ¡Hola! Gracias por probar Rumi estos días. Me ayudas con 3 respuestas cortas para Google Play? 1) ¿Qué usaste más? 2) ¿Algo falló, se te hizo confuso o te faltó? 3) Del 1 al 5, ¿qué tan probable es que la sigas usando? Puedes responder aquí o en la app: Ajustes → Reportar un error.
- Anota las respuestas aquí abajo (sin nombres) para que las de la solicitud sean ciertas.

### Parte 1 — Acerca de la prueba cerrada

**¿Qué tan fácil fue reclutar verificadores?**
> Elegir según cómo fue. Si costó llegar a 12, "Algo difícil" o "Difícil" es una respuesta válida y honesta.

**Describe la participación que recibiste de los verificadores durante la prueba cerrada.**
> Rumi se probó con [COMPLETAR: número] personas en Colombia, en su mayoría familiares, amigos y compañeros que llevan sus gastos a mano o no los llevan. Las invitamos a través de un grupo de Google y una página con los pasos (sotico91.github.io/RumiApp/probar.html). Durante los 14 días la usaron para anotar sus gastos del día a día, poner topes del mes y hacer preguntas a "Pregúntale a Rumi". [COMPLETAR: ej. "unas X personas la abrieron casi todos los días", según lo que veas en Play Console → Estadísticas o te cuenten]. Empezamos con la versión 1.0 y durante la prueba publicamos la 1.1.0, que los verificadores recibieron por Google Play.

**Resume los comentarios que recibiste de los verificadores. Incluye cómo los recopilaste.**
> Recibimos comentarios por tres vías: el botón "Reportar un error" dentro de la app (abre un correo al desarrollador), mensajes directos por WhatsApp y una encuesta en Google Forms al final de la prueba (si les gustó, qué tan fácil fue, qué mejorarían y si pagarían Pro). Lo más mencionado fue: [COMPLETAR: 2–4 puntos reales, ej. "querían preguntarle a Rumi por un gasto puntual, como una recarga o un Didi, y no solo por categorías"; "no encontraban dónde poner un tope"; "pidieron ver el saldo de cada cuenta"]. También probamos la app nosotros mismos en un Android de gama media (Moto g) y en iPhone, en español e inglés, y en pesos y dólares.

### Parte 2 — Acerca de tu app

**¿Quién es el público objetivo de tu app?**
> Adultos en Colombia y Latinoamérica (también en EE. UU., en inglés y dólares) que quieren saber en qué se les va la plata sin hojas de cálculo y sin conectar su banco. En especial personas que se pierden en los gastos pequeños del día a día (café, domicilios, transporte, suscripciones) y quieren recordar a tiempo sus pagos y cuotas.

**Describe cómo tu app aporta valor a los usuarios.**
> Rumi permite anotar un gasto en segundos, escribiéndolo o dictándolo ("almuerzo 18 mil con Nequi"), y lo clasifica solo. Con eso muestra el mes de un vistazo, deja poner topes por categoría, recuerda pagos y cuotas de créditos el día antes, y responde preguntas en lenguaje natural como "¿cuánto gasté en domicilios este mes?" o "¿ya pagué Netflix?", mostrando los movimientos detrás de cada respuesta. No pide cuenta ni conexión al banco: los datos se guardan cifrados en el teléfono y no salen de él.

**¿Cuántas instalaciones esperas durante el primer año?**
> Elegir el rango más bajo creíble: **0 – 10 mil**. Es una app nueva sin presupuesto de anuncios.

### Parte 3 — Preparación para producción

**¿Qué cambios hiciste en tu app a partir de lo que aprendiste durante la prueba cerrada?**
> - "Pregúntale a Rumi" ahora busca en las descripciones de todo el historial y responde preguntas más naturales: "¿qué día tomé Didi?", "¿ya pagué Netflix?", "¿qué compré ayer?", "¿cuál fue mi gasto más grande?", cuántas veces y el promedio de un gasto (versión 1.1.0).
> - Las exportaciones de respaldo (JSON y CSV) ya no dejan copias sueltas en el teléfono: se guardan en una carpeta temporal que se vacía sola.
> - La fecha de la política de privacidad dentro de la app quedó igual que la de la web.
> - Publicamos el sitio web en español e inglés con la política de privacidad y los términos de uso.
> - [COMPLETAR: cualquier arreglo hecho por un comentario de un tester; si alguno de los puntos de arriba nació de un comentario, decirlo así: "Un verificador pidió…, así que…"].

**¿Cómo decidiste que tu app está lista para producción?**
> Después de 14 días con [COMPLETAR: número] verificadores no quedaron errores abiertos que impidan usarla, y los comentarios de la prueba ya están resueltos en la versión 1.1.0. Antes de cada versión corremos pruebas automáticas (casi 500 pruebas unitarias y recorridos completos en el simulador: registro inicial, agregar un gasto, buscar categorías, aprender de una corrección, restaurar un respaldo y mover dinero) y la probamos en un Android real. La app no usa servidor ni recoge datos personales, así que no hay riesgos de privacidad abiertos, y la ficha, la clasificación de contenido y la sección de seguridad de los datos están completas.

# Pauta en EE. UU.: palabras clave y textos

Primera prueba de pauta pagada en EE. UU. (escrito el 2026-11-21). Dos campañas: **Apple Ads** para la App Store y **Google Ads, campaña de app** para Google Play. Cada una con USD 10 a 15 al día durante 2 semanas. Se apaga o se cambia lo que pase de unos USD 3 por instalación a los 7 días.

Dos públicos, en grupos y campañas separados para poder medirlos por aparte:

- **Inglés:** público general. Es caro y con mucha competencia (YNAB, Monarch, Rocket Money, Copilot, EveryDollar).
- **Español:** hispanos en EE. UU. Es más barato y tiene menos competencia, y Rumi habla su idioma. Es la apuesta principal.

## Antes de encender

- **Reseñas:** 10 o más, como dice `marketing/ESTRATEGIA.md`.
- **Medición:**
  - Apple Ads conectado a RevenueCat (Integrations → Apple Search Ads).
  - Google Ads vinculado a Play Console, con un evento de instalación (Firebase/GA4). Sin él, la campaña de Google no sabe a quién buscar.
- **iPhone en español:** la App Store tiene un solo español (es-MX), y por decisión del 2026-11-19 muestra **pesos**. Quien tenga el iPhone en español en EE. UU. ve capturas en pesos. Antes de pagar por palabras en español en Apple Ads, decidir una de dos:
  1. Cambiar las capturas de es-MX a dólares, lo que afecta a Colombia.
  2. Crear una **página de producto personalizada** (Custom Product Page) en es-MX con las capturas de `marketing/store/ios-es-usd/`, y usarla solo en el grupo de anuncios en español.

  La opción 2 es la recomendada. Play no tiene este problema: su ficha es-US ya está en dólares.

  **Hecho el 2026-11-21:** página personalizada "EE. UU. en español (USD)" creada por la API.
  - Locale es-MX, con las 7 capturas de `marketing/store/v3/ios63-esus/` (APP_IPHONE_61).
  - Texto promocional: "Anota tus gastos en dólares en segundos, mira a dónde se va tu dinero y pregúntale a Rumi. Sin conectar tu banco."
  - ID `8cf0205d-4fb8-43fe-a236-061804924009`. URL: https://apps.apple.com/us/app/rumi-gastos-y-presupuesto/id6834433231?ppid=8cf0205d-4fb8-43fe-a236-061804924009
  - Enviada a revisión el 2026-11-21 en un envío aparte de la versión de la app (envío `a23525b2`). Aprobada por Apple el 2026-11-22: ya se puede usar en Apple Ads. En Apple Ads se elige en el grupo de anuncios en español: Ad Variation → Custom Product Page.

## Apple Ads (App Store)

Apple no deja escribir el texto del anuncio: muestra el nombre, el subtítulo, el ícono y las primeras capturas de la ficha (o de la página personalizada). Lo que se elige son las **palabras clave**, el **tipo de coincidencia** y la **oferta por toque (CPT)**.

Estructura: una campaña de Search Results, país Estados Unidos, con estos grupos de anuncios.

### Grupo 1: Marca (exacta)

Barato y protege el nombre. CPT máximo inicial: USD 0,50.

```
rumi
rumi app
rumi budget
rumi finanzas
rumi gastos
```

### Grupo 2: Categoría en inglés (exacta)

CPT máximo inicial: USD 1,50. Subir solo las que conviertan.

```
budget app
budget planner
budgeting app
expense tracker
spending tracker
money tracker
expense tracker app
budget tracker
monthly budget
personal finance
money manager
daily expense tracker
spending app
bill tracker
debt tracker
savings tracker
budget app no bank
budget without bank account
offline budget app
simple budget app
```

### Grupo 3: Categoría en español (exacta)

CPT máximo inicial: USD 1,00. Usar con la página personalizada en dólares.

```
presupuesto
app de presupuesto
control de gastos
app de gastos
gastos
gastos diarios
registro de gastos
finanzas personales
administrar dinero
ahorrar dinero
ahorro
deudas
gastos hormiga
presupuesto mensual
organizador de gastos
app de finanzas
app de finanzas en español
budget app en español
cuentas claras
quincena
```

### Grupo 4: Competidores (exacta, opcional)

Apple permite pujar por nombres de otras apps. Suelen convertir peor y salir caros. Empezar con CPT de USD 1,00 y apagar a los 7 días si no traen instalaciones.

```
ynab
mint
mint alternative
monarch money
rocket money
copilot money
everydollar
goodbudget
pocketguard
spendee
money lover
wallet budget
fintonic
```

### Grupo 5: Descubrimiento (amplia + Search Match)

Para encontrar palabras que no están arriba. CPT máximo: USD 1,00. Este grupo lleva como **negativas exactas** todas las palabras de los grupos 1 a 4, para que no compitan entre sí. Cada semana se revisa el informe de términos de búsqueda:
- Lo que convierte pasa a su grupo exacto.
- Lo que no tiene que ver pasa a negativas.

Palabras amplias:

```
budget
expense
spending
gastos
presupuesto
finanzas
```

### Negativas (en todos los grupos)

Búsquedas que no son de Rumi: préstamos, adelantos de sueldo, inversión, impuestos y puntaje de crédito.

**Amplias:** bloquean cualquier búsqueda que las contenga.

```
loan
loans
payday loan
cash advance
borrow money
instant cash
earn money
make money
free money
credit score
credit karma
taxes
invest
investing
stocks
crypto
bitcoin
cash app
venmo
zelle
chime
earnin
brigit
prestamo
prestamos
dinero rapido
ganar dinero
impuestos
invertir
```

**Exactas:** solo la búsqueda idéntica. "bank" o "credito" en amplia también bloquearían "budget app no bank" o "tarjeta de credito", que sí sirven.

```
bank
banking
banco
credito
tax
paypal
dave
```

`payday` sola no va como palabra clave en EE. UU.: casi siempre busca préstamos.

## Google Ads: campaña de app (Google Play)

Las campañas de app no usan palabras clave: Google arma los anuncios con los textos, imágenes y videos que se le dan, y los muestra en Play, la Búsqueda de Google, YouTube y Display.

Configuración inicial:
- Una campaña por idioma, porque cada una lleva sus textos. Ubicación: Estados Unidos. Idioma: inglés en una, español en la otra.
- Objetivo: instalaciones.
- Oferta: CPI objetivo de USD 2,50 (inglés) y USD 1,50 (español).
- Presupuesto: USD 10 a 15 al día por campaña.

Límites: hasta 5 títulos de 30 caracteres y 5 descripciones de 90. Imágenes: las capturas v3 y el gráfico destacado. Videos: el de vista previa (`marketing/store/preview-en.mp4`) y los reels en inglés (`rumi-coffee-en`, `rumi-coffee-15-en`, `rumi-nobank-en`, `rumi-afford-en`; ver `README.md`). Google los pide en YouTube. Subidos al canal @rumifinanzas como no listados el 2026-11-21 (los enlaces sirven en Google Ads):
  - `rumi-coffee-en`: https://youtube.com/shorts/O1Dxo9i1rlQ
  - `rumi-coffee-15-en`: https://youtube.com/shorts/VNs-dESwFoM
  - `rumi-nobank-en`: https://youtube.com/shorts/ux4V4HtU_7U
  - `rumi-afford-en`: https://youtube.com/shorts/MHJa9JwyiC8

  Llevan voz de borrador (edge-tts). Si se regeneran con Azure, hay que subirlos de nuevo y cambiar los enlaces en la campaña.

**Voz:** los reels en inglés usan edge-tts, que sirve de borrador. Para pautar con dinero, generar la misma voz con Azure Speech (`credentials/azure-speech.json`; `voice/mascot.ts` la usa sola si existe) y volver a renderizar.

### Inglés

Títulos (≤30):

```
Track spending, no bank link
Ask Rumi where your money went
Spot small spends that add up
Your budget, no bank login
Free expense tracker
```

Descripciones (≤90):

```
Log a spend in seconds by voice or text. Rumi files it in the right category for you.
No bank login: your money data stays on your phone. Budgets, debts and savings in one app.
Ask how much you spent on takeout or coffee this month and get the answer right away.
See where your money goes with a clear map of your month. Set a limit for each category.
Free to use, no ads. Rumi Pro adds Excel export, a plan to get out of debt and more.
```

### Español (EE. UU.)

En dólares y con "dinero", no "plata": la mayoría de los hispanos en EE. UU. no son colombianos. "Gastos hormiga" se queda: se entiende sin explicación.

Títulos (≤30):

```
Controla tus gastos sin banco
¿A dónde se va tu dinero?
Detecta tus gastos hormiga
Tu presupuesto, en español
App de gastos gratis
```

Descripciones (≤90):

```
Anota un gasto en segundos, con tu voz o escribiendo. Rumi lo pone en su categoría.
Sin conectar tu banco: tus datos de dinero se quedan en tu teléfono. Topes y deudas.
Pregúntale a Rumi cuánto gastaste en comida o en renta este mes y te responde al instante.
Mira a dónde se va tu dinero con un mapa claro del mes y ponle un tope a cada categoría.
Gratis y sin anuncios. Rumi Pro suma exportar a Excel, un plan para salir de deudas y más.
```

## Qué se mide

Cada semana, por campaña y por idioma:

- **Costo por instalación (CPI).** Se apaga o se cambia si pasa de USD 3.
- **Tasa de conversión de toque a instalación** (Apple). Por debajo del 30 % suele indicar que las capturas no convencen.
- **Pruebas del plan anual y suscripciones en RevenueCat**, por campaña. Es lo que dice si la instalación valió algo.
- **Retención al día 1 y al día 7** (Play Console y App Store Connect). Si la gente instala y no vuelve, el problema está en la app o en el público, no en el anuncio.

Para atribuir las instalaciones, no usar el total de RevenueCat: lo inflan los robots de Google y la revisión de Apple (ver la nota del 2026-11-20).

## Canal de YouTube en inglés

Creado el 2026-11-21 con la cuenta de Rumi: **Rumi · Money Tracker** (@rumimoneyapp). Es aparte de @rumifinanzas para que YouTube recomiende los videos a gente que habla inglés (EE. UU., Reino Unido, Canadá). Cada video lleva el idioma "Inglés (Estados Unidos)", la descripción en inglés y el enlace de `descargar.html`. Publicados (públicos):

- "Where did my money go? 💸 Budget app that shows you (no bank link)": https://youtube.com/shorts/WUG7k611WDY (`rumi-where-money-en`)
- "What your daily coffee really costs ☕ $1,320 a year": https://youtube.com/shorts/ZYEJiAbvXP0 (`rumi-coffee-en`)
- "Budget app with no bank link 🔒 Your data stays on your phone": https://youtube.com/shorts/Nvv5NXq655c (`rumi-nobank-en`)
- "Can I afford it? 👟 Ask your budget app before you buy": https://youtube.com/shorts/GeglQyj5ylE (`rumi-afford-en`)
- "It's just $5... right? 🐜 Small spends that cost $3,720 a year": https://youtube.com/shorts/BypZbSIZf3E (`rumi-small-spends-en`)
- "Why your credit card balance never goes down 💳 (the minimum payment trap)": https://youtube.com/shorts/oU1ZUYUoYAg (`rumi-card-en`)
- "Forgot a bill again? 😬 Stop paying late fees": https://youtube.com/shorts/XSpjE3Z7oOg (`rumi-bills-en`)
- "Broke in January? 🎄 How to budget the holidays": https://youtube.com/shorts/6gYKqqgFaHg (`rumi-january-en`)
- "Saving for something? ✈️ How much to save each month for your goal": https://youtube.com/shorts/fW0kwRj7V6k (`rumi-goal-en`)

Foto y portada propias: `marketing/redes/avatar-en.png` (la misma mascota sobre petróleo, para distinguirlo del canal en español, que va sobre crema) y `marketing/redes/youtube-banner-en.png` ("Know where your money goes. No bank link."). Composiciones `social-avatar-en` y `social-youtube-banner-en` en `src/SocialKit.tsx`.

## Pauta pagada: en pausa (2026-11-21)

Las cuentas de Google Ads y Apple Ads quedaron creadas, pero no se publicó nada. Rumi todavía no tiene suscripciones pagadas y no se sabe qué parte de los que descargan termina pagando, así que pagar por descarga hoy pierde plata. Primero usuarios gratis (videos, comunidades, reseñas, ficha); la prueba pagada se retoma cuando haya datos de conversión a Pro, empezando por Apple Ads (solo resultados de búsqueda en EE. UU.), porque en EE. UU. pesa más el iPhone. Google Ads tiene en borrador una campaña de app Android para EE. UU. en inglés con los textos y videos de arriba.

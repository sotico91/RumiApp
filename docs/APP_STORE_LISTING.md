# App Store: lo que se pega en App Store Connect

Textos y respuestas para publicar Rumi en la App Store. Es el equivalente de `PLAY_LISTING.md`. Pasos generales en `STORE_CHECKLIST.md`; suscripción y RevenueCat en `PRO.md`.

Estado (2026-11-13): Apple Developer Program pagado como persona natural; activación pendiente (llega por correo en 2 días hábiles). La app es **solo iPhone** (`supportsTablet: false`).

## 0. Cuando la cuenta esté activa

1. **Xcode → Settings → Accounts:** agrega el Apple ID de la cuenta de desarrollador.
2. **Acuerdos:** App Store Connect → Business (Negocios) → firma el **Paid Apps Agreement** y llena:
   - **Banco:** cuenta en Colombia (Apple paga en COP o USD según el banco).
   - **Impuestos:** formulario **W-8BEN** (persona natural, fuera de EE. UU.), con los mismos datos que en Play.
3. **Small Business Program** (15 % de comisión en vez de 30 %): se pide aparte en https://developer.apple.com/app-store/small-business-program/ después de firmar el acuerdo. Empieza a regir desde la aprobación, así que conviene pedirlo antes de la primera venta.
4. **Clave de la API de App Store Connect** (para subir builds sin contraseña): Users and Access → Integrations → App Store Connect API → **Generate API Key**, rol **App Manager**. Descarga el `.p8` (solo se descarga una vez) en `credentials/asc-api-key.p8` (está en `.gitignore`). Anota el **Key ID** y el **Issuer ID**.

## Estado y API (2026-11-13)

- App creada: Apple ID **6834433231**, bundle `com.sotico91.rumi`, SKU `rumi-ios`. Suscripciones: grupo **Rumi Pro** (22576991), `rumi_pro_monthly` (6834543169, COP 9.900 / US$1,99) y `rumi_pro_annual` (6834543413, COP 69.900 / US$14,99, 1 semana gratis), las dos `READY_TO_SUBMIT`, con la captura de revisión de `e2e/pro/screen.yaml`.
- **Clave de la API de App Store Connect:** `credentials/asc-api-key.p8` (Key ID `A4SMWC32N9`, Issuer `0289bb86-99d4-4ed9-a9e5-139a808fcdd7`, rol Admin). Cliente mínimo: `node scripts/asc/asc.mjs GET /v1/apps`. Con ella se configuran suscripciones, precios y la versión sin entrar a la web.
- **Una suscripción necesita precio en los 175 territorios** (aunque se venda en 18); con solo 18 se queda en `MISSING_METADATA`.
- **Builds:** `npm run ios:testflight` (Xcode, equipo 3Q53N2B5XD). `BUILD_NUMBER=<n>` para fijar el número. EAS no pudo entrar a la cuenta de Apple el 2026-11-13.

## 1. Crear la app (Apps → + → New App)

| Campo | Valor |
|---|---|
| Plataforma | iOS |
| Nombre | Rumi: gastos y presupuesto |
| Idioma principal | Español (México); es el español que ofrece Apple para Latinoamérica |
| Bundle ID | `com.sotico91.rumi` (se registra en Certificates, IDs & Profiles, o lo crea EAS en la primera build) |
| SKU | `rumi-ios` |
| Acceso | Acceso completo |

## 2. Información de la app

| Campo | Valor |
|---|---|
| Nombre en inglés | Rumi: Expense & Budget ("Rumi: spending & budget" ya estaba tomado en la App Store) |
| Subtítulo (≤30) | es: Tu plata clara, sin tu banco · en: Spending made clear, no bank |
| Categoría | Finanzas; secundaria: Productividad |
| Derechos de contenido | No contiene contenido de terceros |
| Clasificación por edad | Responder "No" o "Ninguno" a todo (sin contenido generado por usuarios, sin anuncios, sin apuestas, sin navegador web, sin chat). Resultado esperado: 4+ |
| URL de la política de privacidad | https://sotico91.github.io/RumiApp/privacy-policy.html |
| URL de soporte | https://sotico91.github.io/RumiApp/ |
| URL de marketing | https://sotico91.github.io/RumiApp/ |
| Copyright | 2026 Edgar David Velasco |

## 3. Ficha de la versión

### Español

**Texto promocional (≤170, se cambia sin nueva revisión):**
> Anota tus gastos en segundos, ponles tope, ahorra con metas y pregúntale a Rumi si te alcanza. Sin cuenta y sin conectar tu banco.

**Palabras clave (≤100, sin espacios; no repetir palabras del nombre ni del subtítulo, ni marcas ajenas como Nequi):**
```
finanzas,ahorro,hormiga,quincena,billetera,deudas,cuentas,dinero,plata,metas,recordatorios,pesos
```

**Descripción:**
> Rumi te ayuda a saber en qué se te va la plata, sin hojas de cálculo y sin conectar tu banco.
>
> ANOTA EN SEGUNDOS
> Escribe cuánto y en qué ("almuerzo", "uber", "mercado") y Rumi lo pone en su categoría. También puedes dictarlo: "gasté veinte mil en almuerzo ayer".
>
> TOPES QUE TE CUIDAN
> Ponle un tope al mes a lo que quieras cuidar y mira cuánto te queda en cada categoría antes de pasarte.
>
> GASTOS HORMIGA
> El café, el domicilio, la suscripción: Rumi te muestra cuánto suman esos gastos pequeños que se repiten.
>
> PREGÚNTALE A RUMI
> "¿Cuánto gasté en café este mes?", "¿me alcanza para algo de 200 mil?". Rumi responde con tus números y te muestra los movimientos detrás de la respuesta.
>
> METAS DE AHORRO
> Dile para qué ahorras, cuánto necesitas y para cuándo, y Rumi te dice cuánto apartar cada mes.
>
> RECORDATORIOS DE PAGOS
> Te avisa el día de pagar la luz, el internet o el arriendo, y un día antes de cada cuota de tus créditos.
>
> TODO TU DINERO EN UN LUGAR
> Efectivo, bancos, billeteras, ahorros, inversiones, tarjetas y créditos, con tu patrimonio neto y el pronóstico de cómo cierras el mes.
>
> TUS DATOS SON TUYOS
> Sin cuenta ni correo, sin servidor y sin anuncios. Todo se guarda cifrado en tu iPhone y puedes bloquear la app con Face ID.
>
> RUMI PRO
> Rumi es gratis. Rumi Pro quita los límites: preguntas, topes, recordatorios y metas sin límite, plan para salir de deudas, "¿me alcanza?" para meses futuros, y exportar a Excel, CSV y respaldo. Se paga cada mes o cada año, con 7 días gratis en el plan anual. El cobro va a tu cuenta de Apple y la suscripción se renueva sola salvo que la canceles al menos 24 horas antes del final del periodo, desde los ajustes de tu cuenta en la App Store.
>
> Funciona en pesos colombianos y en dólares.
>
> Términos de uso: https://sotico91.github.io/RumiApp/terms.html
> Privacidad: https://sotico91.github.io/RumiApp/privacy-policy.html

### English (U.S.)

**Promotional text:**
> Log spending in seconds, set limits, save with goals and ask Rumi whether you can afford it. No account, no bank connection.

**Keywords:**
```
expense,tracker,money,finance,savings,goals,debt,bills,reminders,wallet,personal,cash,spend,planner
```

**Description:**
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
> "How much did I spend on coffee this month?", "can I afford something for $200?". Rumi answers with your numbers and shows the transactions behind it.
>
> SAVINGS GOALS
> Tell Rumi what you're saving for, how much and by when, and it tells you how much to put aside each month.
>
> PAYMENT REMINDERS
> A heads-up on the day your power, internet or rent is due, and a day before each loan installment.
>
> ALL YOUR MONEY IN ONE PLACE
> Cash, banks, wallets, savings, investments, cards and loans, with your net worth and a month-end forecast.
>
> YOUR DATA IS YOURS
> No account, no server, no ads. Everything is stored encrypted on your iPhone, and you can lock the app with Face ID.
>
> RUMI PRO
> Rumi is free. Rumi Pro removes the limits: unlimited questions, limits, reminders and goals, a debt payoff plan, "can I afford it?" for later months, and Excel, CSV and backup export. Billed monthly or yearly, with a 7-day free trial on the yearly plan. Payment is charged to your Apple Account, and the subscription renews automatically unless canceled at least 24 hours before the end of the period in your App Store account settings.
>
> Works in US dollars and Colombian pesos.
>
> Terms of Use: https://sotico91.github.io/RumiApp/terms.html
> Privacy: https://sotico91.github.io/RumiApp/privacy-policy.html

### Capturas

App Store Connect pide primero el iPhone mediano (6,3"): `marketing/store/ios-6.3/` (es) y `marketing/store/ios-en-6.3/` (en), 1206×2622 JPG, las 6. Las de 6,9" (`ios/`, 1320×2868) no las acepta en esa casilla. Sin iPad.

## 4. Suscripción (Monetization → Subscriptions)

Grupo de suscripción: **Rumi Pro** (nombre visible en es: "Rumi Pro"; en en: "Rumi Pro").

| Product ID | Duración | Precio base (Colombia) | Nombre visible | Descripción (≤45) |
|---|---|---|---|---|
| `rumi_pro_monthly` | 1 mes | COP 9.900 (o el punto de precio más cercano) | Rumi Pro mensual / Rumi Pro monthly | Preguntas, topes y metas sin límite / Unlimited questions, limits, goals |
| `rumi_pro_annual` | 1 año | COP 69.900 (o el más cercano) | Rumi Pro anual / Rumi Pro yearly | Lo mismo |

- **Nivel:** los dos en el mismo nivel; así quien cambia de plan no paga doble.
- **Oferta introductoria** en `rumi_pro_annual`: prueba gratis de 1 semana, para nuevos suscriptores.
- **Precios en otros países:** Apple los calcula desde Colombia; revisa EE. UU. (cerca de US$2.99 y US$19.99).
- **Captura para la revisión:** cada producto pide una captura de la pantalla de Pro (`app/pro.tsx`). Se toma en el simulador en la primera build de TestFlight.
- **Primera revisión:** las suscripciones nuevas se envían **junto con la primera versión de la app**. En la página de la versión, en "In-App Purchases and Subscriptions", hay que marcar las dos.

**RevenueCat:** Project settings → Apps → **+ App Store**, con el bundle `com.sotico91.rumi`, la clave de compras dentro de la app (App Store Connect → Users and Access → Integrations → In-App Purchase → Generate) y el App-Specific Shared Secret. Después:
- importar los dos productos y agregarlos al entitlement `pro`;
- en la offering `default`, agregarlos a `$rc_monthly` y `$rc_annual`;
- copiar la llave pública `appl_…` y guardarla así:
  ```bash
  npx eas-cli env:create --environment production --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_xxx --visibility plaintext
  ```
Sin esa llave, Pro queda apagado en iPhone.

## 5. Privacidad de la app (App Privacy)

Ya no es "Data Not Collected": desde Rumi Pro, RevenueCat recibe la compra y un id anónimo (política de privacidad §6). Antes de enviar, revisa también la guía de RevenueCat (revenuecat.com/docs, "Apple App Privacy").

| Tipo de dato | ¿Se recopila? | Uso | ¿Vinculado a la persona? | ¿Rastreo? |
|---|---|---|---|---|
| Compras → Historial de compras | Sí | Funcionalidad de la app | No (id anónimo, sin cuenta ni correo) | No |
| Identificadores → ID de usuario (el id anónimo de RevenueCat) | Sí | Funcionalidad de la app | No | No |
| Todo lo demás (movimientos, contactos, ubicación, salud, audio…) | No | | | |

- **Movimientos:** se quedan en el teléfono y nunca salen de él, así que no se declaran.
- **Voz:** el dictado lo pasa a texto el reconocedor de Apple; Rumi no guarda el audio.
- **Rastreo:** no hay (ni IDFA ni App Tracking Transparency). La recopilación automática de identificadores de dispositivo de RevenueCat está apagada.

## 6. Disponibilidad y precio

- **Precio de la app:** gratis.
- **Países:** Colombia, Estados Unidos y Latinoamérica para empezar.
- **Sin Unión Europea por ahora:** para publicar allá, Apple exige declararse comerciante (DSA) y muestra en la ficha la dirección, el teléfono y el correo. Se puede agregar después.

## 7. Revisión de la app (App Review Information)

- **Requiere inicio de sesión:** No.
- **Contacto:** tu nombre, teléfono y correo (Apple no los publica).
- **Notas para el revisor** (reescritas el 2026-11-14 tras el rechazo 2.1 "Information Needed", que pidió video en iPhone real + propósito, uso, servicios externos, regiones e industria regulada; adjuntar el video en "Archivo adjunto"):
  > 1. SCREEN RECORDING: attached (recorded on a physical iPhone, latest iOS). It starts at app launch and shows the first-run setup, logging a spend, the monthly Plan, debts and savings goals, "Ask Rumi", and the Rumi Pro screen with the subscription purchase (sandbox), Restore Purchases, Terms of Use and Privacy Policy. Rumi has no accounts, so there is no registration, login or account deletion flow, and no user-generated content shared with other users.
  >
  > 2. PURPOSE AND AUDIENCE: Rumi is a personal spending and budget tracker for adults in Latin America and the US who want to know where their money goes without connecting a bank. You log a spend in seconds (typing or dictating), plan the month by category, follow debts with a payoff plan and savings goals, and ask plain questions like "how much did I spend on food this month?". All data stays on the device, encrypted.
  >
  > 3. HOW TO USE IT: No login, no credentials, no sample files. Open the app, pick the currency and (optionally) payday, then tap the floating + on Home to add a spend. Tabs: Home, History, Plan, Wealth (debts and savings) and Ask Rumi. Rumi Pro (optional auto-renewable subscription, monthly or annual with a 1-week free trial) unlocks unlimited Ask Rumi questions (free: 5 per month), more monthly limits, reminders and savings goals, the debt payoff plan, "Can I afford it?" and export (Excel, CSV, backup). Open it from Settings (the initial on Home) → Rumi Pro, or by asking a 6th question in Ask Rumi. Free users can log spending without limits.
  >
  > 4. EXTERNAL SERVICES: Apple In-App Purchase (StoreKit) for Rumi Pro, validated through RevenueCat (receipt validation and entitlement; it only receives purchase data and an anonymous app user id). Apple Speech framework for dictation, on-device when the iPhone supports it. No data providers, no authentication service, no AI or LLM service: answers in Ask Rumi are computed on the device from the user's own entries.
  >
  > 5. REGIONS: The app works the same in every region. Only the default currency (taken from the device region, changeable) and the language (Spanish or English, from the device) differ.
  >
  > 6. REGULATED INDUSTRY: Not applicable. Rumi is not a bank, lender, payment processor, investment or tax service, does not move money and does not connect to financial accounts. It is a personal record-keeping tool.
- **Cifrado de exportación:** "No" (la app ya declara `ITSAppUsesNonExemptEncryption = false`).

## 8. Build y envío

1. **Versión:** sube `version` en `app.json` y `package.json` (minor, 1.11.0); el número de build de iOS lo maneja EAS (`autoIncrement`).
2. **La primera build de iOS en EAS** pide entrar con el Apple ID para crear el certificado y el perfil de distribución. Corre en tu terminal: `! npx eas-cli build -p ios --profile production`, y responde "Yes" a que EAS maneje las credenciales.
3. **Envío a TestFlight:** con la clave del paso 0.4 y el **Apple ID de la app** (App Store Connect → la app → App Information → Apple ID, un número), se agrega a `eas.json` en `submit.production`:
   ```json
   "ios": {
     "ascAppId": "<Apple ID de la app>",
     "ascApiKeyPath": "./credentials/asc-api-key.p8",
     "ascApiKeyIssuerId": "<Issuer ID>",
     "ascApiKeyId": "<Key ID>"
   }
   ```
   Después: `npm run eas:submit:ios`.
4. **TestFlight:** instálala en tu iPhone y prueba una compra con una cuenta **sandbox** (Users and Access → Sandbox → Testers; en el iPhone, Ajustes → Developer → Sandbox Apple Account). Las compras sandbox son gratis.
5. **Enviar a revisión:** con capturas, suscripciones marcadas, privacidad y notas. Suele tardar de 1 a 3 días.

# ASO: palabras clave para las fichas

Propuesta del 2026-11-18. Los textos vigentes están en `docs/PLAY_LISTING.md` y `docs/APP_STORE_LISTING.md`; cuando se aplique un cambio, se copia allá.

## Reglas de cada tienda

- **App Store:** indexa nombre (≤30), subtítulo (≤30) y el campo de palabras clave (≤100, separadas por coma y sin espacios). La descripción no cuenta. Una palabra que ya está en el nombre o el subtítulo, repetida en el campo, es espacio perdido. Apple combina palabras de los tres campos ("control" + "gastos"), así que se ponen sueltas y en singular o plural, no frases. Cambiar el subtítulo o las palabras clave exige mandar una versión a revisión.
- **Google Play:** no hay campo de palabras clave. Indexa el nombre (≤30), la descripción breve (≤80) y la descripción completa. Los términos principales van en el nombre y la descripción breve, y se repiten de forma natural 3 a 5 veces en la completa. Se cambia en cualquier momento sin build nuevo.

## Términos objetivo (Colombia, español)

| Prioridad | Término | Dónde va |
|---|---|---|
| Alta | control de gastos | subtítulo iOS, descripción breve de Play |
| Alta | presupuesto | nombre (ya está) |
| Alta | finanzas personales | palabras clave iOS, descripción breve de Play |
| Alta | gastos hormiga | palabras clave iOS, descripción completa (ya está) |
| Media | ahorro / metas de ahorro | subtítulo iOS, descripción completa |
| Media | deudas, tarjeta de crédito | palabras clave iOS, descripción completa |
| Media | quincena, salario | palabras clave iOS, descripción completa |
| Media | plata, dinero, pesos | palabras clave iOS |
| Baja | billetera, cuentas | descripción completa |

Fuera: marcas ajenas (Nequi, Daviplata, Bancolombia) en nombre, subtítulo o palabras clave, porque Apple y Google rechazan la ficha. En la descripción completa se pueden mencionar como ejemplo.

## App Store

Cargado en la versión 1.14.1 de App Store Connect el 2026-11-18 (subtítulo y palabras clave). Entra en vigor cuando Apple apruebe esa versión (la 1.13.2 se retiró de revisión y se reemplazó por la 1.14.1).

### Español

- **Nombre:** Rumi: gastos y presupuesto (sin cambio)
- **Subtítulo:** `Control de gastos y ahorro` (26). Hoy dice "Tu plata clara, sin tu banco", que suena bien pero casi nadie busca esas palabras.
- **Palabras clave (100):**
  ```
  finanzas,personales,hormiga,quincena,deudas,tarjeta,credito,cuentas,dinero,metas,salario,plata,pesos
  ```
  Salen `ahorro` (pasa al subtítulo) y `billetera` y `recordatorios` (poca búsqueda, mucho espacio). Entran `personales` (con `finanzas` arma "finanzas personales"), `tarjeta`, `credito`, `salario` y `cuentas`.

### English

- **Name:** Rumi: Expense & Budget (sin cambio)
- **Subtitle:** `Spending tracker, no bank link` (30)
- **Keywords (94):**
  ```
  money,finance,savings,goals,debt,bills,wallet,personal,cash,planner,credit,card,payday,monthly
  ```
  Salen `expense` (ya está en el nombre), `tracker` y `spend` (pasan al subtítulo) y `reminders`. Entran `credit`, `card`, `payday` y `monthly`.

## Google Play

Aplicado en Play el 2026-11-18 por la API (descripción breve y completa, es-419 y en-US). Medir desde esa fecha.

### Español (es-419)

- **Nombre:** Rumi: gastos y presupuesto (sin cambio)
- **Descripción breve (75):** `Control de gastos y finanzas personales: topes, deudas y ahorro. Sin banco.`
- **Descripción completa:** dejarla como está y agregar en el primer párrafo "control de gastos" y "finanzas personales", y en TODO TU DINERO EN UN LUGAR "tarjeta de crédito" y "presupuesto mensual".

### English (en-US)

- **Name:** Rumi: spending & budget (sin cambio)
- **Short description (76):** `Expense tracker and budget planner: limits, debts and savings. No bank link.`

## Cómo medir

- Play Console → Estadísticas → Adquisición de usuarios → Búsqueda en Google Play: términos que traen visitas e instalaciones.
- App Store Connect → Analytics → Fuentes → Búsqueda en App Store.
- Revisar 3 a 4 semanas después de cada cambio, y cambiar una cosa a la vez para saber qué funcionó.

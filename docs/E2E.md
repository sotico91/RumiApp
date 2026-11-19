# Recorridos de prueba (Maestro)

Flujos de la app que se prueban solos en el simulador de iOS antes de cada entrega.
Cada recorrido **borra los datos de la app en ese simulador** y empieza con un onboarding nuevo.

## Correrlos

1. Compilar e instalar en un simulador encendido (bundle `com.sotico91.rumi`):
   ```sh
   cd ios && mise exec -- xcodebuild -workspace Rumi.xcworkspace -scheme Rumi -configuration Release \
     -sdk iphonesimulator -destination 'platform=iOS Simulator,id=<SIM>' \
     -derivedDataPath ~/Library/Caches/rumi-ios-sim-build build
   xcrun simctl install <SIM> ~/Library/Caches/rumi-ios-sim-build/Build/Products/Release-iphonesimulator/Rumi.app
   ```
2. `npm run e2e` corre todos (unos 16 minutos). Uno solo: `E2E_FLOW=move-money npm run e2e`.
   - `E2E_DEVICE` elige el simulador (por defecto, el primero encendido).
   - `MAESTRO` apunta al binario si no está en el PATH (por defecto `~/.maestro-cli/maestro/bin/maestro`).

El simulador debe estar en **español**: los recorridos buscan los textos en español.

## Qué cubre

| Recorrido | Qué comprueba |
|---|---|
| `onboarding` | El saldo inicial queda en el banco principal. |
| `quick-add` | Un gasto con descripción ("almuerzo") toma su categoría y sale del banco. |
| `spend-mosaic` | Análisis muestra "¿A dónde se va tu plata?" con un bloque por categoría y la frase de la mayor; tocar Alimentación abre sus subcategorías. |
| `income-needs-category` | Un ingreso sin categoría elegida no pasa del paso de categoría; con "Salario" sigue. |
| `usd-quick-add` | En dólares, el registro rápido y el de un toque cierran su pantalla al guardar y descuentan del banco. |
| `category-search` | Con más de 10 subcategorías aparece el buscador, y lo escrito elige el destino. |
| `learn-correction` | Elegir otra categoría a mano enseña la descripción: la próxima vez va ahí. |
| `teach-unknown` | Una descripción que Rumi no conoce aparece en Análisis; elegir su categoría mueve el gasto y la enseña. |
| `restore-auto-backup` | La copia del día se guarda con el primer movimiento y restaurarla trae ese estado. |
| `one-tap` | El botón de un toque dice el concepto (Café · Alimentación); lo escrito reemplaza el monto y el campo vacío registra el último. |
| `move-money` | Mover solo sale de cuentas con dinero, llega a Inversiones, y "Ver totales" muestra solo cuentas con dinero e inversiones aparte. |
| `credit-draw` | Un crédito rotativo en Créditos y cuotas marcado "Sí, es rotativo" aparece como origen en Mover, solo deja llegar al Banco principal, y la deuda sube lo mismo que el banco. |
| `date-range` | "Fechas" en Actividad abre el calendario; un atajo filtra los movimientos y el resumen muestra ingresos, gastos y balance de esas fechas. |
| `savings-goal` | Una meta en Patrimonio crea su bolsillo, dice cuánto apartar al mes, "Aportar" abre Mover hacia ese bolsillo y el avance sube con el saldo. |
| `dictate` | La barra "Díctaselo a Rumi" arriba en Agregar abre "Te escucho…", Cancelar la cierra sin llenar nada y sigue ahí en Ingreso. Lo que interpreta cada frase lo prueba jest (`dictation.test.ts`). |
| `ask-rumi` | En Análisis, una suma ("¿Cuánto gasté hoy?") sale sin etiqueta y un límite diario ("¿Cuánto puedo gastar hoy?") sale con "Estimación" y sus supuestos. Lo que responde cada pregunta lo prueba jest (`src/utils/ask/__tests__`). |
| `streak` | El chip del encabezado empieza en 0 y abre "Empieza tu racha hoy" con el recordatorio a las 20:00; un gasto lo sube solo a 1; "Compartir mi racha" abre la tarjeta para historias; el recordatorio pasa a las 21:00. Las reglas de la racha y los comodines las prueba jest (`streak.test.ts`). |

`subflows/` tiene pasos compartidos: `fresh-start` (datos limpios y onboarding con $1.000.000 en el banco; `CURRENCY: "USD"` elige dólares) y `quick-spend` (registro rápido con monto y descripción).

## Al escribir uno nuevo

- Preferir `id:` (los `testID` de la app: `add-fab`, `quick-amount`, `quick-note`, `category-search`, `flow-amount`, `flow-note`, `edit-note`, `dictate-bar`, `streak-chip`, `streak-reminder`, `streak-share`, `ask-input`, `ask-basis`, `streak-share-go`, `onboard-bank`, `repeat-amount`, `debt-name`, `debt-limit`, `debt-balance`) a coordenadas.
- iOS junta los textos de un botón en una sola etiqueta ("B, Banco principal, $1.000.000"): usar expresiones regulares y escapar `$`, `.` y paréntesis.
- El teclado numérico no tiene "Listo": tocar un título ("¿En qué?") lo cierra.
- El permiso de notificaciones de iOS puede salir al abrir la app recién instalada (pasa también en 1.10.2, sin investigar aún) o con el primer movimiento: `fresh-start` lo acepta con `tapOn: "Permitir"` `optional: true`, y los recorridos que registran algo lo repiten por si acaso.
- `maestro hierarchy` muestra las etiquetas que hay en pantalla.

## Rumi Pro (aparte)

`e2e/pro/limits.yaml` no corre con `npm run e2e`: necesita un build **Debug** con la llave del Test Store de RevenueCat (el SDK cierra un build Release que usa una llave `test_`).

1. `.env.local` (no se sube a git ni a EAS): `EXPO_PUBLIC_REVENUECAT_IOS_KEY=test_…`
2. `npx expo start` y compilar con `-configuration Debug` (mismo comando de arriba); instalar `Debug-iphonesimulator/Rumi.app`.
3. `E2E_FLOW=pro/limits npm run e2e`.

Comprueba: 5 preguntas gratis y la sexta abre Pro con los dos planes y sus precios ("Ahorra 44%"); la compra de prueba del anual da "Bienvenido a Pro", quita el contador y Ajustes dice "Rumi Pro · Activo".


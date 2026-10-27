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
| `category-search` | Con más de 10 subcategorías aparece el buscador, y lo escrito elige el destino. |
| `learn-correction` | Elegir otra categoría a mano enseña la descripción: la próxima vez va ahí. |
| `restore-auto-backup` | La copia del día se guarda con el primer movimiento y restaurarla trae ese estado. |
| `one-tap` | El botón de un toque dice el concepto (Café · Alimentación); lo escrito reemplaza el monto y el campo vacío registra el último. |
| `move-money` | Mover solo sale de cuentas con dinero, llega a Inversiones, y "Ver totales" muestra solo cuentas con dinero e inversiones aparte. |
| `dictate` | La barra "Díctaselo a Rumi" arriba en Agregar abre "Te escucho…", Cancelar la cierra sin llenar nada y sigue ahí en Ingreso. Lo que interpreta cada frase lo prueba jest (`dictation.test.ts`). |

`subflows/` tiene pasos compartidos: `fresh-start` (datos limpios y onboarding con $1.000.000 en el banco) y `quick-spend` (registro rápido con monto y descripción).

## Al escribir uno nuevo

- Preferir `id:` (los `testID` de la app: `add-fab`, `quick-amount`, `quick-note`, `category-search`, `flow-amount`, `flow-note`, `dictate-bar`, `onboard-bank`, `repeat-amount`) a coordenadas.
- iOS junta los textos de un botón en una sola etiqueta ("B, Banco principal, $1.000.000"): usar expresiones regulares y escapar `$`, `.` y paréntesis.
- El teclado numérico no tiene "Listo": tocar un título ("¿En qué?") lo cierra.
- `maestro hierarchy` muestra las etiquetas que hay en pantalla.

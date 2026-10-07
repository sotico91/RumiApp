# Rumi — Plan de mejoras

Ideas para ir ejecutando poco a poco. Se revisa al empezar cada sesión: elegir una, hacerla, probarla en el simulador y marcarla aquí.

Última revisión: 2026-10-06.

## Hecho (2026-10-06)

- **Idioma del teléfono desde el primer arranque:** el paquete de iOS declara inglés y español (`CFBundleLocalizations`). Antes, un iPhone en español abría Rumi en inglés.
- **Revisión del dinero al editar:** subir el monto de un gasto ya no deja una cuenta en negativo. Antes de revisar, se devuelve a la cuenta el dinero de ese mismo movimiento.
- **El motor aprende de las correcciones:** elegir otra categoría a mano, cambiarla al editar o tocar "Dejar así" enseña esa descripción. Guarda hasta 300 enseñanzas, que siguen a las subcategorías cuando se juntan (`taughtCategories`, `teach`).
- **Respaldo automático y silencioso en el teléfono:** una copia cifrada al día, se guardan las últimas 7 (`src/data/autoBackup.ts`). Se recupera en Ajustes → Restaurar respaldo. No necesita iCloud ni Drive.
  - Protege de errores y datos dañados.
  - Si se pierde el teléfono, solo la salva la copia del propio teléfono (copia de iCloud del iPhone o Copia de seguridad de Google), si está activada.

## Pendiente, por prioridad

### 1. Gráfica de tendencia por categoría
- Lo que pidió el usuario: que sea **legible y nada engorrosa**.
- Propuesta: en Historial, al tocar una categoría de "Gastado por categoría", mostrar sus últimos 6 meses como barras simples con el monto encima.
  - Una sola línea de texto arriba: "Alimentación: $X este mes, 20% más que el promedio".
  - Sin ejes complicados ni leyendas. El mes actual resaltado.
- Antes de escribirla, cargar la guía de gráficas (skill `dataviz`).

### 2. Recorridos de Maestro dentro del proyecto
- Guardar en el repo (`e2e/`) los flujos que hoy se probaron a mano en el simulador:
  - onboarding;
  - registro rápido con descripción;
  - buscador de categorías;
  - aprender de una corrección;
  - restaurar una copia automática.
- Correrlos antes de cada entrega. Así fallos como el de "Mercado" no llegan al teléfono.
- Receta del simulador: memoria `simulator-maestro`.

### 3. Gastos repetidos automáticos
- Netflix, arriendo o el plan del celular se registran solos el día que tocan, con confirmación de un toque.
- Ya existen las reglas de recordatorio y la detección de pagos mensuales (`predictMonthlySpends`, `suggestReminders`); falta convertirlas en registros.
- Cuidado: no agregar notificaciones nuevas. Usar las que ya existen.

### 4. Sincronizar dispositivos y hogar (proyecto grande)
- Hoy cada teléfono tiene sus propios datos: el Android y el iPhone no comparten nada.
- Para compartir un libro entre dispositivos o en pareja hace falta un servidor (cuentas, sincronización y conflictos). La base ya existe: cada movimiento guarda quién lo registró (`registeredById`).
- Decidirlo pronto si se va a usar en pareja, porque cambia cómo se guardan los datos.

### 5. Captura desde notificaciones del banco (solo Android, proyecto grande)
- Leer "Bancolombia le informa compra por $45.000 en Éxito" y proponer el gasto ya categorizado con el motor de sugerencias.
- Requiere un permiso sensible de lectura de notificaciones y cuidado con la privacidad. En iPhone no es posible.

### 6. Foto del recibo
- Adjuntar una foto al gasto y, más adelante, leer el monto de la foto.

## Descartado por ahora (decisión del usuario)

- **Botón de cuadre de cuentas** ("Mi banco dice $X"): no convence como UX.
- **Avisos al acercarse a un tope** (80% / 100%): demasiadas notificaciones empeoran la experiencia. Si se retoma, que sea solo dentro de la app, sin notificaciones.

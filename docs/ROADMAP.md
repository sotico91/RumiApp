# Rumi — Plan por fases

Se revisa al empezar cada sesión: tomar el siguiente punto de la fase actual, hacerlo, probarlo en el simulador y marcarlo aquí.
Lo ya entregado, con detalle, está en `CHANGELOG.md`.

Última revisión: 2026-10-23. **Fase actual: 1 — Estabilidad.**

## Fase 1 — Estabilidad (en curso)

Que lo que ya existe no se rompa al entregar y se sienta fluido.

- [x] **Recorridos de Maestro en el repo (`e2e/`):** onboarding, registro rápido, buscador de categorías, aprender de una corrección, restaurar una copia automática y mover dinero.
  Se corren antes de cada entrega con `npm run e2e` (ver `E2E.md`). Hecho el 2026-10-23.
- [ ] **Fluidez en Android real:** confirmar en el teléfono que Actividad y el cambio de pestañas ya no se traban (arreglo del 2026-10-23).
  Si sigue, perfilar en el teléfono antes de tocar más código.

## Fase 2 — Valor diario

Lo que hace que Rumi ahorre trabajo y explique mejor el dinero.

- [ ] **Gráfica de tendencia por categoría:** debe ser **legible y nada engorrosa**.
  - En Actividad, al tocar una categoría de "Gastado por categoría": sus últimos 6 meses como barras simples con el monto encima, el mes actual resaltado.
  - Una sola línea arriba: "Alimentación: $X este mes, 20% más que el promedio". Sin ejes complicados ni leyendas.
  - Antes de escribirla, cargar la guía de gráficas (skill `dataviz`).
- [ ] **Gastos repetidos que se registran solos:** Netflix, arriendo o el plan del celular, el día que tocan, con confirmación de un toque.
  - Ya existe la detección (`predictMonthlySpends`, `suggestReminders`); falta convertirla en registros.
  - Sin notificaciones nuevas: usar las que ya existen.

## Fase 3 — Publicar

Pasos en `STORE_CHECKLIST.md`. Al empezar la fase, anotar aquí cuáles ya están hechos.

- [ ] Cuenta de Apple Developer activa y Play Console registrada.
- [ ] Página de privacidad publicada en GitHub Pages.
- [ ] Builds de producción con EAS.
- [ ] TestFlight y prueba interna de Play antes de producción.

## Fase 4 — Proyectos grandes

- [ ] **Sincronizar dispositivos y hogar:** hoy cada teléfono tiene sus propios datos.
  - Hace falta un servidor (cuentas, sincronización, conflictos). La base existe: cada movimiento guarda quién lo registró (`registeredById`).
  - **Decidir pronto** si se usará en pareja: cambia cómo se guardan los datos.
- [ ] **Captura desde notificaciones del banco (solo Android):** leer "Bancolombia le informa compra por $45.000 en Éxito" y proponer el gasto ya categorizado.
  Requiere un permiso sensible y cuidado con la privacidad; en iPhone no es posible.
- [ ] **Foto del recibo:** adjuntarla al gasto y, más adelante, leer el monto de la foto.

## Hecho

- **2026-10-23:** mover dinero entre cuentas e inversiones; el dinero solo sale de cuentas con saldo; navegación más fluida en Android; respuestas de Rumi coherentes con Inicio.
- **2026-10-13:** dependencias al día con el SDK 57.
- **2026-10-06:** idioma del teléfono desde el primer arranque, revisar el dinero al editar, el motor aprende de las correcciones, respaldo automático en el teléfono.

## Descartado por ahora (decisión del usuario)

- **Botón de cuadre de cuentas** ("Mi banco dice $X"): no convence como UX.
- **Avisos al acercarse a un tope** (80% / 100%): demasiadas notificaciones empeoran la experiencia. Si se retoma, que sea solo dentro de la app, sin notificaciones.

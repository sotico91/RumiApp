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
- [ ] **Cierre reportado en la encuesta:** un tester en Android marcó "la app se cerró o tuvo un error" y también se enredó con cuentas y mover plata. Se le escribió el 2026-11-12 para saber en qué pantalla pasó; reproducirlo antes de arreglar.
- [ ] **Primer arranque más claro:** 2 de 9 testers se enredaron al configurar Rumi al principio. Preguntar qué parte (cuentas, día de pago, qué poner) antes de cambiar el onboarding.

## Fase 2 — Valor diario

Lo que hace que Rumi ahorre trabajo y explique mejor el dinero.

- [ ] **Gráfica de tendencia por categoría:** debe ser **legible y nada engorrosa**.
  - En Actividad, al tocar una categoría de "Gastado por categoría": sus últimos 6 meses como barras simples con el monto encima, el mes actual resaltado.
  - Una sola línea arriba: "Alimentación: $X este mes, 20% más que el promedio". Sin ejes complicados ni leyendas.
  - Antes de escribirla, cargar la guía de gráficas (skill `dataviz`).
- [ ] **Comparar meses:** 4 de 9 testers pidieron más gráficas y comparación entre meses, y "entender el mes" fue lo peor calificado (4,3 de 5). Va junto con la gráfica de tendencia de arriba: este mes contra el anterior y contra el promedio, en Actividad o Análisis.
- [ ] **Presupuesto por quincena:** 3 de 9 testers. Topes y "lo que te queda" por quincena (1–15 y 16–fin, o desde el día de pago), sobre lo que ya hace "Mi mes empieza el día".
- [ ] **Gastos repetidos que se registran solos:** Netflix, arriendo o el plan del celular, el día que tocan, con confirmación de un toque.
  - Ya existe la detección (`predictMonthlySpends`, `suggestReminders`); falta convertirla en registros.
  - Sin notificaciones nuevas: usar las que ya existen.
- [ ] **Pregúntale a Rumi, siguientes pasos del asesor** (plan completo y decisiones en `docs/ASK_ENGINE.md`; B, A, E y C salieron en 1.15.0/1.16.0):
  - **D. Contexto de conversación:** recordar la última pregunta (monto, periodo, concepto) para seguimientos como "¿y si gasto 300 mil?" (compararlo con el límite diario recién dado), "¿y el mes pasado?", "¿y en café?". En memoria de la pantalla, sin guardar en disco.
  - **F. Preguntas de aclaración:** cuando falta un dato que cambia la respuesta (monto, sin ingresos registrados, concepto ambiguo), responder con una pregunta corta, el porqué y opciones de un toque (`AskResult.clarify`). Nunca preguntar lo que ya se sabe.
  - **H. Set de evaluación:** preguntas reales es/en con casos ambiguos, datos incompletos o contradictorios y 3 perfiles de usuario (con sueldo fijo, ingresos variables, con deudas). Medir precisión de intención y montos exactos; crece con cada paso.
  - **G. Memoria de hábitos editable:** separar hábitos estables (≥3 meses) de ocasionales; que la persona vea y corrija lo aprendido ("Netflix no es suscripción", "el mercado no es un pago fijo") desde ajustes, sin tocar nunca los movimientos. Necesita pantalla nueva.
  - **Detector de pagos fijos:** `predictMonthlySpends` toma como fija cualquier categoría con 1–2 pagos al mes en 2 meses (en datos de prueba salieron Mercado y Transporte en "¿qué suscripciones tengo?"). Revisarlo con datos reales; G permitiría corregirlo a mano.
  - **Recurrentes por nota en la proyección:** "próximos 30 días" y la proyección del mes no cuentan los pagos repetidos por nota (Netflix en una categoría hormiga). Decidir si se suman, cuidando que no cambie de golpe la cifra que muestra Inicio.
  - **Panorama del mes:** una respuesta tipo resumen ("¿cómo van mis finanzas?") que junte disponible, cuentas que faltan, margen diario y topes en riesgo.

- [x] **Mes desde el día de pago y chip de fecha** (1.7.0).
- [x] **Pro: plan para salir de deudas y "¿me alcanza?" a futuro** (1.7.0).
- [x] **Pro: exportaciones (1.8.0).** Excel por año (SheetJS, sin módulo nativo): hoja "Resumen" con los 12 meses y una hoja por mes; si hay varios años, primero "¿De qué año?". Exportar CSV y exportar respaldo JSON pasan a Pro (`ProFeature` `export`); restaurar un respaldo y las copias automáticas siguen gratis. Detalle en docs/PRO.md.
- [x] **Metas de ahorro (1.10.0):** cada meta usa un bolsillo de Patrimonio y avanza con su saldo; "Aportar" abre Mover hacia ese bolsillo; con fecha, dice cuánto apartar al mes. 1 meta gratis, ilimitadas con Pro. La pidieron 7 de 9 testers en la encuesta del 2026-11-10.
- [x] **Filtro por fechas en Actividad (1.10.0):** "Fechas" junto a Hoy / Esta semana / Este mes abre un calendario (primer día, último día) y atajos (7 días, 30 días, este año).
- [ ] **Pro, siguientes:** "Tu mes en Rumi" (resumen al cerrar el mes, compartible); resumen para la declaración de renta (patrimonio y deudas al 31 de diciembre, ingresos del año). Después, captura desde notificaciones del banco (Fase 4).

### Encuesta a testers (2026-11-10/11, 9 respuestas)

Google Form de la prueba cerrada (`marketing/encuesta/`). Les gustó 4,7/5; anotar un gasto 4,7; entender el mes 4,3. NPS +56 (6 promotores, 2 neutros, 1 detractor). Uso: 2 casi a diario, 5 varias veces por semana, 1 semanal, 1 pocas veces. Antes de Rumi: 6 usaban Excel o Sheets, 3 no llevaban sus gastos.

| Pedido | Votos | Dónde quedó |
|---|---|---|
| Metas de ahorro | 7 | Hecho (1.10.0) |
| Leer notificaciones del banco o Nequi | 4 | Fase 4 |
| Más gráficas y comparar meses | 4 | Fase 2, "Comparar meses" |
| Varios teléfonos o computador | 3 | Fase 4, sincronizar |
| Compartir con pareja o familia | 3 | Fase 4, sincronizar |
| Presupuesto por quincena | 3 | Fase 2 |
| Contraseña al entrar | 1 | Ya existía el bloqueo; el tip de seguridad de 1.10.0 lo muestra |
| Filtrar por rango de fechas | 1 | Hecho (1.10.0) |
| Widget, varias monedas a la vez, más categorías por defecto | 1 c/u | Sin plan |

Dónde se enredaron: configurar al principio 2, cuentas y mover plata 2, la app se cerró 1, elegir la categoría 1, registrar una deuda 1, Pregúntale no entendió 1, encontrar cada cosa 1. Precio y Pro: ver `PRO.md`.

## Fase 3 — Publicar

Pasos en `STORE_CHECKLIST.md`. Al empezar la fase, anotar aquí cuáles ya están hechos.

- [ ] Cuenta de Apple Developer activa y Play Console registrada.
- [ ] Página de privacidad publicada en GitHub Pages.
- [ ] Builds de producción con EAS.
- [ ] TestFlight y prueba interna de Play antes de producción.
- [ ] Prueba cerrada de Play: 12 testers durante 14 días. Invitación lista: `docs/probar.html` (QR) y el video `rumi-pruebame-es`. Grupo de testers: https://groups.google.com/g/rumiapptester (rumiapptester@googlegroups.com); agregarlo en Play Console → Prueba cerrada → Testers.
- [x] **Listo para dólares (ejercicio en inglés + USD del 2026-10-27):** sumas, centavos, topes, cuotas y "Ask Rumi" funcionan en USD. Arreglado el mismo día: el onboarding preselecciona USD si el teléfono es de una región con dólar (EE. UU., Ecuador, Panamá, El Salvador, Puerto Rico…); en USD las billeteras sugeridas son PayPal, Venmo y Cash App; los textos con CDT, credicheque o "200 mil" tienen versión en dólares (es y en); la política de privacidad nombra "Reportar un error" como en la app.

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

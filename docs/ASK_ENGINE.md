# Pregúntale a Rumi: motor de preguntas

Cómo funciona el motor de "Pregúntale a Rumi", qué se encontró en la auditoría del 2026-11-18 y el plan para llevarlo a un asesor financiero conversacional. Código en `src/utils/ask/`.

## Cómo funciona hoy

- **Todo con reglas y en el teléfono.** No hay LLM: los datos no salen del dispositivo, no hay costo por pregunta y responde en milisegundos. Los montos se calculan con código determinístico (`financeMath.ts`, `projection.ts`), nunca se estiman con un modelo.
- **Flujo:** `askRumi` → `parseQuery` (normaliza el texto, detecta qué se pide con `lexicon/{es,en}.ts`, el periodo con `period.ts`, conceptos, medio de pago y palabra de nota) → `HANDLERS` en orden; responde el primero que acepta. El orden es la prioridad.
- **`snapshot.ts` (desde 1.15.0):** las cifras del mes en un solo lugar, calculadas una vez por pregunta (`ctx.snapshot()`): disponible, cuentas pendientes, margen, ritmo y proyección. Todas las respuestas que hablan de "lo que queda" usan estas cifras.
  - `incomeRoom = ingresos − gastado − cuentas pendientes` (lo que el ingreso del mes aún cubre).
  - `cashRoom = disponible − cuentas pendientes`.
  - `room` = el menor de los dos; `perDay = room / días que faltan`.
  - `projectedLeft = incomeRoom − gasto del día a día que falta a tu ritmo`. Así "puedo gastar hoy", "puedo comprar X", "me queda" y "fin de mes" encadenan los mismos números.
- **Datos vs estimaciones:** disponible, gastado e ingresos son datos. Cuentas pendientes (deducidas del historial y de las deudas), ritmo y proyección son estimaciones y las respuestas lo dicen ("a tu ritmo habitual", "estimación", "cerca de").

## Auditoría (2026-11-18)

Se pasaron 15 preguntas reales por el motor. Encontrado:

1. **Respuestas falsas:** la palabra después de "por/a/para" se tomaba como búsqueda en notas ("¿por **qué**…?", "a **final** de mes") y, si nada más respondía, salía "Coincidencias de 'que': $0". Corregido en 1.15.0.
2. **Cifras que no cuadraban:** "¿cuánto puedo gastar?" y "¿puedo comprar X?" calculaban "lo que queda" cada una a su manera. Corregido con `snapshot.ts`.
3. **Sin contexto entre preguntas:** "¿y si gasto 300 mil?" no sabe de qué se hablaba.
4. **Faltan intenciones de asesor:** por qué tengo menos, en qué me paso, cuánto debería ahorrar, recurrentes/suscripciones, obligaciones próximas.
5. **Presupuesto solo binario:** dice si un tope se pasó, no el ritmo frente al mes.
6. **Periodos:** faltaban quincena y próximos N días. Agregados en 1.15.0.
7. **Sin nivel de certeza explícito** en el resultado (`AskResult`).
8. **Nunca pregunta:** cuando falta un dato devuelve un texto fijo.
9. **Hábitos sin memoria editable:** `habits.ts`, `predictMonthlySpends` y `antSpendTips` se calculan en cada consulta; no se pueden ver ni corregir.
10. **Mantenibilidad:** prioridad por orden de 29 handlers y palabras por subcadena; pocas pruebas por intención.

## Plan

| Paso | Qué | Estado |
|---|---|---|
| B | Parser: sin "$0" falsos, "por qué" no responde con totales, quincena, próximos N días, "final de mes" | 1.15.0 |
| A | `snapshot.ts`: una sola fuente para disponible, cuentas pendientes, margen, ritmo | 1.15.0 |
| E | Certeza por respuesta: dato / estimación / inferencia, con supuestos | pendiente |
| C | Handlers de asesor: por qué, en qué me paso, cuánto ahorrar, panorama, recurrentes, próximas cuentas, presupuesto con ritmo | pendiente |
| D | Contexto de conversación (`AskSession`): seguimientos tipo "¿y si…?" | pendiente |
| F | Preguntas de aclaración con opciones cuando falta un dato que cambia la respuesta | pendiente |
| H | Set de evaluación: precisión de intención y montos exactos, casos ambiguos, 3 perfiles | crece en cada paso |
| G | Memoria de hábitos editable (estable ≥3 meses vs ocasional), sin tocar movimientos | pendiente |

## Decisiones

- **Sin LLM por ahora.** Privacidad (datos solo en el teléfono), costo cero, sin latencia de red y cálculos exactos. Un LLM solo tendría sentido para redactar, nunca para calcular, y queda como fase opcional.
- **No reescribir:** se conservan `parseQuery` + `HANDLERS`; los cambios son incrementales y cada paso sale con pruebas.
- **El efectivo puede ser el límite:** si hay menos dinero en las cuentas que lo que el ingreso del mes cubre, "¿cuánto puedo gastar?" usa el efectivo y dice ambas cifras. "¿Puedo comprar X?" usa el plan del mes y avisa aparte si hoy no alcanza el disponible.
- **Quincena = mitades del calendario** (1–15 y 16–fin), no el mes de pago configurado.
- **Próximos N días:** gasto del día a día al ritmo habitual × N, más las cuentas fijas que vencen en esa ventana (`fixedDueBetween`: las pendientes de este mes y las de meses siguientes en su día habitual).

# Rumi — Historial de cambios

Resumen de lo que se ha hecho en la app, del más reciente al más antiguo, para tener el contexto a mano.
El detalle de cada cambio está en `git log`.

## Reglas generales

- **Sin coautores de IA en git:** ningún commit ni PR lleva `Co-Authored-By` de Claude ni de otra IA, ni líneas como "Generated with…".
  El autor es siempre la persona del repo.
- **Comentarios de código en inglés:** todos los comentarios del código van en inglés.
  Los textos que ve el usuario van en `src/i18n/translations.ts` (es/en).

## 2026-10-06

- **Recordatorios sugeridos en Plan:**
  - Los pagos que haces cada mes y aún no tienen recordatorio aparecen en "Te sugerimos", con el día habitual y el monto. Salen de "Pagos a vigilar" y nunca incluyen hormigas.
  - "Recordármelo" crea un recordatorio mensual el día anterior, a las 9:00. "Ahora no" lo descarta para siempre (`reminderSuggestionsDismissed`).
  - Con la sección plegada, el resumen dice cuántas sugerencias hay.

- **El vencimiento de una deuda ya no se corre al día del pago:**
  - Antes, pagar el 8 una cuota del 20 dejaba el próximo vencimiento el 8 del mes siguiente.
  - Ahora cada pago cubre el vencimiento más cercano (con 10 días de margen para pagos atrasados) y la fecha pasa al siguiente con el mismo día de pago.
  - Un segundo pago o abono en el mismo ciclo no adelanta otro mes.
  - Deshacer o editar el pago devuelve la fecha (`nextDueAfterPayment` / `dueBeforePayment` en `payDay.ts`).

- **Recordatorios de deudas en Plan:**
  - Cada deuda activa (cuota o tarjeta) avisa la mañana anterior a su vencimiento, a las 9:00: "Mañana vence el pago de Moto: $300.000".
  - No avisa si ese mes ya está pago. Un pago parcial recuerda lo que falta, y en tarjetas sin cuota fija cualquier pago del mes cuenta.
  - Vienen activados. En "Cuotas y deudas" se apagan uno por uno (`debtRemindersOff`).
  - Al tocarlo se abre el pago de esa deuda con la cuota sugerida.
- **Conceptos hormiga fuera del selector de recordatorios**, porque no se pagan con calendario.
  Los pagos que se repiten salen primero, y un recordatorio nuevo empieza mensual, en el día en que sueles pagarlo.

- **Recordatorios de Plan que saben si ya pagaste:**
  - Antes eran repeticiones fijas del sistema.
  - Ahora `ReminderScheduler` programa avisos con fecha (7 días para los diarios, 3 meses para los mensuales).
  - Se replanifican al abrir la app y al registrar un movimiento, aplicando solo lo que cambió.
  - El mes ya pagado no avisa y un pago parcial recuerda lo que falta.
  - El diario no avisa si ese concepto ya se registró hoy.
- **Monto habitual en el aviso:** "¿Ya pagaste la administración? Suele ser $300.000." Sale de "Pagos a vigilar" o de la mediana de meses o pagos anteriores.
  Al tocarlo, Agregar abre con ese monto ya puesto.
  Si los montos están ocultos (ojo), el aviso no lleva monto.
- La lógica está en `src/utils/reminderPlan.ts`, con pruebas.
  `useSettings` solo guarda las reglas y `ReminderHygiene` se reemplazó por `ReminderScheduler`.

- **Pregúntale a Rumi entiende más periodos:** "la semana pasada", "últimos 7 días", "hace 15 días" y "el fin de semana".
  Antes estas frases se respondían en silencio con el periodo por defecto.
- **Comparar un concepto:** "¿café vs el mes pasado?" compara el café de ambos meses, y "¿gasté más esta semana que la pasada?" también se reconoce.
  La semana se compara contra el lunes a domingo anterior, cortado al mismo tiempo transcurrido.
- **Varios conceptos a la vez** ("café y delivery") y **búsqueda en notas** cuando la palabra no es un concepto ("¿cuánto gasté en pizza?").
- **Ahorro negativo con palabras claras:** "Gastaste X más de lo que te ingresó" en vez de "Ahorraste −X".
  "¿Cuánto me queda?" responde primero con el disponible de hoy y luego con cómo cerraría el mes.
- **Proyección del mes más precisa (`projectMonth`):**
  - El ritmo diario mezcla el mes actual con el de los últimos 3 meses, y el mes actual pesa más a medida que avanza.
  - Respeta los hábitos por día de la semana, por ejemplo sábados más caros.
  - Las compras puntuales (muy por encima de lo normal y sin parecidas en su concepto) cuentan una sola vez y no se extrapolan.
  - Con historial previo, la estimación deja de marcarse como "temprana".
- **Motor de preguntas reorganizado en `src/utils/ask/`** (antes era una función de ~800 líneas en `smartInsights.ts`):
  - `parse.ts` convierte la pregunta en periodo, conceptos, método de pago e intenciones, sin calcular nada.
  - `handlers.ts` tiene un manejador por intención; su orden en `HANDLERS` es la prioridad del motor.
  - `lexicon/es.ts` y `lexicon/en.ts` guardan las palabras clave por idioma.
  - `period.ts`, `categories.ts`, `signals.ts`, `ledger.ts`, `percent.ts`, `planning.ts` y `suggestions.ts` agrupan lo demás.
  - `smartInsights.ts` queda solo con las tarjetas de Insights y reexporta el motor.
- **`askRumi` devuelve una respuesta estructurada:** texto, qué entendió (concepto y periodo), qué manejador respondió, los movimientos detrás y preguntas de seguimiento.
  `answerFinanceQuery` sigue devolviendo solo el texto.
- **Pregúntale a Rumi en Insights:**
  - Muestra "Entendí: Café · Este mes".
  - "Ver N movimientos" despliega los movimientos que suman la respuesta.
  - "Sigue preguntando" ofrece chips de seguimiento.
  - Las preguntas y las tarjetas usan solo tus movimientos, como el resto de la pantalla.
  - Las tarjetas ya no se recalculan en cada render.
- **Tabla de pruebas del motor** (`src/utils/ask/__tests__/askRumi.test.ts`): unas 20 preguntas con la intención y el periodo esperados.
- **Publicar APK no reutiliza builds viejos:** `publish-apk-lan.sh` se niega a publicar una APK más antigua que el último commit, porque una compilación fallida dejaba la anterior con el nombre del commit nuevo.
  Para forzarlo: `RUMI_PUBLISH_STALE=1`.

## 2026-10-05

- **APK más liviano: de 24.6 MB a 21.9 MB.** El APK llevaba 57 fuentes y ahora lleva 8.
  Las fuentes se importan por peso (`@expo-google-fonts/dm-sans/400Regular`…) y los íconos por familia (`@expo/vector-icons/MaterialCommunityIcons`), porque el índice del paquete metía las 18 variantes y las 19 familias.
  Ionicons se cambió por MaterialCommunityIcons, y el nuevo `AppSymbol` usa SF Symbols en iOS y MaterialCommunityIcons en Android.
  `ensure-android-release-props.sh` limpia los recursos generados por Gradle antes de cada APK, que arrastraban fuentes de builds viejos.
- **Código sin uso eliminado:** `LanguageSwitcher`, `SummaryCard`, `src/data/storage.ts` (la migración vive en `financeStorage`) y los restos de la plantilla de Expo (`components/`, `constants/`, `SpaceMono`).
- **Pagos a vigilar aprende tus pagos mensuales:** busca en los últimos 6 meses los conceptos que pagas una o dos veces al mes (administración, recibos, seguro de la moto…), en al menos 2 meses y con un pago reciente.
  Deja fuera los gastos de todos los días (más de 2 pagos al mes) y los marcados como hormiga.
  Cuando pagas uno este mes pasa a "Ya pagados" con lo que realmente pagaste; varios pagos al mismo concepto se suman ("2 pagos").
  Lo pendiente muestra el total típico del mes, y una cuota con abono parcial dice "Llevas $X de $Y" y cuánto falta.
  La proyección del mes ahora suma solo lo que falta por pagar.
- **Una sola fuente de colores:** `palette` (nombres antiguos) se construye ahora desde `src/theme/tokens.ts`, así que las pantallas viejas ya no pueden quedar con otro tono.
  Se quitaron colores sin uso (`bgDeep`, `surface`, `accentGlow`, `coral`), y el teal para texto y el color de sombra pasan a ser tokens.
- **Patrimonio dividido:** `wealth.tsx` pasa de 1 472 a 218 líneas, sin cambios de comportamiento.
  Las piezas están en `src/components/wealth/`: `PocketsSection` (cuentas), `DebtCard`, `DebtForm` con `useDebtForm`, `OptionChips` y `styles`.
  Los cálculos del día de pago están en `src/utils/payDay.ts`, con tests.
- **Estados vacíos con un siguiente paso:** nuevo componente `EmptyState` (ícono, título, texto y una acción).
  Historial sin movimientos ofrece "Registrar un gasto"; en un mes pasado sin movimientos solo lo dice.
  Análisis sin datos explica qué va a mostrar y ofrece la misma acción.
- **Texto grande del sistema:** el texto normal crece hasta 1.8×; los títulos, montos y etiquetas de pestañas hasta 1.3×, y los montos que se escriben hasta 1.2×.
  Así con tamaños de accesibilidad nada se sale de la pantalla (`maxFontSizeMultiplier`, validado con la documentación de React Native en Context7).
- **Ícono con la R de Rumi:** el sello del billete coral lleva una "R" en Fraunces, como el monograma de un billete; la carita sale del ícono porque se veía genérica.
  La cara vive solo en la animación de inicio: la R se desvanece y en el mismo sello aparecen los ojos, el guiño y la sonrisa.
  El generador escribe `splash-blank.png` (billete sin sello) y `splash-monogram.png` (solo la R) para esa transición, y `splash-icon.png` con la R para el splash nativo.
- **Borrar con Deshacer:** borrar un movimiento ya no pide confirmación; se borra al momento y la tarjeta inferior muestra "Movimiento borrado" con un botón **Deshacer** durante 6 segundos.
  Deshacer devuelve el movimiento con su mismo id y fecha, y reaplica su efecto en saldos y deudas (`restoreTransaction`).
- **Inicio más simple:** sin la línea "Espacio de gastos de…".
  La billetera flotante de la cabecera se mantiene: abre el desglose de efectivo, bancos y billeteras.
  "Merece atención" solo aparece cuando hay topes superados, y abierta.
  "Pagos a vigilar" se oculta si no hay pagos previstos.
  Orden: el mes, el registro rápido, las alertas, los pagos y al final los consejos.
- **Topes en 0 %:** en Plan solo se listan con barra los topes que ya tienen gasto; los que no, van en una línea ("3 topes sin gastos aún: …").
- **APK por LAN:** `publish-apk-lan.sh` publica el APK más reciente entre la carpeta de caché y `android/app/build`.
  Después de un `expo prebuild` se estaba publicando el APK anterior, y por eso en Android no se veía el logo nuevo.
- **Logo nuevo, billetes en abanico:** el billete petróleo va detrás y el coral delante, los dos con borde y sello como un billete real.
  El sello del billete coral lleva la cara de Rumi, como el retrato de un billete.
  Los billetes cruzados en X se leían como "cancelar" o como una curita.
  Todo sale de `scripts/generate-papel-icon.swift`: ícono de iOS (claro, oscuro y tintado), ícono adaptativo de Android (frente, fondo y monocromo), ícono de notificación, favicon y splash.
  El splash animado dibuja los ojos, el guiño y la sonrisa sobre el sello del billete.
- **Agregar abre directo el gasto rápido:** el "+" abre el formulario de una pantalla (monto, en qué, de dónde, guardar) en lugar de las tarjetas "¿Qué pasó?".
  Arriba hay un selector Gasto | Ingreso | Mover | Deuda: los otros tipos abren el modo guiado en su primera pregunta, y "Atrás" vuelve al gasto rápido.
  Las plantillas y el modo guiado quedan en un enlace bajo el botón de guardar.
  Pagar una deuda desde Patrimonio y los recordatorios siguen entrando directo a su flujo.
- **Contraste (WCAG AA):** el coral de acción pasa de `#FF6B4A` a `#CF3E1E`, con un contraste de 4.8:1 con texto blanco (antes 2.8:1).
  El rojo de error pasa a un carmesí (`#B3263F`) para que no se confunda con el coral.
  El verde de éxito pasa a `#1A8158`, y el texto teal usa `palette.tealText` (`#1E7F75`); el teal claro queda solo para fondos e íconos.
  Los colores de las categorías no cambian.
- **Texto mínimo de 12px:** etiquetas de pestañas, insignias y encabezados pequeños suben de 9–11px a 12px.
- **Modo claro fijo:** `userInterfaceStyle: light` (`app.json`, `Info.plist`, Android `strings.xml`).
  Así el teclado y las cabeceras nativas ya no salen oscuros sobre pantallas claras.
- **Inicio:** mientras carga, Ingresos, Gastos y Ahorro muestran una barra en lugar de "$0".
- **Lectores de pantalla:** los botones tienen rol de botón, y los chips y opciones anuncian si están seleccionados.
  Guiado/Avanzado se anuncia como pestañas y los recordatorios como opciones de radio.
  En la hoja para elegir subcategoría de recordatorios, VoiceOver ya puede llegar a cada fila (antes leía toda la hoja como un solo elemento).

## 2026-10-04

- **Teclado sobre las cajas de texto:** el campo con foco siempre sube por encima del teclado.
  Ahora se tiene en cuenta el borde de la hoja o modal (no solo el teclado), se vuelve a revisar al pasar de un campo a otro con el teclado abierto, y los campos de varias líneas muestran su parte de arriba.
  El onboarding y la hoja de repetir gasto usan el mismo scroll seguro (antes la hoja subía a la nota aunque el foco estuviera en "nueva billetera").
  En iOS ya no queda una altura de teclado fantasma al cerrarlo.

## 2026-10-03

- **Diálogos propios (`appAlert`):** todos los `Alert.alert` nativos se cambiaron por un diálogo con el estilo de Rumi.
  Tiene un icono con tono (peligro, aviso, éxito, info), título en Fraunces y botones de la app (rojo para acciones destructivas).
  Un host vive en la raíz y otro dentro de la pantalla Agregar, porque en iOS esa pantalla es un modal nativo.
- **Borrar movimiento:** el diálogo muestra el movimiento (icono, categoría, nota/tipo, fecha y monto) y explica que el saldo se ajusta y no se puede deshacer.
- **Confirmación al guardar:** la alerta nativa ("Listo / OK") se cambió por una tarjeta animada (`SaveToast`).
  Muestra el icono y el color de la categoría, el monto guardado y el total del día, tiene una barra de cierre y vibra al aparecer.
  Se cierra sola o al tocarla.
  Aparece abajo, sobre la barra de pestañas, para que el banner de la notificación del sistema (arriba) no la tape.
- **Editar movimiento:** las categorías se eligen en dos pasos, como en Agregar.
  Primero una fila horizontal de categorías y luego solo sus subcategorías, con buscador cuando hay más de 10.
- **Datos cifrados:** los datos de dinero se guardan cifrados y los movimientos se separan por mes.
  Solo se cifra si una prueba de ida y vuelta sale bien; si no, los datos quedan en texto plano.
  Se arregló que Home se quedara cargando cuando no había movimientos.
- **Sistema de diseño:** tokens de tema (`src/theme`), primitivas de UI y DM Sans Bold.
  Home tiene un hero petróleo con el disponible y cuerpo crema; las pestañas comparten el encabezado petróleo.
- **Navegación:** barra de pestañas clara con Agregar en el centro; el ojo de privacidad pasa a los encabezados.
  El avatar abre una hoja de Ajustes agrupada y las alertas vienen apagadas por defecto.
- **Onboarding:** elegir gastos hormiga, ver el saldo y registrar un primer gasto.
- **Plan:** límites y gastos hormiga agrupados por categoría. **Patrimonio:** primero se crea y luego se listan las cuentas por tipo.
- **Splash:** la sonrisa se dibuja como un arco con puntas afinadas. Las pestañas abren sin parpadeo la primera vez.
- **APK en LAN:** script `npm run android:apk:lan`, que sirve cada build con un nombre único.

## 2026-10-02

- **Nombre:** todo se renombró de Billing a Rumi; el repo y la política de privacidad apuntan a `sotico91/RumiApp`.
- **Versión:** la app se versiona como v1.0 y la versión aparece en el pie de Plan.
- **iOS:** bundle id `com.sotico91.rumi`.
  Se arregló que la app se congelara en iOS 27: los modales se dibujan en una capa raíz (`ModalHost`) en lugar de RN Modal.
- **Respaldos:** respaldos y almacenamiento más robustos, con tests.
  En Android los respaldos y CSV se comparten como archivos reales, con nombre `Rumi_<Nombre>_<YYYY-MM-DD_HH-mm>.json`.
- **Cálculos:**
  - Se corrigió el manejo de USD y el redondeo de centavos.
  - Se arreglaron cálculos engañosos en Entender.
  - Ahora hay proyección de fin de mes y consejos de compra y recorte en Pregúntale a Rumi.
- **Idioma:** categorías y subcategorías por defecto se traducen al cambiar de idioma. Se pulió el texto en inglés.
- **Agregar:**
  - Registro de gasto en una sola pantalla.
  - Volvieron las tarjetas "¿Qué pasó?" y "Gasté" abre el formulario rápido.
  - Se preselecciona la última subcategoría.
  - Los selectores de categoría escalan a muchas categorías con buscador y una sola fila.
- **Home:** gira en torno a "cómo voy este mes"; "pagos a vigilar" están ordenados y la lista "Hoy" se quitó.
- **Primer uso:** onboarding de 3 pasos y 2 coach marks.
- **Patrimonio:** títulos legibles, inversiones con nombre y varias por usuario.
- **Categorías:** tienen iconos y las subcategorías pueden tener su propio color.

## 2026-09-24 a 2026-10-01

- **Deudas:**
  - Los préstamos pagados quedan en Actividad.
  - La app pregunta si un pago extra salda la deuda.
  - Los pagos de deuda se confirman con una notificación.
  - Tarjetas y credicheque aceptan pago total.
- **iOS 27:** React Native arranca desde un scene delegate y el boot splash guiña y sonríe.
- **Bolsillos:**
  - Los gastos pueden salir de cualquier bolsillo.
  - Los saldos se reconstruyen desde el libro de movimientos.
  - Los saldos son editables en Patrimonio.
- **Tarjetas:** los cargos con tarjeta cuentan como gasto sobre el cupo; el efectivo solo se mueve al pagar la tarjeta.
  Tarjetas y préstamos van separados en Patrimonio.
- **Recordatorios:** sugieren un recorte semanal suave de gastos hormiga, y los de facturas nombran el concepto.

## 2026-09-02 a 2026-09-15

- **Billeteras:** Nequi, Daviplata, etc. son billeteras virtuales con nombre y saldo propio, sin límite de cantidad.
  Se pueden renombrar o eliminar.
- **Sobregiros:** ya no hay sobregiros de la cuenta principal si quedan saldos en billeteras o ahorros.
- **Entender:** responde sobre otros meses y años.
- **Face ID:** no se pide en saltos de un minuto, pero siempre después de cerrar la app.
- **Rumi:** la app pasó a llamarse Rumi, con la marca crema de billetes cruzados.
  Diario de registro de 14 días y guía "Cómo usar".

## 2026-08-10 a 2026-08-29

- **Base:**
  - App Expo + iOS nativo con Home, Plan, Actividad, Entender y Patrimonio.
  - Privacidad de montos.
  - Predicciones de gasto mensual, respaldo y restauración, bloqueo con Face ID / huella.
- **Android:** ruta de build para Android y APK.
- **Gastos de un toque:** chips en Home ordenados por frecuencia, con repetición por subcategoría.
- **Notificaciones:** confirmaciones sin duplicados y con ids únicos en Android.
- **Tiendas:** preparación para App Store y Play Store, con la política de privacidad dentro de la app.

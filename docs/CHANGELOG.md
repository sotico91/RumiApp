# Rumi — Historial de cambios

Resumen de lo que se ha hecho en la app, del más reciente al más antiguo, para tener el contexto a mano.
El detalle de cada cambio está en `git log`.

## Reglas generales

- **Sin coautores de IA en git:** ningún commit ni PR lleva `Co-Authored-By` de Claude ni de otra IA, ni líneas como "Generated with…".
  El autor es siempre la persona del repo.
- **Comentarios de código en inglés:** todos los comentarios del código van en inglés.
  Los textos que ve el usuario van en `src/i18n/translations.ts` (es/en).

## 2026-10-26

- **Dictar cualquier movimiento:** el micrófono pasa a una barra "Díctaselo a Rumi" arriba en Agregar, encima de Gasto/Ingreso/Mover/Deuda. Un gasto llena el formulario rápido; lo demás abre su flujo guiado ya lleno y salta al primer paso que falte. Ingreso: "me pagaron la quincena" elige Salario (también Bonos, Reembolsos, Freelance). Mover: "pasé 200 mil de Nequi a ahorros" (de dónde y a dónde), "saqué 100 mil del cajero" (banco → efectivo), "ahorré", "invertí". Deuda: "aboné 300 mil a la tarjeta", "pagué la cuota del carro" (por el nombre de la deuda; si hay una sola, esa); "pagué con la tarjeta", "gasolina del carro" y "cuota de administración" siguen siendo gastos. La fecha dictada vale para todos los tipos y se ve en el resumen. Si escuchar falla al arrancar, Rumi prueba otra forma (en el teléfono → reconocedor del sistema → sin procesamiento de voz) y solo pide permisos cuando de verdad faltan.
- **Dictar un gasto:** en Agregar hay un micrófono junto al monto. Rumi escucha la frase ("gasté veinte mil en almuerzo con Nequi ayer"), muestra lo que oye y llena monto, descripción (que elige la categoría), cuenta y fecha; la persona revisa y guarda. "Ayer", "antier", "hace 3 días" o "el sábado" se vuelven la fecha real contada desde hoy, se ven en un chip (con ✕ para volver a hoy) y el gasto se guarda con esa fecha. Un ingreso dictado abre el flujo de ingreso con el monto. Contra el ruido: en iOS el micrófono usa el procesamiento de voz del sistema (quita ruido de fondo y eco), el reconocedor recibe el vocabulario de Rumi (cuentas, categorías, "mil", "lucas"), se piden varias versiones y gana la que tiene sentido como gasto, y en Android los límites de silencio cortan la toma al terminar de hablar. Reconoce en el teléfono cuando el idioma está instalado; si eso falla al instante, usa el reconocedor del sistema. `expo-speech-recognition` (módulo nativo): Android ya pide `RECORD_AUDIO`, iOS tiene los textos de permiso, y la política de privacidad explica el micrófono.
- **Intérprete de gastos dictados (primer paso del registro por voz):** `src/utils/dictation.ts` lee una frase como "gasté veinte mil en almuerzo con Nequi ayer" y saca tipo (gasto o ingreso), monto (cifras, "20 mil", palabras, "lucas", "palos", "un millón doscientos", "20 000", dólares con centavos), cuenta (nombre propio o "efectivo", "con la tarjeta", "débito"), fecha ("ayer", "antier", "hace 3 días", "el sábado") y la nota limpia para que `suggestCategory` elija la categoría. Todavía no hay micrófono ni pantalla; eso viene después.
- **Pulido para que nada se vea genérico:** Inicio sin etiquetas en mayúsculas (Disponible hoy, Este mes, Ingresos, Ver totales; el estilo `overline` ahora es frase normal en toda la app). Cero en pesos se muestra "$0" como las demás cifras, no "$0,00". Actividad dice "Octubre de 2026", no "Octubre De 2026". La guía no deja hueco en el primer ítem. En "Todos los gastos" las cifras van en tinta (no todo en rojo), sin la etiqueta "Gastos" repetida y con la flecha junto al monto. "Corregir movimiento" ya no repite el monto en pequeño. Los radios de hojas, avisos y selectores salen de la escala de `tokens.ts`, y la hoja de repetir gasto usa `sheetStyles`.

## 2026-10-25

- **Resto de modales con el mismo estilo:** "Corregir movimiento", "Todos los gastos/ingresos" y "Cómo usar Rumi" son hojas pegadas abajo con agarradera, títulos en frase normal (sin mayúsculas forzadas) y la opción elegida con borde en vez de relleno coral. El total del resumen es una cifra sobre la página, sin caja de color; la guía es una lista numerada con separadores en vez de tarjetas grises. Los avisos llevan el ícono pequeño junto al título en vez de un círculo encima. Estilos compartidos en `src/components/ui/sheet.ts`.
- **Hoja "Repetir gasto" con diseño propio:** pegada al borde de abajo (ya no flota ni tapa la barra de estado), con agarradera. Sale la etiqueta en mayúsculas "REPETIR GASTO"; "Gasto hormiga" pasa de píldora a texto ámbar junto a la categoría. El monto va grande, sin caja, sobre una línea como en un recibo, con "La última vez $X" debajo. Solo "Registrar" es coral: "Con plata / Con tarjeta" es un selector segmentado y el bolsillo ya conocido se ve como una línea. Las variantes `quiet` de `SpendSourcePicker` y `AccountChoiceChips` lo hacen posible sin tocar otras pantallas todavía.
- **"¿Gasté más que el mes pasado?" ya no responde por "Mascota":** el motor de preguntas leía "más" como el comienzo de una subcategoría (Mascota). Ahora las coincidencias parciales piden al menos 4 letras en la palabra de la pregunta.
- **Gastos en un toque dicen qué es:** cada botón muestra primero el concepto (Café, Netflix) y debajo, más pequeña, su categoría, con el color de la subcategoría; antes se cortaba en "Alimentaci…".
  Bajo una subcategoría "General", cada descripción es su propio botón (Almuerzo y Desayuno por separado).
- **Repetir un gasto es tocar, cambiar el valor y listo:** la hoja abre con el teclado en el monto y "Registrar $X" justo debajo, por encima del teclado; vacío registra el último monto (que se ve en gris) y lo escrito lo reemplaza. Sale el paso "Cambiar monto"; la cuenta y la observación opcional siguen abajo. Nuevo recorrido `one-tap`.
- **Análisis sin selector de periodo:** se quita Hoy / Esta semana / Este mes; la pantalla muestra el mes, y otros periodos se le preguntan a Rumi ("¿cuánto gasté esta semana?").

## 2026-10-23

- **Recorridos de prueba en el repo (`e2e/`, `npm run e2e`):** seis flujos de Maestro que se corren solos en el simulador antes de cada entrega. Detalle en `E2E.md`.
- **"Ver totales" muestra solo dónde hay dinero:** efectivo, billeteras, ahorros o bancos en 0 no aparecen, y las inversiones se ven debajo del total, aparte del disponible.
- **Mover dinero entre cualquier cuenta e inversión:** ahorros, bancos, efectivo, billeteras y cada inversión sirven de origen o destino; sale de una y entra a la otra.
  El resumen dice si el disponible baja o sube mientras el patrimonio no cambia.
- **El dinero solo sale de cuentas que lo tienen:** al mover, el origen lista solo cuentas con saldo (cualquiera puede recibir), y mover más de lo que hay se frena como un gasto.
  "+ Billetera" solo aparece donde entra dinero (una billetera nueva está en 0).
- **Navegación más fluida en Android:** las pestañas ocultas dejan de re-renderizar (`freezeOnBlur`), Actividad pinta antes de la revisión de categorías y esa revisión va ~6x más rápida (cachés en `suggestCategory`).
- **Respuestas de Rumi coherentes con Inicio:** comparar meses y "% del ingreso" cuentan cuotas de préstamos y no pagos de tarjeta ni traslados.
- **Pods de iOS sincronizados con el SDK 57:** el build de iOS volvía a fallar.
- **Una deuda pagada sale de Patrimonio aunque el pago se haya anotado como gasto:** un gasto en la subcategoría de una deuda (Créditos · Mamá) ahora cuenta como pago de esa deuda y baja su saldo; al llegar a 0 se cierra.
  Al abrir la app, los gastos ya guardados en esa subcategoría se convierten en pagos (del más antiguo al más reciente), así que las deudas ya pagadas se cierran solas.

## 2026-10-13

- **Dependencias al día con el SDK 57:** paquetes de Expo en los parches que pide `expo install --check` y React Native 0.86.3. Jest se queda en 30.
- **Vulnerabilidades:** `npm audit fix` quita la crítica (`shell-quote`) y otras; el audit de producción baja de 39 a 32, sin críticas.
  Las que quedan (`braces`, `node-forge`, `image-size`, `uuid`, `decode-uri-component`) vienen de Metro y del CLI de Expo y no tienen arreglo publicado.

## 2026-10-06

- **Idioma del teléfono desde el primer arranque (iPhone):** `CFBundleLocalizations` declara en/es. Antes, un iPhone en español abría en inglés.
- **Editar un gasto revisa el dinero:** el nuevo monto debe caber en la cuenta, contando el dinero que ese mismo movimiento devuelve a ella.
- **El motor aprende de tus correcciones:**
  - Elegir otra categoría a mano, cambiarla al editar o tocar "Dejar así" enseña esa descripción y su palabra clave (`taughtCategories`).
  - Lo aprendido gana sobre el diccionario y sigue a las subcategorías cuando se juntan. Se guardan hasta 300 enseñanzas.
- **Respaldo automático silencioso:**
  - Una copia cifrada al día en el teléfono; se guardan las últimas 7 (`autoBackup.ts`, `AutoBackupRunner`). No necesita iCloud ni Drive.
  - "Restaurar respaldo" ofrece las copias de los últimos días además de elegir un archivo.
- **Plan de mejoras** en `docs/ROADMAP.md`. Todo lo anterior se verificó en el simulador de iOS con Maestro.

- **Motor de sugerencias revisado con un banco de pruebas real** (`suggestCorpus.test.ts`, más de 120 descripciones en español colombiano e inglés):
  - Más palabras, marcas y jerga: D1, Éxito, Juan Valdez, Frisby, Enel, Vanti, Claro, Smart Fit, SOAT, 4x1000, corrientazo, polas, guayos…
  - Tipos nuevos: mantenimiento del carro, seguros, aseo y hogar, regalos, viajes, comisiones del banco, donaciones y juegos.
  - Tolera un error de una letra ("almuerso", "gasolna") solo si ninguna palabra bien escrita coincide. "uñas" ya no se confunde con "unas".
  - Ante un empate gana la frase más larga ("mercado libre" son compras online). Un nombre de subcategoría en la descripción solo gana si encaja con lo que describe.
  - Palabras ambiguas con su sentido de todos los días: "tenis" son zapatos, "recarga tullave" es transporte, la empanada es un antojo.
- **El formulario avanzado sigue la descripción** mientras no elijas a mano (como el rápido). Ya no deja marcada la primera subcategoría (por ejemplo "Mercado") cuando la sugerencia es otra.
- **El buscador de categorías usa el motor:** "almuerzo" muestra "Sugerido: Alimentación · Almuerzo" o "+ Crear…".

- **Sugerencias más cercanas a cómo piensa una persona:**
  - Una subcategoría que significa otra cosa nunca se queda con un gasto por historial: un almuerzo no va a "Mercado" (el mercado de la casa) ni a "General".
  - El historial solo cuenta en subcategorías que encajan con el gasto o en nombres propios del usuario ("Donde Rosa") (`subAccepts`).
  - Almuerzo, desayuno y cena se crean con su propio nombre (*Alimentación · Almuerzo*). Lo genérico (pizza, restaurante) va a *Comidas*. "lunch" y "almuerzo" cuentan como lo mismo.
  - Una categoría llamada "Mercado" ya no se toma como lugar para comidas.
  - La revisión de Historial propone sacar un almuerzo de *Alimentación · Mercado* (`noteFitsSub`).

- **Revisar categorías en Historial:**
  - Rumi lee las descripciones de los gastos guardados y muestra los que parecen mal ubicados, por ejemplo un almuerzo en "Gastos adicionales" (`findMisfiledSpends`).
  - Cada uno ofrece Mover (o Crear y mover) y Dejar así. Lo que dejas así no vuelve a salir (`categoryReviewDismissed`).
  - "Mover todos" crea cada subcategoría que falte una sola vez (`planReviewMoves`).
  - No propone cambios dentro de la categoría correcta, ni en créditos ni en gastos sin descripción. La sección se oculta si no hay nada que revisar.
- **El historial de descripciones cuenta gastos, no palabras:** un solo gasto "cancha de fútbol" ya no vale por dos votos. Al revisar, un gasto no cuenta como evidencia de sí mismo.

- **La descripción ubica el gasto:**
  - Al escribir "almuerzo", "uber", "gasolina" o "fútbol", Rumi propone la subcategoría (`suggestCategory`, `src/utils/suggestCategory.ts`). En el registro rápido la aplica sola mientras no elijas una a mano, y si no existe la crea al guardar (por ejemplo *Deporte · Fútbol*). En el guiado y el avanzado aparece "Usar" o "Crear y usar".
  - El tipo de gasto decide la categoría y el historial solo elige la subcategoría dentro de ella. Así un almuerzo va a Alimentación aunque antes se hayan guardado almuerzos en "Gastos adicionales".
  - Funciona igual en español e inglés. Lo que crea lleva el nombre en el idioma de la app y se reconoce la próxima vez.
- **Un gasto necesita de dónde salir:**
  - Solo se ofrecen cuentas con saldo, y una cuenta no puede quedar en negativo (`fundsShortfall`, `liquidPocketsForPay`). Si todas están en cero, aparece un aviso con "Registrar ingreso".
  - Las tarjetas de crédito no se bloquean. El onboarding y la guía lo explican.
- **Plan más simple:**
  - El tope se define en la fila de la subcategoría, ya no en una sección al fondo.
  - Las categorías se renombran, mueven y juntan sin perder movimientos (`useSpendTreeEdit`). Borrar una con movimientos pregunta primero a dónde pasan.
  - Con 6 categorías o más aparecen como chips y hay un buscador.
  - Un crédito pagado se marca "Pagada" ese mes y desaparece el mes siguiente.
- **Selector de cuentas en dos pasos:** primero el tipo (Efectivo, Bancos, Billeteras, Ahorros, Tarjetas) y después cuál. Una vez elegida, ocupa una sola línea.
- **Historial:** "Gastado por categoría" en el resumen de cada mes.
- **Pregúntale a Rumi:** una categoría propia ("Deporte") gana sobre un sinónimo interno que comparte la palabra. Antes "deporte" solo contaba lo que estaba ligado a salud.

- **"Cómo usar Rumi" al día:**
  - Paso 2: recordatorios sugeridos que no avisan lo ya pagado.
  - Paso 5: aviso un día antes de cada vencimiento.
  - Paso 6: nuevos ejemplos de preguntas y la vista de lo que Rumi entendió.
  - El README también. El onboarding no cambia: no toca recordatorios ni preguntas.

- **Un recordatorio llega una sola vez:**
  - Dos sincronizaciones que se solapaban (guardar un recordatorio y volver a la app) veían el mismo aviso como pendiente y lo programaban dos veces. Ahora `syncPlannedReminders` corre de a una.
  - Un concepto ligado a una deuda con aviso de vencimiento ya no avisa por su cuenta (`planAllReminders`).
  - Los avisos de deuda también ponen el globo con el número en el ícono.
  - Pruebas con un sistema de notificaciones simulado (`notifications.test.ts`).

- **Recordatorios semanales y el último día del mes:**
  - La frecuencia ahora es diaria, semanal (eliges el día de la semana) o mensual. En la mensual se puede elegir "Último día", que cae el 28, 29, 30 o 31 según el mes.
  - El semanal no avisa si ese concepto ya se registró en los 6 días anteriores, por ejemplo si hiciste el mercado el jueves.
  - Nuevos campos en `ReminderRule`: `weekday` y `lastDay`. La frecuencia se lee con `reminderFrequency`.

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

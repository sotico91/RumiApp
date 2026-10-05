# Rumi — Historial de cambios

Resumen de lo que se ha hecho en la app, del más reciente al más antiguo, para tener el contexto a mano.
El detalle de cada cambio está en `git log`.

## Reglas generales

- **Sin coautores de IA en git:** ningún commit ni PR lleva `Co-Authored-By` de Claude ni de otra IA, ni líneas como "Generated with…".
  El autor es siempre la persona del repo.
- **Comentarios de código en inglés:** todos los comentarios del código van en inglés.
  Los textos que ve el usuario van en `src/i18n/translations.ts` (es/en).

## 2026-10-05

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
- **Inicio más simple:** sin el cerdito animado en la cabecera (sigue en Análisis) ni la línea "Espacio de gastos de…".
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

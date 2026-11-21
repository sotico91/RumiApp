// "Cómo configurar Rumi": the long YouTube tutorial (16:9, chapters). Each step is one voice line,
// one caption beside the phone and, when the screen changes, the Maestro commands that change it.
// tutorial/record.ts runs every step's commands while recording the simulator (one clip per step);
// a step without `flow` holds the last frame of the step before it while its line plays.
// Starts from ../flows/seed.yaml (Sofía, $2.500.000 in the bank and a few everyday spends).

export type TutorialStep = {
  /** What the voice says; numbers in words. */
  say: string;
  /** Short line on screen. */
  text: string;
  /** Maestro commands (YAML list) run while this step records. */
  flow?: string;
  /** Show a hand tapping the flow's first `tapOn` (where it is comes from record.ts). */
  hand?: boolean;
};

export type TutorialChapter = { id: string; title: string; steps: TutorialStep[] };

export const tutorialChapters: TutorialChapter[] = [
  {
    id: 'inicio',
    title: 'Inicio',
    steps: [
      {
        say: 'Hola. En este video te muestro cómo configurar Rumi y cómo registrar tu plata, paso a paso.',
        text: 'Cómo configurar Rumi',
        flow: `
- tapOn: "Inicio"
- swipe: { start: "50%,70%", end: "50%,45%", duration: 1200 }
- swipe: { start: "50%,40%", end: "50%,75%", duration: 1200 }`,
      },
      {
        say: 'En Inicio ves cuánto tienes disponible hoy y cómo va tu mes: ingresos, gastos y lo que te queda.',
        text: 'Inicio: tu disponible y tu mes',
      },
      {
        say: 'Abajo están las pestañas: Actividad, Plan, Patrimonio y Análisis. Y el botón más es para registrar.',
        text: 'Las pestañas y el botón +',
      },
    ],
  },
  {
    id: 'cuentas',
    title: 'Tus cuentas',
    steps: [
      {
        say: 'Empieza por Patrimonio. Aquí están tus cuentas: el efectivo, los bancos, las billeteras como Nequi, y los ahorros.',
        text: 'Patrimonio: dónde está tu plata',
        flow: `
- tapOn: "Patrimonio"
- scrollUntilVisible: { element: "\\\\+ Billetera", direction: UP }`,
      },
      {
        say: 'Para agregar una billetera, toca más Billetera y elige la tuya. Por ejemplo, Nequi.',
        text: '+ Billetera → Nequi',
        flow: `
- tapOn: "\\\\+ Billetera"
- tapOn: "\\\\+ Nequi"`,
      },
      {
        say: 'Tócala, elige Editar saldo y escribe lo que tienes hoy.',
        text: 'Editar saldo: lo que tienes hoy',
        flow: `
- tapOn: ".*Nequi, \\\\$0"
- tapOn: "Editar saldo"
- inputText: "80000"
- tapOn: "Guardar saldo"`,
      },
      {
        say: 'Haz lo mismo con el efectivo. Así Rumi arranca con tus números reales.',
        text: 'Lo mismo con el efectivo',
        flow: `
- tapOn: ".*Efectivo, \\\\$0"
- tapOn: "Editar saldo"
- inputText: "120000"
- tapOn: "Guardar saldo"`,
      },
    ],
  },
  {
    id: 'conceptos',
    title: 'Conceptos y topes',
    steps: [
      {
        say: 'En Plan están tus conceptos de gasto. Cada concepto es una categoría grande, como Alimentación o Transporte.',
        text: 'Plan → Mis conceptos de gasto',
        flow: `
- tapOn: "Plan"
- tapOn: "Mis conceptos de gasto.*"`,
      },
      {
        say: 'Adentro tiene sus subcategorías, como Mercado, Almuerzo o Café. Cada gasto se anota en una de ellas.',
        text: 'Cada concepto tiene subcategorías',
        flow: `
- tapOn: "Alimentación, \\\\d+ subcategorías.*"
- swipe: { start: "50%,70%", end: "50%,50%", duration: 1000 }`,
      },
      {
        say: 'Para crear un concepto nuevo, escribe el nombre y toca Agregar.',
        text: 'Nuevo concepto: «Mascotas»',
        flow: `
- scrollUntilVisible: { element: "Ej. Recibos, Transporte.*", direction: UP }
- tapOn: "Ej. Recibos, Transporte.*"
- inputText: "Mascotas"
- tapOn: "Agregar"
- tapOn: "Crea una categoría y luego.*"`,
      },
      {
        say: 'Luego agrégale sus subcategorías. Por ejemplo, Veterinario.',
        text: 'Sus subcategorías: «Veterinario»',
        flow: `
- scrollUntilVisible: { element: "Ej. Luz, Cine.*", direction: DOWN, centerElement: true }
- tapOn: "Ej. Luz, Cine.*"
- inputText: "Veterinario"
- tapOn: "Agregar subcategoría"
- tapOn: ".*Mascotas, \\\\d+"`,
      },
      {
        say: '¿Quieres cuidar un gasto? Toca la subcategoría y ponle un tope al mes.',
        text: 'Toca una subcategoría → Tope al mes',
        flow: `
- tapOn: ".*Alimentación, \\\\d+"
- scrollUntilVisible: { element: "Mercado, Sin tope.*", direction: DOWN, centerElement: true }
- tapOn: "Mercado, Sin tope.*"
- inputText: "600000"
- tapOn: "Guardar"`,
      },
      {
        say: 'En Topes del mes ves cuánto llevas y cuánto te queda antes de pasarte.',
        text: 'Topes del mes: cuánto te queda',
        flow: `
- scrollUntilVisible: { element: "Mis conceptos de gasto.*", direction: UP }
- tapOn: "Mis conceptos de gasto.*"
- tapOn: "Topes del mes.*"`,
      },
      {
        say: 'En Gastos hormiga se juntan los gastos pequeños que se repiten, como el café o los domicilios. Los marcas con el botón Hormiga.',
        text: 'Gastos hormiga 🐜',
        flow: `
- tapOn: "Topes del mes, ▾"
- tapOn: "Gastos hormiga.*"`,
      },
      {
        say: 'Y en Recordatorios de gastos programas avisos para los pagos que se repiten, como el arriendo o el internet.',
        text: 'Recordatorios de pagos',
        flow: `
- tapOn: "Gastos hormiga, ▾"
- tapOn: "Recordatorios de gastos.*"`,
      },
    ],
  },
  {
    id: 'gasto',
    title: 'Registrar un gasto',
    steps: [
      {
        say: 'Para registrar un gasto, toca el botón más. Se abre directo en Gasto.',
        text: 'Botón + → Gasto',
        flow: `
- tapOn: "Inicio"
- tapOn: { id: "add-fab" }`,
      },
      {
        say: 'Escribe cuánto fue.',
        text: '¿Cuánto?',
        flow: `
- tapOn: { id: "quick-amount" }
- inputText: "45000"
- tapOn: "¿En qué?"`,
      },
      {
        say: 'Elige en qué fue. Si no está, toca Otra categoría.',
        text: '¿En qué? → Mercado',
        flow: `
- tapOn: ".*, Mercado"`,
      },
      {
        say: 'Abajo eliges de qué cuenta salió la plata.',
        text: '¿De dónde salió?',
        flow: `
- swipe: { start: "50%,75%", end: "50%,45%", duration: 1000 }`,
      },
      {
        say: 'Toca Guardar, y listo. El gasto ya cuenta en tu mes y en tu tope.',
        text: 'Guardar',
        flow: `
- tapOn: "Guardar \\\\$45\\\\.000"
- extendedWaitUntil: { visible: "Inicio", timeout: 10000 }`,
      },
    ],
  },
  {
    id: 'ingreso',
    title: 'Registrar un ingreso',
    steps: [
      {
        say: 'Para un ingreso, como tu sueldo, toca más y luego Ingreso. Rumi te guía paso a paso.',
        text: '+ → Ingreso',
        flow: `
- tapOn: { id: "add-fab" }
- tapOn: "Ingreso"`,
      },
      {
        say: 'Escribe cuánto te llegó y toca Continuar.',
        text: '¿Cuánto te llegó?',
        flow: `
- tapOn: { id: "flow-amount" }
- inputText: "3500000"
- tapOn: "¿De cuánto fue?"
- tapOn: "Continuar"`,
      },
      {
        say: 'Elige de dónde viene. Por ejemplo, Salario.',
        text: '¿De dónde viene? → Salario',
        flow: `
- tapOn: "Salario"
- tapOn: "Continuar"`,
      },
      {
        say: 'Luego, a qué cuenta llegó.',
        text: '¿A qué cuenta llegó?',
        flow: `
- tapOn: "Continuar"`,
      },
      {
        say: 'Revisas que todo esté bien, y guardas.',
        text: '¿Se ve bien? → Sí, guardar',
        flow: `
- tapOn: "Sí, guardar"
- extendedWaitUntil: { visible: "Inicio", timeout: 10000 }`,
      },
    ],
  },
  {
    id: 'mover',
    title: 'Mover dinero',
    steps: [
      {
        say: 'Mover es para pasar plata entre tus cuentas. Por ejemplo, del banco a Nequi o a los ahorros. No es un gasto.',
        text: '+ → Mover',
        flow: `
- tapOn: { id: "add-fab" }
- tapOn: "Mover"`,
      },
      {
        say: 'Escribe cuánto vas a mover.',
        text: '¿Cuánto mueves?',
        flow: `
- tapOn: { id: "flow-amount" }
- inputText: "200000"
- tapOn: "¿De cuánto fue?"
- tapOn: "Continuar"`,
      },
      {
        say: 'Elige de dónde sale y a dónde llega. Aquí, del banco a Ahorros.',
        text: 'Del banco → a Ahorros',
        flow: `
- tapOn: "Cambiar la cuenta"
- tapOn: "Ahorros · .*"`,
      },
      {
        say: 'Rumi te muestra cómo quedan las dos cuentas antes de guardar.',
        text: 'Revisa y guarda',
        flow: `
- tapOn: "Continuar"`,
      },
      {
        say: 'Guardas, y la plata cambia de lugar.',
        text: 'Sí, guardar',
        flow: `
- tapOn: "Sí, guardar"
- extendedWaitUntil: { visible: "Inicio", timeout: 10000 }`,
      },
    ],
  },
  {
    id: 'deudas',
    title: 'Deudas',
    steps: [
      {
        say: 'Las deudas se registran en Patrimonio, más abajo. Hay dos lugares: Tarjetas y cupos, y Créditos y cuotas.',
        text: 'Patrimonio → tus deudas',
        flow: `
- tapOn: "Patrimonio"
- scrollUntilVisible: { element: "Agregar tarjeta", direction: DOWN, centerElement: true }`,
      },
      {
        say: 'En Tarjetas y cupos va tu tarjeta de crédito o el credicheque: el cupo total, lo que ya usaste y el pago de este mes.',
        text: 'Tarjeta: cupo, lo usado y el pago del mes',
        flow: `
- tapOn: "Agregar tarjeta"
- tapOn: { id: "debt-name" }
- inputText: "Visa"
- tapOn: "Qué estás pagando"
- tapOn: { id: "debt-limit" }
- inputText: "3000000"
- tapOn: "Cupo total"
- tapOn: { id: "debt-balance" }
- inputText: "450000"
- tapOn: "Lo que ya usaste / debes"
- tapOn: { below: "Pago de este mes" }
- inputText: "150000"
- tapOn: "Pago de este mes"
- scrollUntilVisible: { element: "Guardar", direction: DOWN }
- tapOn: "Guardar"
- tapOn: { text: "Permitir", optional: true }`,
      },
      {
        say: 'En Créditos y cuotas van los préstamos con cuota fija: la moto, el carro o el apartamento. Escribe lo que aún debes y la cuota de cada mes.',
        text: 'Crédito: lo que debes y la cuota fija',
        flow: `
- scrollUntilVisible: { element: "Agregar crédito", direction: DOWN }
- tapOn: "Agregar crédito"
- swipe: { start: "50%,80%", end: "50%,35%", duration: 800 }
- tapOn: "Cuota apto, cuota carro…"
- inputText: "Moto"
- tapOn: { below: "Saldo que aún debes" }
- inputText: "4800000"
- tapOn: "Saldo que aún debes"
- tapOn: { below: "Cuota mensual fija" }
- inputText: "320000"
- tapOn: "Cuota mensual fija"
- swipe: { start: "50%,80%", end: "50%,30%", duration: 800 }
- tapOn: "Guardar"
- tapOn: { text: "Permitir", optional: true }`,
      },
      {
        say: 'Con el día de pago, Rumi te recuerda cada cuota un día antes.',
        text: 'Te recuerda cada cuota',
      },
      {
        say: 'Para pagar una cuota, toca más y elige Deuda. Escribe cuánto pagaste.',
        text: '+ → Deuda',
        flow: `
- tapOn: "Inicio"
- tapOn: { id: "add-fab" }
- tapOn: "Deuda"
- tapOn: { id: "flow-amount" }
- inputText: "320000"
- tapOn: "¿De cuánto fue?"
- tapOn: "Continuar"`,
      },
      {
        say: 'Elige qué deuda pagaste, y si es la cuota del mes, el total o otro valor.',
        text: '¿Qué deuda? ¿Qué pagas?',
        flow: `
- tapOn: "Moto.*"
- tapOn: "Cuota de este mes.*"
- tapOn: "Continuar"`,
      },
      {
        say: 'Luego, de qué cuenta sale el pago. Revisas, y guardas.',
        text: '¿De qué cuenta sale? → Guardar',
        flow: `
- tapOn: "Continuar"
- tapOn: "Sí, guardar"
- extendedWaitUntil: { visible: "Inicio", timeout: 10000 }`,
      },
      {
        say: 'Listo. El saldo de la deuda baja, y la plata sale de tu cuenta.',
        text: 'El saldo de la deuda baja',
        flow: `
- tapOn: "Patrimonio"
- scrollUntilVisible: { element: "Saldo restante", direction: DOWN, centerElement: true }`,
      },
    ],
  },
  {
    id: 'cierre',
    title: 'Listo',
    steps: [
      {
        say: 'Eso es todo. Si tienes dudas, en Análisis le puedes preguntar a Rumi lo que quieras de tu plata.',
        text: '¿Dudas? Pregúntale a Rumi',
        flow: `
- tapOn: "Análisis"`,
      },
    ],
  },
];

export const tutorialEnd = {
  title: 'Rumi',
  tagline: 'Cuentas claras, mente tranquila.',
  line: 'Gratis en Android y iPhone. Sin cuenta y sin conectar tu banco.',
  say: 'Rumi. Cuentas claras, mente tranquila.',
  qr: 'qr-descargar.png',
};

export const tutorialIntro = { title: 'Cómo configurar Rumi', subtitle: 'Cuentas, conceptos, topes, gastos, ingresos, mover y deudas' };

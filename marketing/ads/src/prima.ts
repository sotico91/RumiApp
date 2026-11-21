// "Llegó la prima": a 16:9 promo for December (YouTube and the Play listing video). Same pieces as
// the tutorial (src/tutorial.ts): one voice line, one caption and the Maestro commands per step,
// recorded with `SCRIPT=prima node --experimental-strip-types tutorial/record.ts`.
// Steps marked `hand` show a hand tapping the first `tapOn` of their flow; record.ts reads where
// that element is on screen (maestro hierarchy) before running the step.
// Starts from ../flows/seed.yaml (Sofía, $2.500.000 in the bank and a few everyday spends).
import type { TutorialChapter } from './tutorial';

export const primaChapters: TutorialChapter[] = [
  {
    id: 'prima',
    title: 'Anótala',
    steps: [
      {
        say: 'Antes de que se esfume, anótala en Rumi. Toca el botón más.',
        text: 'Toca +',
        hand: true,
        flow: `
- tapOn: { id: "add-fab" }`,
      },
      {
        say: 'Elige Ingreso.',
        text: 'Ingreso',
        hand: true,
        flow: `
- tapOn: "Ingreso"`,
      },
      {
        say: 'Escribe cuánto te llegó. Por ejemplo, un millón ochocientos mil.',
        text: '¿Cuánto te llegó?',
        hand: true,
        flow: `
- tapOn: { id: "flow-amount" }
- inputText: "1800000"
- tapOn: "¿De cuánto fue?"
- tapOn: "Continuar"`,
      },
      {
        say: 'Es tu prima, así que va en Bonos.',
        text: '¿De dónde viene? → Bonos',
        hand: true,
        flow: `
- tapOn: "Bonos"
- tapOn: "Continuar"`,
      },
      {
        say: 'Llega a tu cuenta del banco.',
        text: '¿A qué cuenta llegó?',
        hand: true,
        flow: `
- tapOn: "Continuar"`,
      },
      {
        say: 'Guardas, y ya sabes con cuánto cuentas.',
        text: 'Sí, guardar',
        hand: true,
        flow: `
- tapOn: "Sí, guardar"
- extendedWaitUntil: { visible: "Inicio", timeout: 10000 }`,
      },
    ],
  },
  {
    id: 'meta',
    title: 'Ponle un destino',
    steps: [
      {
        say: 'Ahora sepárale una parte. En Patrimonio, crea una meta.',
        text: 'Patrimonio → Nueva meta',
        hand: true,
        flow: `
- tapOn: "Patrimonio"
- scrollUntilVisible: { element: { id: "goal-add" }, direction: DOWN, centerElement: true }`,
      },
      {
        say: 'Ponle nombre, cuánto quieres juntar y para cuándo.',
        text: 'Meta: Fondo de emergencia',
        hand: true,
        flow: `
- tapOn: { id: "goal-add" }
- tapOn: { id: "goal-name" }
- inputText: "Fondo de emergencia"
- pressKey: Enter
- inputText: "1200000"
- tapOn: "¿Para cuándo?"
- tapOn: "En 6 meses"
- scrollUntilVisible: { element: { id: "goal-save" }, direction: DOWN }`,
      },
      {
        say: 'Rumi te dice cuánto apartar cada mes para llegar.',
        text: 'Cuánto apartar al mes',
        hand: true,
        flow: `
- tapOn: { id: "goal-save" }
- scrollUntilVisible: { element: { id: "goal-contribute" }, direction: DOWN, centerElement: true }`,
      },
      {
        say: 'Y de una vez le metes una parte de la prima.',
        text: 'Aportar $500.000',
        hand: true,
        flow: `
- tapOn: { id: "goal-contribute" }
- tapOn: { id: "flow-amount" }
- inputText: "500000"
- tapOn: "¿De cuánto fue?"
- tapOn: "Continuar"
- tapOn: "Continuar"
- tapOn: "Sí, guardar"
- extendedWaitUntil: { visible: "Inicio", timeout: 10000 }
- tapOn: "Patrimonio"
- scrollUntilVisible: { element: ".*\\\\$500\\\\.000 de \\\\$1\\\\.200\\\\.000.*", direction: DOWN, centerElement: true }`,
      },
    ],
  },
  {
    id: 'claro',
    title: 'Ten claro en qué se va',
    steps: [
      {
        say: '¿Te alcanza para un antojo? Pregúntale a Rumi.',
        text: 'Pregúntale a Rumi',
        hand: true,
        flow: `
- tapOn: "Análisis"`,
      },
      {
        say: 'Por ejemplo: ¿me alcanza para unos tenis de trescientos mil?',
        text: '«¿Me alcanza para unos tenis de 300 mil?»',
        hand: true,
        flow: `
- tapOn: { id: "ask-input" }
- inputText: "¿Me alcanza para unos tenis de 300 mil?"
- pressKey: Enter`,
      },
      {
        say: 'Y aquí ves a dónde se va tu plata, para que la prima te rinda.',
        text: '¿A dónde se va tu plata?',
        flow: `
- scrollUntilVisible: { element: "(?i)¿a dónde se va tu plata\\\\?", direction: DOWN }
- scroll`,
      },
    ],
  },
];

export const primaIntro = {
  kicker: 'Diciembre',
  title: 'Llegó la prima 🎁',
  subtitle: '¿Ya sabes en qué se te va a ir?',
  say: 'Llegó la prima. ¿Ya sabes en qué se te va a ir?',
};

export const primaEnd = {
  title: 'Rumi',
  tagline: 'Que la prima te rinda.',
  line: 'Gratis en Android y iPhone. Sin cuenta y sin conectar tu banco.',
  say: 'Rumi. Que la prima te rinda. Descárgala gratis.',
  qr: 'qr-descargar.png',
};

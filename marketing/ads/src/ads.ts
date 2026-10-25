import type { AdProps } from './Ad';

const end = {
  endTitle: 'Rumi',
  endLine: 'Tus finanzas claras. Tus datos se quedan en tu teléfono.',
  // Not in the stores yet; switch to the store CTA at launch.
  cta: 'Muy pronto',
};

// Every time is seconds into the recording (public/clips/), read from its frames.
export const ads: Record<string, AdProps> = {
  'anota-es': {
    hook: '¿En qué se te va la plata?',
    clip: 'quick.mp4',
    music: { file: 'happy-times.mp3', from: 0 },
    segments: [[19.5, 34.5]],
    playbackRate: 1.5,
    captions: [
      { at: 19.5, text: 'Anota un gasto en segundos' },
      { at: 23.2, text: 'Escribe cuánto…' },
      { at: 27.8, text: '…y en qué: «almuerzo»' },
      { at: 30.0, text: 'Rumi lo ubica solo' },
      { at: 32.8, text: 'Listo. Sin hojas de cálculo.' },
    ],
    sfx: [
      { at: 20.3, sound: 'tap' },
      { at: 23.2, sound: 'tap' },
      { at: 24.0, sound: 'type', length: 1.0 },
      { at: 26.3, sound: 'tap' },
      { at: 27.8, sound: 'tap' },
      { at: 28.5, sound: 'type', length: 1.5 },
      { at: 32.2, sound: 'tap' },
      { at: 32.8, sound: 'success' },
    ],
    ...end,
  },
  'pregunta-es': {
    hook: '¿Cuánto gasté en café este mes?',
    clip: 'ask.mp4',
    music: { file: 'im-fine.mp3', from: 8, volume: 0.6 },
    segments: [
      [34.5, 41.2],
      [48.2, 55.5],
    ],
    playbackRate: 1.3,
    captions: [
      { at: 34.5, text: 'Pregúntale a Rumi como hablas' },
      { at: 48.9, text: '$19.500 en 3 cafés. Con tus números.' },
    ],
    sfx: [
      { at: 35.8, sound: 'tap' },
      { at: 39.2, sound: 'type', length: 1.6 },
      { at: 48.6, sound: 'tap' },
      { at: 48.9, sound: 'success' },
    ],
    ...end,
  },
  'hormiga-es': {
    hook: '$5.800 no es nada… ¿o sí?',
    clip: 'onetap.mp4',
    music: { file: 'pop-track-03.mp3', from: 3 },
    segments: [
      [19.5, 20.6],
      [22.4, 28.5],
    ],
    playbackRate: 1,
    captions: [
      { at: 19.5, text: 'Tus gastos de siempre, a un toque' },
      { at: 23.6, text: 'Cambia el valor y listo' },
      { at: 26.5, text: 'Cada cafecito, contado' },
    ],
    sfx: [
      { at: 22.7, sound: 'tap' },
      { at: 23.8, sound: 'type', length: 1.0 },
      { at: 26.2, sound: 'tap' },
      { at: 26.5, sound: 'success' },
    ],
    ...end,
    endLine: 'Ve cuánto suman tus gastos hormiga, sin conectar tu banco.',
  },
  'todo-es': {
    hook: '¿Gastos en una app, deudas en otra y el sueldo en Excel?',
    clip: 'todo.mp4',
    music: { file: 'its-a-cool-thing.mp3', from: 0, volume: 0.5 },
    segments: [
      // Income: + → Ingreso, the amount, Salario, saved
      [25.5, 27.2],
      [30.8, 33.0],
      [34.6, 38.5],
      [40.0, 40.8],
      [41.8, 44.0],
      // A spend from its description
      [63.0, 64.5],
      [67.5, 73.0],
      // A loan in Wealth (the notifications prompt at 105 is cut)
      [80.5, 81.5],
      [90.0, 91.5],
      [92.5, 94.5],
      [97.0, 99.5],
      [102.5, 104.5],
      // Paying its installment: the balance goes down
      [107.0, 109.0],
      [111.5, 114.5],
      [117.0, 117.8],
      [125.2, 129.5],
      // Home: the whole month
      [132.0, 135.5],
    ],
    playbackRate: 2,
    captions: [
      { at: 25.5, text: 'Registra tu sueldo' },
      { at: 63.0, text: 'Tus gastos' },
      { at: 80.5, text: 'Tus créditos y deudas' },
      { at: 107.0, text: 'Pagas la cuota…' },
      { at: 125.2, text: '…y la deuda baja sola' },
      { at: 132.0, text: 'Todo tu mes, en una sola app' },
    ],
    sfx: [
      { at: 25.8, sound: 'tap' },
      { at: 26.9, sound: 'tap' },
      { at: 31.0, sound: 'type', length: 1.0 },
      { at: 36.8, sound: 'tap' },
      { at: 37.9, sound: 'tap' },
      { at: 40.7, sound: 'tap' },
      { at: 41.9, sound: 'success' },
      { at: 63.2, sound: 'type', length: 1.0 },
      { at: 68.2, sound: 'type', length: 1.0 },
      { at: 71.6, sound: 'tap' },
      { at: 72.0, sound: 'success' },
      { at: 80.6, sound: 'tap' },
      { at: 90.2, sound: 'type', length: 1.0 },
      { at: 93.0, sound: 'type', length: 1.0 },
      { at: 97.5, sound: 'type', length: 1.5 },
      { at: 103.4, sound: 'tap' },
      { at: 107.3, sound: 'tap' },
      { at: 111.6, sound: 'tap' },
      { at: 113.8, sound: 'tap' },
      { at: 126.0, sound: 'success' },
      { at: 132.1, sound: 'tap' },
    ],
    ...end,
    endLine: 'Ingresos, gastos y deudas en un solo lugar. No necesitas nada más.',
  },
};

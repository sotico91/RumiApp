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
      { at: 20.3, sound: 'click' },
      { at: 23.2, sound: 'click' },
      { at: 24.0, sound: 'type', length: 1.0 },
      { at: 26.3, sound: 'click' },
      { at: 27.8, sound: 'click' },
      { at: 28.5, sound: 'type', length: 1.5 },
      { at: 32.2, sound: 'click' },
      { at: 32.8, sound: 'success' },
    ],
    ...end,
  },
  'pregunta-es': {
    hook: '¿Cuánto gasté en café este mes?',
    clip: 'ask.mp4',
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
      { at: 35.8, sound: 'click' },
      { at: 39.2, sound: 'type', length: 1.6 },
      { at: 48.6, sound: 'click' },
      { at: 48.9, sound: 'success' },
    ],
    ...end,
  },
  'hormiga-es': {
    hook: '$5.800 no es nada… ¿o sí?',
    clip: 'onetap.mp4',
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
      { at: 22.7, sound: 'click' },
      { at: 23.8, sound: 'type', length: 1.0 },
      { at: 26.2, sound: 'click' },
      { at: 26.5, sound: 'success' },
    ],
    ...end,
    endLine: 'Ve cuánto suman tus gastos hormiga, sin conectar tu banco.',
  },
};

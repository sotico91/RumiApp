import type { AdProps } from './Ad';

const end = {
  endTitle: 'Rumi',
  endLine: 'Tus finanzas claras. Tus datos se quedan en tu teléfono.',
  // Not in the stores yet; switch to the store CTA at launch.
  cta: 'Muy pronto',
};

// Clip timings (seconds into each recording) come from marketing/ads/record.sh output.
export const ads: Record<string, AdProps> = {
  'anota-es': {
    hook: '¿En qué se te va la plata?',
    clip: 'quick.mp4',
    clipStart: 19.5,
    clipLength: 18.5,
    playbackRate: 1.6,
    captions: [
      { at: 0, text: 'Anota un gasto en segundos' },
      { at: 3.5, text: 'Escribe cuánto…' },
      { at: 8, text: '…y en qué: «almuerzo»' },
      { at: 11.5, text: 'Rumi lo ubica solo' },
      { at: 14.5, text: 'Listo. Sin hojas de cálculo.' },
    ],
    ...end,
  },
  'pregunta-es': {
    hook: '¿Cuánto gasté en café este mes?',
    clip: 'ask.mp4',
    clipStart: 34.5,
    clipLength: 21,
    playbackRate: 1.6,
    captions: [
      { at: 0, text: 'Pregúntale a Rumi como hablas' },
      { at: 15, text: '$19.500 en 3 cafés. Con tus números.' },
    ],
    ...end,
  },
  'hormiga-es': {
    hook: '$5.800 no es nada… ¿o sí?',
    clip: 'onetap.mp4',
    clipStart: 19.5,
    clipLength: 9,
    playbackRate: 1,
    captions: [
      { at: 0, text: 'Tus gastos de siempre, a un toque' },
      { at: 3, text: 'Cambia el valor y listo' },
      { at: 7, text: 'Cada cafecito, contado' },
    ],
    endTitle: 'Rumi',
    endLine: 'Ve cuánto suman tus gastos hormiga, sin conectar tu banco.',
    cta: end.cta,
  },
};

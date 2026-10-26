// "Rumi habla": the icon's coral bill as a character, talking straight to camera.
// Each scene is one voice line plus the card that shows it; voice/mascot.ts turns `say` into audio
// and a mouth envelope (src/mascot-voice.json). Numbers go in words in `say`.

export type SceneKind = 'hello' | 'quick' | 'limit' | 'ants' | 'ask' | 'forecast' | 'privacy' | 'end';

export type Scene = { kind: SceneKind; title: string; say: string };

export const mascotScenes: Scene[] = [
  {
    kind: 'hello',
    title: '¿En qué se te va la plata?',
    say: '¡Hola! Soy Rumi. ¿Sientes que la plata se te va y no sabes en qué? Yo te ayudo.',
  },
  {
    kind: 'quick',
    title: 'Anota en segundos',
    say: 'Anotas un gasto en segundos: escribes «almuerzo», y yo lo pongo en su categoría.',
  },
  {
    kind: 'limit',
    title: 'Ponle un tope a cada gasto',
    say: 'Ponle un tope al mes a lo que quieras cuidar, y mira cuánto te queda antes de pasarte.',
  },
  {
    kind: 'ants',
    title: 'Caza los gastos hormiga',
    say: 'Te muestro tus gastos hormiga: esos cafecitos que, juntos, suman más de lo que crees.',
  },
  {
    kind: 'ask',
    title: 'Pregúntame como hablas',
    say: 'Pregúntame como le hablas a una amiga: ¿puedo comprar algo de doscientos mil? Te respondo con tus números.',
  },
  {
    kind: 'forecast',
    title: 'Mira cómo cierras el mes',
    say: 'Y te digo cómo vas a cerrar el mes, para que ajustes a tiempo y ahorres más.',
  },
  {
    kind: 'privacy',
    title: 'Tus datos, en tu teléfono',
    say: 'Todo se queda en tu teléfono. Sin cuentas, sin conectar tu banco.',
  },
  {
    kind: 'end',
    title: 'Rumi',
    say: 'Rumi. Cuentas claras, mente tranquila. ¡Te espero!',
  },
];

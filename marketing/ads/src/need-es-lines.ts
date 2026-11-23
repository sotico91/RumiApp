// Narration of the Spanish need reels built on src/NeedEs.tsx (one line per scene, in order), the
// Spanish versions of the English episodes in need-en-lines.ts, in pesos and Colombian Spanish.
// voice/need-es.ts speaks them into public/voice/<id>/<n>.mp3. `drip` is the line whose sentences
// pop cards one by one (one item per sentence). Numbers in words for the voice. Amounts on screen
// and in the lines must agree; Rumi's answers copy the app's Spanish text.
export const NEED_ES: Record<string, { lines: string[]; drip?: number }> = {
  // "La tarjeta que no baja": $3.200.000 at 1,9 % a month, $120.000 minimum, $60.800 interest.
  // Six months: $720.000 paid, $2.827.494 still owed. At the minimum: 38 months, ~$1.300.000
  // interest (debt-free February 2030). With $50.000 extra ($170.000): 24 months (December 2028),
  // 14 months sooner, ~$500.000 less interest.
  'tarjeta-es': {
    lines: [
      'Pagas la tarjeta todos los meses. ¿Entonces por qué la deuda no baja?',
      'Debes tres millones doscientos mil. Pagas el mínimo, ciento veinte mil. Pero los intereses suman sesenta mil.',
      'Mes tras mes, casi no se mueve. Seis meses y setecientos veinte mil pesos después, todavía debes más de dos millones ochocientos mil.',
      'Pagando el mínimo, te demoras más de tres años, y pagas como un millón trescientos mil en intereses.',
      'No es que no pagues. Es que no ves la salida.',
      '¡Yo te muestro la salida!',
      'Te digo en qué mes sales de deudas.',
      'Abona cincuenta mil más al mes, y sales catorce meses antes, con como quinientos mil pesos menos de intereses.',
      'Y te recuerdo el día antes de cada pago, para que nunca te atrases.',
      'Rumi. Gratis en Google Play y en la App Store. Sin conectar tu banco.',
    ],
  },
  // "¿Se te volvió a pasar un recibo?": the electricity bill due on the 15th, paid on the 20th,
  // $80.000 in late interest and reconnection; four times a year = $320.000.
  'recibo-es': {
    lines: [
      '¿Se te volvió a pasar un recibo?',
      'El de la luz vencía el quince. Lo pagaste el veinte.',
      'Mora y reconexión: ochenta mil pesos. Por plata que sí tenías.',
      'Cuatro veces al año, y son trescientos veinte mil pesos, por nada.',
      'La plata estaba. El recordatorio no.',
      '¡Yo no me olvido!',
      'Veo lo que pagas cada mes, y te sugiero un recordatorio para cada uno.',
      'El día antes te aviso, con lo que sueles pagar.',
      'Y si ya lo pagaste, no te molesto.',
      'Rumi. Gratis en Google Play y en la App Store. Sin conectar tu banco.',
    ],
  },
  // "Enero sin plata": December with no limits, $2.300.000 on the card.
  'enero-es': {
    drip: 1,
    lines: [
      'Diciembre. Regalos, novenas, el viaje a la tierra. ¡Es temporada!',
      'Regalos. Novenas. Pasajes. La pinta de fin de año. El amigo secreto.',
      'Y llega enero, con un extracto de la tarjeta de dos millones trescientos mil pesos.',
      'Diciembre no es el problema. Gastar sin tope, sí.',
      '¡Hagamos un plan!',
      'Ponle un tope al mes a regalos, salidas y viajes.',
      'Y pregúntame cómo vas. Te aviso antes de que te pases.',
      'Rumi. Gratis en Google Play y en la App Store. Sin conectar tu banco.',
    ],
  },
  // "¿Ahorrando para algo?": a year of saving on and off, $340.000 of a $2.000.000 trip.
  // ($2.000.000 − $340.000) / 10 months = $166.000 a month, by September 2027.
  'meta-es': {
    drip: 1,
    lines: [
      'Llevas un año entero ahorrando para un viaje.',
      'Unos meses, cien mil. Otros meses, nada. Otros meses, lo vuelves a sacar.',
      'Un año después: trescientos cuarenta mil pesos. El viaje cuesta dos millones.',
      'No es que no puedas ahorrar. Es que no tienes un plan.',
      '¡Hagamos un plan!',
      'Dime para qué es, cuánto necesitas y para cuándo.',
      'Te digo exactamente cuánto apartar cada mes.',
      'Y lo ves crecer, hasta que llegas.',
      'Rumi. Gratis en Google Play y en la App Store. Sin conectar tu banco.',
    ],
  },
};

// Narration of the English need reels built on src/NeedEn.tsx (one line per scene, in order).
// voice/need-en.ts speaks them into public/voice/<id>/<n>.mp3. `drip` is the line whose
// sentences pop cards one by one (one item per sentence). Numbers in words for the voice.
// Amounts on screen and in the lines must agree; Rumi's answers copy the app's English text.
export const NEED_EN: Record<string, { lines: string[]; drip?: number }> = {
  // "It's just $5": small spends that add up. $310 a month × 12 = $3,720 a year.
  'small-en': {
    drip: 1,
    lines: [
      'It’s just five dollars. That’s nothing, right?',
      'Coffee. A snack. A soda. A delivery fee. An app you forgot to cancel. Another coffee.',
      'Five dollars here, three dollars there. By the end of the month, that’s three hundred ten dollars.',
      'And in a year? Over three thousand seven hundred dollars. A whole vacation, gone in little pieces.',
      'Small spends aren’t small. They’re just invisible.',
      'I’ll make them visible!',
      'Log every little spend in seconds.',
      'I add up your small spends, so you see exactly where they go.',
      'Ask me, and I’ll tell you which ones cost you the most.',
      'Rumi. Free on the App Store and Google Play. No bank link.',
    ],
  },
  // "The card that never goes down": $3,200 at about 22% a year (1.83% a month), $95 minimum.
  // Six months: $570 paid, about $2,970 still owed. At the minimum: ~53 months, ~$1,800 interest.
  // With $50 extra ($145): ~29 months (24 sooner), ~$900 less interest.
  'card-en': {
    lines: [
      'You pay your credit card every month. So why does the balance never go down?',
      'You owe three thousand two hundred dollars. You pay the minimum, ninety-five. But interest adds fifty-eight.',
      'Month after month, it barely moves. Six months and five hundred seventy dollars later, you still owe almost three thousand.',
      'At the minimum, it takes over four years, and about eighteen hundred dollars in interest.',
      'It’s not that you don’t pay. You just can’t see the way out.',
      'Let me show you the way out!',
      'I tell you the day you’ll be debt-free.',
      'Add fifty dollars a month, and you’re out two years sooner, with about nine hundred dollars less in interest.',
      'And I remind you the day before every payment, so you’re never late.',
      'Rumi. Free on the App Store and Google Play. No bank link.',
    ],
  },
};

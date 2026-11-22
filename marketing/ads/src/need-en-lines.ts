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
  // "Forgot a bill again?": rent due on the 1st, paid on the 6th, $75 late fee; four times a year = $300.
  'bills-en': {
    lines: [
      'Forgot a bill again?',
      'Rent was due on the first. You paid it on the sixth.',
      'Late fee: seventy-five dollars. For money you already had.',
      'Four times a year, and that’s three hundred dollars, for nothing.',
      'The money was there. The reminder wasn’t.',
      'I never forget!',
      'I notice what you pay every month, and suggest a reminder for each one.',
      'The day before, I remind you, with the usual amount.',
      'And if you already paid, I stay quiet.',
      'Rumi. Free on the App Store and Google Play. No bank link.',
    ],
  },
  // "January broke": December with no limits, then a $2,100 card bill.
  'january-en': {
    drip: 1,
    lines: [
      'December. Gifts, parties, a trip home. It’s the holidays!',
      'Gifts. Dinner out. Flights. Decorations. The ugly sweater party.',
      'Then January comes, with a two thousand one hundred dollar card bill.',
      'The holidays aren’t the problem. Spending with no limit is.',
      'Let’s plan it!',
      'Put a monthly limit on gifts, going out and travel.',
      'And ask me how you’re doing. I warn you before you go over.',
      'Rumi. Free on the App Store and Google Play. No bank link.',
    ],
  },
  // "Saving for something?": a year of saving on and off, $340 of a $2,000 trip.
  // ($2,000 − $340) / 10 months ≈ $166 a month, by September 2027.
  'goal-en': {
    drip: 1,
    lines: [
      'You’ve been saving for a trip for a whole year.',
      'Some months, a hundred. Some months, nothing. Some months, you take it back.',
      'A year later: three hundred forty dollars. The trip costs two thousand.',
      'It’s not that you can’t save. You just don’t have a plan.',
      'Let’s make a plan!',
      'Tell me what it’s for, how much, and by when.',
      'I tell you exactly how much to put in each month.',
      'Then watch it grow, until you get there.',
      'Rumi. Free on the App Store and Google Play. No bank link.',
    ],
  },
};

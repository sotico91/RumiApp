// "Gastos hormiga" reel: the app part, recorded with
// `SCRIPT=hormiga SKIP_SEED=1 node --experimental-strip-types tutorial/record.ts` on the simulator
// that already has the demo data (../flows/seed.yaml). See src/HormigaVideo.tsx.
import type { TutorialChapter } from './tutorial';

export const hormigaChapters: TutorialChapter[] = [
  {
    id: 'hormiga',
    title: 'Gastos hormiga',
    steps: [
      {
        say: 'Plan',
        text: 'Plan',
        hand: true,
        flow: `
- tapOn: "Plan"`,
      },
      {
        say: 'Gastos hormiga',
        text: 'Gastos hormiga',
        hand: true,
        flow: `
- tapOn: "Gastos hormiga.*"
- swipe: { start: "50%,75%", end: "50%,40%", duration: 1600 }`,
      },
    ],
  },
];

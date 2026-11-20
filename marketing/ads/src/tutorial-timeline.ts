// Where every part of the tutorial falls, in seconds. Shared by the video (Tutorial.tsx) and
// tutorial/chapters.ts, which prints the YouTube chapter list from the same numbers.
import type { TutorialChapter } from './tutorial';

export type Clip = { file: string; from: number; to: number };
export type Voice = Record<string, { file: string; seconds: number }>;

export const INTRO_SECONDS = 4;
export const CHAPTER_CARD_SECONDS = 2.4;
// Breath after a voice line before the next step.
export const VOICE_GAP = 0.7;
export const VOICE_LEAD = 0.25;

export type StepSpan = {
  chapter: number;
  step: number;
  start: number;
  seconds: number;
  /** Footage: play [from, to] of `file`, then hold its last frame; or hold `to` from the start. */
  clip?: Clip;
  /** Seconds the footage plays, at `rate` times its speed. */
  footage: number;
  rate: number;
  hold: boolean;
  say: string;
  text: string;
};

export type ChapterSpan = { index: number; title: string; cardStart: number; start: number; end: number };

export function tutorialTimeline(
  chapters: TutorialChapter[],
  clips: Record<string, Clip>,
  voice: Voice,
  endSay: string,
  introSeconds = INTRO_SECONDS,
) {
  const steps: StepSpan[] = [];
  const spans: ChapterSpan[] = [];
  let t = introSeconds;
  let last: Clip | undefined;
  chapters.forEach((c, ci) => {
    const cardStart = t;
    // The first chapter follows the title card straight away.
    if (ci > 0) t += CHAPTER_CARD_SECONDS;
    const start = t;
    c.steps.forEach((s, si) => {
      const own = s.flow ? clips[`${c.id}-${si + 1}`] : undefined;
      const clip = own ?? last;
      const spoken = (voice[s.say]?.seconds ?? 2) + VOICE_LEAD + VOICE_GAP;
      // Long typing with a short line plays faster (up to 2x), so the voice isn't followed by silence.
      const raw = own ? own.to - own.from : 0;
      const rate = Math.min(2, Math.max(1, raw / (spoken + 2)));
      const footage = raw / rate;
      const seconds = Math.max(footage, spoken);
      steps.push({ chapter: ci, step: si, start: t, seconds, footage, rate, clip, hold: !own, say: s.say, text: s.text });
      t += seconds;
      if (own) last = own;
    });
    spans.push({ index: ci, title: c.title, cardStart, start, end: t });
  });
  const endStart = t;
  const endSeconds = Math.max(5, (voice[endSay]?.seconds ?? 3) + 2);
  return { steps, chapters: spans, endStart, endSeconds, total: endStart + endSeconds };
}

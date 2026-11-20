// Prints the YouTube chapter list ("0:00 Intro" …) for out/tutorial-es.mp4, from the same timeline the video uses.
// Run: node --experimental-strip-types tutorial/chapters.ts
import { readFileSync } from 'node:fs';
import { tutorialChapters, tutorialEnd } from '../src/tutorial.ts';
import { tutorialTimeline } from '../src/tutorial-timeline.ts';

const json = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const t = tutorialTimeline(tutorialChapters, json('../src/tutorial-clips.json'), json('../src/tutorial-voice.json'), tutorialEnd.say);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
t.chapters.forEach((c, i) => console.log(`${i === 0 ? '0:00' : mmss(c.cardStart)} ${c.title}`));
console.log(`\nTotal ${mmss(t.total)}`);

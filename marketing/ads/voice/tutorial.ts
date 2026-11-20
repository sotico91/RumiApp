// Speaks every line of the tutorial (src/tutorial.ts) into public/voice/ and writes
// src/tutorial-voice.json: the file and how long each line lasts.
// Run: node --experimental-strip-types voice/tutorial.ts   (needs edge-tts on PATH, or EDGE_TTS=/path/to/edge-tts)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tutorialChapters, tutorialEnd } from '../src/tutorial.ts';

const VOICE = process.env.VOICE ?? 'es-CO-SalomeNeural';
// A little slower than her default, so each step is easy to follow.
const RATE = process.env.RATE ?? '-6%';
const tts = process.env.EDGE_TTS ?? 'edge-tts';

const lines = new Set<string>([tutorialEnd.say]);
for (const c of tutorialChapters) for (const s of c.steps) lines.add(s.say);

/** Seconds until the last audible sample; the files end in about a second of silence. */
function speechEnd(mp3: string): number {
  const wav = join(tmpdir(), 'rumi-voice.wav');
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@24000', '-c', '1', mp3, wav]);
  const buf = readFileSync(wav);
  rmSync(wav);
  const data = buf.indexOf('data') + 8;
  let last = data;
  for (let i = data; i + 1 < buf.length; i += 2) if (Math.abs(buf.readInt16LE(i)) > 600) last = i;
  return Math.round(((last - data) / 2 / 24000) * 100) / 100;
}

mkdirSync('public/voice', { recursive: true });
const out: Record<string, { file: string; seconds: number }> = {};
for (const text of lines) {
  const file = `voice/${createHash('sha1').update(`${VOICE}|${RATE}|${text}`).digest('hex').slice(0, 12)}.mp3`;
  if (!existsSync(`public/${file}`)) {
    execFileSync(tts, ['--voice', VOICE, `--rate=${RATE}`, '--text', text, '--write-media', `public/${file}`]);
  }
  const seconds = speechEnd(`public/${file}`);
  out[text] = { file, seconds };
  console.log(`${seconds.toFixed(2)}s  ${text}`);
}
writeFileSync('src/tutorial-voice.json', `${JSON.stringify(out, null, 2)}\n`);

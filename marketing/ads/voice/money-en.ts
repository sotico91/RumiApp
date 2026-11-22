// Voice for the English need reel "Where did my money go?" (src/MoneyEnVideo.tsx): one mp3 per
// line in public/voice/money-en/<n>.mp3 and src/money-en-voice.json with each file's length and,
// for the drip line, when each spend is said (edge-tts sentence boundaries: one spend per sentence).
// Run: EDGE_TTS=/path/to/edge-tts node --experimental-strip-types voice/money-en.ts
// then:  node --experimental-strip-types voice/mouths.ts plata hormiga money-en
// edge-tts is a draft voice; for paid ads re-voice with Azure Speech (same voice name).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MONEY_EN_LINES } from '../src/money-en-lines.ts';

const VOICE = 'en-US-AvaNeural';
const RATE = '-2%';
const tts = process.env.EDGE_TTS ?? 'edge-tts';

/** Seconds of audio up to the last audible sample. */
function seconds(mp3: string): number {
  const wav = join(tmpdir(), 'rumi-money-en.wav');
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@24000', '-c', '1', mp3, wav]);
  const buf = readFileSync(wav);
  rmSync(wav);
  const data = buf.indexOf('data') + 8;
  let last = (buf.length - data) >> 1;
  while (last > 0 && Math.abs(buf.readInt16LE(data + (last - 1) * 2)) < 300) last--;
  return Math.round((last / 24000) * 100) / 100;
}

/** Start of every cue in an SRT file, in seconds. */
function cueStarts(srt: string): number[] {
  return [...srt.matchAll(/(\d\d):(\d\d):(\d\d)[,.](\d\d\d) -->/g)].map(
    ([, h, m, s, ms]) => Math.round((+h * 3600 + +m * 60 + +s + +ms / 1000) * 100) / 100
  );
}

mkdirSync('public/voice/money-en', { recursive: true });
const out: { seconds: number[]; dripAt: number[] } = { seconds: [], dripAt: [] };
for (const [i, line] of MONEY_EN_LINES.entries()) {
  const file = `public/voice/money-en/${i + 1}.mp3`;
  const srt = join(tmpdir(), `rumi-money-en-${i + 1}.srt`);
  if (!existsSync(file) || i === 1) {
    execFileSync(tts, ['--voice', VOICE, `--rate=${RATE}`, '--text', line, '--write-media', file, '--write-subtitles', srt]);
  }
  out.seconds.push(seconds(file));
  // Line 2 names the spends: "Then it starts." first, then one sentence per spend.
  if (i === 1) out.dripAt = cueStarts(readFileSync(srt, 'utf8')).slice(1);
  console.log(`${out.seconds[i].toFixed(2)}s  ${line}`);
}
writeFileSync('src/money-en-voice.json', `${JSON.stringify(out)}\n`);
console.log('drip at', out.dripAt.join(', '));

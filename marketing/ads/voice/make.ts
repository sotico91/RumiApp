// Speaks every voice line in src/ads.ts into public/voice/ and writes their lengths to src/voice.json,
// which the ads read to give each step the time its line needs.
// Run: node --experimental-strip-types voice/make.ts   (needs edge-tts on PATH, or EDGE_TTS=/path/to/edge-tts)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ads } from '../src/ads.ts';

const VOICE = process.env.VOICE ?? 'es-CO-SalomeNeural';
// A little slower than her default, so each step is easy to follow.
const RATE = process.env.RATE ?? '-8%';
const tts = process.env.EDGE_TTS ?? 'edge-tts';

const lines = new Set<string>();
for (const ad of Object.values(ads)) {
  for (const text of [ad.hookSay, ad.endSay, ...ad.captions.map((c) => c.say)]) if (text) lines.add(text);
}

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
writeFileSync('src/voice.json', `${JSON.stringify(out, null, 2)}\n`);

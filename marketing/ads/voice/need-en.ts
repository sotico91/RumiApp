// Voice for the English need reels in src/NeedEn.tsx: public/voice/<id>/<n>.mp3 per line and
// src/need-en-voice.json with each file's length and, for the `drip` line, when each sentence
// (one item each) starts, from edge-tts sentence boundaries.
// Run: EDGE_TTS=/path/to/edge-tts node --experimental-strip-types voice/need-en.ts [id…]
// then:  node --experimental-strip-types voice/mouths.ts plata hormiga money-en small-en card-en
// edge-tts is a draft voice; for paid ads re-voice with Azure Speech (same voice name).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NEED_EN } from '../src/need-en-lines.ts';

const VOICE = 'en-US-AvaNeural';
const RATE = '-2%';
const tts = process.env.EDGE_TTS ?? 'edge-tts';
const OUT = 'src/need-en-voice.json';

/** Seconds of audio up to the last audible sample. */
function seconds(mp3: string): number {
  const wav = join(tmpdir(), 'rumi-need-en.wav');
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@24000', '-c', '1', mp3, wav]);
  const buf = readFileSync(wav);
  rmSync(wav);
  const data = buf.indexOf('data') + 8;
  let last = (buf.length - data) >> 1;
  while (last > 0 && Math.abs(buf.readInt16LE(data + (last - 1) * 2)) < 300) last--;
  return Math.round((last / 24000) * 100) / 100;
}

const cueStarts = (srt: string) =>
  [...srt.matchAll(/(\d\d):(\d\d):(\d\d)[,.](\d\d\d) -->/g)].map(
    ([, h, m, s, ms]) => Math.round((+h * 3600 + +m * 60 + +s + +ms / 1000) * 100) / 100
  );

const out: Record<string, { seconds: number[]; dripAt: number[] }> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(NEED_EN);
for (const id of ids) {
  const { lines, drip, voice = VOICE } = NEED_EN[id];
  mkdirSync(`public/voice/${id}`, { recursive: true });
  out[id] = { seconds: [], dripAt: [] };
  for (const [i, line] of lines.entries()) {
    const file = `public/voice/${id}/${i + 1}.mp3`;
    const srt = join(tmpdir(), `rumi-${id}-${i + 1}.srt`);
    execFileSync(tts, ['--voice', voice, `--rate=${RATE}`, '--text', line, '--write-media', file, '--write-subtitles', srt]);
    out[id].seconds.push(seconds(file));
    if (i === drip) out[id].dripAt = cueStarts(readFileSync(srt, 'utf8'));
    console.log(`${id} ${out[id].seconds[i].toFixed(2)}s  ${line}`);
  }
}
writeFileSync(OUT, `${JSON.stringify(out)}\n`);

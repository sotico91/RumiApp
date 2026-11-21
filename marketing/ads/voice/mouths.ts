// How open Rumi's mouth is on every video frame of the need reels' lines (PlataVideo,
// HormigaVideo…): the loudness of each mp3 under public/voice/<dir>/, the same envelope as
// voice/mascot.ts. Writes src/mouths.json, keyed by the file path used in staticFile().
//   node --experimental-strip-types voice/mouths.ts plata hormiga
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FPS = 30;
const SR = 24000;

function envelope(mp3: string): number[] {
  const wav = join(tmpdir(), 'rumi-mouth.wav');
  execFileSync('afconvert', ['-f', 'WAVE', '-d', `LEI16@${SR}`, '-c', '1', mp3, wav]);
  const buf = readFileSync(wav);
  rmSync(wav);
  const data = buf.indexOf('data') + 8;
  const samples = (buf.length - data) >> 1;
  const per = SR / FPS;
  const rms: number[] = [];
  for (let f = 0; f * per < samples; f++) {
    let sum = 0;
    const end = Math.min(samples, (f + 1) * per);
    for (let i = f * per; i < end; i++) sum += buf.readInt16LE(data + i * 2) ** 2;
    rms.push(Math.sqrt(sum / per));
  }
  let last = rms.length - 1;
  while (last > 0 && rms[last] < 300) last--;
  const sorted = [...rms].sort((a, b) => a - b);
  const loud = sorted[Math.floor(sorted.length * 0.95)] || 1;
  return rms.slice(0, last + 1).map((v) => Math.round(Math.min(1, Math.max(0, (v - 200) / loud)) * 100) / 100);
}

const out: Record<string, number[]> = {};
for (const dir of process.argv.slice(2)) {
  for (const name of readdirSync(`public/voice/${dir}`).filter((n) => n.endsWith('.mp3')).sort()) {
    const key = `voice/${dir}/${name}`;
    out[key] = envelope(`public/${key}`);
    console.log(`${key} ${(out[key].length / FPS).toFixed(2)}s`);
  }
}
writeFileSync('src/mouths.json', `${JSON.stringify(out)}\n`);

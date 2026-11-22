// Speaks every line of src/mascot.ts into public/voice/ and writes src/mascot-voice.json: how long
// each line lasts and its loudness per video frame, which opens and closes Rumi's mouth.
// Run: node --experimental-strip-types voice/mascot.ts   (needs edge-tts on PATH, or EDGE_TTS=/path/to/edge-tts)
// With credentials/azure-speech.json at the repo root ({ "key": "...", "region": "eastus" }) it speaks the same voice through
// Azure Speech instead, which has a commercial license (edge-tts is only a draft, not for paid ads). TTS=edge forces edge-tts.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mascotVideos } from '../src/mascot-scenes.ts';

const DEFAULT_VOICE = process.env.VOICE ?? 'es-CO-SalomeNeural';
const RATE = process.env.RATE ?? '-4%';
const tts = process.env.EDGE_TTS ?? 'edge-tts';
const AZURE_FILE = new URL('../../../credentials/azure-speech.json', import.meta.url);
const azure: { key: string; region: string } | null =
  process.env.TTS !== 'edge' && existsSync(AZURE_FILE) ? JSON.parse(readFileSync(AZURE_FILE, 'utf8')) : null;
const PROVIDER = azure ? 'azure' : 'edge';

const xml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Azure Speech REST: same neural voice and rate as edge-tts, 24 kHz mono mp3. */
async function azureSpeak(text: string, path: string, VOICE: string) {
  const ssml = `<speak version="1.0" xml:lang="${VOICE.split('-').slice(0, 2).join('-')}"><voice name="${VOICE}"><prosody rate="${RATE}">${xml(text)}</prosody></voice></speak>`;
  for (let i = 0; ; i++) {
    const r = await fetch(`https://${azure!.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azure!.key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'rumi-ads',
      },
      body: ssml,
    });
    if (r.ok) return writeFileSync(path, Buffer.from(await r.arrayBuffer()));
    if (r.status === 429 && i < 5) { await new Promise((ok) => setTimeout(ok, 2000 * (i + 1))); continue; }
    throw new Error(`Azure TTS ${r.status}: ${await r.text()}`);
  }
}
const FPS = 30;
const SR = 24000;

/** Loudness per frame (0–1) up to the last audible sample. */
function envelope(mp3: string): number[] {
  const wav = join(tmpdir(), 'rumi-mascot.wav');
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

mkdirSync('public/voice', { recursive: true });
const out: Record<string, { file: string; seconds: number; mouth: number[] }> = {};
for (const { say, VOICE } of Object.values(mascotVideos).flatMap((v) => v.scenes.map((s) => ({ say: s.say, VOICE: v.voice ?? DEFAULT_VOICE })))) {
  if (out[say]) continue;
  const file = `voice/${createHash('sha1').update(`${PROVIDER === 'azure' ? 'azure|' : ''}${VOICE}|${RATE}|${say}`).digest('hex').slice(0, 12)}.mp3`;
  if (!existsSync(`public/${file}`)) {
    if (azure) await azureSpeak(say, `public/${file}`, VOICE);
    else execFileSync(tts, ['--voice', VOICE, `--rate=${RATE}`, '--text', say, '--write-media', `public/${file}`]);
  }
  const mouth = envelope(`public/${file}`);
  out[say] = { file, seconds: mouth.length / FPS, mouth };
  console.log(`${PROVIDER} ${(mouth.length / FPS).toFixed(2)}s  ${say}`);
}
writeFileSync('src/mascot-voice.json', `${JSON.stringify(out)}\n`);

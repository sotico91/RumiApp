// Records the tutorial (src/tutorial.ts) on the booted iOS simulator: one clip per step that has a
// `flow`, into public/clips/tutorial/, then finds where each clip moves (ffmpeg freezedetect) and
// writes src/tutorial-clips.json, so the video skips Maestro's start-up and the idle tail.
// Seeds the demo data first (WIPES the app's data on that simulator) unless SKIP_SEED=1.
//   node --experimental-strip-types tutorial/record.ts
//   DRY=1     runs the steps without recording (to check the selectors)
//   MEASURE=1 only measures the clips already recorded (no simulator needed)
//   FROM=<chapter id>  starts at that chapter (with SKIP_SEED=1, after a run that stopped there)
//   SIM, MAESTRO as in record.sh
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { tutorialChapters } from '../src/tutorial.ts';

const sh = (cmd: string, args: string[]) => execFileSync(cmd, args, { encoding: 'utf8' });
const sleep = (s: number) => new Promise((ok) => setTimeout(ok, s * 1000));
const SIM = process.env.SIM ?? sh('xcrun', ['simctl', 'list', 'devices', 'booted']).match(/[0-9A-F-]{36}/)?.[0];
if (!SIM) throw new Error('No booted simulator');
const MAESTRO = process.env.MAESTRO ?? join(homedir(), '.maestro-cli/maestro/bin/maestro');
const DRY = process.env.DRY === '1';
const OUT = 'public/clips/tutorial';
const CLIPS = 'src/tutorial-clips.json';
mkdirSync(OUT, { recursive: true });

const maestro = (file: string) => execFileSync(MAESTRO, ['--device', SIM, 'test', file], { stdio: 'inherit' });

/**
 * First and last moment the picture changes: samples the clip at 10 fps as tiny gray frames and
 * compares each with the one before (Remotion's ffmpeg has no freezedetect).
 */
function motion(file: string): { from: number; to: number; length: number } {
  const W = 36;
  const H = 78;
  const raw = execFileSync(
    'npx',
    ['remotion', 'ffmpeg', '-hide_banner', '-v', 'error', '-i', file, '-r', '10', '-vf', `scale=${W}:${H}`, '-pix_fmt', 'gray', '-c:v', 'rawvideo', '-f', 'image2pipe', '-'],
    { maxBuffer: 1 << 28 },
  );
  const size = W * H;
  const frames = Math.floor(raw.length / size);
  const moving: number[] = [];
  for (let i = 1; i < frames; i++) {
    let sum = 0;
    for (let j = 0; j < size; j++) sum += Math.abs(raw[i * size + j] - raw[(i - 1) * size + j]);
    if (sum / size > 0.15) moving.push(i);
  }
  const length = frames / 10;
  if (!moving.length) return { from: 0, to: Math.min(length, 1), length };
  const from = Math.max(0, moving[0] / 10 - 0.4);
  const to = Math.min(length, moving[moving.length - 1] / 10 + 0.8);
  return { from, to, length };
}

async function main() {
  if (!DRY && process.env.MEASURE !== '1') {
    sh('xcrun', ['simctl', 'status_bar', SIM!, 'override', '--time', '9:41', '--batteryState', 'charged', '--batteryLevel', '100', '--cellularBars', '4', '--wifiBars', '3']);
  }
  if (process.env.SKIP_SEED !== '1' && process.env.MEASURE !== '1') maestro(join(import.meta.dirname, '../../flows/seed.yaml'));
  const clips: Record<string, { file: string; from: number; to: number }> =
    existsSync(CLIPS) ? JSON.parse(readFileSync(CLIPS, 'utf8')) : {};
  const startAt = process.env.FROM ? tutorialChapters.findIndex((c) => c.id === process.env.FROM) : 0;
  for (const chapter of tutorialChapters.slice(startAt)) {
    for (const [i, step] of chapter.steps.entries()) {
      if (!step.flow) continue;
      const id = `${chapter.id}-${i + 1}`;
      const yaml = join(tmpdir(), `rumi-tutorial-${id}.yaml`);
      writeFileSync(yaml, `appId: com.sotico91.rumi\n---${step.flow}\n`);
      console.log(`\n▶ ${id}: ${step.text}`);
      if (DRY) {
        maestro(yaml);
        continue;
      }
      const file = `${OUT}/${id}.mp4`;
      if (process.env.MEASURE === '1') {
        const m = motion(file);
        clips[id] = { file: `clips/tutorial/${id}.mp4`, from: Math.round(m.from * 100) / 100, to: Math.round(m.to * 100) / 100 };
        console.log(`  motion ${clips[id].from}s → ${clips[id].to}s of ${m.length.toFixed(2)}s`);
        writeFileSync(CLIPS, `${JSON.stringify(clips, null, 2)}\n`);
        continue;
      }
      const rec = spawn('xcrun', ['simctl', 'io', SIM!, 'recordVideo', '--codec', 'h264', '--force', file], { stdio: ['ignore', 'pipe', 'pipe'] });
      // recordVideo can take several seconds to start: wait for its "Recording started" line.
      await new Promise<void>((ok) => {
        const timer = setTimeout(ok, 15000);
        const watch = (d: Buffer) => {
          if (/Recording started/i.test(String(d))) {
            clearTimeout(timer);
            ok();
          }
        };
        rec.stdout!.on('data', watch);
        rec.stderr!.on('data', watch);
      });
      await sleep(0.8);
      try {
        maestro(yaml);
        await sleep(2.5);
      } finally {
        rec.kill('SIGINT');
        await new Promise((ok) => rec.on('exit', ok));
      }
      const m = motion(file);
      clips[id] = { file: `clips/tutorial/${id}.mp4`, from: Math.round(m.from * 100) / 100, to: Math.round(m.to * 100) / 100 };
      console.log(`  motion ${clips[id].from}s → ${clips[id].to}s of ${m.length.toFixed(2)}s`);
      writeFileSync(CLIPS, `${JSON.stringify(clips, null, 2)}\n`);
    }
  }
}

await main();

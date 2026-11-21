// Records the tutorial (src/tutorial.ts) on the booted iOS simulator: one clip per step that has a
// `flow`, into public/clips/tutorial/, then finds where each clip moves (ffmpeg freezedetect) and
// writes src/tutorial-clips.json, so the video skips Maestro's start-up and the idle tail.
// Seeds the demo data first (WIPES the app's data on that simulator) unless SKIP_SEED=1.
//   node --experimental-strip-types tutorial/record.ts
//   DRY=1     runs the steps without recording (to check the selectors)
//   MEASURE=1 only measures the clips already recorded (no simulator needed)
//   FROM=<chapter id>  starts at that chapter (with SKIP_SEED=1, after a run that stopped there)
//   SIM, MAESTRO as in record.sh
//   SCRIPT=prima records the prima promo (src/prima.ts) into public/clips/prima/ and src/prima-clips.json
// Steps with `hand: true` also get where their first tapOn is on screen (0..1 of the screen), read
// with `maestro hierarchy` just before the step runs, so the video can show a hand tapping there.
// Check them on a frame at `from`: when the screen moves before the tap (keyboard closing, a form
// opening), fix the point by hand in the clips JSON.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { primaChapters } from '../src/prima.ts';
import { tutorialChapters } from '../src/tutorial.ts';

const sh = (cmd: string, args: string[]) => execFileSync(cmd, args, { encoding: 'utf8' });
const sleep = (s: number) => new Promise((ok) => setTimeout(ok, s * 1000));
const SIM = process.env.SIM ?? sh('xcrun', ['simctl', 'list', 'devices', 'booted']).match(/[0-9A-F-]{36}/)?.[0];
if (!SIM) throw new Error('No booted simulator');
const MAESTRO = process.env.MAESTRO ?? join(homedir(), '.maestro-cli/maestro/bin/maestro');
const DRY = process.env.DRY === '1';
const SCRIPT = process.env.SCRIPT === 'prima' ? 'prima' : 'tutorial';
const chapters = SCRIPT === 'prima' ? primaChapters : tutorialChapters;
const OUT = `public/clips/${SCRIPT}`;
const CLIPS = `src/${SCRIPT}-clips.json`;
mkdirSync(OUT, { recursive: true });

const maestro = (file: string) => execFileSync(MAESTRO, ['--device', SIM, 'test', file], { stdio: 'inherit' });

type Node = { attributes?: Record<string, string>; children?: Node[] };
type Box = [number, number, number, number];
const boxOf = (b?: string): Box | undefined => {
  const m = b?.match(/\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/);
  return m ? [+m[1], +m[2], +m[3], +m[4]] : undefined;
};

/** The first `tapOn` of a flow: an id, or a text regex Maestro matches against the whole label. */
function firstTap(flow: string): { id?: string; text?: string } | undefined {
  const line = flow.split('\n').find((l) => l.trim().startsWith('- tapOn:'));
  if (!line) return undefined;
  const rest = line.slice(line.indexOf('tapOn:') + 6).trim();
  const id = rest.match(/id:\s*"([^"]+)"/)?.[1];
  if (id) return { id };
  const text = rest.match(/^"(.*)"$/)?.[1];
  // The YAML holds the regex with escaped backslashes.
  return text ? { text: text.replace(/\\\\/g, '\\') } : undefined;
}

/** Centre of the element the step taps first, as 0..1 of the screen; undefined if not found. */
function tapPoint(flow: string): { x: number; y: number } | undefined {
  const sel = firstTap(flow);
  if (!sel) return undefined;
  const raw = execFileSync(MAESTRO, ['--device', SIM!, 'hierarchy'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const tree = JSON.parse(raw.slice(raw.indexOf('{'))) as Node;
  // The screen is the first node with bounds (the root); some lists run wider than it.
  let screen: Box | undefined;
  const hits: Box[] = [];
  const re = sel.text ? new RegExp(`^(?:${sel.text})$`, 's') : undefined;
  const walk = (n: Node) => {
    const a = n.attributes ?? {};
    const b = boxOf(a.bounds);
    if (b && !screen && b[2] > 0) screen = b;
    const inside = b && screen && b[0] >= 0 && b[2] <= screen[2] + 1 && b[1] >= 0 && b[3] <= screen[3] + 1;
    if (b && inside && b[2] > b[0] && b[3] > b[1]) {
      if (sel.id && a['resource-id'] === sel.id) hits.push(b);
      else if (re && [a.text, a.accessibilityText].some((t) => t && re.test(t))) hits.push(b);
    }
    n.children?.forEach(walk);
  };
  walk(tree);
  // Maestro taps the deepest (smallest) match.
  const hit = hits.sort((p, q) => (p[2] - p[0]) * (p[3] - p[1]) - (q[2] - q[0]) * (q[3] - q[1]))[0];
  if (!hit || !screen) return undefined;
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return { x: r((hit[0] + hit[2]) / 2 / screen[2]), y: r((hit[1] + hit[3]) / 2 / screen[3]) };
}

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
  const clips: Record<string, { file: string; from: number; to: number; tap?: { x: number; y: number } }> =
    existsSync(CLIPS) ? JSON.parse(readFileSync(CLIPS, 'utf8')) : {};
  const startAt = process.env.FROM ? chapters.findIndex((c) => c.id === process.env.FROM) : 0;
  for (const chapter of chapters.slice(startAt)) {
    for (const [i, step] of chapter.steps.entries()) {
      if (!step.flow) continue;
      const id = `${chapter.id}-${i + 1}`;
      const yaml = join(tmpdir(), `rumi-tutorial-${id}.yaml`);
      writeFileSync(yaml, `appId: com.sotico91.rumi\n---${step.flow}\n`);
      const tap = step.hand && process.env.MEASURE !== '1' ? tapPoint(step.flow) : undefined;
      if (step.hand && process.env.MEASURE !== '1') console.log(`  hand at ${tap ? `${tap.x}, ${tap.y}` : 'NOT FOUND'}`);
      console.log(`\n▶ ${id}: ${step.text}`);
      if (DRY) {
        maestro(yaml);
        continue;
      }
      const file = `${OUT}/${id}.mp4`;
      if (process.env.MEASURE === '1') {
        const m = motion(file);
        clips[id] = { ...clips[id], file: `clips/${SCRIPT}/${id}.mp4`, from: Math.round(m.from * 100) / 100, to: Math.round(m.to * 100) / 100 };
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
      clips[id] = { file: `clips/${SCRIPT}/${id}.mp4`, from: Math.round(m.from * 100) / 100, to: Math.round(m.to * 100) / 100, ...(tap ? { tap } : {}) };
      console.log(`  motion ${clips[id].from}s → ${clips[id].to}s of ${m.length.toFixed(2)}s`);
      writeFileSync(CLIPS, `${JSON.stringify(clips, null, 2)}\n`);
    }
  }
}

await main();

import {
  AbsoluteFill,
  Audio,
  Freeze,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { brand, fonts, FPS } from './brand';
import { primaChapters, primaEnd, primaIntro } from './prima';
import clipsJson from './prima-clips.json';
import type { Voice } from './tutorial-timeline';
import voiceJson from './prima-voice.json';

// "Llegó la prima" (16:9): the phone on the left playing the recorded steps, with a hand that taps
// where each step taps; the line on the right. Steps come from src/prima.ts.
type Tap = { x: number; y: number };
type Clip = { file: string; from: number; to: number; tap?: Tap };
const clips = clipsJson as Record<string, Clip>;
const voice = voiceJson as Voice;

const f = (s: number) => Math.round(s * FPS);
const INTRO = Math.max(3.2, (voice[primaIntro.say]?.seconds ?? 3) + 0.9);
// Before a tap the footage waits on its first frame while the hand moves in.
const HAND_LEAD = 0.45;
const VOICE_LEAD = 0.2;
const GAP = 0.3;

type Span = { chapter: number; start: number; seconds: number; lead: number; footage: number; rate: number; clip?: Clip; say: string; text: string };

function timeline() {
  const steps: Span[] = [];
  let t = INTRO;
  primaChapters.forEach((c, ci) => {
    c.steps.forEach((s, si) => {
      const clip = clips[`${c.id}-${si + 1}`];
      const lead = s.hand && clip?.tap ? HAND_LEAD : 0;
      const spoken = (voice[s.say]?.seconds ?? 2) + VOICE_LEAD + GAP;
      const raw = clip ? clip.to - clip.from : 0;
      // Long typing plays faster (up to 3x) so the voice isn't followed by a wait.
      const rate = Math.min(3, Math.max(1, raw / (spoken + 0.5)));
      const footage = raw / rate;
      const seconds = lead + Math.max(footage, spoken);
      steps.push({ chapter: ci, start: t, seconds, lead, footage, rate, clip, say: s.say, text: s.text });
      t += seconds;
    });
  });
  const endSeconds = Math.max(5, (voice[primaEnd.say]?.seconds ?? 4) + 1.6);
  return { steps, endStart: t, total: t + endSeconds };
}

const plan = timeline();
export const primaFrames = Math.round(plan.total * FPS);

// The simulator records 1206x2622 (iPhone 17 Pro); shown 900 px tall.
const SCREEN_H = 900;
const SCREEN_W = Math.round((SCREEN_H * 1206) / 2622);
const BEZEL = 14;

function Footage({ s }: { s: Span }) {
  if (!s.clip) return null;
  const src = staticFile(s.clip.file);
  const style = { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', objectFit: 'cover' as const };
  const lead = f(s.lead);
  const play = f(s.footage);
  return (
    <>
      {lead > 0 ? (
        <Sequence durationInFrames={lead}>
          <Freeze frame={f(s.clip.from)}>
            <OffthreadVideo src={src} muted style={style} />
          </Freeze>
        </Sequence>
      ) : null}
      <Sequence from={lead} durationInFrames={play}>
        <OffthreadVideo src={src} muted startFrom={f(s.clip.from)} playbackRate={s.rate} style={style} />
      </Sequence>
      <Sequence from={lead + play}>
        <Freeze frame={f(s.clip.to) - 1}>
          <OffthreadVideo src={src} muted style={style} />
        </Freeze>
      </Sequence>
    </>
  );
}

/** A hand that slides in, presses where the step taps (with a ripple) and leaves. */
function Hand({ tap, pressAt }: { tap: Tap; pressAt: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const press = f(pressAt);
  const arrive = spring({ frame, fps, config: { damping: 18, stiffness: 120 }, durationInFrames: Math.max(8, press) });
  const down = interpolate(frame, [press - 3, press, press + 5], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const out = interpolate(frame, [press + f(0.4), press + f(0.65)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ripple = interpolate(frame, [press, press + f(0.5)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = tap.x * SCREEN_W;
  const y = tap.y * SCREEN_H;
  // Comes in from below-right of the target.
  const dx = (1 - arrive) * 140;
  const dy = (1 - arrive) * 220;
  const SIZE = 118;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: out }}>
      {frame >= press ? (
        <div
          style={{
            position: 'absolute',
            left: x - 46,
            top: y - 46,
            width: 92,
            height: 92,
            borderRadius: '50%',
            border: `6px solid ${brand.coral}`,
            background: 'rgba(255,255,255,0.35)',
            transform: `scale(${0.4 + ripple * 0.9})`,
            opacity: 1 - ripple,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          // The emoji's fingertip sits about 40% across and 6% down its box.
          left: x - SIZE * 0.4 + dx,
          top: y - SIZE * 0.06 + dy,
          fontSize: SIZE,
          lineHeight: 1,
          transform: `scale(${1 - down * 0.12})`,
          transformOrigin: '40% 6%',
          filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.35))',
          opacity: Math.min(1, arrive * 1.6),
        }}>
        👆
      </div>
    </div>
  );
}

function Phone({ s }: { s: Span }) {
  const tap = s.clip?.tap;
  return (
    <div
      style={{
        width: SCREEN_W + BEZEL * 2,
        height: SCREEN_H + BEZEL * 2,
        borderRadius: 64,
        background: '#05121A',
        padding: BEZEL,
        boxShadow: '0 50px 90px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.06)',
        position: 'relative',
      }}>
      <div style={{ width: SCREEN_W, height: SCREEN_H, borderRadius: 52, overflow: 'hidden', position: 'relative', background: brand.cream }}>
        <Footage s={s} />
      </div>
      {tap && s.lead > 0 ? (
        <div style={{ position: 'absolute', left: BEZEL, top: BEZEL, width: SCREEN_W, height: SCREEN_H }}>
          {/* The tap lands when the recording starts to move: lead + 0.4 s of footage. */}
          <Hand tap={tap} pressAt={s.lead + 0.4 / s.rate} />
        </div>
      ) : null}
    </div>
  );
}

/** Soft coins and confetti drifting behind the phone, for depth. */
function Backdrop() {
  const frame = useCurrentFrame();
  const dots = [
    { x: 90, y: 160, r: 70, c: brand.gold, s: 0.6 },
    { x: 610, y: 120, r: 34, c: brand.coral, s: 0.9 },
    { x: 650, y: 860, r: 90, c: brand.gold, s: 0.4 },
    { x: 70, y: 820, r: 40, c: '#7BC6CC', s: 0.8 },
    { x: 380, y: 980, r: 26, c: brand.coral, s: 1.1 },
    { x: 140, y: 520, r: 22, c: '#FFFFFF', s: 1.3 },
  ];
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 140,
          width: 600,
          height: 800,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244,193,93,0.28), rgba(244,193,93,0) 70%)',
        }}
      />
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: d.x,
            top: d.y + Math.sin((frame / FPS) * d.s + i) * 14,
            width: d.r,
            height: d.r,
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, #FFFFFF, ${d.c} 55%)`,
            opacity: 0.55,
            boxShadow: '0 12px 24px rgba(0,0,0,0.25)',
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

function Caption({ s }: { s: Span }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 12 });
  return (
    <div style={{ opacity: pop, transform: `translateY(${(1 - pop) * 24}px)` }}>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 30, color: brand.coral, letterSpacing: 1, textTransform: 'uppercase' }}>
        {s.chapter + 1}. {primaChapters[s.chapter].title}
      </div>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 84, lineHeight: 1.06, color: brand.ink, marginTop: 18, textWrap: 'balance' }}>
        {s.text}
      </div>
    </div>
  );
}

function Steps({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      {primaChapters.map((c, i) => {
        const on = i === current;
        const done = i < current;
        return (
          <div
            key={c.id}
            style={{
              fontFamily: fonts.body,
              fontWeight: on ? 700 : 500,
              fontSize: 26,
              padding: '12px 22px',
              borderRadius: 999,
              background: on ? brand.petrol700 : done ? '#E6EFEF' : '#FFFFFF',
              color: on ? brand.cream : done ? brand.petrol500 : '#5B6B73',
              border: on ? 'none' : '2px solid #E3DED6',
            }}>
            {done ? '✓ ' : ''}
            {c.title}
          </div>
        );
      })}
    </div>
  );
}

function StepScene({ s }: { s: Span }) {
  return (
    <AbsoluteFill style={{ background: brand.cream, flexDirection: 'row' }}>
      <div
        style={{
          width: 760,
          position: 'relative',
          background: `linear-gradient(160deg, ${brand.petrol700}, ${brand.petrol900})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Backdrop />
        <Phone s={s} />
      </div>
      <div style={{ flex: 1, padding: '90px 90px 70px 90px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Img src={staticFile('icon.png')} style={{ width: 64, height: 64, borderRadius: 16 }} />
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 40, color: brand.petrol700 }}>Rumi</div>
          <div style={{ fontFamily: fonts.body, fontSize: 26, color: '#5B6B73', marginLeft: 8 }}>· {primaIntro.title}</div>
        </div>
        <Caption s={s} />
        <Steps current={s.chapter} />
      </div>
    </AbsoluteFill>
  );
}

function IntroCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14 }, durationInFrames: 22 });
  return (
    <AbsoluteFill
      style={{ background: `linear-gradient(160deg, ${brand.petrol700}, ${brand.petrol900})`, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ transform: `scale(${0.85 + pop * 0.15})`, opacity: Math.min(1, pop * 1.4) }}>
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 40, color: brand.gold, letterSpacing: 3, textTransform: 'uppercase' }}>
          {primaIntro.kicker}
        </div>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 150, color: brand.cream, marginTop: 10 }}>{primaIntro.title}</div>
        <div style={{ fontFamily: fonts.body, fontSize: 54, color: '#CFE0E3', marginTop: 18 }}>{primaIntro.subtitle}</div>
      </div>
    </AbsoluteFill>
  );
}

function EndCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 16 });
  return (
    <AbsoluteFill
      style={{ background: `linear-gradient(160deg, ${brand.petrol700}, ${brand.petrol900})`, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 120 }}>
      <div style={{ opacity: pop }}>
        <Img src={staticFile('icon.png')} style={{ width: 170, height: 170, borderRadius: 40 }} />
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 130, color: brand.cream, marginTop: 24 }}>{primaEnd.title}</div>
        <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 60, color: brand.gold }}>{primaEnd.tagline}</div>
        <div style={{ fontFamily: fonts.body, fontSize: 34, color: '#CFE0E3', marginTop: 24, maxWidth: 900 }}>{primaEnd.line}</div>
      </div>
      <div style={{ opacity: pop, padding: 24, borderRadius: 36, background: '#FFFFFF', textAlign: 'center' }}>
        <Img src={staticFile(primaEnd.qr)} style={{ width: 340, height: 340, display: 'block' }} />
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 28, color: brand.ink, marginTop: 12 }}>Descárgala gratis</div>
      </div>
    </AbsoluteFill>
  );
}

export function Prima() {
  const frame = useCurrentFrame();
  const total = primaFrames;
  const musicVolume = interpolate(frame, [0, f(1), total - f(2.5), total], [0, 0.1, 0.1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const intro = voice[primaIntro.say];
  const end = voice[primaEnd.say];
  return (
    <AbsoluteFill style={{ background: brand.petrol900 }}>
      <Audio src={staticFile('music/its-a-cool-thing.mp3')} volume={musicVolume} loop />
      <Sequence durationInFrames={f(INTRO)}>
        <IntroCard />
        <Audio src={staticFile('sfx/whoosh.mp3')} volume={0.35} />
        {intro ? (
          <Sequence from={f(0.3)}>
            <Audio src={staticFile(intro.file)} />
          </Sequence>
        ) : null}
      </Sequence>
      {plan.steps.map((s, i) => {
        const line = voice[s.say];
        return (
          <Sequence key={i} from={f(s.start)} durationInFrames={f(s.start + s.seconds) - f(s.start)}>
            <StepScene s={s} />
            {s.lead > 0 ? (
              <Sequence from={f(s.lead + 0.4 / s.rate)}>
                <Audio src={staticFile('sfx/tap.mp3')} volume={0.5} />
              </Sequence>
            ) : null}
            {line ? (
              <Sequence from={f(VOICE_LEAD)}>
                <Audio src={staticFile(line.file)} />
              </Sequence>
            ) : null}
          </Sequence>
        );
      })}
      <Sequence from={f(plan.endStart)}>
        <EndCard />
        {end ? (
          <Sequence from={f(0.4)}>
            <Audio src={staticFile(end.file)} />
          </Sequence>
        ) : null}
      </Sequence>
    </AbsoluteFill>
  );
}

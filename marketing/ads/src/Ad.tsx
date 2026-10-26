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
import { brand, fonts } from './brand';
import voice from './voice.json';

/**
 * One step of the ad: a line on screen from `at` (seconds into the recording) and, optionally,
 * what the voice says. The step lasts until the next caption, longer if its line needs it.
 */
export type Caption = { at: number; text: string; say?: string };

export type Sfx = {
  at: number;
  sound: 'tap' | 'type' | 'success';
  /** Seconds of the recording it lasts (typing bursts). */
  length?: number;
};

export type AdProps = {
  /** Opening line, alone on screen before the phone appears. */
  hook: string;
  hookSay?: string;
  /** Screen recording in public/clips/. */
  clip: string;
  /** Parts of the recording to keep, [from, to] in seconds; dead time in between is cut. */
  segments: [number, number][];
  playbackRate: number;
  /** Lines above the phone, each from `at` (recording seconds). */
  captions: Caption[];
  /** Taps, typing and saves, in recording seconds. */
  sfx: Sfx[];
  /** Track in public/music/, from `from` seconds (past a quiet intro); `volume` evens out quieter masters. */
  music: { file: string; from: number; volume?: number };
  /** Last card: what Rumi is, and the promise. */
  endTitle: string;
  /** Slogan under the name. */
  tagline: string;
  endLine: string;
  endSay?: string;
  cta: string;
};

const HOOK_SECONDS = 2.2;
const END_SECONDS = 3;
// Breath after a voice line before the next step starts.
const VOICE_GAP = 0.45;
const VOICE_LEAD = 0.15;

const voiceOf = (text?: string) => (text ? (voice as Record<string, { file: string; seconds: number }>)[text] : undefined);
const voiced = (text: string | undefined, min: number) =>
  Math.max(min, (voiceOf(text)?.seconds ?? 0) + VOICE_LEAD + VOICE_GAP);

export const hookSeconds = (p: AdProps) => voiced(p.hookSay, HOOK_SECONDS);
const endSeconds = (p: AdProps) => voiced(p.endSay, END_SECONDS);

/** What the phone shows, in order: a stretch of the recording, or its frame at `at` held still. */
type Piece = { start: number; seconds: number } & ({ from: number; to: number } | { hold: number });

/**
 * Lays the kept segments out step by step. A step whose voice line outlasts its footage holds
 * its last frame until the line ends, so nothing on screen moves on before it is explained.
 */
function timeline(p: AdProps): { pieces: Piece[]; stepStarts: number[]; seconds: number } {
  const pieces: Piece[] = [];
  const stepStarts: number[] = [];
  let t = 0;
  const bounds = [...p.captions.map((c) => c.at), Infinity];
  const firstAt = p.segments[0][0];
  // Footage before the first caption plays as a silent step.
  const steps = bounds[0] > firstAt ? [{ from: firstAt, to: bounds[0] }] : [];
  p.captions.forEach((c, i) => steps.push({ from: c.at, to: bounds[i + 1] }));
  steps.forEach((step, i) => {
    const caption = p.captions[i - (steps.length - p.captions.length)];
    if (caption) stepStarts.push(t);
    const begin = t;
    let last = step.from;
    for (const [from, to] of p.segments) {
      const a = Math.max(from, step.from);
      const b = Math.min(to, step.to);
      if (b <= a) continue;
      const seconds = (b - a) / p.playbackRate;
      pieces.push({ start: t, seconds, from: a, to: b });
      t += seconds;
      last = b;
    }
    const need = caption?.say ? voiced(caption.say, 0) : 0;
    if (t - begin < need) {
      pieces.push({ start: t, seconds: need - (t - begin), hold: last });
      t = begin + need;
    }
  });
  return { pieces, stepStarts, seconds: t };
}

export const bodySeconds = (p: AdProps) => timeline(p).seconds;

export const adSeconds = (p: AdProps) => hookSeconds(p) + bodySeconds(p) + endSeconds(p);

/** Recording seconds → seconds into the phone part of the ad (the first time that moment shows). */
function toBody(p: AdProps, at: number): number {
  for (const piece of timeline(p).pieces) {
    if (!('from' in piece)) continue;
    if (at < piece.from) return piece.start;
    if (at <= piece.to) return piece.start + (at - piece.from) / p.playbackRate;
  }
  return timeline(p).seconds;
}

const SCREEN_W = 600;
const SCREEN_H = Math.round((SCREEN_W * 2622) / 1206);
const SFX_VOLUME = { tap: 0.8, type: 0.5, success: 0.7 } as const;
// The stock tracks are mastered loud; this keeps taps and dings on top.
const MUSIC_VOLUME = 0.28;
const VOICE_MUSIC = 0.45;

function Background() {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 600], [0, 120]);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 20% ${10 + drift / 10}%, ${brand.petrol500} 0%, ${brand.petrol700} 45%, ${brand.petrol900} 100%)`,
      }}
    />
  );
}

function Hook({ text, seconds }: { text: string; seconds: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14 } });
  const out = interpolate(frame, [seconds * fps - 10, seconds * fps], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: 90, opacity: out }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 104,
          lineHeight: 1.08,
          color: brand.cream,
          textAlign: 'center',
          transform: `scale(${0.85 + pop * 0.15})`,
          opacity: pop,
        }}>
        {text}
      </div>
    </AbsoluteFill>
  );
}

function Phone({ p }: { p: AdProps }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16 } });
  return (
    <div
      style={{
        position: 'absolute',
        left: (1080 - SCREEN_W - 28) / 2,
        top: 520,
        padding: 14,
        borderRadius: 92,
        background: '#05090C',
        boxShadow: '0 40px 120px rgba(0,0,0,0.55), 0 0 0 3px #2B3740',
        transform: `translateY(${(1 - enter) * 900}px) rotate(${(1 - enter) * 6}deg)`,
      }}>
      <div style={{ width: SCREEN_W, height: SCREEN_H, borderRadius: 80, overflow: 'hidden', position: 'relative' }}>
        {timeline(p).pieces.map((piece) => {
          const video = (startFrom: number, rate: number) => (
            <OffthreadVideo
              src={staticFile(`clips/${p.clip}`)}
              startFrom={startFrom}
              playbackRate={rate}
              muted
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            />
          );
          return (
            <Sequence
              key={piece.start}
              from={Math.round(piece.start * fps)}
              durationInFrames={Math.max(1, Math.round(piece.seconds * fps))}
              layout="none">
              {'from' in piece ? (
                video(Math.round(piece.from * fps), p.playbackRate)
              ) : (
                <Freeze frame={0}>{video(Math.max(0, Math.round(piece.hold * fps) - 1), 1)}</Freeze>
              )}
            </Sequence>
          );
        })}
      </div>
    </div>
  );
}

function Captions({ p }: { p: AdProps }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const starts = timeline(p).stepStarts.map((s) => Math.round(s * fps));
  const index = starts.reduce((acc, start, i) => (frame >= start ? i : acc), -1);
  if (index < 0) return null;
  const pop = spring({ frame: frame - starts[index], fps, config: { damping: 15 } });
  return (
    <div
      style={{
        position: 'absolute',
        top: 150,
        left: 70,
        right: 70,
        height: 330,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 78,
          lineHeight: 1.1,
          color: brand.cream,
          textAlign: 'center',
          opacity: pop,
          transform: `translateY(${(1 - pop) * 30}px)`,
        }}>
        {p.captions[index].text}
      </div>
    </div>
  );
}

function EndCard({ title, tagline, line, cta }: { title: string; tagline: string; line: string; cta: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 13 } });
  const later = spring({ frame: frame - 10, fps, config: { damping: 15 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 44, padding: 90, opacity: pop }}>
      <Img
        src={staticFile('icon.png')}
        style={{ width: 260, height: 260, borderRadius: 60, transform: `scale(${0.6 + pop * 0.4})` }}
      />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 120, color: brand.cream }}>{title}</div>
        <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 64, color: brand.gold, marginTop: 8, textWrap: 'balance' }}>
          {tagline}
        </div>
      </div>
      <div
        style={{
          fontFamily: fonts.body,
          fontWeight: 500,
          fontSize: 50,
          lineHeight: 1.3,
          color: brand.cream,
          textAlign: 'center',
          opacity: later,
        }}>
        {line}
      </div>
      <div
        style={{
          marginTop: 20,
          padding: '28px 64px',
          borderRadius: 999,
          background: brand.coral,
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 48,
          color: '#FFFFFF',
          opacity: later,
          transform: `translateY(${(1 - later) * 40}px)`,
        }}>
        {cta}
      </div>
    </AbsoluteFill>
  );
}

/** One sound at `from` (ad frames), optionally cut after `frames`. */
function Sound({ from, src, volume, frames }: { from: number; src: string; volume: number; frames?: number }) {
  return (
    <Sequence from={from} durationInFrames={frames} layout="none">
      <Audio src={staticFile(src)} volume={volume} />
    </Sequence>
  );
}

function Soundtrack({ p, total }: { p: AdProps; total: number }) {
  const { fps } = useVideoConfig();
  const hook = Math.round(hookSeconds(p) * fps);
  const end = hook + Math.round(bodySeconds(p) * fps);
  const at = (s: number) => hook + Math.round(toBody(p, s) * fps);
  const steps = timeline(p).stepStarts;
  const lead = Math.round(VOICE_LEAD * fps);
  const lines = [
    { from: 0, text: p.hookSay },
    ...p.captions.map((c, i) => ({ from: hook + Math.round(steps[i] * fps), text: c.say })),
    { from: end, text: p.endSay },
  ];
  // The music steps back while she speaks.
  const speaking = p.hookSay || p.endSay || p.captions.some((c) => c.say);
  return (
    <>
      <Audio
        src={staticFile(`music/${p.music.file}`)}
        startFrom={Math.round(p.music.from * fps)}
        volume={(f) =>
          (p.music.volume ?? MUSIC_VOLUME) *
          (speaking ? VOICE_MUSIC : 1) *
          interpolate(f, [0, 8, total - 24, total - 1], [0, 1, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />
      <Sound from={2} src="sfx/pop.mp3" volume={0.7} />
      <Sound from={hook - 12} src="sfx/whoosh.mp3" volume={0.6} />
      {steps.slice(1).map((s) => (
        <Sound key={s} from={hook + Math.round(s * fps) - 2} src="sfx/caption.mp3" volume={0.6} />
      ))}
      {lines.map(({ from, text }) => {
        const line = voiceOf(text);
        return line ? <Sound key={`voice-${from}`} from={from + lead} src={line.file} volume={1} /> : null;
      })}
      {p.sfx.map((s) => (
        <Sound
          key={`${s.sound}-${s.at}`}
          from={at(s.at)}
          src={`sfx/${s.sound}.mp3`}
          volume={SFX_VOLUME[s.sound]}
          frames={s.length ? Math.round((s.length / p.playbackRate) * fps) : undefined}
        />
      ))}
      <Sound from={end - 12} src="sfx/whoosh.mp3" volume={0.6} />
      <Sound from={end + 2} src="sfx/end.mp3" volume={0.6} />
    </>
  );
}

export function Ad(props: AdProps) {
  const { fps, durationInFrames } = useVideoConfig();
  const hook = Math.round(hookSeconds(props) * fps);
  const body = Math.round(bodySeconds(props) * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: brand.petrol900 }}>
      <Background />
      <Sequence durationInFrames={hook}>
        <Hook text={props.hook} seconds={hookSeconds(props)} />
      </Sequence>
      <Sequence from={hook} durationInFrames={body}>
        <Phone p={props} />
      </Sequence>
      <Sequence from={hook} durationInFrames={body}>
        <Captions p={props} />
      </Sequence>
      <Sequence from={hook + body}>
        <EndCard title={props.endTitle} tagline={props.tagline} line={props.endLine} cta={props.cta} />
      </Sequence>
      <Soundtrack p={props} total={durationInFrames} />
    </AbsoluteFill>
  );
}

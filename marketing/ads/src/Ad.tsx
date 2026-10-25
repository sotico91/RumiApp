import {
  AbsoluteFill,
  Audio,
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

/** Seconds into the screen recording; mapped through the kept segments. */
export type Caption = { at: number; text: string };

export type Sfx = {
  at: number;
  sound: 'click' | 'type' | 'success';
  /** Seconds of the recording it lasts (typing bursts). */
  length?: number;
};

export type AdProps = {
  /** Opening line, alone on screen before the phone appears. */
  hook: string;
  /** Screen recording in public/clips/. */
  clip: string;
  /** Parts of the recording to keep, [from, to] in seconds; dead time in between is cut. */
  segments: [number, number][];
  playbackRate: number;
  /** Lines above the phone, each from `at` (recording seconds). */
  captions: Caption[];
  /** Taps, typing and saves, in recording seconds. */
  sfx: Sfx[];
  /** Last card: what Rumi is, and the promise. */
  endTitle: string;
  endLine: string;
  cta: string;
};

export const HOOK_SECONDS = 2.2;
export const END_SECONDS = 3;

const keptSeconds = (p: AdProps) => p.segments.reduce((sum, [from, to]) => sum + (to - from), 0);

export const bodySeconds = (p: AdProps) => keptSeconds(p) / p.playbackRate;

export const adSeconds = (p: AdProps) => HOOK_SECONDS + bodySeconds(p) + END_SECONDS;

/** Recording seconds → seconds into the phone part of the ad. */
function toBody(p: AdProps, at: number): number {
  let before = 0;
  for (const [from, to] of p.segments) {
    if (at < from) return before / p.playbackRate;
    if (at <= to) return (before + at - from) / p.playbackRate;
    before += to - from;
  }
  return before / p.playbackRate;
}

const SCREEN_W = 600;
const SCREEN_H = Math.round((SCREEN_W * 2622) / 1206);
const SFX_VOLUME = { click: 0.9, type: 0.45, success: 0.7 } as const;

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

function Hook({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14 } });
  const out = interpolate(frame, [HOOK_SECONDS * fps - 10, HOOK_SECONDS * fps], [1, 0], {
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
        {p.segments.map(([from, to], i) => (
          <Sequence
            key={from}
            from={Math.round(toBody(p, from) * fps)}
            durationInFrames={i === p.segments.length - 1 ? undefined : Math.round(((to - from) / p.playbackRate) * fps)}
            layout="none">
            <OffthreadVideo
              src={staticFile(`clips/${p.clip}`)}
              startFrom={Math.round(from * fps)}
              playbackRate={p.playbackRate}
              muted
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            />
          </Sequence>
        ))}
      </div>
    </div>
  );
}

function Captions({ p }: { p: AdProps }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const starts = p.captions.map((c) => Math.round(toBody(p, c.at) * fps));
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

function EndCard({ title, line, cta }: { title: string; line: string; cta: string }) {
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
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 120, color: brand.cream }}>{title}</div>
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
  const hook = Math.round(HOOK_SECONDS * fps);
  const end = hook + Math.round(bodySeconds(p) * fps);
  const at = (s: number) => hook + Math.round(toBody(p, s) * fps);
  return (
    <>
      <Audio
        src={staticFile('music/bed.wav')}
        volume={(f) =>
          0.5 *
          interpolate(f, [0, 8, total - 24, total - 1], [0, 1, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />
      <Sound from={0} src="sfx/pop.wav" volume={0.6} />
      <Sound from={hook - 10} src="sfx/whoosh.wav" volume={0.7} />
      {p.captions.slice(1).map((c) => (
        <Sound key={c.at} from={at(c.at) - 4} src="sfx/whoosh.wav" volume={0.35} />
      ))}
      {p.sfx.map((s) => (
        <Sound
          key={`${s.sound}-${s.at}`}
          from={at(s.at)}
          src={`sfx/${s.sound}.wav`}
          volume={SFX_VOLUME[s.sound]}
          frames={s.length ? Math.round((s.length / p.playbackRate) * fps) : undefined}
        />
      ))}
      <Sound from={end - 6} src="sfx/whoosh.wav" volume={0.6} />
      <Sound from={end} src="sfx/chime.wav" volume={0.7} />
    </>
  );
}

export function Ad(props: AdProps) {
  const { fps, durationInFrames } = useVideoConfig();
  const hook = Math.round(HOOK_SECONDS * fps);
  const body = Math.round(bodySeconds(props) * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: brand.petrol900 }}>
      <Background />
      <Sequence durationInFrames={hook}>
        <Hook text={props.hook} />
      </Sequence>
      <Sequence from={hook} durationInFrames={body}>
        <Phone p={props} />
      </Sequence>
      <Sequence from={hook} durationInFrames={body}>
        <Captions p={props} />
      </Sequence>
      <Sequence from={hook + body}>
        <EndCard title={props.endTitle} line={props.endLine} cta={props.cta} />
      </Sequence>
      <Soundtrack p={props} total={durationInFrames} />
    </AbsoluteFill>
  );
}

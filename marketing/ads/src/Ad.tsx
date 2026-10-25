import {
  AbsoluteFill,
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

export type Caption = { at: number; text: string };

export type AdProps = {
  /** Opening line, alone on screen before the phone appears. */
  hook: string;
  /** Screen recording in public/clips/. */
  clip: string;
  /** Seconds to skip at the start of the recording. */
  clipStart: number;
  /** Seconds of the recording to show. */
  clipLength: number;
  playbackRate: number;
  /** Lines above the phone, each from `at` seconds into the recording. */
  captions: Caption[];
  /** Last card: what Rumi is, and the promise. */
  endTitle: string;
  endLine: string;
  cta: string;
};

export const HOOK_SECONDS = 2.2;
export const END_SECONDS = 3;

export const adSeconds = (p: AdProps) => HOOK_SECONDS + p.clipLength / p.playbackRate + END_SECONDS;

const SCREEN_W = 600;
const SCREEN_H = Math.round((SCREEN_W * 2622) / 1206);

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

function Phone({ clip, clipStart, playbackRate }: Pick<AdProps, 'clip' | 'clipStart' | 'playbackRate'>) {
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
        <OffthreadVideo
          src={staticFile(`clips/${clip}`)}
          startFrom={Math.round(clipStart * fps)}
          playbackRate={playbackRate}
          muted
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}

function Captions({ captions, playbackRate }: Pick<AdProps, 'captions' | 'playbackRate'>) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame / fps) * playbackRate;
  const index = captions.reduce((acc, c, i) => (t >= c.at ? i : acc), -1);
  if (index < 0) return null;
  const startFrame = Math.round((captions[index].at / playbackRate) * fps);
  const pop = spring({ frame: frame - startFrame, fps, config: { damping: 15 } });
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
        {captions[index].text}
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

export function Ad(props: AdProps) {
  const { fps } = useVideoConfig();
  const hook = Math.round(HOOK_SECONDS * fps);
  const body = Math.round((props.clipLength / props.playbackRate) * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: brand.petrol900 }}>
      <Background />
      <Sequence durationInFrames={hook}>
        <Hook text={props.hook} />
      </Sequence>
      <Sequence from={hook - 8} durationInFrames={body + 8}>
        <Phone clip={props.clip} clipStart={props.clipStart} playbackRate={props.playbackRate} />
      </Sequence>
      <Sequence from={hook} durationInFrames={body}>
        <Captions captions={props.captions} playbackRate={props.playbackRate} />
      </Sequence>
      <Sequence from={hook + body}>
        <EndCard title={props.endTitle} line={props.endLine} cta={props.cta} />
      </Sequence>
    </AbsoluteFill>
  );
}

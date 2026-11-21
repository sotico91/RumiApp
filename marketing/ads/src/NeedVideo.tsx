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
import { Rumi } from './Mascot';

// "Need" reels (vertical 1080x1920): the problem told by an Xtarify reel (public/xtarify/<id>.mp4,
// downloaded from the Xtarify MCP), then Rumi solving it with the real app and a hand, and an end card.
// Each video: needVideos below. The Rumi part reuses the prima recordings (src/prima-clips.json).

export type NeedProps = {
  /** The Xtarify reel, inside public/. */
  intro: string;
  /** Its length in seconds (ffprobe). */
  introSeconds: number;
  /** Salomé's line over the Rumi part (public/voice/…). */
  voice: string;
  voiceSeconds: number;
  headline: string;
};

export const needVideos: Record<string, NeedProps> = {
  'need-quincena-es': {
    intro: 'xtarify/quincena.mp4',
    introSeconds: 34.13,
    voice: 'voice/need-quincena.mp3',
    voiceSeconds: 7.1,
    headline: 'Con Rumi lo ves',
  },
};

const f = (s: number) => Math.round(s * FPS);
const TAIL_PHONE = 2.4; // "anotas cada gasto": the + tap
const TAIL_MOSAIC = 4.2; // "ves a dónde se va tu plata"
const TAIL_END = 3.2;
export const tailSeconds = TAIL_PHONE + TAIL_MOSAIC + TAIL_END;
export const needFrames = (p: NeedProps) => f(p.introSeconds + tailSeconds);

const SCREEN_W = 600;
const SCREEN_H = Math.round((SCREEN_W * 2622) / 1206);
const BEZEL = 16;

function Phone({ children, tap }: { children: React.ReactNode; tap?: { x: number; y: number; at: number } }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 16 }, durationInFrames: 14 });
  const press = tap ? f(tap.at) : 0;
  const arrive = tap ? spring({ frame, fps, config: { damping: 18, stiffness: 120 }, durationInFrames: Math.max(8, press) }) : 0;
  const ripple = interpolate(frame, [press, press + f(0.5)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        left: (1080 - SCREEN_W) / 2 - BEZEL,
        top: 470,
        width: SCREEN_W + BEZEL * 2,
        height: SCREEN_H + BEZEL * 2,
        borderRadius: 80,
        background: '#05121A',
        padding: BEZEL,
        transform: `scale(${0.9 + pop * 0.1}) rotate(-3deg)`,
        boxShadow: '0 50px 100px rgba(11,31,41,0.45)',
      }}>
      <div style={{ width: SCREEN_W, height: SCREEN_H, borderRadius: 64, overflow: 'hidden', position: 'relative', background: brand.cream }}>
        {children}
      </div>
      {tap ? (
        <div style={{ position: 'absolute', left: BEZEL, top: BEZEL, width: SCREEN_W, height: SCREEN_H }}>
          {frame >= press ? (
            <div
              style={{
                position: 'absolute',
                left: tap.x * SCREEN_W - 60,
                top: tap.y * SCREEN_H - 60,
                width: 120,
                height: 120,
                borderRadius: '50%',
                border: `8px solid ${brand.coral}`,
                transform: `scale(${0.4 + ripple})`,
                opacity: 1 - ripple,
              }}
            />
          ) : null}
          <div
            style={{
              position: 'absolute',
              left: tap.x * SCREEN_W - 200 * 0.4 + (1 - arrive) * 160,
              top: tap.y * SCREEN_H - 200 * 0.06 + (1 - arrive) * 260,
              fontSize: 200,
              lineHeight: 1,
              opacity: Math.min(1, arrive * 1.6) * interpolate(frame, [press + f(0.45), press + f(0.75)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              filter: 'drop-shadow(0 16px 20px rgba(0,0,0,0.4))',
            }}>
            👆
          </div>
        </div>
      ) : null}
    </div>
  );
}

const fill = { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', objectFit: 'cover' as const };

function Headline({ text, sub }: { text: string; sub: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14 }, durationInFrames: 16 });
  return (
    <div style={{ position: 'absolute', top: 120, left: 60, right: 60, textAlign: 'center', transform: `scale(${0.9 + pop * 0.1})`, opacity: pop }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 108, lineHeight: 1, color: brand.coral, whiteSpace: 'nowrap' }}>{text}</div>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 56, color: brand.ink, marginTop: 18 }}>{sub}</div>
    </div>
  );
}

function Tail({ p }: { p: NeedProps }) {
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #FFFBF5 0%, #FFF1E4 60%, #FFE2CF 100%)' }}>
      <Sequence durationInFrames={f(TAIL_PHONE)}>
        <Headline text={p.headline} sub="Anota cada gasto en segundos" />
        <Phone tap={{ x: 0.878, y: 0.831, at: 0.55 }}>
          {/* The + tap from the prima recording: hold Home while the hand comes in, then play. */}
          <Sequence durationInFrames={f(0.55)}>
            <Freeze frame={f(12.2)}>
              <OffthreadVideo src={staticFile('clips/prima/prima-1.mp4')} muted style={fill} />
            </Freeze>
          </Sequence>
          <Sequence from={f(0.55)}>
            <OffthreadVideo src={staticFile('clips/prima/prima-1.mp4')} muted startFrom={f(12.6)} style={fill} />
          </Sequence>
        </Phone>
        <Audio src={staticFile('sfx/whoosh.mp3')} volume={0.4} />
        <Sequence from={f(0.55)}>
          <Audio src={staticFile('sfx/tap.mp3')} volume={0.5} />
        </Sequence>
      </Sequence>
      <Sequence from={f(TAIL_PHONE)} durationInFrames={f(TAIL_MOSAIC)}>
        <Headline text="Y ves" sub="a dónde se va tu plata" />
        <Phone>
          <OffthreadVideo src={staticFile('clips/prima/claro-3.mp4')} muted startFrom={f(24)} style={fill} />
        </Phone>
      </Sequence>
      <Sequence from={f(TAIL_PHONE + TAIL_MOSAIC)}>
        <EndCard />
      </Sequence>
      <Sequence from={f(0.2)}>
        <Audio src={staticFile(p.voice)} />
      </Sequence>
    </AbsoluteFill>
  );
}

function EndCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14 }, durationInFrames: 18 });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${brand.petrol700}, ${brand.petrol900})`, alignItems: 'center', textAlign: 'center' }}>
      <div style={{ marginTop: 260, transform: `scale(${0.85 + pop * 0.15})`, opacity: Math.min(1, pop * 1.4) }}>
        <Img src={staticFile('icon.png')} style={{ width: 200, height: 200, borderRadius: 48 }} />
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 170, color: brand.cream, marginTop: 30 }}>Rumi</div>
        <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 64, color: brand.gold }}>Cuentas claras, mente tranquila.</div>
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 50, color: brand.cream, marginTop: 50 }}>Descárgala gratis</div>
        <div style={{ fontFamily: fonts.body, fontSize: 40, color: '#CFE0E3', marginTop: 12 }}>Android y iPhone · sin conectar tu banco</div>
      </div>
      <div style={{ position: 'absolute', bottom: 40, left: (1080 - 840 * 0.9) / 2, width: 840, height: 600, transform: 'scale(0.9)', transformOrigin: 'left top' }}>
        <Rumi talk={0.6} wave={1} look={0} />
      </div>
    </AbsoluteFill>
  );
}

export function NeedVideo(p: NeedProps) {
  const frame = useCurrentFrame();
  // Music only under Rumi's part: the Xtarify reel brings its own sound.
  const start = f(p.introSeconds);
  const music = interpolate(frame, [start, start + f(0.5), start + f(tailSeconds) - f(1), start + f(tailSeconds)], [0, 0.12, 0.12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence durationInFrames={start}>
        <OffthreadVideo src={staticFile(p.intro)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Sequence>
      <Sequence from={start}>
        <Tail p={p} />
      </Sequence>
      <Audio src={staticFile('music/its-a-cool-thing.mp3')} volume={music} />
    </AbsoluteFill>
  );
}

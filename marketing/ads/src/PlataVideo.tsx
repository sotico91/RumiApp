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
import mouths from './mouths.json';

// "¿A dónde se fue la quincena?" (vertical 1080x1920): the need first, told day by day with our
// own animation (the pay arrives, small spends drip out, the balance hits zero, the math of one
// coffee a day), then Rumi jumps in and the real app shows the answer. Narration: Salomé
// (public/voice/plata/<n>.mp3, made with edge-tts; the seconds below are each file's length).
const f = (s: number) => Math.round(s * FPS);
const VOICE = [4.44, 11.33, 5.06, 7.61, 4.42, 3.53, 2.83, 4.75, 6.67];
// Each scene lasts its line minus most of the silence at the end of the file.
const SCENE = VOICE.map((v, i) => (i === VOICE.length - 1 ? v + 0.6 : v - 0.45));
const START = SCENE.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SCENE[i - 1]], []);
export const plataFrames = f(START[START.length - 1] + SCENE[SCENE.length - 1]);

const PAY = 1_800_000;
const SPENDS = [
  { icon: '☕', name: 'Tinto', amount: 3_000, day: 15 },
  { icon: '🍱', name: 'Almuerzo', amount: 18_000, day: 15 },
  { icon: '🛵', name: 'Domicilio', amount: 25_000, day: 16 },
  { icon: '🚕', name: 'Taxi', amount: 14_000, day: 17 },
  { icon: '📺', name: 'Series', amount: 26_900, day: 18 },
  { icon: '💳', name: 'Cuota tarjeta', amount: 380_000, day: 19 },
  { icon: '💡', name: 'Luz', amount: 95_000, day: 20 },
  { icon: '🎂', name: 'Vaca del cumple', amount: 30_000, day: 21 },
];
// Seconds into line 2 when each spend is named.
const SPEND_AT = [1.9, 2.9, 3.9, 4.9, 5.8, 6.8, 8.5, 9.4];

export const money = (n: number) => `$${Math.max(0, Math.round(n)).toLocaleString('es-CO').replace(/,/g, '.')}`;

export const cream = 'linear-gradient(180deg, #FFFBF5 0%, #FFF1E4 60%, #FFE2CF 100%)';
export const dark = `linear-gradient(160deg, ${brand.petrol700}, ${brand.petrol900})`;

/**
 * How open Rumi's mouth is `frame` frames into a scene whose line (`voice`, a path under public/)
 * starts 0.1 s in, from that file's loudness (src/mouths.json, made by voice/mouths.ts).
 */
export function mouthAt(voice: string, frame: number): number {
  const m = (mouths as Record<string, number[]>)[voice] ?? [];
  const i = frame - f(0.1);
  if (i < 0 || i >= m.length) return 0;
  return ((m[i - 1] ?? 0) + m[i] * 2 + (m[i + 1] ?? 0)) / 4;
}

export function usePop(delay = 0, damping = 14) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - f(delay), fps, config: { damping }, durationInFrames: 18 });
}

/** 1. The pay arrives. */
function Payday() {
  const frame = useCurrentFrame();
  const pop = usePop(0.2, 10);
  const count = interpolate(frame, [f(1.6), f(3.2)], [0, PAY], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 56, color: brand.petrol700, letterSpacing: 4, textTransform: 'uppercase', opacity: pop }}>
        15 de noviembre
      </div>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 120, color: brand.ink, marginTop: 20, transform: `scale(${0.8 + pop * 0.2})` }}>
        Te pagaron 🎉
      </div>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 170, color: '#1F8A5B', marginTop: 40, fontVariantNumeric: 'tabular-nums' }}>
        +{money(count)}
      </div>
    </AbsoluteFill>
  );
}

/** 2. The drip: a calendar from the 15th to the 21st, each spend flying out of the balance. */
function Drip() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const shown = SPEND_AT.filter((at) => t >= at).length;
  const spent = SPENDS.slice(0, shown).reduce((s, x) => s + x.amount, 0);
  // The balance shown also takes every other small spend of the week, so it ends near zero.
  const extra = interpolate(t, [SPEND_AT[0], SCENE[1]], [0, PAY - SPENDS.reduce((s, x) => s + x.amount, 0) - 60_000], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const balance = PAY - spent - extra;
  const day = shown ? SPENDS[shown - 1].day : 15;
  const low = balance < 400_000;
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      {/* Calendar strip. */}
      <div style={{ display: 'flex', gap: 14, marginTop: 120 }}>
        {[15, 16, 17, 18, 19, 20, 21, 22].map((d) => (
          <div
            key={d}
            style={{
              width: 104,
              height: 124,
              borderRadius: 24,
              background: d === day ? brand.coral : d < day ? '#F3D9CC' : '#FFFFFF',
              color: d === day ? '#FFFFFF' : brand.ink,
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: 54,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(11,31,41,0.12)',
              transform: `scale(${d === day ? 1.1 : 1})`,
            }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 44, color: brand.petrol700, marginTop: 70 }}>Te queda</div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 160,
          color: low ? brand.coral : brand.ink,
          fontVariantNumeric: 'tabular-nums',
          transform: `translateX(${low ? Math.sin(frame * 1.7) * 4 : 0}px)`,
        }}>
        {money(balance)}
      </div>
      {/* The spends, newest on top. */}
      <div style={{ position: 'absolute', top: 760, left: 80, right: 80 }}>
        {SPENDS.slice(0, shown)
          .map((s, i) => ({ ...s, i }))
          .reverse()
          .slice(0, 6)
          .map((s, row) => {
            const age = t - SPEND_AT[s.i];
            const enter = spring({ frame: f(age), fps, config: { damping: 13 }, durationInFrames: 14 });
            return (
              <div
                key={s.i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 26,
                  height: 140,
                  marginBottom: 22,
                  padding: '0 36px',
                  borderRadius: 36,
                  background: '#FFFFFF',
                  boxShadow: '0 14px 30px rgba(11,31,41,0.12)',
                  opacity: (1 - row * 0.13) * Math.min(1, enter * 1.5),
                  transform: `translateY(${(1 - enter) * -120}px) scale(${1 - row * 0.03})`,
                }}>
                <div style={{ fontSize: 76 }}>{s.icon}</div>
                <div style={{ flex: 1, fontFamily: fonts.body, fontWeight: 700, fontSize: 50, color: brand.ink }}>{s.name}</div>
                <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 56, color: brand.coral }}>-{money(s.amount)}</div>
              </div>
            );
          })}
      </div>
      {SPEND_AT.map((at, i) => (
        <Sequence key={i} from={f(at)} durationInFrames={f(0.6)}>
          <Audio src={staticFile('sfx/pop.mp3')} volume={0.35} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

/** 3. The 22nd: zero. */
function Zero() {
  const frame = useCurrentFrame();
  const pop = usePop(0.1, 8);
  const ask = usePop(2.2, 12);
  const shake = frame < f(0.6) ? Math.sin(frame * 2.3) * 10 : 0;
  return (
    <AbsoluteFill style={{ background: dark, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 56, color: brand.gold, letterSpacing: 4, textTransform: 'uppercase' }}>22 de noviembre</div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 300,
          color: '#FF6B4A',
          transform: `scale(${0.6 + pop * 0.4}) translateX(${shake}px)`,
          lineHeight: 1.1,
        }}>
        $0
      </div>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 96, color: brand.cream, marginTop: 40, opacity: ask, transform: `translateY(${(1 - ask) * 30}px)`, padding: '0 80px' }}>
        ¿Pero en qué se me fue? 🤯
      </div>
    </AbsoluteFill>
  );
}

/** 4. One coffee a day, counted up. */
function Coffee() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const rows = [
    { at: 1.2, label: 'Al día', value: 3_000 },
    { at: 3.4, label: 'Al mes', value: 66_000 },
    { at: 5.4, label: 'Al año', value: 792_000 },
  ];
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 220, marginTop: 170 }}>☕</div>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 100, color: brand.ink }}>Un tinto</div>
      <div style={{ marginTop: 60, width: 860 }}>
        {rows.map((r, i) => {
          const p = interpolate(t, [r.at, r.at + 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const show = spring({ frame: frame - f(r.at), fps, config: { damping: 14 }, durationInFrames: 14 });
          const last = i === rows.length - 1;
          return (
            <div
              key={r.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '26px 44px',
                marginBottom: 24,
                borderRadius: 36,
                background: last ? brand.coral : '#FFFFFF',
                boxShadow: '0 14px 30px rgba(11,31,41,0.12)',
                opacity: show,
                transform: `scale(${0.85 + show * 0.15})`,
              }}>
              <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 54, color: last ? '#FFFFFF' : brand.petrol700 }}>{r.label}</div>
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: last ? 110 : 84, color: last ? '#FFFFFF' : brand.ink, fontVariantNumeric: 'tabular-nums' }}>
                {money(r.value * p)}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** 5. The point. */
function Truth() {
  const a = usePop(0.1, 200);
  const b = usePop(1.6, 200);
  return (
    <AbsoluteFill style={{ background: dark, justifyContent: 'center', padding: '0 90px' }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 104, lineHeight: 1.08, color: brand.cream, opacity: a }}>No es que ganes poco.</div>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 104, lineHeight: 1.08, color: brand.gold, marginTop: 40, opacity: b }}>
        Es que no sabes a dónde se va.
      </div>
    </AbsoluteFill>
  );
}

/** 6. Rumi jumps in. */
export function RumiEnters({ voice, text = ['¡Para eso', 'estoy yo!'] }: { voice: string; text?: [string, string] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const jump = spring({ frame, fps, config: { damping: 9, stiffness: 90 }, durationInFrames: 24 });
  const talk = mouthAt(voice, frame);
  const shown = usePop(0.4, 12);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 120, color: brand.coral, marginTop: 260, textAlign: 'center', opacity: shown, transform: `scale(${0.8 + shown * 0.2})` }}>
        {text[0]}
        <br />
        {text[1]}
      </div>
      <div style={{ position: 'absolute', left: (1080 - 840 * 1.15) / 2, top: 820 + (1 - jump) * 900, width: 840, height: 600, transform: 'scale(1.15)', transformOrigin: 'left top' }}>
        <Rumi talk={talk} wave={1} look={0} smileTalk />
      </div>
      <Audio src={staticFile('sfx/whoosh.mp3')} volume={0.5} />
      <Sequence from={f(0.5)}>
        <Audio src={staticFile('sfx/success.mp3')} volume={0.4} />
      </Sequence>
    </AbsoluteFill>
  );
}

const SCREEN_W = 600;
const SCREEN_H = Math.round((SCREEN_W * 2622) / 1206);
export const fill = { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', objectFit: 'cover' as const };

export function Phone({
  children,
  title,
  sub,
  tapAt,
  tap = { x: 0.878, y: 0.831 },
}: {
  children: React.ReactNode;
  title: string;
  sub: string;
  tapAt?: number;
  tap?: { x: number; y: number };
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 16 }, durationInFrames: 14 });
  const press = tapAt === undefined ? 0 : f(tapAt);
  const arrive = tapAt === undefined ? 0 : spring({ frame, fps, config: { damping: 18, stiffness: 120 }, durationInFrames: Math.max(8, press) });
  const fade = interpolate(frame, [press + f(0.45), press + f(0.75)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ripple = interpolate(frame, [press, press + f(0.5)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: cream }}>
      <div style={{ position: 'absolute', top: 110, left: 60, right: 60, textAlign: 'center' }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 108, color: brand.coral, whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 54, color: brand.ink, marginTop: 10 }}>{sub}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: (1080 - SCREEN_W) / 2 - 16,
          top: 470,
          padding: 16,
          borderRadius: 80,
          background: '#05121A',
          transform: `scale(${0.9 + pop * 0.1}) rotate(-3deg)`,
          boxShadow: '0 50px 100px rgba(11,31,41,0.45)',
        }}>
        <div style={{ width: SCREEN_W, height: SCREEN_H, borderRadius: 64, overflow: 'hidden', position: 'relative' }}>{children}</div>
        {tapAt !== undefined ? (
          <div style={{ position: 'absolute', left: 16, top: 16, width: SCREEN_W, height: SCREEN_H }}>
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
                left: tap.x * SCREEN_W - 80 + (1 - arrive) * 160,
                top: tap.y * SCREEN_H - 12 + (1 - arrive) * 260,
                fontSize: 200,
                lineHeight: 1,
                opacity: Math.min(1, arrive * 1.6) * fade,
                filter: 'drop-shadow(0 16px 20px rgba(0,0,0,0.4))',
              }}>
              👆
            </div>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
}

/** 7. Logging a spend: the + tap from the prima recording. */
function Log() {
  return (
    <Phone title="Anota" sub="cada gasto en segundos" tapAt={0.5}>
      <Sequence durationInFrames={f(0.5)}>
        <Freeze frame={f(12.2)}>
          <OffthreadVideo src={staticFile('clips/prima/prima-1.mp4')} muted style={fill} />
        </Freeze>
      </Sequence>
      <Sequence from={f(0.5)}>
        <OffthreadVideo src={staticFile('clips/prima/prima-1.mp4')} muted startFrom={f(12.6)} style={fill} />
      </Sequence>
      <Sequence from={f(0.5)}>
        <Audio src={staticFile('sfx/tap.mp3')} volume={0.5} />
      </Sequence>
    </Phone>
  );
}

/** 8. Insights scrolling past the ant spends down to the spend mosaic. */
function See() {
  return (
    <Phone title="Mira" sub="a dónde se va tu plata">
      <OffthreadVideo src={staticFile('clips/prima/claro-3.mp4')} muted startFrom={f(20)} playbackRate={1.9} style={fill} />
    </Phone>
  );
}

export function End({ voice = 'voice/plata/9.mp3' }: { voice?: string }) {
  const frame = useCurrentFrame();
  const pop = usePop(0, 14);
  const talk = mouthAt(voice, frame);
  return (
    <AbsoluteFill style={{ background: dark, alignItems: 'center', textAlign: 'center' }}>
      <div style={{ marginTop: 240, transform: `scale(${0.85 + pop * 0.15})`, opacity: Math.min(1, pop * 1.4) }}>
        <Img src={staticFile('icon.png')} style={{ width: 190, height: 190, borderRadius: 46 }} />
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 170, color: brand.cream, marginTop: 24 }}>Rumi</div>
        <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 64, color: brand.gold }}>Cuentas claras, mente tranquila.</div>
        <div style={{ display: 'inline-block', marginTop: 50, padding: '22px 56px', borderRadius: 999, background: brand.coral, fontFamily: fonts.body, fontWeight: 700, fontSize: 54, color: '#FFFFFF' }}>
          Descárgala gratis
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: 40, color: '#CFE0E3', marginTop: 22 }}>Android y iPhone · sin conectar tu banco</div>
      </div>
      <div style={{ position: 'absolute', bottom: 30, left: (1080 - 840 * 0.9) / 2, width: 840, height: 600, transform: 'scale(0.9)', transformOrigin: 'left top' }}>
        {/* Its mouth follows the line (a smile between words), then a big happy grin. */}
        <Rumi talk={talk} wave={1} look={0} smileTalk mood={frame > f(0.1) + ((mouths as Record<string, number[]>)[voice]?.length ?? 0) ? 'happy' : undefined} />
      </div>
    </AbsoluteFill>
  );
}

export function PlataVideo() {
  const frame = useCurrentFrame();
  const total = plataFrames;
  // Tense music under the problem, brighter once Rumi comes in.
  const rumiAt = f(START[5]);
  const tense = interpolate(frame, [0, f(0.5), rumiAt - f(0.6), rumiAt], [0, 0.08, 0.08, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bright = interpolate(frame, [rumiAt, rumiAt + f(0.4), total - f(1.5), total], [0, 0.13, 0.13, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scenes = [<Payday />, <Drip />, <Zero />, <Coffee />, <Truth />, <RumiEnters voice="voice/plata/6.mp3" />, <Log />, <See />, <End />];
  return (
    <AbsoluteFill>
      <Audio src={staticFile('music/im-fine.mp3')} volume={tense} />
      <Sequence from={rumiAt}>
        <Audio src={staticFile('music/happy-times.mp3')} volume={bright} />
      </Sequence>
      {scenes.map((scene, i) => (
        <Sequence key={i} from={f(START[i])} durationInFrames={f(SCENE[i])}>
          {scene}
          <Sequence from={f(0.1)}>
            <Audio src={staticFile(`voice/plata/${i + 1}.mp3`)} />
          </Sequence>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

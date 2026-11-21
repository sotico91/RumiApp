import { AbsoluteFill, Audio, Freeze, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { brand, fonts, FPS } from './brand';
import clipsJson from './hormiga-clips.json';
import { cream, dark, End, fill, money, Phone, RumiEnters, usePop } from './PlataVideo';

// "Gastos hormiga" (vertical 1080x1920), second reel of the need series after PlataVideo: the small
// daily spends marching by, how much they add up to in a month and a year, then Rumi and the app's
// ant-spend list. Narration: public/voice/hormiga/<n>.mp3 (Salomé); the end line is the quincena one.
type Clip = { file: string; from: number; to: number; tap?: { x: number; y: number } };
const clips = clipsJson as Record<string, Clip>;

const f = (s: number) => Math.round(s * FPS);
const VOICE = [6.02, 6.19, 4.54, 6.6, 4.9, 3.58, 2.83, 4.92, 6.67];
const SCENE = VOICE.map((v, i) => (i === VOICE.length - 1 ? v + 0.6 : v - 0.45));
const START = SCENE.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SCENE[i - 1]], []);
export const hormigaFrames = f(START[START.length - 1] + SCENE[SCENE.length - 1]);

// Each little spend: how much once, and how many times a month.
const ITEMS = [
  { icon: '☕', name: 'Tinto', amount: 3_000, times: 22 },
  { icon: '🥐', name: 'Pan', amount: 2_500, times: 22 },
  { icon: '🥤', name: 'Gaseosa', amount: 3_500, times: 22 },
  { icon: '🛵', name: 'Domicilio', amount: 25_000, times: 4 },
  { icon: '🚕', name: 'Taxi', amount: 15_000, times: 2 },
  { icon: '📺', name: 'Suscripción', amount: 26_900, times: 1 },
];
const MONTH = ITEMS.reduce((s, x) => s + x.amount * x.times, 0);
// Seconds from the start of scene 1 when each item is named (scene 2 starts at SCENE[0]).
const ITEM_AT = [2.4, 3.3, 4.3, SCENE[0] + 0.7, SCENE[0] + 2.4, SCENE[0] + 3.9];

/** An ant carrying something, walking: little legs move with the frame. */
function Ant({ size, carry }: { size: number; carry?: string }) {
  const frame = useCurrentFrame();
  const step = Math.sin(frame / 2) * 4;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {carry ? (
        <div style={{ position: 'absolute', left: size * 0.1, top: -size * 0.62 + step * 0.5, fontSize: size * 0.7, lineHeight: 1 }}>{carry}</div>
      ) : null}
      <div style={{ fontSize: size, lineHeight: 1, transform: `scaleX(-1) translateY(${Math.abs(step) * 0.4}px)` }}>🐜</div>
    </div>
  );
}

/** 1–2. The spends, one card each, and a line of ants marching along the bottom. */
function March() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const title = t < SCENE[0] ? 'Son gastitos, ¿no?' : 'Y uno que otro más…';
  const tp = usePop(0.1, 14);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 92, color: brand.ink, marginTop: 150, opacity: tp, textAlign: 'center', padding: '0 60px' }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 30, justifyContent: 'center', width: 960, marginTop: 70 }}>
        {ITEMS.map((it, i) => {
          const at = ITEM_AT[i];
          const p = spring({ frame: frame - f(at), fps, config: { damping: 12 }, durationInFrames: 16 });
          if (t < at) return <div key={it.name} style={{ width: 290, height: 300 }} />;
          return (
            <div
              key={it.name}
              style={{
                width: 290,
                height: 300,
                borderRadius: 40,
                background: '#FFFFFF',
                boxShadow: '0 14px 30px rgba(11,31,41,0.12)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `scale(${0.6 + p * 0.4}) rotate(${(1 - p) * (i % 2 ? 8 : -8)}deg)`,
                opacity: Math.min(1, p * 1.5),
              }}>
              <div style={{ fontSize: 110, lineHeight: 1 }}>{it.icon}</div>
              <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 42, color: brand.ink, marginTop: 14 }}>{it.name}</div>
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 52, color: brand.coral }}>{money(it.amount)}</div>
            </div>
          );
        })}
      </div>
      {/* The ant line: carries whatever has been named so far. */}
      <div style={{ position: 'absolute', bottom: 160, left: 0, right: 0, height: 150, overflow: 'hidden' }}>
        {Array.from({ length: 9 }).map((_, i) => {
          const x = ((i * 150 - frame * 4) % 1350 + 1350) % 1350 - 150;
          const shown = ITEMS.filter((_, j) => t >= ITEM_AT[j]);
          const carry = shown.length ? shown[i % shown.length].icon : undefined;
          return (
            <div key={i} style={{ position: 'absolute', left: x, top: 60 }}>
              <Ant size={80} carry={carry} />
            </div>
          );
        })}
      </div>
      {ITEM_AT.map((at, i) => (
        <Sequence key={i} from={f(at)} durationInFrames={f(0.6)}>
          <Audio src={staticFile('sfx/pop.mp3')} volume={0.35} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

/** 3. They add up: the cards shrink into one growing total. */
function Pile() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const total = interpolate(t, [0.6, 3.6], [0, MONTH], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const a = usePop(0.1, 200);
  const b = usePop(1.6, 12);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 90, color: brand.ink, marginTop: 200, opacity: a }}>Uno por uno no se sienten</div>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 96, color: brand.coral, marginTop: 20, opacity: b, transform: `scale(${0.8 + b * 0.2})` }}>
        …pero se juntan
      </div>
      <div style={{ position: 'relative', width: 900, height: 700, marginTop: 40 }}>
        {ITEMS.map((it, i) => {
          const angle = (i / ITEMS.length) * Math.PI * 2;
          const p = interpolate(t, [0.4 + i * 0.25, 1.6 + i * 0.25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const r = 330 * (1 - p);
          return (
            <div
              key={it.name}
              style={{
                position: 'absolute',
                left: 450 + Math.cos(angle) * r - 60,
                top: 330 + Math.sin(angle) * r * 0.8 - 60,
                fontSize: 120,
                opacity: 1 - p * 0.9,
                transform: `scale(${1 - p * 0.6})`,
              }}>
              {it.icon}
            </div>
          );
        })}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 280, fontFamily: fonts.display, fontWeight: 700, fontSize: 150, color: brand.ink, fontVariantNumeric: 'tabular-nums' }}>
          {money(total)}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** 4. A month and a year. */
function Totals() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const rows = [
    { at: 0.6, label: 'Al mes', value: MONTH },
    { at: 3.4, label: 'Al año', value: MONTH * 12 },
  ];
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center', textAlign: 'center' }}>
      <div style={{ marginTop: 230 }}>
        <Ant size={190} carry="💰" />
      </div>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 92, color: brand.ink, marginTop: 30 }}>Tus gastos hormiga</div>
      <div style={{ marginTop: 60, width: 900 }}>
        {rows.map((r, i) => {
          const p = interpolate(t, [r.at, r.at + 1.1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const show = spring({ frame: frame - f(r.at), fps, config: { damping: 14 }, durationInFrames: 14 });
          const last = i === rows.length - 1;
          return (
            <div
              key={r.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '30px 46px',
                marginBottom: 28,
                borderRadius: 40,
                background: last ? brand.coral : '#FFFFFF',
                boxShadow: '0 14px 30px rgba(11,31,41,0.12)',
                opacity: show,
                transform: `scale(${0.85 + show * 0.15})`,
              }}>
              <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 56, color: last ? '#FFFFFF' : brand.petrol700 }}>{r.label}</div>
              <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: last ? 104 : 88, color: last ? '#FFFFFF' : brand.ink, fontVariantNumeric: 'tabular-nums' }}>
                {money(r.value * p)}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** 5. Why they are called ants: a line of them carrying your money off. */
function Name() {
  const frame = useCurrentFrame();
  const a = usePop(0.1, 200);
  const b = usePop(1.8, 200);
  return (
    <AbsoluteFill style={{ background: dark, justifyContent: 'center', padding: '0 90px' }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 110, lineHeight: 1.05, color: brand.cream, opacity: a }}>Gastos hormiga 🐜</div>
      <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 84, lineHeight: 1.1, color: brand.gold, marginTop: 40, opacity: b }}>
        Pequeñitos, pero se llevan todo.
      </div>
      <div style={{ position: 'absolute', bottom: 260, left: 0, right: 0, height: 200 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: 1100 - frame * 6 + i * 170, top: 60 }}>
            <Ant size={100} carry="💵" />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/** 7. Plan tab: the hand taps Plan. */
function MarkThem() {
  const c = clips['hormiga-1'];
  return (
    <Phone title="Marca" sub="tus gastos hormiga en Plan" tapAt={0.45} tap={c.tap}>
      <Sequence durationInFrames={f(0.45)}>
        <Freeze frame={f(c.from)}>
          <OffthreadVideo src={staticFile(c.file)} muted style={fill} />
        </Freeze>
      </Sequence>
      <Sequence from={f(0.45)}>
        <OffthreadVideo src={staticFile(c.file)} muted startFrom={f(c.from + 0.4)} style={fill} />
      </Sequence>
      <Sequence from={f(0.45)}>
        <Audio src={staticFile('sfx/tap.mp3')} volume={0.5} />
      </Sequence>
    </Phone>
  );
}

/** 8. The ant-spend list and its total. */
function SeeThem() {
  const c = clips['hormiga-2'];
  return (
    <Phone title="Mira" sub="cuánto se llevan al mes" tapAt={0.45} tap={c.tap}>
      <Sequence durationInFrames={f(0.45)}>
        <Freeze frame={f(c.from)}>
          <OffthreadVideo src={staticFile(c.file)} muted style={fill} />
        </Freeze>
      </Sequence>
      <Sequence from={f(0.45)}>
        <OffthreadVideo src={staticFile(c.file)} muted startFrom={f(c.from + 0.4)} style={fill} />
      </Sequence>
    </Phone>
  );
}

export function HormigaVideo() {
  const frame = useCurrentFrame();
  const total = hormigaFrames;
  const rumiAt = f(START[5]);
  const tense = interpolate(frame, [0, f(0.5), rumiAt - f(0.6), rumiAt], [0, 0.08, 0.08, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bright = interpolate(frame, [rumiAt, rumiAt + f(0.4), total - f(1.5), total], [0, 0.13, 0.13, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Scenes 1 and 2 share the March (one continuous shot).
  const marchFrames = f(SCENE[0] + SCENE[1]);
  const scenes = [null, null, <Pile />, <Totals />, <Name />, <RumiEnters seconds={SCENE[5]} text={['¡Yo te los', 'encuentro!']} />, <MarkThem />, <SeeThem />, <End />];
  return (
    <AbsoluteFill>
      <Audio src={staticFile('music/im-fine.mp3')} volume={tense} />
      <Sequence from={rumiAt}>
        <Audio src={staticFile('music/happy-times.mp3')} volume={bright} />
      </Sequence>
      <Sequence durationInFrames={marchFrames}>
        <March />
      </Sequence>
      {scenes.map((scene, i) =>
        scene ? (
          <Sequence key={i} from={f(START[i])} durationInFrames={f(SCENE[i])}>
            {scene}
          </Sequence>
        ) : null,
      )}
      {VOICE.map((_, i) => (
        <Sequence key={`v${i}`} from={f(START[i] + 0.1)} durationInFrames={f(VOICE[i])}>
          <Audio src={staticFile(i === VOICE.length - 1 ? 'voice/plata/9.mp3' : `voice/hormiga/${i + 1}.mp3`)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

import type { ReactNode } from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { brand, fonts, FPS } from './brand';
import { mascotScenes, type Scene } from './mascot-scenes';
import voice from './mascot-voice.json';

// The front bill of the app icon (assets/images/icon.png), lighter than the UI coral.
const BILL = '#FF6B4A';
const PAPER = '#F2E4D8';

const LEAD = 0.35;
const GAP = 0.6;
const INTRO = 0.6;
const OUTRO = 1.6;

type Voice = { file: string; seconds: number; mouth: number[] };
const voiceOf = (s: Scene) => (voice as Record<string, Voice>)[s.say];

/** Scene start and length in frames; the voice of each starts LEAD seconds in. */
export function mascotTimeline() {
  let t = INTRO * FPS;
  const scenes = mascotScenes.map((scene, i) => {
    const extra = i === mascotScenes.length - 1 ? OUTRO : 0;
    const frames = Math.round((LEAD + voiceOf(scene).seconds + GAP + extra) * FPS);
    const start = i === 0 ? 0 : t;
    const length = i === 0 ? frames + t : frames;
    t = start + length;
    return { scene, start, length, voiceAt: (i === 0 ? INTRO : 0) * FPS + start + LEAD * FPS };
  });
  return { scenes, frames: t };
}

/** How open the mouth is (0–1) at `frame`, from the voice that is playing. */
function mouthAt(frame: number): number {
  for (const s of mascotTimeline().scenes) {
    const m = voiceOf(s.scene).mouth;
    const i = Math.round(frame - s.voiceAt);
    if (i >= 0 && i < m.length) return ((m[i - 1] ?? 0) + m[i] * 2 + (m[i + 1] ?? 0)) / 4;
  }
  return 0;
}

function Rumi({ talk, wave, look }: { talk: number; wave: number; look: number }) {
  const frame = useCurrentFrame();
  const blink = frame % 96 < 4 || frame % 211 < 4 ? 0.1 : 1;
  const armSwing = Math.sin(frame / 3.2) * 28 * wave;
  const mouthH = 6 + talk * 50;
  const mouthW = 64 + talk * 22;
  return (
    <svg viewBox="-420 -300 840 600" width={840} height={600} style={{ overflow: 'visible' }}>
      {/* back bill */}
      <g transform="translate(-40 -70) rotate(-14)">
        <rect x={-300} y={-125} width={600} height={250} rx={44} fill={brand.petrol700} />
        <rect x={-272} y={-98} width={544} height={196} rx={28} fill="none" stroke="#5E7683" strokeWidth={9} />
        <circle cx={0} cy={0} r={60} fill="none" stroke="#5E7683" strokeWidth={9} />
      </g>
      {/* arms */}
      <g stroke={brand.petrol900} strokeWidth={16} strokeLinecap="round" fill={PAPER}>
        <g transform={`translate(-300 60) rotate(${-Math.sin(frame / 14) * 8})`}>
          <path d="M0 0 Q -60 30 -70 90" fill="none" />
          <circle cx={-70} cy={100} r={26} strokeWidth={10} />
        </g>
        <g transform={`translate(300 0) rotate(${-armSwing - 70 * wave})`}>
          <path d="M0 0 Q 60 30 70 90" fill="none" />
          <circle cx={70} cy={100} r={26} strokeWidth={10} />
        </g>
      </g>
      {/* front bill with the face */}
      <g transform="rotate(7)">
        <rect x={-322} y={-147} width={644} height={294} rx={54} fill={PAPER} />
        <rect x={-308} y={-133} width={616} height={266} rx={44} fill={BILL} />
        <rect x={-284} y={-109} width={568} height={218} rx={30} fill="none" stroke="#FFC2B2" strokeWidth={8} />
        <circle cx={0} cy={-38} r={58} fill={brand.cream} />
        <text
          x={0}
          y={-10}
          textAnchor="middle"
          fontFamily={fonts.display}
          fontWeight={700}
          fontSize={82}
          fill={brand.petrol700}
        >
          R
        </text>
        {[-1, 1].map((side) => (
          <g key={side} transform={`translate(${side * 160} -32) scale(1 ${blink})`}>
            <ellipse rx={38} ry={44} fill="#fff" />
            <circle cx={look * 12} cy={4} r={20} fill={brand.petrol900} />
            <circle cx={look * 12 + 7} cy={-4} r={6} fill="#fff" />
          </g>
        ))}
        <ellipse cx={-165} cy={40} rx={34} ry={16} fill="#FF3F6C" opacity={0.28} />
        <ellipse cx={165} cy={40} rx={34} ry={16} fill="#FF3F6C" opacity={0.28} />
        {talk < 0.05 ? (
          <path d="M-36 58 Q 0 92 36 58" fill="none" stroke={brand.petrol900} strokeWidth={10} strokeLinecap="round" />
        ) : (
          <g transform="translate(0 70)">
            <ellipse rx={mouthW / 2} ry={mouthH / 2} fill={brand.petrol900} />
            <ellipse cy={mouthH / 4} rx={mouthW / 4} ry={mouthH / 5} fill="#E2475F" />
          </g>
        )}
      </g>
    </svg>
  );
}

const pop = (frame: number, fps: number, delay = 0) =>
  spring({ frame: frame - delay, fps, config: { damping: 13, stiffness: 140 } });

function Card({ children, delay = 6 }: { children: ReactNode; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, delay);
  return (
    <div
      style={{
        position: 'absolute',
        left: 90,
        right: 90,
        top: 1060,
        padding: 52,
        borderRadius: 44,
        background: '#fff',
        boxShadow: '0 24px 60px rgba(11,31,41,0.14)',
        transform: `translateY(${(1 - p) * 120}px) scale(${0.9 + p * 0.1})`,
        opacity: p,
        fontFamily: fonts.body,
        color: brand.ink,
      }}
    >
      {children}
    </div>
  );
}

const label = { fontSize: 34, color: '#5B6B73', fontWeight: 500 } as const;
const big = { fontFamily: fonts.display, fontWeight: 700, fontSize: 64, color: brand.petrol900 } as const;
const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO').replace(/,/g, '.')}`;

function QuickCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const word = 'almuerzo';
  const typed = word.slice(0, Math.max(0, Math.floor((frame - 30) / 4)));
  const chip = pop(frame, fps, 30 + word.length * 4 + 12);
  return (
    <Card>
      <div style={label}>¿Cuánto y en qué?</div>
      <div style={{ ...big, fontSize: 96, marginTop: 10 }}>$18.000</div>
      <div
        style={{
          marginTop: 28,
          padding: '26px 30px',
          borderRadius: 26,
          border: `3px solid ${brand.petrol500}`,
          fontSize: 46,
        }}
      >
        {typed}
        <span style={{ opacity: frame % 20 < 10 ? 1 : 0, color: brand.petrol500 }}>|</span>
      </div>
      <div
        style={{
          marginTop: 30,
          display: 'inline-flex',
          gap: 16,
          alignItems: 'center',
          padding: '18px 30px',
          borderRadius: 999,
          background: '#E3F5F2',
          color: '#13635B',
          fontSize: 40,
          fontWeight: 700,
          transform: `scale(${chip})`,
          transformOrigin: 'left center',
        }}
      >
        ✓ Comida · Almuerzo
      </div>
    </Card>
  );
}

function Bar({ name, spent, limit, delay }: { name: string; spent: number; limit: number; delay: number }) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ratio = (spent / limit) * p;
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 40, fontWeight: 700 }}>
        <span>{name}</span>
        <span style={{ color: '#5B6B73', fontWeight: 500 }}>
          {cop(spent * p)} / {cop(limit)}
        </span>
      </div>
      <div style={{ marginTop: 16, height: 30, borderRadius: 15, background: '#EEF1F2', overflow: 'hidden' }}>
        <div
          style={{
            width: `${ratio * 100}%`,
            height: '100%',
            borderRadius: 15,
            background: ratio > 0.8 ? brand.coral : brand.teal,
          }}
        />
      </div>
      <div style={{ marginTop: 14, fontSize: 34, color: ratio > 0.8 ? brand.coral : '#13635B', fontWeight: 700 }}>
        Te quedan {cop(limit - spent * p)}
      </div>
    </div>
  );
}

function LimitCard() {
  return (
    <Card>
      <div style={{ ...label, marginBottom: 30 }}>Tope al mes</div>
      <Bar name="Domicilios" spent={96000} limit={150000} delay={20} />
      <Bar name="Salidas" spent={172000} limit={200000} delay={50} />
    </Card>
  );
}

function AntsCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items: [string, number][] = [
    ['Café', 4500],
    ['Galletas', 2000],
    ['Café', 5000],
    ['Gaseosa', 3500],
    ['Café', 4500],
    ['Chicle', 1500],
  ];
  const shown = items.filter((_, i) => frame > 20 + i * 12);
  const total = interpolate(frame, [20, 20 + items.length * 12 + 20], [0, 86000], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <Card>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {shown.map(([name, n], i) => (
          <div
            key={i}
            style={{
              padding: '14px 24px',
              borderRadius: 999,
              background: '#FFF3E8',
              fontSize: 34,
              transform: `scale(${pop(frame, fps, 20 + i * 12)})`,
            }}
          >
            🐜 {name} {cop(n)}
          </div>
        ))}
      </div>
      <div style={{ ...label, marginTop: 40 }}>Gastos hormiga este mes</div>
      <div style={{ ...big, fontSize: 100, color: brand.coral }}>{cop(total)}</div>
    </Card>
  );
}

function Bubble({ me, delay, children }: { me?: boolean; delay: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, delay);
  return (
    <div
      style={{
        alignSelf: me ? 'flex-end' : 'flex-start',
        maxWidth: '86%',
        marginBottom: 24,
        padding: '26px 32px',
        borderRadius: 34,
        borderBottomRightRadius: me ? 8 : 34,
        borderBottomLeftRadius: me ? 34 : 8,
        background: me ? brand.petrol700 : '#F1F4F5',
        color: me ? '#fff' : brand.ink,
        fontSize: 40,
        lineHeight: 1.3,
        opacity: p,
        transform: `translateY(${(1 - p) * 30}px)`,
      }}
    >
      {children}
    </div>
  );
}

function AskCard() {
  const frame = useCurrentFrame();
  const thinking = frame > 60 && frame < 95;
  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Bubble me delay={20}>
          ¿Puedo comprar algo de 200 mil?
        </Bubble>
        {thinking ? (
          <Bubble delay={60}>
            <span style={{ letterSpacing: 8 }}>{'•••'.slice(0, 1 + Math.floor(frame / 6) % 3)}</span>
          </Bubble>
        ) : null}
        {frame >= 95 ? (
          <Bubble delay={95}>
            <b>Sí.</b> Te quedan {cop(540000)} libres este mes; después de comprarlo, tendrías {cop(340000)}.
          </Bubble>
        ) : null}
      </div>
    </Card>
  );
}

function ForecastCard() {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [15, 55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dash = interpolate(frame, [55, 85], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const real = 'M0 230 L80 200 L160 210 L240 160 L320 150 L400 110 L480 100';
  const proj = 'M480 100 L600 70 L700 40';
  return (
    <Card>
      <div style={label}>Así cierras octubre</div>
      <div style={{ ...big, color: '#13635B' }}>≈ {cop(420000 * Math.max(dash, 0.001))} a favor</div>
      <svg viewBox="-10 0 720 260" style={{ width: '100%', marginTop: 24 }}>
        <line x1={0} y1={250} x2={700} y2={250} stroke="#E3E8EA" strokeWidth={4} />
        <path d={real} fill="none" stroke={brand.petrol500} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        <path d={proj} fill="none" stroke={brand.teal} strokeWidth={10} strokeLinecap="round" strokeDasharray="18 18" opacity={dash} />
        <circle cx={700} cy={40} r={16} fill={brand.teal} opacity={dash} />
      </svg>
      <div style={{ ...label, display: 'flex', justifyContent: 'space-between', fontSize: 30 }}>
        <span>Hoy</span>
        <span>Fin de mes</span>
      </div>
    </Card>
  );
}

function PrivacyCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rows = ['Sin cuenta ni correo', 'Sin conectar tu banco', 'Datos cifrados en tu teléfono'];
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 30 }}>
        <svg viewBox="0 0 64 64" width={84} height={84}>
          <rect x={10} y={28} width={44} height={32} rx={8} fill={brand.petrol700} />
          <path d="M20 28 V20 a12 12 0 0 1 24 0 V28" fill="none" stroke={brand.petrol700} strokeWidth={7} />
          <circle cx={32} cy={44} r={5} fill={brand.gold} />
        </svg>
        <div style={{ ...big, fontSize: 52 }}>Solo tú los ves</div>
      </div>
      {rows.map((r, i) => (
        <div
          key={r}
          style={{
            display: 'flex',
            gap: 20,
            alignItems: 'center',
            fontSize: 40,
            padding: '16px 0',
            opacity: pop(frame, fps, 25 + i * 14),
            transform: `translateX(${(1 - pop(frame, fps, 25 + i * 14)) * 40}px)`,
          }}
        >
          <span style={{ color: '#13635B', fontWeight: 700 }}>✓</span> {r}
        </div>
      ))}
    </Card>
  );
}

/** Bills drifting off the top: the money that "se va". */
function Flying() {
  const frame = useCurrentFrame();
  return (
    <>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const t = (frame - 40 - i * 10) / 70;
        if (t < 0) return null;
        const x = 140 + ((i * 197) % 800);
        const y = 1500 - t * 1000;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 130,
              height: 66,
              borderRadius: 14,
              background: i % 2 ? brand.petrol500 : BILL,
              opacity: interpolate(t, [0, 0.2, 0.8, 1], [0, 0.9, 0.9, 0]),
              transform: `rotate(${Math.sin(frame / 8 + i) * 25}deg)`,
            }}
          />
        );
      })}
    </>
  );
}

const CARDS: Partial<Record<Scene['kind'], () => ReactNode>> = {
  quick: QuickCard,
  limit: LimitCard,
  ants: AntsCard,
  ask: AskCard,
  forecast: ForecastCard,
  privacy: PrivacyCard,
};

function SceneView({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = pop(frame, fps, 2);
  const Body = CARDS[scene.kind];
  const solo = scene.kind === 'hello' || scene.kind === 'end';
  return (
    <AbsoluteFill>
      {scene.kind === 'hello' ? <Flying /> : null}
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          top: solo ? 1240 : 860,
          textAlign: 'center',
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: scene.kind === 'end' ? 150 : solo ? 92 : 76,
          lineHeight: 1.1,
          color: brand.petrol900,
          opacity: t,
          transform: `translateY(${(1 - t) * 40}px)`,
        }}
      >
        {scene.title}
      </div>
      {scene.kind === 'end' ? <EndCard /> : null}
      {Body ? <Body /> : null}
    </AbsoluteFill>
  );
}

function EndCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = pop(frame, fps, 25);
  const b = pop(frame, fps, 45);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1420, textAlign: 'center', fontFamily: fonts.body }}>
      <div style={{ fontSize: 48, color: brand.petrol700, opacity: a }}>Cuentas claras, mente tranquila.</div>
      <div
        style={{
          display: 'inline-block',
          marginTop: 56,
          padding: '28px 64px',
          borderRadius: 999,
          background: brand.coral,
          color: '#fff',
          fontSize: 46,
          fontWeight: 700,
          transform: `scale(${b})`,
        }}
      >
        Muy pronto en tu tienda
      </div>
    </div>
  );
}

export function Mascot() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scenes } = mascotTimeline();
  const current = [...scenes].reverse().find((s) => frame >= s.start) ?? scenes[0];
  const solo = current.scene.kind === 'hello' || current.scene.kind === 'end';
  // Rumi glides between center stage (hello, end) and the top while a card explains.
  const move = spring({ frame: frame - current.start, fps, config: { damping: 16 } });
  const prevSolo = (() => {
    const i = scenes.indexOf(current);
    const k = i > 0 ? scenes[i - 1].scene.kind : 'hello';
    return k === 'hello' || k === 'end';
  })();
  const from = prevSolo ? { y: 720, s: 1.1 } : { y: 500, s: 0.92 };
  const to = solo ? { y: 720, s: 1.1 } : { y: 500, s: 0.92 };
  const y = from.y + (to.y - from.y) * move;
  const s = from.s + (to.s - from.s) * move;
  const enter = spring({ frame, fps, config: { damping: 11 } });
  const talk = mouthAt(frame);
  const bob = Math.sin(frame / 11) * 10;
  const wave =
    current.scene.kind === 'hello'
      ? interpolate(frame, [10, 20, 70, 80], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      : current.scene.kind === 'end'
        ? interpolate(frame - current.start, [40, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        : 0;
  const look = solo ? 0 : Math.min(1, (frame - current.start) / 10) * -0.2 + Math.sin(frame / 40) * 0.6;

  return (
    <AbsoluteFill style={{ background: brand.cream }}>
      <div
        style={{
          position: 'absolute',
          width: 1400,
          height: 1400,
          left: -160,
          top: y - 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #F7E6D6 0%, rgba(251,247,241,0) 65%)',
        }}
      />
      {scenes.map((s) => (
        <Sequence key={s.scene.kind} from={s.start} durationInFrames={s.length}>
          <SceneView scene={s.scene} />
        </Sequence>
      ))}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: y - 300 + bob,
          transform: `scale(${s * enter}) rotate(${Math.sin(frame / 17) * 2 + talk * 2}deg) scaleY(${1 + talk * 0.03})`,
        }}
      >
        <Rumi talk={talk} wave={wave} look={look} />
      </div>

      <Audio src={staticFile('music/happy-times.mp3')} volume={(f) => (mouthAt(f) > 0 ? 0.1 : 0.16)} />
      {scenes.map((s, i) => (
        <Sequence key={`v${i}`} from={Math.round(s.voiceAt)}>
          <Audio src={staticFile(voiceOf(s.scene).file)} />
        </Sequence>
      ))}
      <Sequence from={4} durationInFrames={20}>
        <Audio src={staticFile('sfx/pop.mp3')} volume={0.6} />
      </Sequence>
      {scenes.slice(1).map((s, i) => (
        <Sequence key={`w${i}`} from={s.start} durationInFrames={30}>
          <Audio src={staticFile('sfx/whoosh.mp3')} volume={0.35} />
        </Sequence>
      ))}
      {scenes
        .filter((s) => CARDS[s.scene.kind])
        .map((s, i) => (
          <Sequence key={`p${i}`} from={s.start + 8} durationInFrames={20}>
            <Audio src={staticFile('sfx/pop.mp3')} volume={0.45} />
          </Sequence>
        ))}
      {scenes
        .filter((s) => s.scene.kind === 'quick')
        .map((s) => (
          <Sequence key="type" from={s.start + 30} durationInFrames={34}>
            <Audio src={staticFile('sfx/type.mp3')} volume={0.5} />
          </Sequence>
        ))}
      {scenes
        .filter((s) => s.scene.kind === 'end')
        .map((s) => (
          <Sequence key="end" from={s.start + 45} durationInFrames={60}>
            <Audio src={staticFile('sfx/end.mp3')} volume={0.5} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
}

export const mascotFrames = () => mascotTimeline().frames;

import { AbsoluteFill, Img, staticFile, useVideoConfig } from 'remotion';
import { brand, fonts } from './brand';

// Store screenshots, second design (2026-11-20): a warm background with soft 3D coins, the real
// capture on a phone tilted in perspective, a hand tapping the one thing to do on that screen,
// and the benefit as a big headline. One design for every size: Google Play (1080x1920) and the
// App Store (1320x2868 and 1206x2622); sizes below are fractions of the width.
// Render with --public-dir ../store (the captures live in ../store/ios*).

type Lang = 'es' | 'en' | 'esus';
type Shot = {
  /** Capture file per language (inside ../store). */
  image: Record<Lang, string>;
  kicker: Record<Lang, string>;
  title: Record<Lang, string>;
  subtitle: Record<Lang, string>;
  /** Where the hand taps, as 0..1 of the capture; none shows the privacy card instead. */
  tap?: { x: number; y: number };
  /** Which way the phone turns (1 = right side away). */
  turn: 1 | -1;
};

const shots: Shot[] = [
  {
    image: { es: 'ios/1-inicio.png', en: 'ios-en/1-home.png', esus: 'ios-es-usd/1-inicio.png' },
    kicker: { es: 'Gastos claros', en: 'Clear spending', esus: 'Gastos claros' },
    title: { es: 'Sabe en qué se te va la plata', en: 'See where your money goes', esus: 'Sabe en qué se te va el dinero' },
    subtitle: {
      es: 'Lo que tienes hoy y cómo va tu mes, de un vistazo',
      en: 'What you have today and how your month is going',
      esus: 'Lo que tienes hoy y cómo va tu mes, de un vistazo',
    },
    tap: { x: 0.868, y: 0.846 },
    turn: 1,
  },
  {
    image: { es: 'ios/2-agregar.png', en: 'ios-en/2-add.png', esus: 'ios-es-usd/2-agregar.png' },
    kicker: { es: 'En segundos', en: 'In seconds', esus: 'En segundos' },
    title: { es: 'Anota un gasto en un toque', en: 'Log a spend in one tap', esus: 'Anota un gasto en un toque' },
    subtitle: {
      es: 'Escribe “almuerzo” y Rumi lo clasifica solo',
      en: 'Type “lunch” and Rumi files it for you',
      esus: 'Escribe “almuerzo” y Rumi lo clasifica solo',
    },
    tap: { x: 0.8, y: 0.82 },
    turn: -1,
  },
  {
    image: { es: 'ios/3-plan.png', en: 'ios-en/3-plan.png', esus: 'ios-es-usd/3-plan.png' },
    kicker: { es: 'Presupuesto', en: 'Budget', esus: 'Presupuesto' },
    title: { es: 'Topes que te cuidan', en: 'Limits that look out for you', esus: 'Topes que te cuidan' },
    subtitle: {
      es: 'Ves cuánto te queda en cada categoría antes de pasarte',
      en: 'See what’s left in each category before you overspend',
      esus: 'Ves cuánto te queda en cada categoría antes de pasarte',
    },
    tap: { x: 0.49, y: 0.69 },
    turn: 1,
  },
  {
    image: { es: 'ios/4-pregunta.png', en: 'ios-en/4-ask.png', esus: 'ios-es-usd/4-pregunta.png' },
    kicker: { es: 'Pregúntale a Rumi', en: 'Ask Rumi', esus: 'Pregúntale a Rumi' },
    title: { es: '“¿Cuánto gasté en café?”', en: '“How much on coffee?”', esus: '“¿Cuánto gasté en café?”' },
    subtitle: {
      es: 'Pregunta como hablas y Rumi responde con tus números',
      en: 'Ask the way you talk; Rumi answers with your numbers',
      esus: 'Pregunta como hablas y Rumi responde con tus números',
    },
    tap: { x: 0.155, y: 0.37 },
    turn: -1,
  },
  {
    image: { es: 'ios/5-patrimonio.png', en: 'ios-en/5-wealth.png', esus: 'ios-es-usd/5-patrimonio.png' },
    kicker: { es: 'Todo en un lugar', en: 'All in one place', esus: 'Todo en un lugar' },
    title: { es: 'Efectivo, Nequi, banco y deudas', en: 'Cash, bank, savings and loans', esus: 'Efectivo, banco, ahorros y préstamos' },
    subtitle: {
      es: 'Agrega tus cuentas y mira cuánto tienes de verdad',
      en: 'Add your accounts and see what you really have',
      esus: 'Agrega tus cuentas y mira cuánto tienes de verdad',
    },
    tap: { x: 0.165, y: 0.422 },
    turn: 1,
  },
  {
    image: { es: 'ios/6-actividad.png', en: 'ios-en/6-activity.png', esus: 'ios-es-usd/6-actividad.png' },
    kicker: { es: '100 % privado', en: '100% private', esus: '100 % privado' },
    title: { es: 'Sin conectar tu banco', en: 'No bank login needed', esus: 'Sin conectar tu banco' },
    subtitle: {
      es: 'Sin cuenta ni servidor: todo queda cifrado en tu teléfono',
      en: 'No account, no server: it stays encrypted on your phone',
      esus: 'Sin cuenta ni servidor: todo queda cifrado en tu teléfono',
    },
    turn: -1,
  },
];

export type StoreShotV2Props = { index: number; lang: Lang };

/** Ids: store2-<lang>-<n>-<size>, size play | ios69 | ios63. */
export const storeShotsV2: { id: string; props: StoreShotV2Props; width: number; height: number }[] = [];
const sizes = { play: [1080, 1920], ios69: [1320, 2868], ios63: [1206, 2622] } as const;
for (const lang of ['es', 'en', 'esus'] as Lang[]) {
  shots.forEach((_, i) => {
    for (const [size, [width, height]] of Object.entries(sizes)) {
      storeShotsV2.push({ id: `store2-${lang}-${i + 1}-${size}`, props: { index: i, lang }, width, height });
    }
  });
}

const CAPTURE_RATIO = 2868 / 1320;

/** A shiny coin seen at an angle: an ellipse with a rim, for depth. */
function Coin({ x, y, d, tilt, blur = 0, opacity = 1 }: { x: number; y: number; d: number; tilt: number; blur?: number; opacity?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: d,
        height: d,
        transform: `rotate(${tilt}deg) scaleY(0.62)`,
        filter: blur ? `blur(${blur}px)` : undefined,
        opacity,
      }}>
      <div style={{ position: 'absolute', inset: 0, top: d * 0.14, borderRadius: '50%', background: '#B8862A' }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          bottom: d * 0.14,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #FFF3C4 0%, #F4C95D 38%, #D9A33C 75%, #B8862A 100%)',
          boxShadow: `inset 0 0 0 ${d * 0.06}px rgba(255,255,255,0.25)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: d * 0.32,
          top: d * 0.18,
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: d * 0.5,
          color: '#B8862A',
          lineHeight: 1,
        }}>
        $
      </div>
    </div>
  );
}

const privacy: Record<Lang, string[]> = {
  es: ['Sin cuenta ni correo', 'Sin conectar tu banco', 'Cifrado en tu teléfono'],
  esus: ['Sin cuenta ni correo', 'Sin conectar tu banco', 'Cifrado en tu teléfono'],
  en: ['No account or email', 'No bank login', 'Encrypted on your phone'],
};

/** Floating card over the phone on the privacy shot. */
function PrivacyCard({ lang, u, top }: { lang: Lang; u: number; top: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 110 * u,
        right: 110 * u,
        top,
        background: '#FFFFFF',
        borderRadius: 44 * u,
        padding: `${36 * u}px ${44 * u}px`,
        boxShadow: `0 ${40 * u}px ${80 * u}px rgba(11,31,41,0.45)`,
        transform: 'rotate(-3deg)',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 * u }}>
        <div style={{ fontSize: 86 * u, lineHeight: 1 }}>🔒</div>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 54 * u, color: brand.ink, lineHeight: 1.05 }}>
          {lang === 'en' ? 'Your data is yours' : 'Tus datos son tuyos'}
        </div>
      </div>
      {privacy[lang].map((line) => (
        <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 18 * u, marginTop: 22 * u }}>
          <div
            style={{
              width: 46 * u,
              height: 46 * u,
              borderRadius: '50%',
              background: brand.teal,
              color: '#FFFFFF',
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: 30 * u,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            ✓
          </div>
          <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: 40 * u, color: brand.petrol700 }}>{line}</div>
        </div>
      ))}
    </div>
  );
}

export function StoreShotV2({ index, lang }: StoreShotV2Props) {
  const { width: W, height: H } = useVideoConfig();
  const s = shots[index];
  const u = W / 1080; // 1 unit = 1 px at Play width
  const tall = H / W > 2; // App Store sizes have more room below the headline
  const phoneW = W * (tall ? 0.7 : 0.6);
  const phoneH = phoneW * CAPTURE_RATIO;
  const bezel = 16 * u;
  const top = H * (tall ? 0.255 : 0.27);
  const handSize = 150 * u;
  const tapX = (s.tap?.x ?? 0) * phoneW;
  const tapY = (s.tap?.y ?? 0) * phoneH;
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #FFF4E6 0%, #FBE3CF 55%, #F6CDB4 100%)', overflow: 'hidden' }}>
      {/* Soft petrol arc behind the phone, and a warm glow. */}
      <div
        style={{
          position: 'absolute',
          left: -W * 0.25,
          right: -W * 0.25,
          top: top + phoneH * 0.32,
          height: H,
          borderRadius: '50% 50% 0 0',
          background: `linear-gradient(180deg, ${brand.petrol500} 0%, ${brand.petrol700} 45%, ${brand.petrol900} 100%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: W * 0.1,
          top: top - 120 * u,
          width: W * 0.8,
          height: W * 0.8,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.75), rgba(255,255,255,0) 65%)',
        }}
      />
      <Coin x={W * (s.turn > 0 ? 0.04 : 0.78)} y={top + phoneH * 0.18} d={150 * u} tilt={-18} />
      <Coin x={W * (s.turn > 0 ? 0.82 : 0.02)} y={top + phoneH * 0.05} d={95 * u} tilt={22} blur={2 * u} opacity={0.9} />
      <Coin x={W * (s.turn > 0 ? 0.8 : 0.06)} y={top + phoneH * 0.62} d={120 * u} tilt={-8} />
      <Coin x={W * (s.turn > 0 ? 0.1 : 0.84)} y={top + phoneH * 0.8} d={70 * u} tilt={30} blur={3 * u} opacity={0.85} />

      {/* Headline. */}
      <div style={{ position: 'absolute', top: H * (tall ? 0.055 : 0.05), left: 70 * u, right: 70 * u, textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 34 * u,
            letterSpacing: 2 * u,
            textTransform: 'uppercase',
            color: '#FFFFFF',
            background: brand.coral,
            borderRadius: 999,
            padding: `${10 * u}px ${28 * u}px`,
          }}>
          {s.kicker[lang]}
        </div>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: (tall ? 92 : 84) * u,
            lineHeight: 1.04,
            color: brand.ink,
            marginTop: 24 * u,
            textWrap: 'balance',
          }}>
          {s.title[lang]}
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 500,
            fontSize: 38 * u,
            lineHeight: 1.3,
            color: brand.petrol700,
            marginTop: 18 * u,
            textWrap: 'balance',
          }}>
          {s.subtitle[lang]}
        </div>
      </div>

      {/* Phone in perspective, with the hand on its screen. */}
      <div style={{ position: 'absolute', left: (W - phoneW) / 2 - bezel, top, perspective: 2600 * u }}>
        <div
          style={{
            position: 'relative',
            width: phoneW + bezel * 2,
            height: phoneH + bezel * 2,
            borderRadius: 96 * u,
            background: 'linear-gradient(135deg, #2B3A44 0%, #05121A 40%, #0B1F29 100%)',
            padding: bezel,
            transform: `rotateY(${-12 * s.turn}deg) rotateX(6deg) rotateZ(${-2 * s.turn}deg)`,
            transformStyle: 'preserve-3d',
            boxShadow: `${-40 * s.turn * u}px ${70 * u}px ${110 * u}px rgba(11,31,41,0.55), 0 0 0 ${3 * u}px rgba(255,255,255,0.12)`,
          }}>
          <Img src={staticFile(s.image[lang])} style={{ width: phoneW, height: phoneH, borderRadius: 80 * u, display: 'block' }} />
          {/* Glass sheen. */}
          <div
            style={{
              position: 'absolute',
              inset: bezel,
              borderRadius: 80 * u,
              background: 'linear-gradient(115deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 35%)',
              pointerEvents: 'none',
            }}
          />
          {/* Tap ring + hand: the fingertip rests on the ring's lower right, so the label stays readable. */}
          {s.tap ? (<>
          <div
            style={{
              position: 'absolute',
              left: bezel + tapX - 70 * u,
              top: bezel + tapY - 70 * u,
              width: 140 * u,
              height: 140 * u,
              borderRadius: '50%',
              border: `${8 * u}px solid ${brand.coral}`,
              boxShadow: `0 0 0 ${14 * u}px rgba(207,62,30,0.16)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: bezel + tapX - handSize * 0.4 + 52 * u,
              top: bezel + tapY - handSize * 0.06 + 56 * u,
              fontSize: handSize,
              lineHeight: 1,
              filter: `drop-shadow(0 ${16 * u}px ${18 * u}px rgba(0,0,0,0.4))`,
              transform: 'rotate(-12deg)',
              transformOrigin: '40% 6%',
            }}>
            👆
          </div>
          </>) : null}
        </div>
      </div>
      {s.tap ? null : <PrivacyCard lang={lang} u={u} top={top + phoneH * 0.5} />}
    </AbsoluteFill>
  );
}

import { AbsoluteFill, Img, staticFile, useVideoConfig } from 'remotion';
import { brand, fonts } from './brand';
import { Rumi } from './Mascot';

// Store screenshots, third design (2026-11-20), after looking at what makes big apps' listings
// readable at thumbnail size: one giant verb, the key number pulled out of the phone and enlarged,
// a character (Rumi, the coral bill from the videos) and a big hand where there is something to tap.
// Sizes: Google Play (1080x1920) and the App Store (1320x2868, 1206x2622); units scale with width.
// Render with --public-dir ../store (the captures live in ../store/ios*, from flows/record-store-shots.sh).

type Lang = 'es' | 'en' | 'esus';
type L = Record<Lang, string>;
type Box = { x: number; y: number; w: number; h: number };
type Shot = {
  image: L;
  verb: L;
  line: L;
  /** Part of the capture shown enlarged on a card (0..1 of the capture); per language when layouts differ. */
  zoom?: Box | Partial<Record<Lang, Box>> & { es: Box };
  /** Where a big hand taps on the phone (0..1 of the capture). */
  tap?: { x: number; y: number };
  /** Phone on the left (1) or right (-1); Rumi and the card go on the other side. */
  side: 1 | -1;
  /** Rumi's pose: wave 0..1 lifts the arm, talk 0..1 opens the mouth. */
  rumi: { wave: number; talk: number };
  /** The last shot shows the privacy card instead of a zoom. */
  privacy?: boolean;
};

const shots: Shot[] = [
  {
    image: { es: 'ios/1-inicio.png', en: 'ios-en/1-home.png', esus: 'ios-es-usd/1-inicio.png' },
    verb: { es: 'Mira', en: 'See', esus: 'Mira' },
    line: { es: 'cuánto te queda hoy', en: 'what’s left today', esus: 'cuánto te queda hoy' },
    zoom: { x: 0.02, y: 0.24, w: 0.72, h: 0.11 },
    side: 1,
    rumi: { wave: 1, talk: 0.5 },
  },
  {
    image: { es: 'ios/2-agregar.png', en: 'ios-en/2-add.png', esus: 'ios-es-usd/2-agregar.png' },
    verb: { es: 'Anota', en: 'Log', esus: 'Anota' },
    line: { es: 'un gasto en segundos', en: 'a spend in seconds', esus: 'un gasto en segundos' },
    zoom: { x: 0.04, y: 0.34, w: 0.92, h: 0.09 },
    tap: { x: 0.8, y: 0.838 },
    side: -1,
    rumi: { wave: 0.4, talk: 0.3 },
  },
  {
    image: { es: 'ios/3-mosaico.png', en: 'ios-en/3-mosaic.png', esus: 'ios-es-usd/3-mosaico.png' },
    verb: { es: 'Descubre', en: 'Discover', esus: 'Descubre' },
    line: { es: 'a dónde se va tu plata', en: 'where your money goes', esus: 'a dónde se va tu dinero' },
    zoom: { x: 0.03, y: 0.06, w: 0.94, h: 0.44 },
    side: 1,
    rumi: { wave: 0.7, talk: 0.7 },
  },
  {
    image: { es: 'ios/4-plan.png', en: 'ios-en/4-plan.png', esus: 'ios-es-usd/4-plan.png' },
    verb: { es: 'Cuida', en: 'Guard', esus: 'Cuida' },
    line: { es: 'lo que gastas con topes', en: 'your spending with limits', esus: 'lo que gastas con topes' },
    zoom: { x: 0.04, y: 0.6, w: 0.92, h: 0.19 },
    side: -1,
    rumi: { wave: 0, talk: 0.2 },
  },
  {
    image: { es: 'ios/5-pregunta.png', en: 'ios-en/5-ask.png', esus: 'ios-es-usd/5-pregunta.png' },
    verb: { es: 'Pregunta', en: 'Ask', esus: 'Pregunta' },
    line: { es: 'como le hablas a un amigo', en: 'like you’d ask a friend', esus: 'como le hablas a un amigo' },
    zoom: { x: 0.04, y: 0.415, w: 0.92, h: 0.15 },
    tap: { x: 0.155, y: 0.37 },
    side: 1,
    rumi: { wave: 0.6, talk: 0.9 },
  },
  {
    image: { es: 'ios/6-patrimonio.png', en: 'ios-en/6-wealth.png', esus: 'ios-es-usd/6-patrimonio.png' },
    verb: { es: 'Junta', en: 'Gather', esus: 'Junta' },
    line: {
      es: 'efectivo, Nequi, banco y deudas',
      en: 'cash, bank, savings and loans',
      esus: 'efectivo, banco, ahorros y préstamos',
    },
    zoom: { x: 0.02, y: 0.14, w: 0.75, h: 0.12 },
    side: -1,
    rumi: { wave: 0.3, talk: 0.4 },
  },
  {
    image: { es: 'ios/7-actividad.png', en: 'ios-en/7-activity.png', esus: 'ios-es-usd/7-actividad.png' },
    verb: { es: 'Tuyo', en: 'Yours', esus: 'Tuyo' },
    line: { es: 'sin cuenta y sin conectar tu banco', en: 'no account, no bank login', esus: 'sin cuenta y sin conectar tu banco' },
    side: 1,
    rumi: { wave: 1, talk: 0.6 },
    privacy: true,
  },
];

export type StoreShotV3Props = { index: number; lang: Lang };

/** Ids: store3-<lang>-<n>-<size>, size play | ios69 | ios63. */
export const storeShotsV3: { id: string; props: StoreShotV3Props; width: number; height: number }[] = [];
const sizes = { play: [1080, 1920], ios69: [1320, 2868], ios63: [1206, 2622] } as const;
for (const lang of ['es', 'en', 'esus'] as Lang[]) {
  shots.forEach((_, i) => {
    for (const [size, [width, height]] of Object.entries(sizes)) {
      storeShotsV3.push({ id: `store3-${lang}-${i + 1}-${size}`, props: { index: i, lang }, width, height });
    }
  });
}

const CAPTURE_W = 1320;
const CAPTURE_H = 2868;

const privacyLines: Record<Lang, string[]> = {
  es: ['Sin cuenta ni correo', 'Sin conectar tu banco', 'Cifrado en tu teléfono'],
  esus: ['Sin cuenta ni correo', 'Sin conectar tu banco', 'Cifrado en tu teléfono'],
  en: ['No account or email', 'No bank login', 'Encrypted on your phone'],
};

/** The capture region `box`, enlarged on a white card `width` px wide. */
function ZoomCard({ image, box, width, u }: { image: string; box: Box; width: number; u: number }) {
  const scale = width / (box.w * CAPTURE_W);
  const height = box.h * CAPTURE_H * scale;
  return (
    <div
      style={{
        width: width + 24 * u,
        padding: 12 * u,
        borderRadius: 40 * u,
        background: '#FFFFFF',
        boxShadow: `0 ${30 * u}px ${70 * u}px rgba(11,31,41,0.35), 0 0 0 ${10 * u}px rgba(244,201,93,0.55)`,
      }}>
      <div style={{ width, height, overflow: 'hidden', borderRadius: 30 * u, position: 'relative' }}>
        <Img
          src={staticFile(image)}
          style={{
            position: 'absolute',
            width: CAPTURE_W * scale,
            height: CAPTURE_H * scale,
            left: -box.x * CAPTURE_W * scale,
            top: -box.y * CAPTURE_H * scale,
          }}
        />
      </div>
    </div>
  );
}

function PrivacyCard({ lang, u }: { lang: Lang; u: number }) {
  return (
    <div
      style={{
        width: 760 * u,
        background: '#FFFFFF',
        borderRadius: 44 * u,
        padding: `${36 * u}px ${44 * u}px`,
        boxShadow: `0 ${30 * u}px ${70 * u}px rgba(11,31,41,0.35), 0 0 0 ${10 * u}px rgba(244,201,93,0.55)`,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 * u }}>
        <div style={{ fontSize: 86 * u, lineHeight: 1 }}>🔒</div>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 56 * u, color: brand.ink, lineHeight: 1.05 }}>
          {lang === 'en' ? 'Your data is yours' : 'Tus datos son tuyos'}
        </div>
      </div>
      {privacyLines[lang].map((line) => (
        <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 18 * u, marginTop: 22 * u }}>
          <div
            style={{
              width: 48 * u,
              height: 48 * u,
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
          <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 42 * u, color: brand.petrol700 }}>{line}</div>
        </div>
      ))}
    </div>
  );
}

export function StoreShotV3({ index, lang }: StoreShotV3Props) {
  const { width: W, height: H } = useVideoConfig();
  const s = shots[index];
  const u = W / 1080;
  const tall = H / W > 2;
  const image = s.image[lang];
  const zoom = s.zoom ? ('x' in s.zoom ? s.zoom : (s.zoom[lang] ?? s.zoom.es)) : undefined;

  const phoneW = W * (tall ? 0.6 : 0.54);
  const phoneH = (phoneW * CAPTURE_H) / CAPTURE_W;
  const bezel = 16 * u;
  const headH = H * (tall ? 0.25 : 0.26);
  const phoneTop = headH + 40 * u;
  // The phone hangs off its side a little, like it's being held up to you.
  const phoneLeft = s.side > 0 ? W * 0.02 : W - phoneW - W * 0.02 - bezel * 2;
  const handSize = 230 * u;
  const rumiScale = (tall ? 0.85 : 0.78) * u;
  const verbSize = (s.verb[lang].length > 7 ? 168 : 200) * u;

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #FFFBF5 0%, #FFF1E4 60%, #FFE2CF 100%)', overflow: 'hidden' }}>
      {/* Soft shapes for depth. */}
      <div
        style={{
          position: 'absolute',
          width: W * 1.1,
          height: W * 1.1,
          borderRadius: '50%',
          left: s.side > 0 ? -W * 0.35 : W * 0.25,
          top: phoneTop + phoneH * 0.15,
          background: 'radial-gradient(circle, rgba(207,62,30,0.16), rgba(207,62,30,0) 65%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: W * 0.9,
          height: W * 0.9,
          borderRadius: '50%',
          left: s.side > 0 ? W * 0.45 : -W * 0.35,
          top: phoneTop - 80 * u,
          background: 'radial-gradient(circle, rgba(244,201,93,0.35), rgba(244,201,93,0) 65%)',
        }}
      />

      {/* Headline: the verb, huge, and one short line. */}
      <div style={{ position: 'absolute', top: H * (tall ? 0.045 : 0.035), left: 60 * u, right: 60 * u, textAlign: 'center' }}>
        {index === 0 ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16 * u, marginBottom: 6 * u }}>
            <Img src={staticFile('icon.png')} style={{ width: 64 * u, height: 64 * u, borderRadius: 16 * u }} />
            <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 52 * u, color: brand.petrol700 }}>Rumi</div>
          </div>
        ) : null}
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: verbSize, lineHeight: 0.95, color: brand.coral, letterSpacing: -2 * u }}>
          {s.verb[lang]}
        </div>
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 62 * u, lineHeight: 1.12, color: brand.ink, marginTop: 14 * u, textWrap: 'balance' }}>
          {s.line[lang]}
        </div>
      </div>

      {/* Phone. */}
      <div style={{ position: 'absolute', left: phoneLeft, top: phoneTop, perspective: 2600 * u }}>
        <div
          style={{
            position: 'relative',
            width: phoneW + bezel * 2,
            height: phoneH + bezel * 2,
            borderRadius: 96 * u,
            background: 'linear-gradient(135deg, #2B3A44 0%, #05121A 40%, #0B1F29 100%)',
            padding: bezel,
            transform: `rotateY(${10 * s.side}deg) rotateZ(${-4 * s.side}deg)`,
            boxShadow: `${30 * s.side * u}px ${60 * u}px ${110 * u}px rgba(11,31,41,0.45)`,
          }}>
          <Img src={staticFile(image)} style={{ width: phoneW, height: phoneH, borderRadius: 80 * u, display: 'block' }} />
          {s.tap ? (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: bezel + s.tap.x * phoneW - 60 * u,
                  top: bezel + s.tap.y * phoneH - 60 * u,
                  width: 120 * u,
                  height: 120 * u,
                  borderRadius: '50%',
                  border: `${8 * u}px solid ${brand.coral}`,
                  boxShadow: `0 0 0 ${14 * u}px rgba(207,62,30,0.18)`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: bezel + s.tap.x * phoneW - handSize * 0.4 + 50 * u,
                  top: bezel + s.tap.y * phoneH - handSize * 0.06 + 52 * u,
                  fontSize: handSize,
                  lineHeight: 1,
                  filter: `drop-shadow(0 ${18 * u}px ${20 * u}px rgba(0,0,0,0.4))`,
                  transform: 'rotate(-14deg)',
                  transformOrigin: '40% 6%',
                }}>
                👆
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* The key part of the screen, enlarged on a card over the phone's far edge. */}
      <div
        style={{
          position: 'absolute',
          top: phoneTop + phoneH * (tall ? 0.2 : 0.18),
          [s.side > 0 ? 'right' : 'left']: 30 * u,
          transform: `rotate(${3 * s.side}deg)`,
        }}>
        {s.privacy ? <PrivacyCard lang={lang} u={u} /> : zoom ? <ZoomCard image={image} box={zoom} width={W * 0.56} u={u} /> : null}
      </div>

      {/* Rumi, on the other side of the phone, near the bottom (never mirrored: the R on its face would read backwards). */}
      <div
        style={{
          position: 'absolute',
          width: 840 * rumiScale,
          height: 600 * rumiScale,
          left: s.side > 0 ? W - 840 * rumiScale + 110 * u : -110 * u,
          top: H - 600 * rumiScale - (tall ? 90 : 20) * u,
          filter: `drop-shadow(0 ${20 * u}px ${30 * u}px rgba(11,31,41,0.3))`,
        }}>
        <div style={{ width: 840, height: 600, transform: `scale(${rumiScale})`, transformOrigin: 'left top' }}>
          <Rumi talk={s.rumi.talk} wave={s.rumi.wave} look={0} still />
        </div>
      </div>
    </AbsoluteFill>
  );
}

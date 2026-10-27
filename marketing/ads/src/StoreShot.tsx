import { AbsoluteFill, Img, staticFile } from 'remotion';
import { brand, fonts } from './brand';

// Google Play phone screenshot: a headline over a real simulator capture.
// The captures live in ../store/ios and ../store/ios-en (the App Store
// screenshots); render with --public-dir ../store so staticFile finds them.
export type StoreShotProps = { image: string; title: string; subtitle: string };

export const storeShots: Record<string, StoreShotProps> = {
  'play-1-inicio': { image: 'ios/1-inicio.png', title: 'Tu mes, de un vistazo', subtitle: 'Lo que entra, lo que sale y lo que te queda' },
  'play-2-agregar': { image: 'ios/2-agregar.png', title: 'Anota un gasto en segundos', subtitle: 'Escribe “almuerzo” y Rumi lo clasifica' },
  'play-3-plan': { image: 'ios/3-plan.png', title: 'Topes que te cuidan', subtitle: 'Sabes cuánto te queda en cada categoría' },
  'play-4-pregunta': { image: 'ios/4-pregunta.png', title: 'Pregúntale a Rumi', subtitle: '“¿Cuánto gasté en café este mes?”' },
  'play-5-patrimonio': { image: 'ios/5-patrimonio.png', title: 'Cuentas, inversiones y deudas', subtitle: 'Todo tu dinero en un solo lugar' },
  'play-6-actividad': { image: 'ios/6-actividad.png', title: 'Cada movimiento, en orden', subtitle: 'Sin cuenta ni servidor: todo queda en tu teléfono' },
  'play-en-1-home': { image: 'ios-en/1-home.png', title: 'Your month at a glance', subtitle: 'What comes in, what goes out, what’s left' },
  'play-en-2-add': { image: 'ios-en/2-add.png', title: 'Log a spend in seconds', subtitle: 'Type “lunch” and Rumi files it' },
  'play-en-3-plan': { image: 'ios-en/3-plan.png', title: 'Limits that look out for you', subtitle: 'See what’s left in every category' },
  'play-en-4-ask': { image: 'ios-en/4-ask.png', title: 'Ask Rumi', subtitle: '“How much did I spend on coffee?”' },
  'play-en-5-wealth': { image: 'ios-en/5-wealth.png', title: 'Accounts, savings and loans', subtitle: 'All your money in one place' },
  'play-en-6-activity': { image: 'ios-en/6-activity.png', title: 'Every transaction, in order', subtitle: 'No account, no server: it stays on your phone' },
};

const PHONE_HEIGHT = 1460;
const PHONE_WIDTH = Math.round((PHONE_HEIGHT * 1320) / 2868);

export function StoreShot({ image, title, subtitle }: StoreShotProps) {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${brand.petrol700} 0%, ${brand.petrol900} 100%)`,
        alignItems: 'center',
      }}
    >
      <div style={{ marginTop: 96, width: 940, textAlign: 'center' }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 76, lineHeight: 1.1, color: brand.cream, textWrap: 'balance' }}>
          {title}
        </div>
        <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 38, color: brand.gold, marginTop: 22, textWrap: 'balance' }}>
          {subtitle}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 380,
          width: PHONE_WIDTH + 28,
          height: PHONE_HEIGHT + 28,
          borderRadius: 86,
          background: brand.ink,
          padding: 14,
          boxShadow: '0 40px 90px rgba(0,0,0,0.45)',
        }}
      >
        <Img src={staticFile(image)} style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT, borderRadius: 72, display: 'block' }} />
      </div>
    </AbsoluteFill>
  );
}

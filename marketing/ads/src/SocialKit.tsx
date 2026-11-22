import { AbsoluteFill } from 'remotion';
import { brand, fonts } from './brand';
import { Rumi } from './Mascot';

// Profile picture and covers for Rumi's social accounts (see marketing/redes/README.md).
// Render: npx remotion still src/index.ts <id> ../redes/<id>.png

type CoverCopy = { tagline: string; stores: string };
const ES: CoverCopy = { tagline: 'Tu plata clara, sin conectar tu banco', stores: 'Gratis en Google Play y App Store' };
// The English channel (@rumimoneyapp, US/UK/Canada).
const EN: CoverCopy = { tagline: 'Know where your money goes. No bank link.', stores: 'Free budget app on the App Store and Google Play' };

/**
 * 1080×1080: the mascot on a circle-safe square (every network crops it to a circle). Cream for the
 * Spanish accounts; `petrol` tells the English channel apart at a glance, same Rumi.
 */
export function SocialAvatar({ petrol = false }: { petrol?: boolean }) {
  return (
    <AbsoluteFill
      style={{
        background: petrol ? `linear-gradient(135deg, ${brand.petrol700} 0%, ${brand.petrol900} 100%)` : brand.cream,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: petrol
            ? 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 62%)'
            : 'radial-gradient(circle, #F7E6D6 0%, rgba(251,247,241,0) 70%)',
        }}
      />
      <div style={{ transform: 'scale(0.95)', marginLeft: 20 }}>
        <Rumi talk={0} wave={0} look={0} still />
      </div>
    </AbsoluteFill>
  );
}

/** A wide cover: mascot, name and tagline inside the `safe` box (centered), petrol background. */
function Cover({ safeW, safeH, scale, copy = ES }: { safeW: number; safeH: number; scale: number; copy?: CoverCopy }) {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${brand.petrol700} 0%, ${brand.petrol900} 100%)`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: safeW,
          height: safeH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 40 * scale,
        }}
      >
        <div style={{ width: 840 * scale * 0.55, height: 600 * scale * 0.55, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${scale * 0.55})`, transformOrigin: 'top left' }}>
            <Rumi talk={0} wave={0} look={0.4} still />
          </div>
        </div>
        <div>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 150 * scale, color: brand.cream, lineHeight: 1 }}>
            Rumi
          </div>
          <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 40 * scale, color: brand.gold, marginTop: 14 * scale, whiteSpace: 'nowrap' }}>
            {copy.tagline} 🐜
          </div>
          <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 32 * scale, color: '#CFE0E4', marginTop: 10 * scale }}>
            {copy.stores}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** YouTube banner 2560×1440; only the center 1546×423 shows on every device. */
export const YoutubeBanner = () => <Cover safeW={1546} safeH={423} scale={1} />;
export const YoutubeBannerEn = () => <Cover safeW={1546} safeH={423} scale={1} copy={EN} />;

/** Facebook page cover 1640×624; phones crop the sides, so keep it to the middle. */
export const FacebookCover = () => <Cover safeW={1300} safeH={500} scale={0.95} />;

import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { brand, fonts, FPS } from './brand';
import { Rumi } from './Mascot';
import voice from './money-en-voice.json';
import mouths from './mouths.json';
import { cream, dark, fill, mouthAt, Phone, RumiEnters, usePop } from './PlataVideo';

// "Where did my money go?" (vertical 1080x1920), the English need reel for the US: the problem
// first with our own animation (payday, the spends dripping out, $0, money scattered across
// accounts, no plan), then Rumi jumps in and the real English app (clips/preview-en, recorded
// for the App Store preview) solves each part. Narration: src/money-en-lines.ts, spoken by
// voice/money-en.ts into public/voice/money-en/<n>.mp3 (lengths in src/money-en-voice.json).
const f = (s: number) => Math.round(s * FPS);
const VOICE = voice.seconds;
// Each scene lasts its line plus a breath; Rumi's short line gets a little more; the end lingers.
const SCENE = VOICE.map((v, i) => (i === VOICE.length - 1 ? v + 1.4 : i === 6 ? Math.max(2.2, v + 0.6) : v + 0.45));
const START = SCENE.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SCENE[i - 1]], []);
export const moneyEnFrames = f(START[START.length - 1] + SCENE[SCENE.length - 1]);
const line = (i: number) => `voice/money-en/${i + 1}.mp3`;

const usd = (n: number) => `$${Math.max(0, Math.round(n)).toLocaleString('en-US')}`;
const PAY = 2_400;
const SPENDS = [
  { icon: '☕', name: 'Coffee', amount: 6, day: 15 },
  { icon: '🍱', name: 'Lunch', amount: 14, day: 15 },
  { icon: '🛵', name: 'Takeout', amount: 32, day: 16 },
  { icon: '🚕', name: 'Ride', amount: 19, day: 17 },
  { icon: '📺', name: 'Streaming', amount: 16, day: 18 },
  { icon: '💳', name: 'Card payment', amount: 250, day: 19 },
  { icon: '💡', name: 'Electric bill', amount: 95, day: 20 },
  { icon: '🎂', name: 'Birthday gift', amount: 40, day: 21 },
];
// Seconds into line 2 when each spend is said (sentence boundaries from edge-tts).
const SPEND_AT = voice.dripAt;

const big = { fontFamily: fonts.display, fontWeight: 700 } as const;
const card = { borderRadius: 36, background: '#FFFFFF', boxShadow: '0 14px 30px rgba(11,31,41,0.12)' } as const;

/** 1. Payday. */
function Payday() {
  const frame = useCurrentFrame();
  const pop = usePop(0.2, 10);
  const count = interpolate(frame, [f(1.2), f(2.8)], [0, PAY], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 56, color: brand.petrol700, letterSpacing: 4, textTransform: 'uppercase', opacity: pop }}>
        Friday, Nov 15
      </div>
      <div style={{ ...big, fontSize: 130, color: brand.ink, marginTop: 20, transform: `scale(${0.8 + pop * 0.2})` }}>Payday 🎉</div>
      <div style={{ ...big, fontSize: 190, color: '#1F8A5B', marginTop: 40, fontVariantNumeric: 'tabular-nums' }}>+{usd(count)}</div>
    </AbsoluteFill>
  );
}

/** 2. The drip: a week of small and big spends flying out of the balance. */
function Drip() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const shown = SPEND_AT.filter((at) => t >= at).length;
  const spent = SPENDS.slice(0, shown).reduce((s, x) => s + x.amount, 0);
  // Every other small spend of the week goes too, so the balance ends near zero.
  const extra = interpolate(t, [SPEND_AT[0], SCENE[1]], [0, PAY - SPENDS.reduce((s, x) => s + x.amount, 0) - 60], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const balance = PAY - spent - extra;
  const day = shown ? SPENDS[shown - 1].day : 15;
  const low = balance < 500;
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 14, marginTop: 120 }}>
        {[15, 16, 17, 18, 19, 20, 21, 22].map((d) => (
          <div
            key={d}
            style={{
              ...big,
              width: 104,
              height: 124,
              borderRadius: 24,
              background: d === day ? brand.coral : d < day ? '#F3D9CC' : '#FFFFFF',
              color: d === day ? '#FFFFFF' : brand.ink,
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
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 44, color: brand.petrol700, marginTop: 70 }}>Left</div>
      <div
        style={{
          ...big,
          fontSize: 160,
          color: low ? brand.coral : brand.ink,
          fontVariantNumeric: 'tabular-nums',
          transform: `translateX(${low ? Math.sin(frame * 1.7) * 4 : 0}px)`,
        }}>
        {usd(balance)}
      </div>
      <div style={{ position: 'absolute', top: 760, left: 80, right: 80 }}>
        {SPENDS.slice(0, shown)
          .map((s, i) => ({ ...s, i }))
          .reverse()
          .slice(0, 6)
          .map((s, row) => {
            const enter = spring({ frame: f(t - SPEND_AT[s.i]), fps, config: { damping: 13 }, durationInFrames: 14 });
            return (
              <div
                key={s.i}
                style={{
                  ...card,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 26,
                  height: 140,
                  marginBottom: 22,
                  padding: '0 36px',
                  opacity: (1 - row * 0.13) * Math.min(1, enter * 1.5),
                  transform: `translateY(${(1 - enter) * -120}px) scale(${1 - row * 0.03})`,
                }}>
                <div style={{ fontSize: 76 }}>{s.icon}</div>
                <div style={{ flex: 1, fontFamily: fonts.body, fontWeight: 700, fontSize: 50, color: brand.ink }}>{s.name}</div>
                <div style={{ ...big, fontSize: 56, color: brand.coral }}>-{usd(s.amount)}</div>
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
  const ask = usePop(1.7, 12);
  const shake = frame < f(0.6) ? Math.sin(frame * 2.3) * 10 : 0;
  return (
    <AbsoluteFill style={{ background: dark, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 56, color: brand.gold, letterSpacing: 4, textTransform: 'uppercase' }}>November 22</div>
      <div style={{ ...big, fontSize: 300, color: '#FF6B4A', transform: `scale(${0.6 + pop * 0.4}) translateX(${shake}px)`, lineHeight: 1.1 }}>$0</div>
      <div style={{ ...big, fontSize: 96, color: brand.cream, marginTop: 40, opacity: ask, transform: `translateY(${(1 - ask) * 30}px)`, padding: '0 80px' }}>
        Where did it all go? 🤯
      </div>
    </AbsoluteFill>
  );
}

/** 4. Money in four places, none of them adding up. */
function Scattered() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const places = [
    { icon: '🏦', name: 'Checking', at: 0.2 },
    { icon: '🐷', name: 'Savings', at: 0.8 },
    { icon: '💵', name: 'Cash', at: 1.3 },
    { icon: '💳', name: 'Credit card', at: 1.9 },
  ];
  const total = usePop(2.6, 12);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ ...big, fontSize: 96, color: brand.ink, marginTop: 170, textAlign: 'center', lineHeight: 1.1 }}>
        How much do you
        <br />
        really have?
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 30, width: 900, marginTop: 80, justifyContent: 'center' }}>
        {places.map((p, i) => {
          const show = spring({ frame: frame - f(p.at), fps, config: { damping: 12 }, durationInFrames: 16 });
          const wobble = Math.sin(frame / 6 + i) * 4;
          return (
            <div key={p.name} style={{ ...card, width: 420, height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: show, transform: `scale(${0.7 + show * 0.3}) rotate(${wobble}deg)` }}>
              <div style={{ fontSize: 100 }}>{p.icon}</div>
              <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 46, color: brand.petrol700 }}>{p.name}</div>
              <div style={{ ...big, fontSize: 70, color: brand.coral }}>$ ???</div>
            </div>
          );
        })}
      </div>
      <div style={{ ...big, fontSize: 84, color: brand.coral, marginTop: 70, opacity: total, transform: `scale(${0.8 + total * 0.2})` }}>No idea 🤷</div>
    </AbsoluteFill>
  );
}

/** 5. The rest of the month, blank. */
function NoPlan() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = usePop(0.9, 12);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 52, color: brand.petrol700, marginTop: 200, letterSpacing: 3, textTransform: 'uppercase' }}>
        Rest of the month
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 190px)', gap: 24, marginTop: 60 }}>
        {[23, 24, 25, 26, 27, 28, 29, 30].map((d, i) => {
          const show = spring({ frame: frame - f(0.1 + i * 0.08), fps, config: { damping: 14 }, durationInFrames: 12 });
          return (
            <div key={d} style={{ ...card, height: 190, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: show, background: '#F4EEE8' }}>
              <div style={{ ...big, fontSize: 60, color: '#9AA5AB' }}>{d}</div>
              <div style={{ ...big, fontSize: 56, color: brand.coral }}>?</div>
            </div>
          );
        })}
      </div>
      <div style={{ ...big, fontSize: 120, color: brand.ink, marginTop: 90, opacity: title, transform: `scale(${0.8 + title * 0.2})` }}>No plan 😬</div>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 52, color: brand.petrol700, marginTop: 20, opacity: usePop(2.2, 14) }}>
        Just hoping it lasts
      </div>
    </AbsoluteFill>
  );
}

/** 6. The point. */
function Truth() {
  const a = usePop(0.1, 200);
  const b = usePop(1.7, 200);
  return (
    <AbsoluteFill style={{ background: dark, justifyContent: 'center', padding: '0 90px' }}>
      <div style={{ ...big, fontSize: 104, lineHeight: 1.08, color: brand.cream, opacity: a }}>It’s not that you earn too little.</div>
      <div style={{ ...big, fontSize: 104, lineHeight: 1.08, color: brand.gold, marginTop: 40, opacity: b }}>You just can’t see where it goes.</div>
    </AbsoluteFill>
  );
}

const clip = (name: string) => staticFile(`clips/preview-en/${name}.mp4`);

/** 8–11. The real app, in English. */
function AppClip({ title, sub, src, from, rate = 1 }: { title: string; sub: string; src: string; from: number; rate?: number }) {
  return (
    <Phone title={title} sub={sub}>
      <OffthreadVideo src={clip(src)} muted startFrom={f(from)} playbackRate={rate} style={fill} />
    </Phone>
  );
}

/** 12. Planning: Rumi's month-end answer, with the app's own English text (search.answerProjection*). */
function Plan() {
  const frame = useCurrentFrame();
  const q = usePop(0.3, 14);
  const thinking = frame > f(1.0) && frame < f(1.7);
  const a = usePop(1.7, 14);
  const bubble = { borderRadius: 40, padding: '30px 40px', fontFamily: fonts.body, fontSize: 46, lineHeight: 1.3, maxWidth: 820 } as const;
  return (
    <AbsoluteFill style={{ background: cream }}>
      <div style={{ position: 'absolute', top: 110, left: 60, right: 60, textAlign: 'center' }}>
        <div style={{ ...big, fontSize: 108, color: brand.coral }}>Plan</div>
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 54, color: brand.ink, marginTop: 10 }}>before it’s gone</div>
      </div>
      <div style={{ position: 'absolute', top: 560, left: 80, right: 80, display: 'flex', flexDirection: 'column', gap: 34 }}>
        <div style={{ ...bubble, alignSelf: 'flex-end', background: brand.petrol700, color: '#FFFFFF', fontWeight: 700, opacity: q, transform: `translateY(${(1 - q) * 30}px)` }}>
          How will I end the month?
        </div>
        {thinking ? <div style={{ ...bubble, ...card, alignSelf: 'flex-start', letterSpacing: 8 }}>{'•••'.slice(0, 1 + (Math.floor(frame / 6) % 3))}</div> : null}
        {frame >= f(1.7) ? (
          <div style={{ ...bubble, ...card, alignSelf: 'flex-start', color: brand.ink, opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>
            At this pace you would spend about <b>$2,310</b> by the end of the month ($1,620 so far, 21 of 30 days).
            <br />
            <br />
            With $2,400 of income logged, about <b style={{ color: '#1F8A5B' }}>$90</b> would be left.
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
}

/** 13. The end card. */
function End() {
  const frame = useCurrentFrame();
  const pop = usePop(0, 14);
  const v = line(12);
  const talk = mouthAt(v, frame);
  return (
    <AbsoluteFill style={{ background: dark, alignItems: 'center', textAlign: 'center' }}>
      <div style={{ marginTop: 240, transform: `scale(${0.85 + pop * 0.15})`, opacity: Math.min(1, pop * 1.4) }}>
        <Img src={staticFile('icon.png')} style={{ width: 190, height: 190, borderRadius: 46 }} />
        <div style={{ ...big, fontSize: 170, color: brand.cream, marginTop: 24 }}>Rumi</div>
        <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 64, color: brand.gold }}>Know where your money goes.</div>
        <div style={{ display: 'inline-block', marginTop: 50, padding: '22px 56px', borderRadius: 999, background: brand.coral, fontFamily: fonts.body, fontWeight: 700, fontSize: 54, color: '#FFFFFF' }}>
          Download free
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: 40, color: '#CFE0E3', marginTop: 22 }}>iPhone & Android · no bank link</div>
      </div>
      <div style={{ position: 'absolute', bottom: 30, left: (1080 - 840 * 0.9) / 2, width: 840, height: 600, transform: 'scale(0.9)', transformOrigin: 'left top' }}>
        <Rumi talk={talk} wave={1} look={0} smileTalk mood={frame > f(0.1) + ((mouths as Record<string, number[]>)[v]?.length ?? 0) ? 'happy' : undefined} />
      </div>
    </AbsoluteFill>
  );
}

export function MoneyEnVideo() {
  const frame = useCurrentFrame();
  const total = moneyEnFrames;
  // Tense music under the problem, brighter once Rumi comes in.
  const rumiAt = f(START[6]);
  const tense = interpolate(frame, [0, f(0.5), rumiAt - f(0.6), rumiAt], [0, 0.08, 0.08, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bright = interpolate(frame, [rumiAt, rumiAt + f(0.4), total - f(1.5), total], [0, 0.13, 0.13, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scenes = [
    <Payday />,
    <Drip />,
    <Zero />,
    <Scattered />,
    <NoPlan />,
    <Truth />,
    <RumiEnters voice={line(6)} text={['That’s what', 'I’m here for!']} />,
    <AppClip title="See" sub="all your money in one place" src="1-home" from={21.5} />,
    <AppClip title="Log" sub="every spend in seconds" src="2-add" from={16.5} rate={2.2} />,
    <AppClip title="Know" sub="where it went" src="3-mosaic" from={30.75} rate={2} />,
    <AppClip title="Ask" sub="anything" src="4-ask" from={84} rate={1.4} />,
    <Plan />,
    <End />,
  ];
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
            <Audio src={staticFile(line(i))} />
          </Sequence>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

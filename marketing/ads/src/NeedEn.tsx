import type { ReactNode } from 'react';
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { brand, fonts, FPS } from './brand';
import { Rumi } from './Mascot';
import mouths from './mouths.json';
import voices from './need-en-voice.json';
import { cream, dark, fill, mouthAt, Phone, RumiEnters, usePop } from './PlataVideo';

// English need reels, the series after "Where did my money go?" (MoneyEnVideo): the problem in
// dollars with our own animation, then Rumi jumps in and the app solves it. Each episode is a
// list of scenes; scene i plays line i of src/need-en-lines.ts (public/voice/<id>/<i+1>.mp3).
const f = (s: number) => Math.round(s * FPS);
const usd = (n: number, cents = false) =>
  `$${Math.max(0, n).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;
const big = { fontFamily: fonts.display, fontWeight: 700 } as const;
const body = { fontFamily: fonts.body, fontWeight: 700 } as const;
const card = { borderRadius: 36, background: '#FFFFFF', boxShadow: '0 14px 30px rgba(11,31,41,0.12)' } as const;
const GREEN = '#1F8A5B';

type Voice = { seconds: number[]; dripAt: number[] };
const voiceOf = (id: string) => (voices as Record<string, Voice>)[id];

/** Scene lengths: the line plus a breath, at least `min` seconds; Rumi's jump a bit longer; the end lingers. */
function timeline(id: string, rumiAt: number, min = 2.6) {
  const s = voiceOf(id).seconds;
  const scene = s.map((v, i) => (i === s.length - 1 ? v + 1.4 : i === rumiAt ? Math.max(2.2, v + 0.6) : Math.max(min, v + 0.45)));
  const start = scene.reduce<number[]>((acc, x, i) => [...acc, i === 0 ? 0 : acc[i - 1] + scene[i - 1]], []);
  return { scene, start, frames: f(start[start.length - 1] + scene[scene.length - 1]) };
}

/** Plays the scenes with their lines; tense music until Rumi comes in, brighter after. */
function Shell({ id, rumiAt, scenes }: { id: string; rumiAt: number; scenes: ReactNode[] }) {
  const frame = useCurrentFrame();
  const { scene, start, frames } = timeline(id, rumiAt);
  const at = f(start[rumiAt]);
  const tense = interpolate(frame, [0, f(0.5), at - f(0.6), at], [0, 0.08, 0.08, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bright = interpolate(frame, [at, at + f(0.4), frames - f(1.5), frames], [0, 0.13, 0.13, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Audio src={staticFile('music/im-fine.mp3')} volume={tense} />
      <Sequence from={at}>
        <Audio src={staticFile('music/happy-times.mp3')} volume={bright} />
      </Sequence>
      {scenes.map((s, i) => (
        <Sequence key={i} from={f(start[i])} durationInFrames={f(scene[i])}>
          {s}
          <Sequence from={f(0.1)}>
            <Audio src={staticFile(`voice/${id}/${i + 1}.mp3`)} />
          </Sequence>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

/** A title, a big number counting up from `from` to `to`, and a line under it. */
function BigCount({ kicker, from = 0, to, at = [0.6, 2.4], under, underAt = 2.6, tone = brand.coral, bg = cream }: {
  kicker: string;
  from?: number;
  to: number;
  at?: [number, number];
  under?: ReactNode;
  underAt?: number;
  tone?: string;
  bg?: string;
}) {
  const frame = useCurrentFrame();
  const pop = usePop(0.1, 12);
  const n = interpolate(frame, [f(at[0]), f(at[1])], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const u = usePop(underAt, 12);
  const onDark = bg === dark;
  return (
    <AbsoluteFill style={{ background: bg, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 80px' }}>
      <div style={{ ...body, fontSize: 58, color: onDark ? brand.gold : brand.petrol700, letterSpacing: 3, textTransform: 'uppercase', opacity: pop }}>{kicker}</div>
      <div style={{ ...big, fontSize: 230, color: tone, fontVariantNumeric: 'tabular-nums', transform: `scale(${0.8 + pop * 0.2})`, lineHeight: 1.15 }}>{usd(n)}</div>
      {under ? <div style={{ ...big, fontSize: 80, color: onDark ? brand.cream : brand.ink, marginTop: 30, opacity: u, transform: `translateY(${(1 - u) * 30}px)` }}>{under}</div> : null}
    </AbsoluteFill>
  );
}

/** Two lines on dark: the point of the episode. */
function Truth({ a, b }: { a: string; b: string }) {
  const x = usePop(0.1, 200);
  const y = usePop(1.5, 200);
  return (
    <AbsoluteFill style={{ background: dark, justifyContent: 'center', padding: '0 90px' }}>
      <div style={{ ...big, fontSize: 110, lineHeight: 1.08, color: brand.cream, opacity: x }}>{a}</div>
      <div style={{ ...big, fontSize: 110, lineHeight: 1.08, color: brand.gold, marginTop: 40, opacity: y }}>{b}</div>
    </AbsoluteFill>
  );
}

function AppClip({ title, sub, src, from, rate = 1 }: { title: string; sub: string; src: string; from: number; rate?: number }) {
  return (
    <Phone title={title} sub={sub}>
      <OffthreadVideo src={staticFile(`clips/preview-en/${src}.mp4`)} muted startFrom={f(from)} playbackRate={rate} style={fill} />
    </Phone>
  );
}

/** A title over an app-like card that pops in (Rumi's own screens, with the app's English copy). */
function AppCard({ title, sub, children, delay = 0.4 }: { title: string; sub: string; children: ReactNode; delay?: number }) {
  const p = usePop(delay, 14);
  return (
    <AbsoluteFill style={{ background: cream }}>
      <div style={{ position: 'absolute', top: 110, left: 60, right: 60, textAlign: 'center' }}>
        <div style={{ ...big, fontSize: 108, color: brand.coral }}>{title}</div>
        <div style={{ ...body, fontSize: 54, color: brand.ink, marginTop: 10 }}>{sub}</div>
      </div>
      <div style={{ position: 'absolute', top: 520, left: 80, right: 80, opacity: p, transform: `translateY(${(1 - p) * 40}px) scale(${0.94 + p * 0.06})` }}>{children}</div>
    </AbsoluteFill>
  );
}

/** Ask Rumi: a question bubble, dots, then the answer (the app's own English text). */
function Chat({ q, a }: { q: string; a: ReactNode }) {
  const frame = useCurrentFrame();
  const qp = usePop(0.3, 14);
  const ap = usePop(1.5, 14);
  const bubble = { borderRadius: 40, padding: '30px 40px', fontFamily: fonts.body, fontSize: 46, lineHeight: 1.3, maxWidth: 840 } as const;
  return (
    <AbsoluteFill style={{ background: cream }}>
      <div style={{ position: 'absolute', top: 110, left: 60, right: 60, textAlign: 'center' }}>
        <div style={{ ...big, fontSize: 108, color: brand.coral }}>Ask</div>
        <div style={{ ...body, fontSize: 54, color: brand.ink, marginTop: 10 }}>in your own words</div>
      </div>
      <div style={{ position: 'absolute', top: 560, left: 80, right: 80, display: 'flex', flexDirection: 'column', gap: 34 }}>
        <div style={{ ...bubble, alignSelf: 'flex-end', background: brand.petrol700, color: '#FFFFFF', fontWeight: 700, opacity: qp, transform: `translateY(${(1 - qp) * 30}px)` }}>{q}</div>
        {frame > f(0.9) && frame < f(1.5) ? <div style={{ ...bubble, ...card, alignSelf: 'flex-start', letterSpacing: 8 }}>{'•••'.slice(0, 1 + (Math.floor(frame / 6) % 3))}</div> : null}
        {frame >= f(1.5) ? <div style={{ ...bubble, ...card, alignSelf: 'flex-start', color: brand.ink, opacity: ap, transform: `translateY(${(1 - ap) * 30}px)` }}>{a}</div> : null}
      </div>
    </AbsoluteFill>
  );
}

function End({ id, tagline }: { id: string; tagline: string }) {
  const frame = useCurrentFrame();
  const pop = usePop(0, 14);
  const v = `voice/${id}/${voiceOf(id).seconds.length}.mp3`;
  const talk = mouthAt(v, frame);
  return (
    <AbsoluteFill style={{ background: dark, alignItems: 'center', textAlign: 'center' }}>
      <div style={{ marginTop: 240, transform: `scale(${0.85 + pop * 0.15})`, opacity: Math.min(1, pop * 1.4) }}>
        <Img src={staticFile('icon.png')} style={{ width: 190, height: 190, borderRadius: 46 }} />
        <div style={{ ...big, fontSize: 170, color: brand.cream, marginTop: 24 }}>Rumi</div>
        <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 64, color: brand.gold }}>{tagline}</div>
        <div style={{ display: 'inline-block', marginTop: 50, padding: '22px 56px', borderRadius: 999, background: brand.coral, ...body, fontSize: 54, color: '#FFFFFF' }}>Download free</div>
        <div style={{ fontFamily: fonts.body, fontSize: 40, color: '#CFE0E3', marginTop: 22 }}>iPhone & Android · no bank link</div>
      </div>
      <div style={{ position: 'absolute', bottom: 30, left: (1080 - 840 * 0.9) / 2, width: 840, height: 600, transform: 'scale(0.9)', transformOrigin: 'left top' }}>
        <Rumi talk={talk} wave={1} look={0} smileTalk mood={frame > f(0.1) + ((mouths as Record<string, number[]>)[v]?.length ?? 0) ? 'happy' : undefined} />
      </div>
    </AbsoluteFill>
  );
}

/* ---------- "It's just $5" (small-en) ---------- */

const SMALL = [
  { icon: '☕', name: 'Coffee', amount: 5 },
  { icon: '🍪', name: 'Snack', amount: 3 },
  { icon: '🥤', name: 'Soda', amount: 2 },
  { icon: '🛵', name: 'Delivery fee', amount: 4 },
  { icon: '📱', name: 'Forgotten app', amount: 9.99 },
  { icon: '☕', name: 'Coffee', amount: 5 },
];

function JustFive() {
  const pop = usePop(0.1, 9);
  const shrug = usePop(1.4, 12);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 240, transform: `scale(${0.6 + pop * 0.4})` }}>☕</div>
      <div style={{ ...big, fontSize: 130, color: brand.ink, marginTop: 20 }}>It’s just $5</div>
      <div style={{ ...big, fontSize: 84, color: brand.petrol700, marginTop: 30, opacity: shrug }}>That’s nothing… right? 🤷</div>
    </AbsoluteFill>
  );
}

function SmallPile() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const at = voiceOf('small-en').dripAt;
  const shown = at.filter((x) => t >= x).length;
  const total = SMALL.slice(0, shown).reduce((s, x) => s + x.amount, 0);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ ...body, fontSize: 48, color: brand.petrol700, marginTop: 150, letterSpacing: 3, textTransform: 'uppercase' }}>Just today</div>
      <div style={{ ...big, fontSize: 170, color: brand.coral, fontVariantNumeric: 'tabular-nums' }}>{usd(total, true)}</div>
      <div style={{ position: 'absolute', top: 560, left: 80, right: 80 }}>
        {SMALL.slice(0, shown).map((s, i) => {
          const enter = spring({ frame: f(t - at[i]), fps, config: { damping: 13 }, durationInFrames: 14 });
          return (
            <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 26, height: 150, marginBottom: 24, padding: '0 40px', opacity: Math.min(1, enter * 1.5), transform: `translateX(${(1 - enter) * 300}px)` }}>
              <div style={{ fontSize: 76 }}>{s.icon}</div>
              <div style={{ flex: 1, ...body, fontSize: 52, color: brand.ink }}>🐜 {s.name}</div>
              <div style={{ ...big, fontSize: 58, color: brand.coral }}>-{usd(s.amount, s.amount % 1 !== 0)}</div>
            </div>
          );
        })}
      </div>
      {at.map((x, i) => (
        <Sequence key={i} from={f(x)} durationInFrames={f(0.6)}>
          <Audio src={staticFile('sfx/pop.mp3')} volume={0.35} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

export function SmallSpendsEn() {
  const id = 'small-en';
  return (
    <Shell
      id={id}
      rumiAt={5}
      scenes={[
        <JustFive />,
        <SmallPile />,
        <BigCount kicker="By the end of the month" to={310} at={[2.6, 5]} under="in small spends 🐜" underAt={4.6} />,
        <BigCount kicker="In a year" from={310} to={3720} at={[0.8, 2.6]} under="A whole vacation ✈️ gone in little pieces" underAt={3.4} bg={dark} tone="#FF6B4A" />,
        <Truth a="Small spends aren’t small." b="They’re just invisible." />,
        <RumiEnters voice={`voice/${id}/6.mp3`} text={['I’ll make them', 'visible!']} />,
        <AppClip title="Log" sub="every little spend in seconds" src="2-add" from={16.5} rate={3.2} />,
        <AppClip title="See" sub="where they all go" src="3-mosaic" from={33} rate={1.6} />,
        <Chat
          q="What are my small spends?"
          a={
            <>
              Small spends (This month): <b>$310</b>. Top: Coffee $132 · Delivery fees $48 · Snacks $45.
            </>
          }
        />,
        <End id={id} tagline="Catch the small spends." />,
      ]}
    />
  );
}
export const smallSpendsEnFrames = timeline('small-en', 5).frames;

/* ---------- "The card that never goes down" (card-en) ---------- */

/** The statement: balance, minimum payment, interest. */
function Statement() {
  const frame = useCurrentFrame();
  const rows = [
    { at: 0.3, label: 'Balance', value: '$3,200.00', color: brand.ink },
    { at: 2.6, label: 'You pay (minimum)', value: '-$95.00', color: GREEN },
    { at: 4.6, label: 'Interest', value: '+$58.00', color: brand.coral },
  ];
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ ...big, fontSize: 96, color: brand.ink, marginTop: 200 }}>💳 Card statement</div>
      <div style={{ ...card, width: 900, marginTop: 70, padding: '20px 50px' }}>
        {rows.map((r, i) => {
          const p = spring({ frame: frame - f(r.at), fps, config: { damping: 14 }, durationInFrames: 14 });
          return (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '34px 0', borderBottom: i < rows.length - 1 ? '2px solid #EEE6DE' : 'none', opacity: p, transform: `translateX(${(1 - p) * 60}px)` }}>
              <div style={{ ...body, fontSize: 52, color: brand.petrol700 }}>{r.label}</div>
              <div style={{ ...big, fontSize: 70, color: r.color, fontVariantNumeric: 'tabular-nums' }}>{r.value}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** Six months of minimum payments: the balance bars barely shrink. */
function Months() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Balance after each month: B(1.01833) − 95.
  const balances = [3200, 3164, 3127, 3090, 3052, 3013, 2972];
  const paid = usePop(4.4, 12);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ ...body, fontSize: 52, color: brand.petrol700, marginTop: 170, letterSpacing: 3, textTransform: 'uppercase' }}>Month after month</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 26, height: 760, marginTop: 50 }}>
        {balances.map((b, i) => {
          const p = spring({ frame: frame - f(0.3 + i * 0.45), fps, config: { damping: 14 }, durationInFrames: 14 });
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: p }}>
              <div style={{ ...big, fontSize: 34, color: brand.ink, marginBottom: 10 }}>${(b / 1000).toFixed(2)}k</div>
              <div style={{ width: 104, height: (b / 3200) * 620 * p, borderRadius: 22, background: i === balances.length - 1 ? brand.coral : '#F3C9B8' }} />
              <div style={{ ...body, fontSize: 32, color: brand.petrol700, marginTop: 12 }}>{i === 0 ? 'Now' : `M${i}`}</div>
            </div>
          );
        })}
      </div>
      <div style={{ ...big, fontSize: 70, color: brand.ink, marginTop: 50, opacity: paid, textAlign: 'center' }}>
        Paid <span style={{ color: GREEN }}>$570</span> · still owe <span style={{ color: brand.coral }}>$2,972</span>
      </div>
    </AbsoluteFill>
  );
}

function Years() {
  const a = usePop(0.2, 10);
  const b = usePop(2.6, 12);
  return (
    <AbsoluteFill style={{ background: dark, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ ...body, fontSize: 56, color: brand.gold, letterSpacing: 3, textTransform: 'uppercase' }}>Paying the minimum</div>
      <div style={{ ...big, fontSize: 200, color: '#FF6B4A', transform: `scale(${0.7 + a * 0.3})`, lineHeight: 1.1 }}>4+ years</div>
      <div style={{ ...big, fontSize: 90, color: brand.cream, marginTop: 30, opacity: b }}>~$1,800 in interest 😩</div>
    </AbsoluteFill>
  );
}

const planCard = { ...card, padding: '44px 50px' } as const;

/** The app's debt plan, free part: the debt-free date (debtPlan.baseline). */
function DebtFree() {
  return (
    <AppCard title="See" sub="your way out">
      <div style={planCard}>
        <div style={{ ...big, fontSize: 56, color: brand.ink }}>Plan to get out of debt</div>
        <div style={{ fontFamily: fonts.body, fontSize: 46, color: brand.ink, marginTop: 26, lineHeight: 1.35 }}>
          Paying only the installments, you are debt-free by <b>April 2031</b>.
        </div>
      </div>
    </AppCard>
  );
}

/** The debt plan with an extra payment (debtPlan.extraLabel / planSooner / interestSaved). Pro. */
function Extra() {
  const p = usePop(1.8, 14);
  return (
    <AppCard title="Get out" sub="two years sooner">
      <div style={planCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ ...body, fontSize: 44, color: brand.petrol700 }}>If you pay extra each month</div>
          <div style={{ ...body, fontSize: 30, color: '#FFFFFF', background: brand.petrol700, borderRadius: 999, padding: '8px 22px' }}>Rumi Pro</div>
        </div>
        <div style={{ ...big, fontSize: 90, color: brand.coral, marginTop: 14 }}>+$50</div>
        <div style={{ fontFamily: fonts.body, fontSize: 46, color: brand.ink, marginTop: 20, lineHeight: 1.35, opacity: p }}>
          You are debt-free by <b>April 2029</b>, <b style={{ color: GREEN }}>24 months sooner</b>.
          <br />
          You save <b style={{ color: GREEN }}>$900</b> in interest.
        </div>
      </div>
    </AppCard>
  );
}

/** The day-before reminder (reminder.debtTitle / debtBodyAmount). */
function Reminder() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame: frame - f(0.5), fps, config: { damping: 12 }, durationInFrames: 18 });
  return (
    <AbsoluteFill style={{ background: cream }}>
      <div style={{ position: 'absolute', top: 110, left: 60, right: 60, textAlign: 'center' }}>
        <div style={{ ...big, fontSize: 108, color: brand.coral }}>Never late</div>
        <div style={{ ...body, fontSize: 54, color: brand.ink, marginTop: 10 }}>a reminder the day before</div>
      </div>
      <div style={{ position: 'absolute', top: 600 + (1 - drop) * -300, left: 70, right: 70, opacity: drop, borderRadius: 44, padding: '34px 40px', background: 'rgba(255,255,255,0.95)', boxShadow: '0 24px 50px rgba(11,31,41,0.22)', display: 'flex', gap: 28 }}>
        <Img src={staticFile('icon.png')} style={{ width: 96, height: 96, borderRadius: 24 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ ...body, fontSize: 40, color: brand.ink }}>Payment due soon</div>
            <div style={{ fontFamily: fonts.body, fontSize: 32, color: '#7A868C' }}>9:00 AM</div>
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: 38, color: brand.ink, marginTop: 8, lineHeight: 1.3 }}>
            The Visa card payment is due tomorrow: $145. Tap to log it.
          </div>
        </div>
      </div>
      <Sequence from={f(0.5)} durationInFrames={f(1)}>
        <Audio src={staticFile('sfx/success.mp3')} volume={0.5} />
      </Sequence>
    </AbsoluteFill>
  );
}

function NeverDown() {
  const a = usePop(0.1, 12);
  const b = usePop(2.4, 12);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 80px' }}>
      <div style={{ fontSize: 220, transform: `scale(${0.6 + a * 0.4})` }}>💳</div>
      <div style={{ ...big, fontSize: 104, color: brand.ink, marginTop: 20, lineHeight: 1.1 }}>You pay it every month…</div>
      <div style={{ ...big, fontSize: 104, color: brand.coral, marginTop: 30, opacity: b, lineHeight: 1.1 }}>so why doesn’t it go down? 🤔</div>
    </AbsoluteFill>
  );
}

export function CardEn() {
  const id = 'card-en';
  return (
    <Shell
      id={id}
      rumiAt={5}
      scenes={[
        <NeverDown />,
        <Statement />,
        <Months />,
        <Years />,
        <Truth a="It’s not that you don’t pay." b="You just can’t see the way out." />,
        <RumiEnters voice={`voice/${id}/6.mp3`} text={['Let me show you', 'the way out!']} />,
        <DebtFree />,
        <Extra />,
        <Reminder />,
        <End id={id} tagline="See your way out of debt." />,
      ]}
    />
  );
}
export const cardEnFrames = timeline('card-en', 5).frames;

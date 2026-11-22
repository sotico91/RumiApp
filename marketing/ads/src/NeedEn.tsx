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

/* ---------- "Forgot a bill again?" (bills-en) ---------- */

function Forgot() {
  const a = usePop(0.1, 9);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 240, transform: `scale(${0.6 + a * 0.4}) rotate(${(1 - a) * -20}deg)` }}>😬</div>
      <div style={{ ...big, fontSize: 120, color: brand.ink, marginTop: 20, lineHeight: 1.1 }}>Forgot a bill</div>
      <div style={{ ...big, fontSize: 120, color: brand.coral, lineHeight: 1.1 }}>again?</div>
    </AbsoluteFill>
  );
}

/** Rent due on the 1st, paid on the 6th: the late days light up. */
function LateDays() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ ...big, fontSize: 96, color: brand.ink, marginTop: 220 }}>🏠 Rent</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 250px)', gap: 30, marginTop: 70 }}>
        {[1, 2, 3, 4, 5, 6].map((d, i) => {
          const p = spring({ frame: frame - f(0.2 + i * 0.28), fps, config: { damping: 13 }, durationInFrames: 14 });
          const due = d === 1;
          const paid = d === 6;
          return (
            <div key={d} style={{ ...card, height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: p, transform: `scale(${0.8 + p * 0.2})`, background: paid ? brand.coral : due ? '#FFFFFF' : '#FBE3D9' }}>
              <div style={{ ...big, fontSize: 96, color: paid ? '#FFFFFF' : brand.ink }}>{d}</div>
              <div style={{ ...body, fontSize: 34, color: paid ? '#FFFFFF' : due ? brand.petrol700 : brand.coral }}>{due ? 'Due' : paid ? 'Paid 😅' : 'Late'}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** The app's suggested reminders (reminder.suggestTitle / suggestHint / suggestMeta / suggestAdd). */
function Suggested() {
  const rows = [
    { name: 'Rent', day: 1, amount: '$1,450' },
    { name: 'Phone', day: 12, amount: '$65' },
    { name: 'Car insurance', day: 20, amount: '$138' },
  ];
  return (
    <AppCard title="Reminders" sub="suggested for you">
      <div style={{ ...card, padding: '40px 46px' }}>
        <div style={{ ...big, fontSize: 54, color: brand.ink }}>Suggested for you</div>
        <div style={{ fontFamily: fonts.body, fontSize: 36, color: '#5B6B73', marginTop: 12, lineHeight: 1.35 }}>
          You pay these every month and they have no reminder yet. We remind you the day before, at 9:00.
        </div>
        {rows.map((r) => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '2px solid #EEE6DE', marginTop: 26, paddingTop: 26 }}>
            <div>
              <div style={{ ...body, fontSize: 44, color: brand.ink }}>{r.name}</div>
              <div style={{ fontFamily: fonts.body, fontSize: 34, color: '#5B6B73' }}>
                Usually paid on day {r.day} · {r.amount}
              </div>
            </div>
            <div style={{ ...body, fontSize: 34, color: '#FFFFFF', background: brand.coral, borderRadius: 999, padding: '14px 26px' }}>Remind me</div>
          </div>
        ))}
      </div>
    </AppCard>
  );
}

/** A push notification dropping in (title + body, the app's own copy). */
function Push({ title, sub, head, text }: { title: string; sub: string; head: string; text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame: frame - f(0.5), fps, config: { damping: 12 }, durationInFrames: 18 });
  return (
    <AbsoluteFill style={{ background: cream }}>
      <div style={{ position: 'absolute', top: 110, left: 60, right: 60, textAlign: 'center' }}>
        <div style={{ ...big, fontSize: 108, color: brand.coral }}>{title}</div>
        <div style={{ ...body, fontSize: 54, color: brand.ink, marginTop: 10 }}>{sub}</div>
      </div>
      <div style={{ position: 'absolute', top: 600 + (1 - drop) * -300, left: 70, right: 70, opacity: drop, borderRadius: 44, padding: '34px 40px', background: 'rgba(255,255,255,0.95)', boxShadow: '0 24px 50px rgba(11,31,41,0.22)', display: 'flex', gap: 28 }}>
        <Img src={staticFile('icon.png')} style={{ width: 96, height: 96, borderRadius: 24 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ ...body, fontSize: 40, color: brand.ink }}>{head}</div>
            <div style={{ fontFamily: fonts.body, fontSize: 32, color: '#7A868C' }}>9:00 AM</div>
          </div>
          <div style={{ fontFamily: fonts.body, fontSize: 38, color: brand.ink, marginTop: 8, lineHeight: 1.3 }}>{text}</div>
        </div>
      </div>
      <Sequence from={f(0.5)} durationInFrames={f(1)}>
        <Audio src={staticFile('sfx/success.mp3')} volume={0.5} />
      </Sequence>
    </AbsoluteFill>
  );
}

/** Already logged: the reminder is skipped (reminder.body: "If you already logged it, Rumi skips that reminder"). */
function Quiet() {
  const p = usePop(1.2, 12);
  return (
    <AppCard title="Already paid?" sub="then no reminder">
      <div style={{ ...card, padding: '40px 46px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <div style={{ fontSize: 70 }}>🏠</div>
          <div style={{ flex: 1 }}>
            <div style={{ ...body, fontSize: 46, color: brand.ink }}>Rent · $1,450</div>
            <div style={{ fontFamily: fonts.body, fontSize: 36, color: GREEN }}>Logged on Nov 30</div>
          </div>
          <div style={{ fontSize: 70, color: GREEN }}>✓</div>
        </div>
        <div style={{ ...body, fontSize: 40, color: brand.petrol700, marginTop: 34, opacity: p }}>🔕 Reminder skipped this month</div>
      </div>
    </AppCard>
  );
}

export function BillsEn() {
  const id = 'bills-en';
  return (
    <Shell
      id={id}
      rumiAt={5}
      scenes={[
        <Forgot />,
        <LateDays />,
        <BigCount kicker="Late fee" to={75} at={[0.5, 1.6]} under="for money you already had 🤦" underAt={2.2} />,
        <BigCount kicker="Four times a year" from={75} to={300} at={[0.6, 2.2]} under="for nothing" underAt={2.6} bg={dark} tone="#FF6B4A" />,
        <Truth a="The money was there." b="The reminder wasn’t." />,
        <RumiEnters voice={`voice/${id}/6.mp3`} text={['I never', 'forget!']} />,
        <Suggested />,
        <Push title="The day before" sub="with the usual amount" head="Rumi reminder" text="Already paid Rent? Usually $1,450. Tap to log it." />,
        <Quiet />,
        <End id={id} tagline="Never miss a bill." />,
      ]}
    />
  );
}
export const billsEnFrames = timeline('bills-en', 5).frames;

/* ---------- "January broke" (january-en) ---------- */

const DECEMBER = [
  { icon: '🎁', name: 'Gifts', amount: 640 },
  { icon: '🍝', name: 'Dinner out', amount: 210 },
  { icon: '✈️', name: 'Flights', amount: 780 },
  { icon: '🎄', name: 'Decorations', amount: 120 },
  { icon: '🧶', name: 'Ugly sweater party', amount: 350 },
];

function Holidays() {
  const a = usePop(0.1, 9);
  const b = usePop(1.6, 12);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 220, transform: `scale(${0.6 + a * 0.4})` }}>🎄</div>
      <div style={{ ...big, fontSize: 130, color: brand.ink, marginTop: 20 }}>December</div>
      <div style={{ ...big, fontSize: 80, color: brand.coral, marginTop: 20, opacity: b }}>It’s the holidays! 🎉</div>
    </AbsoluteFill>
  );
}

/** December's spends piling onto the card, one per sentence of the line. */
function DecemberPile() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const at = voiceOf('january-en').dripAt;
  const shown = at.filter((x) => t >= x).length;
  const total = DECEMBER.slice(0, shown).reduce((s, x) => s + x.amount, 0);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ ...body, fontSize: 48, color: brand.petrol700, marginTop: 150, letterSpacing: 3, textTransform: 'uppercase' }}>💳 On the card</div>
      <div style={{ ...big, fontSize: 170, color: brand.coral, fontVariantNumeric: 'tabular-nums' }}>{usd(total)}</div>
      <div style={{ position: 'absolute', top: 560, left: 80, right: 80 }}>
        {DECEMBER.slice(0, shown).map((s, i) => {
          const enter = spring({ frame: f(t - at[i]), fps, config: { damping: 13 }, durationInFrames: 14 });
          return (
            <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 26, height: 160, marginBottom: 26, padding: '0 40px', opacity: Math.min(1, enter * 1.5), transform: `translateX(${(1 - enter) * 300}px)` }}>
              <div style={{ fontSize: 80 }}>{s.icon}</div>
              <div style={{ flex: 1, ...body, fontSize: 52, color: brand.ink }}>{s.name}</div>
              <div style={{ ...big, fontSize: 60, color: brand.coral }}>-{usd(s.amount)}</div>
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

function LimitBar({ name, spent, limit, delay }: { name: string; spent: number; limit: number; delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - f(delay), fps, config: { damping: 16 }, durationInFrames: 20 });
  const pct = spent / limit;
  const color = pct >= 0.8 ? brand.coral : pct >= 0.6 ? brand.gold : GREEN;
  return (
    <div style={{ marginTop: 34, opacity: Math.min(1, p * 1.5) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ ...body, fontSize: 46, color: brand.ink }}>{name}</div>
        <div style={{ fontFamily: fonts.body, fontSize: 36, color: '#5B6B73' }}>Limit {usd(limit)} a month</div>
      </div>
      <div style={{ height: 34, borderRadius: 17, background: '#EFE7DF', marginTop: 14, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100 * p}%`, height: '100%', borderRadius: 17, background: color }} />
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: 34, color, marginTop: 8 }}>
        {usd(spent)} used · {usd(limit - spent)} left
      </div>
    </div>
  );
}

function Limits() {
  return (
    <AppCard title="Limits" sub="for every category">
      <div style={{ ...card, padding: '30px 46px 44px' }}>
        <LimitBar name="🎁 Gifts" spent={340} limit={400} delay={0.6} />
        <LimitBar name="🍝 Going out" spent={110} limit={250} delay={0.9} />
        <LimitBar name="✈️ Travel" spent={380} limit={600} delay={1.2} />
      </div>
    </AppCard>
  );
}

export function JanuaryEn() {
  const id = 'january-en';
  return (
    <Shell
      id={id}
      rumiAt={4}
      scenes={[
        <Holidays />,
        <DecemberPile />,
        <BigCount kicker="January 3 · card bill" to={2100} at={[1.2, 2.8]} under="Happy new year 😵" underAt={3} bg={dark} tone="#FF6B4A" />,
        <Truth a="The holidays aren’t the problem." b="Spending with no limit is." />,
        <RumiEnters voice={`voice/${id}/5.mp3`} text={['Let’s', 'plan it!']} />,
        <Limits />,
        <Chat
          q="How are my limits?"
          a={
            <>
              No limit exceeded, but <b>Gifts</b> is going fast: <b style={{ color: brand.coral }}>85% used</b> with 40% of the month gone.
            </>
          }
        />,
        <End id={id} tagline="Enjoy December. Start January calm." />,
      ]}
    />
  );
}
export const januaryEnFrames = timeline('january-en', 4).frames;

/* ---------- "Saving for something?" (goal-en) ---------- */

function TripDream() {
  const a = usePop(0.1, 9);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 240, transform: `scale(${0.6 + a * 0.4})` }}>🏝️</div>
      <div style={{ ...big, fontSize: 110, color: brand.ink, marginTop: 20, lineHeight: 1.1 }}>Saving for a trip</div>
      <div style={{ ...big, fontSize: 80, color: brand.petrol700, marginTop: 20 }}>for a whole year…</div>
    </AbsoluteFill>
  );
}

/** Twelve months of saving on and off; the three phrases of the line light up their kind of month. */
function OnAndOff() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const at = voiceOf('goal-en').dripAt;
  // Deposits by month (negative = taken back); total $340.
  const months = [100, 0, 60, -80, 100, 0, 0, 40, -60, 100, 80, 0];
  const kinds = (m: number) => (m > 0 ? 0 : m === 0 ? 1 : 2);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ ...body, fontSize: 48, color: brand.petrol700, marginTop: 200, letterSpacing: 3, textTransform: 'uppercase' }}>Every month</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 700, marginTop: 40 }}>
        {months.map((m, i) => {
          const on = t >= (at[kinds(m)] ?? 0);
          const p = spring({ frame: frame - f(0.2 + i * 0.12), fps, config: { damping: 14 }, durationInFrames: 12 });
          const h = Math.abs(m) * 2.6 * p;
          return (
            <div key={i} style={{ width: 62, height: 600, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ height: 260, display: 'flex', alignItems: 'flex-end' }}>
                {m > 0 ? <div style={{ width: 54, height: h, borderRadius: 14, background: on ? GREEN : '#CFE5D8' }} /> : null}
              </div>
              <div style={{ width: 62, height: 6, background: m === 0 && on ? brand.coral : '#D9CFC6', borderRadius: 3 }} />
              <div style={{ height: 260 }}>{m < 0 ? <div style={{ width: 54, height: h, borderRadius: 14, background: on ? brand.coral : '#F3C9B8' }} /> : null}</div>
              <div style={{ ...body, fontSize: 26, color: '#7A868C' }}>{'JFMAMJJASOND'[i]}</div>
            </div>
          );
        })}
      </div>
      <div style={{ ...big, fontSize: 60, color: brand.ink, marginTop: 20 }}>
        <span style={{ color: GREEN }}>+$100</span> · <span style={{ color: brand.coral }}>$0</span> · <span style={{ color: brand.coral }}>−$80</span>
      </div>
    </AbsoluteFill>
  );
}

function YearLater() {
  const frame = useCurrentFrame();
  const n = interpolate(frame, [f(1.2), f(2.4)], [0, 340], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const b = usePop(3, 12);
  const pct = (n / 2000) * 100;
  return (
    <AbsoluteFill style={{ background: dark, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 90px' }}>
      <div style={{ ...body, fontSize: 56, color: brand.gold, letterSpacing: 3, textTransform: 'uppercase' }}>A year later</div>
      <div style={{ ...big, fontSize: 220, color: '#FF6B4A', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>{usd(n)}</div>
      <div style={{ width: 860, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.15)', marginTop: 20, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#FF6B4A' }} />
      </div>
      <div style={{ ...big, fontSize: 76, color: brand.cream, marginTop: 34, opacity: b }}>The trip costs $2,000 🏝️</div>
    </AbsoluteFill>
  );
}

/** The app's new-goal form (goals.name / target / when). */
function GoalForm() {
  const fields = [
    { label: 'What are you saving for?', value: '🏝️ Trip', at: 0.4 },
    { label: 'How much do you need?', value: '$2,000', at: 1.1 },
    { label: 'By when?', value: 'In 10 months', at: 1.8 },
  ];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AppCard title="+ Goal" sub="what, how much, by when" delay={0.1}>
      <div style={{ ...card, padding: '20px 46px 40px' }}>
        {fields.map((x) => {
          const p = spring({ frame: frame - f(x.at), fps, config: { damping: 14 }, durationInFrames: 14 });
          return (
            <div key={x.label} style={{ marginTop: 30, opacity: Math.min(1, p * 1.5) }}>
              <div style={{ fontFamily: fonts.body, fontSize: 36, color: '#5B6B73' }}>{x.label}</div>
              <div style={{ ...big, fontSize: 64, color: brand.ink, marginTop: 6, borderBottom: `4px solid ${brand.coral}`, paddingBottom: 10 }}>{x.value}</div>
            </div>
          );
        })}
      </div>
    </AppCard>
  );
}

/** The goal card: saved of target and the monthly amount (goals.saved / goals.monthly). */
function GoalCard({ saved, done = false }: { saved: [number, number]; done?: boolean }) {
  const frame = useCurrentFrame();
  const n = interpolate(frame, [f(0.6), f(2.2)], saved, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pct = Math.min(100, (n / 2000) * 100);
  const party = usePop(2.2, 10);
  return (
    <AppCard title={done ? 'Made it!' : 'Your plan'} sub={done ? 'goal reached' : 'how much each month'} delay={0.1}>
      <div style={{ ...card, padding: '40px 46px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ ...big, fontSize: 60, color: brand.ink }}>🏝️ Trip</div>
          <div style={{ ...body, fontSize: 40, color: brand.petrol700 }}>{Math.round(pct)}%</div>
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: 42, color: brand.ink, marginTop: 10 }}>
          {usd(n)} of $2,000
        </div>
        <div style={{ height: 40, borderRadius: 20, background: '#EFE7DF', marginTop: 20, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 20, background: GREEN }} />
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: 42, color: done ? GREEN : brand.ink, marginTop: 26, lineHeight: 1.35, opacity: done ? party : 1 }}>
          {done ? <b>Goal reached! 🎉</b> : <>Put in <b style={{ color: GREEN }}>$166 a month</b> to get there by <b>September 2027</b>.</>}
        </div>
      </div>
    </AppCard>
  );
}

export function GoalEn() {
  const id = 'goal-en';
  return (
    <Shell
      id={id}
      rumiAt={4}
      scenes={[
        <TripDream />,
        <OnAndOff />,
        <YearLater />,
        <Truth a="It’s not that you can’t save." b="You just don’t have a plan." />,
        <RumiEnters voice={`voice/${id}/5.mp3`} text={['Let’s make', 'a plan!']} />,
        <GoalForm />,
        <GoalCard saved={[340, 340]} />,
        <GoalCard saved={[340, 2000]} done />,
        <End id={id} tagline="Save for what you want." />,
      ]}
    />
  );
}
export const goalEnFrames = timeline('goal-en', 4).frames;

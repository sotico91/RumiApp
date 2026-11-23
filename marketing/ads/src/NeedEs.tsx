import { AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { brand, fonts } from './brand';
import { AppCard, big, BigCount, body, card, Chat, cop, End, f, GREEN, LimitBar, Push, Shell, timeline, Truth, voiceOf } from './NeedEn';
import { cream, dark, RumiEnters, usePop } from './PlataVideo';

// Spanish need reels: the English episodes of NeedEn.tsx (card, bills, January, goal) retold in
// pesos for Colombia, on the same shared pieces. Scene i plays line i of src/need-es-lines.ts
// (public/voice/<id>/<i+1>.mp3). Rumi's cards copy the app's Spanish text (translations.ts).

/* ---------- "La tarjeta que no baja" (tarjeta-es) ---------- */

function NuncaBaja() {
  const a = usePop(0.1, 12);
  const b = usePop(2.4, 12);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 80px' }}>
      <div style={{ fontSize: 220, transform: `scale(${0.6 + a * 0.4})` }}>💳</div>
      <div style={{ ...big, fontSize: 104, color: brand.ink, marginTop: 20, lineHeight: 1.1 }}>La pagas cada mes…</div>
      <div style={{ ...big, fontSize: 104, color: brand.coral, marginTop: 30, opacity: b, lineHeight: 1.1 }}>¿y por qué no baja? 🤔</div>
    </AbsoluteFill>
  );
}

/** The statement: balance, minimum payment, interest. */
function Extracto() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rows = [
    { at: 0.3, label: 'Debes', value: '$3.200.000', color: brand.ink },
    { at: 3.4, label: 'Pagas (mínimo)', value: '-$120.000', color: GREEN },
    { at: 5.9, label: 'Intereses', value: '+$60.800', color: brand.coral },
  ];
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ ...big, fontSize: 96, color: brand.ink, marginTop: 200 }}>💳 Extracto</div>
      <div style={{ ...card, width: 920, marginTop: 70, padding: '20px 46px' }}>
        {rows.map((r, i) => {
          const p = spring({ frame: frame - f(r.at), fps, config: { damping: 14 }, durationInFrames: 14 });
          return (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '34px 0', borderBottom: i < rows.length - 1 ? '2px solid #EEE6DE' : 'none', opacity: p, transform: `translateX(${(1 - p) * 60}px)` }}>
              <div style={{ ...body, fontSize: 50, color: brand.petrol700 }}>{r.label}</div>
              <div style={{ ...big, fontSize: 66, color: r.color, fontVariantNumeric: 'tabular-nums' }}>{r.value}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** Six months of minimum payments: the balance bars barely shrink. Balance B(1,019) − 120.000. */
function Meses() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const balances = [3200000, 3140800, 3080475, 3019004, 2956365, 2892536, 2827494];
  const paid = usePop(5.2, 12);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ ...body, fontSize: 52, color: brand.petrol700, marginTop: 170, letterSpacing: 3, textTransform: 'uppercase' }}>Mes tras mes</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 26, height: 760, marginTop: 50 }}>
        {balances.map((b, i) => {
          const p = spring({ frame: frame - f(0.3 + i * 0.45), fps, config: { damping: 14 }, durationInFrames: 14 });
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: p }}>
              <div style={{ ...big, fontSize: 34, color: brand.ink, marginBottom: 10 }}>{(b / 1e6).toFixed(2).replace('.', ',')} M</div>
              <div style={{ width: 104, height: (b / 3200000) * 620 * p, borderRadius: 22, background: i === balances.length - 1 ? brand.coral : '#F3C9B8' }} />
              <div style={{ ...body, fontSize: 32, color: brand.petrol700, marginTop: 12 }}>{i === 0 ? 'Hoy' : `Mes ${i}`}</div>
            </div>
          );
        })}
      </div>
      <div style={{ ...big, fontSize: 62, color: brand.ink, marginTop: 50, opacity: paid, textAlign: 'center', lineHeight: 1.25 }}>
        Pagaste <span style={{ color: GREEN }}>$720.000</span>
        <br />y debes <span style={{ color: brand.coral }}>$2.827.494</span>
      </div>
    </AbsoluteFill>
  );
}

function Anios() {
  const a = usePop(0.2, 10);
  const b = usePop(3, 12);
  return (
    <AbsoluteFill style={{ background: dark, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 70px' }}>
      <div style={{ ...body, fontSize: 56, color: brand.gold, letterSpacing: 3, textTransform: 'uppercase' }}>Pagando el mínimo</div>
      <div style={{ ...big, fontSize: 190, color: '#FF6B4A', transform: `scale(${0.7 + a * 0.3})`, lineHeight: 1.1 }}>3+ años</div>
      <div style={{ ...big, fontSize: 80, color: brand.cream, marginTop: 30, opacity: b }}>~$1.300.000 en intereses 😩</div>
    </AbsoluteFill>
  );
}

const planCard = { ...card, padding: '44px 50px' } as const;

/** The app's debt plan, free part (debtPlan.title / debtPlan.baseline). */
function SalesEn() {
  return (
    <AppCard title="Mira" sub="tu salida">
      <div style={planCard}>
        <div style={{ ...big, fontSize: 56, color: brand.ink }}>Plan para salir de deudas</div>
        <div style={{ fontFamily: fonts.body, fontSize: 46, color: brand.ink, marginTop: 26, lineHeight: 1.35 }}>
          Pagando solo las cuotas, sales de deudas en <b>febrero de 2030</b>.
        </div>
      </div>
    </AppCard>
  );
}

/** The debt plan with an extra payment (debtPlan.extraLabel / planSooner / interestSaved). Pro. */
function Abono() {
  const p = usePop(1.8, 14);
  return (
    <AppCard title="Sal antes" sub="14 meses antes">
      <div style={planCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ ...body, fontSize: 42, color: brand.petrol700 }}>Si abonas de más cada mes</div>
          <div style={{ ...body, fontSize: 30, color: '#FFFFFF', background: brand.petrol700, borderRadius: 999, padding: '8px 22px' }}>Rumi Pro</div>
        </div>
        <div style={{ ...big, fontSize: 90, color: brand.coral, marginTop: 14 }}>+$50.000</div>
        <div style={{ fontFamily: fonts.body, fontSize: 46, color: brand.ink, marginTop: 20, lineHeight: 1.35, opacity: p }}>
          Sales de deudas en <b>diciembre de 2028</b>, <b style={{ color: GREEN }}>14 meses antes</b>.
          <br />
          Te ahorras <b style={{ color: GREEN }}>$507.000</b> en intereses.
        </div>
      </div>
    </AppCard>
  );
}

export function TarjetaEs() {
  const id = 'tarjeta-es';
  return (
    <Shell
      id={id}
      rumiAt={5}
      scenes={[
        <NuncaBaja />,
        <Extracto />,
        <Meses />,
        <Anios />,
        <Truth a="No es que no pagues." b="Es que no ves la salida." />,
        <RumiEnters voice={`voice/${id}/6.mp3`} text={['¡Yo te muestro', 'la salida!']} />,
        <SalesEn />,
        <Abono />,
        <Push title="Nunca tarde" sub="te aviso el día antes" head="Pago por vencer" text="Mañana vence el pago de Tarjeta Visa: $170.000. Toca para registrarlo." />,
        <End id={id} tagline="Mira tu salida de las deudas." />,
      ]}
    />
  );
}
export const tarjetaEsFrames = timeline('tarjeta-es', 5).frames;

/* ---------- "¿Se te volvió a pasar un recibo?" (recibo-es) ---------- */

function SePaso() {
  const a = usePop(0.1, 9);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 60px' }}>
      <div style={{ fontSize: 240, transform: `scale(${0.6 + a * 0.4}) rotate(${(1 - a) * -20}deg)` }}>😬</div>
      <div style={{ ...big, fontSize: 112, color: brand.ink, marginTop: 20, lineHeight: 1.1 }}>¿Se te volvió a pasar</div>
      <div style={{ ...big, fontSize: 112, color: brand.coral, lineHeight: 1.1 }}>un recibo?</div>
    </AbsoluteFill>
  );
}

/** The electricity bill due on the 15th, paid on the 20th: the late days light up. */
function DiasTarde() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ ...big, fontSize: 96, color: brand.ink, marginTop: 220 }}>💡 Recibo de la luz</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 250px)', gap: 30, marginTop: 70 }}>
        {[15, 16, 17, 18, 19, 20].map((d, i) => {
          const p = spring({ frame: frame - f(0.2 + i * 0.28), fps, config: { damping: 13 }, durationInFrames: 14 });
          const due = d === 15;
          const paid = d === 20;
          return (
            <div key={d} style={{ ...card, height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: p, transform: `scale(${0.8 + p * 0.2})`, background: paid ? brand.coral : due ? '#FFFFFF' : '#FBE3D9' }}>
              <div style={{ ...big, fontSize: 96, color: paid ? '#FFFFFF' : brand.ink }}>{d}</div>
              <div style={{ ...body, fontSize: 34, color: paid ? '#FFFFFF' : due ? brand.petrol700 : brand.coral }}>{due ? 'Vence' : paid ? 'Pagado 😅' : 'Tarde'}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** The app's suggested reminders (reminder.suggestTitle / suggestHint / suggestMeta / suggestAdd). */
function Sugeridos() {
  const rows = [
    { name: 'Arriendo', day: 1, amount: '$1.450.000' },
    { name: 'Luz', day: 15, amount: '$98.000' },
    { name: 'Internet', day: 20, amount: '$89.000' },
  ];
  return (
    <AppCard title="Recordatorios" sub="sugeridos para ti">
      <div style={{ ...card, padding: '40px 46px' }}>
        <div style={{ ...big, fontSize: 54, color: brand.ink }}>Te sugerimos</div>
        <div style={{ fontFamily: fonts.body, fontSize: 36, color: '#5B6B73', marginTop: 12, lineHeight: 1.35 }}>
          Los pagas cada mes y aún no tienen recordatorio. Te avisamos el día antes, a las 9:00.
        </div>
        {rows.map((r) => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, borderTop: '2px solid #EEE6DE', marginTop: 26, paddingTop: 26 }}>
            <div>
              <div style={{ ...body, fontSize: 44, color: brand.ink }}>{r.name}</div>
              <div style={{ fontFamily: fonts.body, fontSize: 32, color: '#5B6B73' }}>
                Sueles pagarlo el día {r.day} · {r.amount}
              </div>
            </div>
            <div style={{ ...body, fontSize: 32, color: '#FFFFFF', background: brand.coral, borderRadius: 999, padding: '14px 24px', whiteSpace: 'nowrap' }}>Recordármelo</div>
          </div>
        ))}
      </div>
    </AppCard>
  );
}

/** Already logged: the reminder is skipped (reminder.body: "Si ya lo registraste, Rumi no te lo recuerda"). */
function Callado() {
  const p = usePop(1.2, 12);
  return (
    <AppCard title="¿Ya pagaste?" sub="entonces no te aviso">
      <div style={{ ...card, padding: '40px 46px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <div style={{ fontSize: 70 }}>💡</div>
          <div style={{ flex: 1 }}>
            <div style={{ ...body, fontSize: 46, color: brand.ink }}>Luz · $98.000</div>
            <div style={{ fontFamily: fonts.body, fontSize: 36, color: GREEN }}>Registrado el 13 de nov.</div>
          </div>
          <div style={{ fontSize: 70, color: GREEN }}>✓</div>
        </div>
        <div style={{ ...body, fontSize: 40, color: brand.petrol700, marginTop: 34, opacity: p }}>🔕 Este mes no hay recordatorio</div>
      </div>
    </AppCard>
  );
}

export function ReciboEs() {
  const id = 'recibo-es';
  return (
    <Shell
      id={id}
      rumiAt={5}
      scenes={[
        <SePaso />,
        <DiasTarde />,
        <BigCount kicker="Mora y reconexión" to={80000} at={[0.5, 1.8]} under="por plata que sí tenías 🤦" underAt={3} />,
        <BigCount kicker="Cuatro veces al año" from={80000} to={320000} at={[0.6, 2.4]} under="por nada" underAt={3} bg={dark} tone="#FF6B4A" />,
        <Truth a="La plata estaba." b="El recordatorio no." />,
        <RumiEnters voice={`voice/${id}/6.mp3`} text={['¡Yo no', 'me olvido!']} />,
        <Sugeridos />,
        <Push title="El día antes" sub="con lo que sueles pagar" head="Recordatorio Rumi" text="¿Ya pagaste Luz? Suele ser $98.000. Toca para registrarlo." />,
        <Callado />,
        <End id={id} tagline="Que no se te pase ningún recibo." />,
      ]}
    />
  );
}
export const reciboEsFrames = timeline('recibo-es', 5).frames;

/* ---------- "Enero sin plata" (enero-es) ---------- */

const DICIEMBRE = [
  { icon: '🎁', name: 'Regalos', amount: 650000 },
  { icon: '🙏', name: 'Novenas', amount: 280000 },
  { icon: '🚌', name: 'Pasajes', amount: 900000 },
  { icon: '👗', name: 'Pinta de fin de año', amount: 320000 },
  { icon: '🤫', name: 'Amigo secreto', amount: 150000 },
];

function Temporada() {
  const a = usePop(0.1, 9);
  const b = usePop(4.6, 12);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 220, transform: `scale(${0.6 + a * 0.4})` }}>🎄</div>
      <div style={{ ...big, fontSize: 130, color: brand.ink, marginTop: 20 }}>Diciembre</div>
      <div style={{ ...big, fontSize: 80, color: brand.coral, marginTop: 20, opacity: b }}>¡Es temporada! 🎉</div>
    </AbsoluteFill>
  );
}

/** December's spends piling onto the card, one per sentence of the line. */
function PilaDiciembre() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const at = voiceOf('enero-es').dripAt;
  const shown = at.filter((x) => t >= x).length;
  const total = DICIEMBRE.slice(0, shown).reduce((s, x) => s + x.amount, 0);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ ...body, fontSize: 48, color: brand.petrol700, marginTop: 150, letterSpacing: 3, textTransform: 'uppercase' }}>💳 A la tarjeta</div>
      <div style={{ ...big, fontSize: 150, color: brand.coral, fontVariantNumeric: 'tabular-nums' }}>{cop(total)}</div>
      <div style={{ position: 'absolute', top: 560, left: 70, right: 70 }}>
        {DICIEMBRE.slice(0, shown).map((s, i) => {
          const enter = spring({ frame: f(t - at[i]), fps, config: { damping: 13 }, durationInFrames: 14 });
          return (
            <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 24, height: 160, marginBottom: 26, padding: '0 36px', opacity: Math.min(1, enter * 1.5), transform: `translateX(${(1 - enter) * 300}px)` }}>
              <div style={{ fontSize: 76 }}>{s.icon}</div>
              <div style={{ flex: 1, ...body, fontSize: 48, color: brand.ink }}>{s.name}</div>
              <div style={{ ...big, fontSize: 54, color: brand.coral }}>-{cop(s.amount)}</div>
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

function Topes() {
  return (
    <AppCard title="Topes" sub="para cada categoría">
      <div style={{ ...card, padding: '30px 46px 44px' }}>
        <LimitBar name="🎁 Regalos" spent={340000} limit={400000} delay={0.6} />
        <LimitBar name="🍻 Salidas" spent={110000} limit={250000} delay={0.9} />
        <LimitBar name="🚌 Viajes" spent={380000} limit={600000} delay={1.2} />
      </div>
    </AppCard>
  );
}

export function EneroEs() {
  const id = 'enero-es';
  return (
    <Shell
      id={id}
      rumiAt={4}
      scenes={[
        <Temporada />,
        <PilaDiciembre />,
        <BigCount kicker="Enero · extracto" to={2300000} at={[1.6, 3.4]} under="Feliz año nuevo 😵" underAt={3.6} bg={dark} tone="#FF6B4A" />,
        <Truth a="Diciembre no es el problema." b="Gastar sin tope, sí." />,
        <RumiEnters voice={`voice/${id}/5.mp3`} text={['¡Hagamos', 'un plan!']} />,
        <Topes />,
        <Chat
          q="¿Cómo voy con mis topes?"
          a={
            <>
              Ningún tope superado, pero <b>Regalos</b> va rápido: <b style={{ color: brand.coral }}>85% usado</b> con el 40% del mes.
            </>
          }
        />,
        <End id={id} tagline="Disfruta diciembre. Empieza enero tranquilo." />,
      ]}
    />
  );
}
export const eneroEsFrames = timeline('enero-es', 4).frames;

/* ---------- "¿Ahorrando para algo?" (meta-es) ---------- */

function Viaje() {
  const a = usePop(0.1, 9);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 60px' }}>
      <div style={{ fontSize: 240, transform: `scale(${0.6 + a * 0.4})` }}>🏝️</div>
      <div style={{ ...big, fontSize: 104, color: brand.ink, marginTop: 20, lineHeight: 1.1 }}>Ahorrando para un viaje</div>
      <div style={{ ...big, fontSize: 80, color: brand.petrol700, marginTop: 20 }}>un año entero…</div>
    </AbsoluteFill>
  );
}

/** Twelve months of saving on and off; the three phrases of the line light up their kind of month. */
function UnosMeses() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const at = voiceOf('meta-es').dripAt;
  // Deposits by month in thousands (negative = taken back); total $340.000.
  const months = [100, 0, 60, -80, 100, 0, 0, 40, -60, 100, 80, 0];
  const kinds = (m: number) => (m > 0 ? 0 : m === 0 ? 1 : 2);
  return (
    <AbsoluteFill style={{ background: cream, alignItems: 'center' }}>
      <div style={{ ...body, fontSize: 48, color: brand.petrol700, marginTop: 200, letterSpacing: 3, textTransform: 'uppercase' }}>Cada mes</div>
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
              <div style={{ ...body, fontSize: 26, color: '#7A868C' }}>{'EFMAMJJASOND'[i]}</div>
            </div>
          );
        })}
      </div>
      <div style={{ ...big, fontSize: 56, color: brand.ink, marginTop: 20 }}>
        <span style={{ color: GREEN }}>+$100.000</span> · <span style={{ color: brand.coral }}>$0</span> · <span style={{ color: brand.coral }}>−$80.000</span>
      </div>
    </AbsoluteFill>
  );
}

function UnAnio() {
  const frame = useCurrentFrame();
  const n = interpolate(frame, [f(1.4), f(2.8)], [0, 340000], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const b = usePop(3.6, 12);
  const pct = (n / 2000000) * 100;
  return (
    <AbsoluteFill style={{ background: dark, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 80px' }}>
      <div style={{ ...body, fontSize: 56, color: brand.gold, letterSpacing: 3, textTransform: 'uppercase' }}>Un año después</div>
      <div style={{ ...big, fontSize: 190, color: '#FF6B4A', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>{cop(n)}</div>
      <div style={{ width: 860, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.15)', marginTop: 20, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#FF6B4A' }} />
      </div>
      <div style={{ ...big, fontSize: 72, color: brand.cream, marginTop: 34, opacity: b }}>El viaje cuesta $2.000.000 🏝️</div>
    </AbsoluteFill>
  );
}

/** The app's new-goal form (goals.add / name / target / when). */
function NuevaMeta() {
  const fields = [
    { label: '¿Para qué ahorras?', value: '🏝️ Viaje', at: 0.4 },
    { label: '¿Cuánto necesitas?', value: '$2.000.000', at: 1.2 },
    { label: '¿Para cuándo?', value: 'En 10 meses', at: 2.2 },
  ];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AppCard title="+ Meta" sub="para qué, cuánto, para cuándo" delay={0.1}>
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

/** The goal card: saved of target and the monthly amount (goals.saved / goals.monthly / goals.done). */
function TarjetaMeta({ saved, done = false }: { saved: [number, number]; done?: boolean }) {
  const frame = useCurrentFrame();
  const n = interpolate(frame, [f(0.6), f(2.2)], saved, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pct = Math.min(100, (n / 2000000) * 100);
  const party = usePop(2.2, 10);
  return (
    <AppCard title={done ? '¡Llegaste!' : 'Tu plan'} sub={done ? 'meta cumplida' : 'cuánto apartar al mes'} delay={0.1}>
      <div style={{ ...card, padding: '40px 46px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ ...big, fontSize: 60, color: brand.ink }}>🏝️ Viaje</div>
          <div style={{ ...body, fontSize: 40, color: brand.petrol700 }}>{Math.round(pct)}%</div>
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: 42, color: brand.ink, marginTop: 10 }}>{cop(n)} de $2.000.000</div>
        <div style={{ height: 40, borderRadius: 20, background: '#EFE7DF', marginTop: 20, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 20, background: GREEN }} />
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: 42, color: done ? GREEN : brand.ink, marginTop: 26, lineHeight: 1.35, opacity: done ? party : 1 }}>
          {done ? (
            <b>¡Meta cumplida! 🎉</b>
          ) : (
            <>
              Aparta <b style={{ color: GREEN }}>$166.000 al mes</b> para llegar en <b>septiembre de 2027</b>.
            </>
          )}
        </div>
      </div>
    </AppCard>
  );
}

export function MetaEs() {
  const id = 'meta-es';
  return (
    <Shell
      id={id}
      rumiAt={4}
      scenes={[
        <Viaje />,
        <UnosMeses />,
        <UnAnio />,
        <Truth a="No es que no puedas ahorrar." b="Es que no tienes un plan." />,
        <RumiEnters voice={`voice/${id}/5.mp3`} text={['¡Hagamos', 'un plan!']} />,
        <NuevaMeta />,
        <TarjetaMeta saved={[340000, 340000]} />,
        <TarjetaMeta saved={[340000, 2000000]} done />,
        <End id={id} tagline="Ahorra para lo que quieres." />,
      ]}
    />
  );
}
export const metaEsFrames = timeline('meta-es', 4).frames;

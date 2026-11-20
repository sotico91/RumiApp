import { AbsoluteFill, Audio, Freeze, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { brand, fonts, FPS } from './brand';
import { tutorialChapters, tutorialEnd } from './tutorial';
import clipsJson from './tutorial-clips.json';
import { type Clip, type StepSpan, tutorialTimeline, VOICE_LEAD, type Voice } from './tutorial-timeline';
import voiceJson from './tutorial-voice.json';

// One chapter of the tutorial as a vertical Short (1080x1920), with its own hook and end card.
const clips = clipsJson as Record<string, Clip>;
const voice = voiceJson as Voice;
const HOOK_SECONDS = 2.6;

/** Hook shown before the phone, per chapter id. */
export const shortHooks: Record<string, string> = {
  cuentas: 'Pon tus cuentas en Rumi',
  conceptos: 'Tus conceptos de gasto y tus topes',
  gasto: 'Cómo registrar un gasto',
  ingreso: 'Cómo registrar un ingreso',
  mover: 'Cómo mover plata entre cuentas',
  deudas: 'Dónde van tus deudas y cómo pagarlas',
};

const timelineOf = (id: string) =>
  tutorialTimeline(
    tutorialChapters.filter((c) => c.id === id),
    clips,
    voice,
    tutorialEnd.say,
    HOOK_SECONDS,
  );
export const shortFrames = (id: string) => Math.round(timelineOf(id).total * FPS);

const f = (s: number) => Math.round(s * FPS);
const SCREEN_H = 1220;
const SCREEN_W = Math.round((SCREEN_H * 1206) / 2622);
const BEZEL = 16;

function Footage({ s }: { s: StepSpan }) {
  if (!s.clip) return null;
  const src = staticFile(s.clip.file);
  const style = { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', objectFit: 'cover' as const };
  const still = (
    <Freeze frame={f(s.clip.to) - 1}>
      <OffthreadVideo src={src} muted style={style} />
    </Freeze>
  );
  if (s.hold) return still;
  const play = f(s.footage);
  return (
    <>
      <Sequence durationInFrames={play}>
        <OffthreadVideo src={src} muted startFrom={f(s.clip.from)} playbackRate={s.rate} style={style} />
      </Sequence>
      <Sequence from={play}>{still}</Sequence>
    </>
  );
}

function Step({ s, title }: { s: StepSpan; title: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 12 });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(170deg, ${brand.petrol700}, ${brand.petrol900})`, alignItems: 'center' }}>
      <div style={{ marginTop: 110, width: 940, textAlign: 'center', height: 300, opacity: pop }}>
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 34, color: brand.gold, letterSpacing: 2, textTransform: 'uppercase' }}>{title}</div>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 70, lineHeight: 1.08, color: brand.cream, marginTop: 14, textWrap: 'balance' }}>
          {s.text}
        </div>
      </div>
      <div style={{ width: SCREEN_W + BEZEL * 2, height: SCREEN_H + BEZEL * 2, borderRadius: 84, background: '#05121A', padding: BEZEL, boxShadow: '0 40px 80px rgba(0,0,0,0.4)' }}>
        <div style={{ width: SCREEN_W, height: SCREEN_H, borderRadius: 68, overflow: 'hidden', position: 'relative', background: brand.cream }}>
          <Footage s={s} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 16 });
  return (
    <AbsoluteFill
      style={{ background: `linear-gradient(170deg, ${brand.petrol700}, ${brand.petrol900})`, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 80 }}>
      <div style={{ opacity: pop, transform: `scale(${0.94 + pop * 0.06})`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>{children}</div>
    </AbsoluteFill>
  );
}

export function TutorialShort({ id }: { id: string }) {
  const t = timelineOf(id);
  const chapter = tutorialChapters.find((c) => c.id === id)!;
  const frame = useCurrentFrame();
  const total = f(t.total);
  const music = interpolate(frame, [0, f(1), total - f(2), total], [0, 0.08, 0.08, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: brand.petrol900 }}>
      <Audio src={staticFile('music/happy-times.mp3')} volume={music} loop />
      <Sequence durationInFrames={f(t.chapters[0].start)}>
        <Card>
          <Img src={staticFile('icon.png')} style={{ width: 200, height: 200, borderRadius: 48 }} />
          <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 40, color: brand.gold, marginTop: 50, letterSpacing: 2, textTransform: 'uppercase' }}>
            Cómo usar Rumi
          </div>
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 104, lineHeight: 1.05, color: brand.cream, marginTop: 16, textWrap: 'balance' }}>
            {shortHooks[id]}
          </div>
        </Card>
      </Sequence>
      {t.steps.map((s) => (
        <Sequence key={s.step} from={f(s.start)} durationInFrames={f(s.start + s.seconds) - f(s.start)}>
          <Step s={s} title={chapter.title} />
          {voice[s.say] ? (
            <Sequence from={f(VOICE_LEAD)}>
              <Audio src={staticFile(voice[s.say].file)} />
            </Sequence>
          ) : null}
        </Sequence>
      ))}
      <Sequence from={f(t.endStart)}>
        <Card>
          <Img src={staticFile('icon.png')} style={{ width: 200, height: 200, borderRadius: 48 }} />
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 140, color: brand.cream, marginTop: 30 }}>{tutorialEnd.title}</div>
          <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 60, color: brand.gold }}>{tutorialEnd.tagline}</div>
          <div style={{ fontFamily: fonts.body, fontSize: 40, color: '#CFE0E3', marginTop: 30, maxWidth: 860 }}>{tutorialEnd.line}</div>
          <div style={{ marginTop: 50, padding: 24, borderRadius: 36, background: '#FFFFFF' }}>
            <Img src={staticFile(tutorialEnd.qr)} style={{ width: 300, height: 300, display: 'block' }} />
          </div>
        </Card>
        {voice[tutorialEnd.say] ? (
          <Sequence from={f(0.4)}>
            <Audio src={staticFile(voice[tutorialEnd.say].file)} />
          </Sequence>
        ) : null}
      </Sequence>
    </AbsoluteFill>
  );
}

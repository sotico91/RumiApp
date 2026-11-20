import {
  AbsoluteFill,
  Audio,
  Freeze,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { brand, fonts, FPS } from './brand';
import { tutorialChapters, tutorialEnd, tutorialIntro } from './tutorial';
import clipsJson from './tutorial-clips.json';
import { type Clip, type StepSpan, tutorialTimeline, VOICE_LEAD, type Voice } from './tutorial-timeline';
import voiceJson from './tutorial-voice.json';

const clips = clipsJson as Record<string, Clip>;
const voice = voiceJson as Voice;
export const tutorial = tutorialTimeline(tutorialChapters, clips, voice, tutorialEnd.say);
export const tutorialFrames = Math.round(tutorial.total * FPS);

const f = (s: number) => Math.round(s * FPS);

// The simulator records 1206x2622 (iPhone 17 Pro); shown 900 px tall.
const SCREEN_H = 900;
const SCREEN_W = Math.round((SCREEN_H * 1206) / 2622);
const BEZEL = 14;

function StepFootage({ s }: { s: StepSpan }) {
  if (!s.clip) return null;
  const src = staticFile(s.clip.file);
  const style = { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', objectFit: 'cover' as const };
  if (s.hold) {
    return (
      <Freeze frame={f(s.clip.to) - 1}>
        <OffthreadVideo src={src} muted style={style} />
      </Freeze>
    );
  }
  const playFrames = f(s.footage);
  return (
    <>
      <Sequence durationInFrames={playFrames}>
        <OffthreadVideo src={src} muted startFrom={f(s.clip.from)} playbackRate={s.rate} style={style} />
      </Sequence>
      <Sequence from={playFrames}>
        <Freeze frame={f(s.clip.to) - 1}>
          <OffthreadVideo src={src} muted style={style} />
        </Freeze>
      </Sequence>
    </>
  );
}

function Phone({ s }: { s: StepSpan }) {
  return (
    <div
      style={{
        width: SCREEN_W + BEZEL * 2,
        height: SCREEN_H + BEZEL * 2,
        borderRadius: 64,
        background: '#05121A',
        padding: BEZEL,
        boxShadow: '0 40px 80px rgba(0,0,0,0.35)',
      }}>
      <div style={{ width: SCREEN_W, height: SCREEN_H, borderRadius: 52, overflow: 'hidden', position: 'relative', background: brand.cream }}>
        <StepFootage s={s} />
      </div>
    </div>
  );
}

function Caption({ s }: { s: StepSpan }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 12 });
  const chapter = tutorial.chapters[s.chapter];
  return (
    <div style={{ opacity: pop, transform: `translateY(${(1 - pop) * 24}px)` }}>
      <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 30, color: brand.coral, letterSpacing: 1, textTransform: 'uppercase' }}>
        {chapter.index + 1}. {chapter.title}
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontWeight: 700,
          fontSize: 78,
          lineHeight: 1.08,
          color: brand.ink,
          marginTop: 18,
          textWrap: 'balance',
        }}>
        {s.text}
      </div>
    </div>
  );
}

function ChapterList({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {tutorial.chapters.map((c) => {
        const on = c.index === current;
        const done = c.index < current;
        return (
          <div
            key={c.index}
            style={{
              fontFamily: fonts.body,
              fontWeight: on ? 700 : 500,
              fontSize: 24,
              padding: '10px 20px',
              borderRadius: 999,
              background: on ? brand.petrol700 : done ? '#E6EFEF' : '#FFFFFF',
              color: on ? brand.cream : done ? brand.petrol500 : '#5B6B73',
              border: on ? 'none' : '2px solid #E3DED6',
            }}>
            {c.index + 1}. {c.title}
          </div>
        );
      })}
    </div>
  );
}

function StepScene({ s }: { s: StepSpan }) {
  return (
    <AbsoluteFill style={{ background: brand.cream, flexDirection: 'row' }}>
      <div
        style={{
          width: 760,
          background: `linear-gradient(160deg, ${brand.petrol700}, ${brand.petrol900})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Phone s={s} />
      </div>
      <div style={{ flex: 1, padding: '90px 90px 70px 90px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Img src={staticFile('icon.png')} style={{ width: 64, height: 64, borderRadius: 16 }} />
          <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 40, color: brand.petrol700 }}>Rumi</div>
          <div style={{ fontFamily: fonts.body, fontSize: 26, color: '#5B6B73', marginLeft: 8 }}>· {tutorialIntro.title}</div>
        </div>
        <Caption s={s} />
        <ChapterList current={s.chapter} />
      </div>
    </AbsoluteFill>
  );
}

function TitleCard({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle?: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 16 });
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${brand.petrol700}, ${brand.petrol900})`,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}>
      <div style={{ opacity: pop, transform: `scale(${0.94 + pop * 0.06})` }}>
        <Img src={staticFile('icon.png')} style={{ width: 150, height: 150, borderRadius: 36 }} />
        {kicker ? (
          <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 36, color: brand.gold, marginTop: 36, letterSpacing: 2, textTransform: 'uppercase' }}>
            {kicker}
          </div>
        ) : null}
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 110, color: brand.cream, marginTop: kicker ? 8 : 36 }}>{title}</div>
        {subtitle ? (
          <div style={{ fontFamily: fonts.body, fontSize: 38, color: '#CFE0E3', marginTop: 16, maxWidth: 1300 }}>{subtitle}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
}

function EndCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 16 });
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${brand.petrol700}, ${brand.petrol900})`,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 120,
      }}>
      <div style={{ opacity: pop }}>
        <Img src={staticFile('icon.png')} style={{ width: 170, height: 170, borderRadius: 40 }} />
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 130, color: brand.cream, marginTop: 24 }}>{tutorialEnd.title}</div>
        <div style={{ fontFamily: fonts.display, fontWeight: 600, fontSize: 56, color: brand.gold }}>{tutorialEnd.tagline}</div>
        <div style={{ fontFamily: fonts.body, fontSize: 34, color: '#CFE0E3', marginTop: 24, maxWidth: 900 }}>{tutorialEnd.line}</div>
      </div>
      <div style={{ opacity: pop, padding: 24, borderRadius: 36, background: '#FFFFFF', textAlign: 'center' }}>
        <Img src={staticFile(tutorialEnd.qr)} style={{ width: 340, height: 340, display: 'block' }} />
        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 28, color: brand.ink, marginTop: 12 }}>Descárgala gratis</div>
      </div>
    </AbsoluteFill>
  );
}

export function Tutorial() {
  const total = tutorialFrames;
  const frame = useCurrentFrame();
  // Music under the voice, fading in and out.
  const musicVolume = interpolate(frame, [0, f(1), total - f(3), total], [0, 0.08, 0.08, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ background: brand.petrol900 }}>
      <Audio src={staticFile('music/happy-times.mp3')} volume={musicVolume} loop />
      <Sequence durationInFrames={f(tutorial.chapters[0].cardStart)}>
        <TitleCard title={tutorialIntro.title} subtitle={tutorialIntro.subtitle} />
      </Sequence>
      {tutorial.chapters.filter((c) => c.start > c.cardStart).map((c) => (
        <Sequence key={`card-${c.index}`} from={f(c.cardStart)} durationInFrames={f(c.start) - f(c.cardStart)}>
          <TitleCard kicker={`Capítulo ${c.index + 1}`} title={c.title} />
          <Audio src={staticFile('sfx/whoosh.mp3')} volume={0.35} />
        </Sequence>
      ))}
      {tutorial.steps.map((s) => {
        const line = voice[s.say];
        return (
          <Sequence key={`${s.chapter}-${s.step}`} from={f(s.start)} durationInFrames={f(s.start + s.seconds) - f(s.start)}>
            <StepScene s={s} />
            {line ? (
              <Sequence from={f(VOICE_LEAD)}>
                <Audio src={staticFile(line.file)} />
              </Sequence>
            ) : null}
          </Sequence>
        );
      })}
      <Sequence from={f(tutorial.endStart)}>
        <EndCard />
        {voice[tutorialEnd.say] ? (
          <Sequence from={f(0.4)}>
            <Audio src={staticFile(voice[tutorialEnd.say].file)} />
          </Sequence>
        ) : null}
      </Sequence>
    </AbsoluteFill>
  );
}

import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { brand, fonts, FPS } from './brand';

// App Store app preview (886×1920, 15–30 s): real simulator footage with a
// caption above. Apple asks for in-app footage only, so no end card or mockups.
export type PreviewScene = {
  /** Clip under public/, recorded by marketing/flows/preview-en/record.sh. */
  src: string;
  /** Seconds into the clip where the scene starts and ends. */
  from: number;
  to: number;
  /** Speed-up for slow stretches (typing). */
  rate?: number;
  caption: string;
};
export type AppPreviewProps = { scenes: PreviewScene[]; music?: string };

export const sceneFrames = (s: PreviewScene) => Math.round(((s.to - s.from) / (s.rate ?? 1)) * FPS);
export const previewFrames = (p: AppPreviewProps) => p.scenes.reduce((sum, s) => sum + sceneFrames(s), 0);

const W = 886;
const H = 1920;
const CAPTION_H = 300;
const VIDEO_H = H - CAPTION_H - 40;
const VIDEO_W = Math.round((VIDEO_H * 1320) / 2868);

function Scene({ scene, fadeIn, fadeOut }: { scene: PreviewScene; fadeIn: boolean; fadeOut: boolean }) {
  const frame = useCurrentFrame();
  const total = sceneFrames(scene);
  // The caption only fades when it changes: cuts inside one caption stay still.
  const fade = Math.min(
    fadeIn ? interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' }) : 1,
    fadeOut ? interpolate(frame, [total - 8, total], [1, 0], { extrapolateLeft: 'clamp' }) : 1
  );
  const rise = fadeIn ? interpolate(frame, [0, 12], [24, 0], { extrapolateRight: 'clamp' }) : 0;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: 0,
          height: CAPTION_H,
          width: W,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 60px',
          opacity: fade,
          transform: `translateY(${rise}px)`,
        }}
      >
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 72, lineHeight: 1.08, color: brand.cream, textAlign: 'center', textWrap: 'balance' }}>
          {scene.caption}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: CAPTION_H,
          left: (W - VIDEO_W) / 2,
          width: VIDEO_W,
          height: VIDEO_H,
          borderRadius: 56,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
        }}
      >
        <OffthreadVideo
          src={staticFile(scene.src)}
          startFrom={Math.round(scene.from * FPS)}
          endAt={Math.round(scene.to * FPS)}
          playbackRate={scene.rate ?? 1}
          muted
          style={{ width: VIDEO_W, height: VIDEO_H, objectFit: 'cover' }}
        />
      </div>
    </AbsoluteFill>
  );
}

export function AppPreview({ scenes, music }: AppPreviewProps) {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${brand.petrol700} 0%, ${brand.petrol900} 100%)` }}>
      {scenes.map((scene, i) => {
        const from = at;
        at += sceneFrames(scene);
        return (
          <Sequence key={scene.src + scene.from} from={from} durationInFrames={sceneFrames(scene)}>
            <Scene
              scene={scene}
              fadeIn={scenes[i - 1]?.caption !== scene.caption}
              fadeOut={scenes[i + 1]?.caption !== scene.caption}
            />
          </Sequence>
        );
      })}
      {music ? <Audio src={staticFile(music)} volume={(f) => interpolate(f, [0, 15, at - 30, at], [0, 0.35, 0.35, 0], { extrapolateRight: 'clamp' })} /> : null}
    </AbsoluteFill>
  );
}

// Seconds picked from the clips (each recording starts with Maestro's warm-up).
const clip = (name: string) => `clips/preview-en/${name}.mp4`;
export const appPreviews: Record<string, AppPreviewProps> = {
  'preview-en': {
    music: 'music/happy-times.mp3',
    scenes: [
      { src: clip('1-home'), from: 21.5, to: 27, caption: 'Your month at a glance' },
      { src: clip('2-add'), from: 16.5, to: 34.5, rate: 2.2, caption: 'Log a spend in seconds' },
      { src: clip('3-mosaic'), from: 30.75, to: 44.75, rate: 2, caption: 'See where your money goes' },
      { src: clip('4-ask'), from: 63.75, to: 66.5, rate: 1.2, caption: 'Just ask Rumi' },
      { src: clip('4-ask'), from: 71.5, to: 75, rate: 1.2, caption: 'Just ask Rumi' },
      { src: clip('4-ask'), from: 86.25, to: 89, rate: 1.2, caption: 'Just ask Rumi' },
      { src: clip('4-ask'), from: 103, to: 104.5, rate: 1.2, caption: 'Just ask Rumi' },
    ],
  },
};

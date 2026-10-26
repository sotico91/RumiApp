import { Composition } from 'remotion';
import { Ad, adSeconds, type AdProps } from './Ad';
import { FPS } from './brand';
import { ads } from './ads';
import { Mascot, mascotFrames } from './Mascot';

export function RemotionRoot() {
  return (
    <>
      {Object.entries(ads).map(([id, props]) => (
        <Composition
          key={id}
          id={id}
          component={Ad}
          defaultProps={props}
          width={1080}
          height={1920}
          fps={FPS}
          durationInFrames={Math.round(adSeconds(props) * FPS)}
        />
      ))}
      <Composition id="rumi-habla-es" component={Mascot} width={1080} height={1920} fps={FPS} durationInFrames={mascotFrames()} />
    </>
  );
}

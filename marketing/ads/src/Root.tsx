import { Composition } from 'remotion';
import { Ad, adSeconds, type AdProps } from './Ad';
import { FPS } from './brand';
import { ads } from './ads';
import { Mascot, mascotFrames } from './Mascot';
import { mascotVideos } from './mascot-scenes';
import { StoreShot, storeShots } from './StoreShot';

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
      {Object.keys(mascotVideos).map((id) => (
        <Composition
          key={id}
          id={id}
          component={Mascot}
          defaultProps={{ id }}
          width={1080}
          height={1920}
          fps={FPS}
          durationInFrames={mascotFrames(id)}
        />
      ))}
      {Object.entries(storeShots).map(([id, props]) => (
        <Composition key={id} id={id} component={StoreShot} defaultProps={props} width={1080} height={1920} fps={FPS} durationInFrames={1} />
      ))}
    </>
  );
}

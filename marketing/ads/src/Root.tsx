import { Composition } from 'remotion';
import { Ad, adSeconds, type AdProps } from './Ad';
import { AppPreview, appPreviews, previewFrames } from './AppPreview';
import { FPS } from './brand';
import { ads } from './ads';
import { Mascot, mascotFrames } from './Mascot';
import { mascotVideos } from './mascot-scenes';
import { FacebookCover, SocialAvatar, YoutubeBanner } from './SocialKit';
import { FeatureGraphic, featureGraphics, StoreShot, storeShots } from './StoreShot';

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
      {Object.entries(featureGraphics).map(([id, props]) => (
        <Composition key={id} id={id} component={FeatureGraphic} defaultProps={props} width={1024} height={500} fps={FPS} durationInFrames={1} />
      ))}
      {Object.entries(storeShots).map(([id, props]) => (
        <Composition key={id} id={id} component={StoreShot} defaultProps={props} width={1080} height={1920} fps={FPS} durationInFrames={1} />
      ))}
      {Object.entries(appPreviews).map(([id, props]) => (
        <Composition key={id} id={id} component={AppPreview} defaultProps={props} width={886} height={1920} fps={FPS} durationInFrames={previewFrames(props)} />
      ))}
      <Composition id="social-avatar" component={SocialAvatar} width={1080} height={1080} fps={FPS} durationInFrames={1} />
      <Composition id="social-youtube-banner" component={YoutubeBanner} width={2560} height={1440} fps={FPS} durationInFrames={1} />
      <Composition id="social-facebook-cover" component={FacebookCover} width={1640} height={624} fps={FPS} durationInFrames={1} />
    </>
  );
}

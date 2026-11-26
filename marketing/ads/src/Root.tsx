import { Composition } from 'remotion';
import { Ad, adSeconds, type AdProps } from './Ad';
import { AppPreview, appPreviews, previewFrames } from './AppPreview';
import { FPS } from './brand';
import { ads } from './ads';
import { Mascot, mascotFrames } from './Mascot';
import { MoneyEnVideo, moneyEnFrames } from './MoneyEnVideo';
import { BillsEn, billsEnFrames, BlackFridayEn, blackFridayEnFrames, CardEn, cardEnFrames, GoalEn, goalEnFrames, JanuaryEn, januaryEnFrames, SmallSpendsEn, smallSpendsEnFrames } from './NeedEn';
import { EneroEs, eneroEsFrames, MetaEs, metaEsFrames, ReciboEs, reciboEsFrames, TarjetaEs, tarjetaEsFrames } from './NeedEs';
import { mascotVideos } from './mascot-scenes';
import { FacebookCover, SocialAvatar, YoutubeBanner, YoutubeBannerEn } from './SocialKit';
import { FeatureGraphic, featureGraphics, StoreShot, storeShots } from './StoreShot';
import { NeedVideo, needFrames, needVideos } from './NeedVideo';
import { HormigaVideo, hormigaFrames } from './HormigaVideo';
import { PlataVideo, plataFrames } from './PlataVideo';
import { Prima, primaFrames } from './PrimaVideo';
import { StoreShotV2, storeShotsV2 } from './StoreShotV2';
import { StoreShotV3, storeShotsV3 } from './StoreShotV3';
import { Tutorial, tutorialFrames } from './TutorialVideo';
import { shortFrames, shortHooks, TutorialShort } from './TutorialShort';

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
      {storeShotsV3.map((c) => (
        <Composition key={c.id} id={c.id} component={StoreShotV3} defaultProps={c.props} width={c.width} height={c.height} fps={FPS} durationInFrames={1} />
      ))}
      {storeShotsV2.map((c) => (
        <Composition key={c.id} id={c.id} component={StoreShotV2} defaultProps={c.props} width={c.width} height={c.height} fps={FPS} durationInFrames={1} />
      ))}
      {Object.entries(needVideos).map(([id, props]) => (
        <Composition key={id} id={id} component={NeedVideo} defaultProps={props} width={1080} height={1920} fps={FPS} durationInFrames={needFrames(props)} />
      ))}
      <Composition id="rumi-gastos-hormiga-es" component={HormigaVideo} width={1080} height={1920} fps={FPS} durationInFrames={hormigaFrames} />
      <Composition id="rumi-quincena-se-fue-es" component={PlataVideo} width={1080} height={1920} fps={FPS} durationInFrames={plataFrames} />
      <Composition id="rumi-where-money-en" component={MoneyEnVideo} width={1080} height={1920} fps={FPS} durationInFrames={moneyEnFrames} />
      <Composition id="rumi-small-spends-en" component={SmallSpendsEn} width={1080} height={1920} fps={FPS} durationInFrames={smallSpendsEnFrames} />
      <Composition id="rumi-card-en" component={CardEn} width={1080} height={1920} fps={FPS} durationInFrames={cardEnFrames} />
      <Composition id="rumi-bills-en" component={BillsEn} width={1080} height={1920} fps={FPS} durationInFrames={billsEnFrames} />
      <Composition id="rumi-january-en" component={JanuaryEn} width={1080} height={1920} fps={FPS} durationInFrames={januaryEnFrames} />
      <Composition id="rumi-goal-en" component={GoalEn} width={1080} height={1920} fps={FPS} durationInFrames={goalEnFrames} />
      <Composition id="rumi-blackfriday-en" component={BlackFridayEn} width={1080} height={1920} fps={FPS} durationInFrames={blackFridayEnFrames} />
      <Composition id="rumi-tarjeta-es" component={TarjetaEs} width={1080} height={1920} fps={FPS} durationInFrames={tarjetaEsFrames} />
      <Composition id="rumi-recibo-es" component={ReciboEs} width={1080} height={1920} fps={FPS} durationInFrames={reciboEsFrames} />
      <Composition id="rumi-enero-es" component={EneroEs} width={1080} height={1920} fps={FPS} durationInFrames={eneroEsFrames} />
      <Composition id="rumi-meta-es" component={MetaEs} width={1080} height={1920} fps={FPS} durationInFrames={metaEsFrames} />
      <Composition id="rumi-prima-promo-es" component={Prima} width={1920} height={1080} fps={FPS} durationInFrames={primaFrames} />
      <Composition id="tutorial-es" component={Tutorial} width={1920} height={1080} fps={FPS} durationInFrames={tutorialFrames} />
      {Object.keys(shortHooks).map((id) => (
        <Composition key={id} id={`tutorial-${id}-es`} component={TutorialShort} defaultProps={{ id }} width={1080} height={1920} fps={FPS} durationInFrames={shortFrames(id)} />
      ))}
      <Composition id="social-avatar" component={SocialAvatar} width={1080} height={1080} fps={FPS} durationInFrames={1} />
      <Composition id="social-youtube-banner" component={YoutubeBanner} width={2560} height={1440} fps={FPS} durationInFrames={1} />
      <Composition id="social-avatar-en" component={SocialAvatar} defaultProps={{ petrol: true }} width={1080} height={1080} fps={FPS} durationInFrames={1} />
      <Composition id="social-youtube-banner-en" component={YoutubeBannerEn} width={2560} height={1440} fps={FPS} durationInFrames={1} />
      <Composition id="social-facebook-cover" component={FacebookCover} width={1640} height={624} fps={FPS} durationInFrames={1} />
    </>
  );
}

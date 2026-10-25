import { loadFont as loadDmSans } from '@remotion/google-fonts/DMSans';
import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces';

// Same colors as the app (src/theme/tokens.ts) and its two typefaces.
export const brand = {
  petrol900: '#0B1F29',
  petrol700: '#1B3A4B',
  petrol500: '#2A6F7A',
  coral: '#CF3E1E',
  gold: '#F4C95D',
  teal: '#2EC4B6',
  cream: '#FBF7F1',
  ink: '#0F1C24',
};

export const fonts = {
  display: loadFraunces('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily,
  body: loadDmSans('normal', { weights: ['400', '500', '700'], subsets: ['latin'] }).fontFamily,
};

export const FPS = 30;

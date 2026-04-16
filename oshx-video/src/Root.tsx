import { Composition } from 'remotion';
import { loadFont } from '@remotion/google-fonts/JetBrainsMono';
import { Video } from './Video';
import { TOTAL_FRAMES, FPS } from './theme';

loadFont();

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="OshxVideo"
      component={Video}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};

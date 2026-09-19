import AnimatedBackground, {
  type AnimatedBackgroundBlob,
} from '../../components/layout/AnimatedBackground';

const HOME_BACKGROUND_WRAPPER_CLASSNAME =
  'pointer-events-none fixed inset-0 overflow-hidden';

const HOME_BACKGROUND_BLOBS: AnimatedBackgroundBlob[] = [
  {
    x: [0, 60, 0],
    y: [0, 40, 0],
    scale: [1, 1.12, 1],
    duration: 16,
    className:
      'absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-indigo-600/10 blur-3xl',
  },
  {
    x: [0, -50, 0],
    y: [0, -35, 0],
    scale: [1, 1.15, 1],
    duration: 18,
    className:
      'absolute -bottom-48 -right-40 h-[32rem] w-[32rem] rounded-full bg-purple-600/10 blur-3xl',
  },
];

function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <AnimatedBackground
        wrapperClassName={HOME_BACKGROUND_WRAPPER_CLASSNAME}
        blobs={HOME_BACKGROUND_BLOBS}
      />

      <div className="relative z-10 min-h-screen" />
    </div>
  );
}

export default HomePage;

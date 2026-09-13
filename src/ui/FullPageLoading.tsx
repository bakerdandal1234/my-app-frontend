import Spinner from './Spinner';

/** Full-page blocking loading state — for moments with nothing else useful to show yet. */
function FullPageLoading({ label }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <Spinner label={label} />
    </div>
  );
}

export default FullPageLoading;

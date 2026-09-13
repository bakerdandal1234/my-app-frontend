interface SpinnerProps {
  label?: string;
}

function Spinner({ label }: SpinnerProps) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 motion-reduce:animate-none" />
      {label ? <p className="text-sm text-slate-500">{label}</p> : <span className="sr-only">Loading</span>}
    </div>
  );
}

export default Spinner;

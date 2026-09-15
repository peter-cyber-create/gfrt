export default function LoadingState({ label = "Loading…" }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="loading-skeleton">
        <div className="skel skel-title" />
        <div className="skel skel-line" />
        <div className="skel skel-line short" />
        <div className="skel skel-block" />
      </div>
      <span className="sr-only">{label}</span>
      <div className="text-muted small mt-2 text-center">{label}</div>
    </div>
  );
}

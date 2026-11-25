export function LoadingState({ label = 'Loading products' }: { label?: string }) {
  return (
    <div className="page-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}…</p>
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="page-state error-state" role="alert">
      <p className="eyebrow">Something went wrong</p>
      <h2>We couldn’t load this page.</h2>
      <p>{message}</p>
      <button className="button button-secondary" onClick={retry}>
        Try again
      </button>
    </div>
  );
}

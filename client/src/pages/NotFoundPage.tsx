import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="page-width page-state not-found">
      <p className="eyebrow">404 · Page not found</p>
      <h1>This path leads nowhere.</h1>
      <p>Head back to the catalogue and find something worth keeping.</p>
      <Link className="button" to="/">Back to the catalogue</Link>
    </div>
  );
}

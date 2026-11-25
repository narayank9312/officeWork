import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { SearchBar } from './SearchBar';

export function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner page-width">
          <Link to="/" className="brand" aria-label="Fieldwork home">
            <span className="brand-mark" aria-hidden="true">F</span>
            <span>FIELDWORK<span className="brand-dot">.</span></span>
          </Link>
          <SearchBar />
          <Link to="/" className="nav-link">Catalogue</Link>
        </div>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="page-width footer-inner">
          <Link to="/" className="brand brand-footer">FIELDWORK<span className="brand-dot">.</span></Link>
          <p>Good things, ready for everyday life.</p>
          <p className="footer-note">Product information supplied by Fake Store API.</p>
        </div>
      </footer>
    </div>
  );
}

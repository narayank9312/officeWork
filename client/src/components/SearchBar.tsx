import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function SearchBar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(routeQuery);

  useEffect(() => setQuery(routeQuery), [routeQuery]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (term) {
      navigate(`/search?q=${encodeURIComponent(term)}`);
    }
  }

  return (
    <form className="search-bar" role="search" onSubmit={submit}>
      <label className="sr-only" htmlFor="catalogue-search">
        Search products
      </label>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="search-icon">
        <path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
      </svg>
      <input
        id="catalogue-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="What are you looking for?"
        maxLength={100}
        required
      />
      <button type="submit" disabled={!query.trim()}>
        Search
      </button>
    </form>
  );
}

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductGrid } from '../components/ProductGrid';
import { ErrorState, LoadingState } from '../components/States';
import { catalogApi } from '../lib/api';
import { useRemoteData } from '../lib/use-remote-data';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  const search = useCallback(
    (signal: AbortSignal) => (query ? catalogApi.searchProducts(query, signal) : Promise.resolve([])),
    [query],
  );
  const { data, error, loading, retry } = useRemoteData(search);

  return (
    <div className="page-width inner-page">
      <header className="page-heading search-heading">
        <p className="eyebrow">Catalogue search</p>
        <h1>{query ? `Results for “${query}”` : 'Search the collection'}</h1>
        {data && query && !loading && !error && (
          <p>{data.length} {data.length === 1 ? 'product' : 'products'} found. Results match product names, descriptions and categories.</p>
        )}
      </header>
      {!query && <div className="page-state"><p>Enter a product, category or keyword in the search bar above.</p></div>}
      {query && loading && <LoadingState label="Searching the catalogue" />}
      {query && error && <ErrorState message={error} retry={retry} />}
      {query && data && !loading && !error && (
        data.length > 0 ? <ProductGrid products={data} /> : (
          <div className="empty-results">
            <p className="eyebrow">No matches</p>
            <h2>Nothing found for “{query}”.</h2>
            <p>Try a broader keyword, a different spelling, or browse a category instead.</p>
          </div>
        )
      )}
    </div>
  );
}

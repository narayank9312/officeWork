import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProductGrid } from '../components/ProductGrid';
import { ErrorState, LoadingState } from '../components/States';
import { catalogApi } from '../lib/api';
import { useRemoteData } from '../lib/use-remote-data';

export function CategoryPage() {
  const { category = '' } = useParams();
  const loadCategory = useCallback(
    (signal: AbortSignal) => catalogApi.getCategoryProducts(category, signal),
    [category],
  );
  const { data, error, loading, retry } = useRemoteData(loadCategory);

  return (
    <div className="page-width inner-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Catalogue</Link><span aria-hidden="true">/</span><span>{category}</span>
      </nav>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} retry={retry} />}
      {data && !loading && !error && (
        <>
          <header className="page-heading">
            <p className="eyebrow">Shop the collection</p>
            <h1>{data.category}</h1>
            <p>{data.topRated.length + data.additional.length} products, with the highest-rated picks first.</p>
          </header>
          <section className="catalogue-section" aria-labelledby="top-rated-heading">
            <div className="section-heading">
              <h2 id="top-rated-heading">Top rated in {data.category}</h2>
            </div>
            <ProductGrid products={data.topRated} />
          </section>
          {data.additional.length > 0 && (
            <section className="catalogue-section additional-products" aria-labelledby="additional-heading">
              <div className="section-heading">
                <h2 id="additional-heading">More to explore</h2>
              </div>
              <ProductGrid products={data.additional} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

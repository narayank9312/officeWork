import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ProductGrid } from '../components/ProductGrid';
import { ErrorState, LoadingState } from '../components/States';
import { catalogApi } from '../lib/api';
import { useRemoteData } from '../lib/use-remote-data';

export function HomePage() {
  const loadHome = useCallback(async (signal: AbortSignal) => {
    const [products, categories] = await Promise.all([
      catalogApi.getFeaturedProducts(signal),
      catalogApi.getCategories(signal),
    ]);
    return { products, categories };
  }, []);
  const { data, error, loading, retry } = useRemoteData(loadHome);

  return (
    <>
      <section className="hero page-width">
        <div>
          <p className="eyebrow">The everyday, elevated</p>
          <h1>Find something<br /><em>worth keeping.</em></h1>
        </div>
        <p className="hero-copy">
          A considered collection of useful objects and wardrobe staples, chosen for how they work and how long they last.
        </p>
      </section>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} retry={retry} />}
      {data && !loading && !error && (
        <>
          <section className="catalogue-section page-width" aria-labelledby="featured-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Customer favourites</p>
                <h2 id="featured-heading">Five worth a closer look</h2>
              </div>
              <p>Our top-rated pieces, ranked by customer rating and review count.</p>
            </div>
            <ProductGrid products={data.products} />
          </section>

          <section className="category-section">
            <div className="page-width">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Make your way around</p>
                  <h2>Browse by category</h2>
                </div>
              </div>
              <div className="category-links">
                {data.categories.map((category, index) => (
                  <Link to={`/category/${encodeURIComponent(category)}`} key={category} className="category-link">
                    <span className="category-number">0{index + 1}</span>
                    <span>{category}</span>
                    <span aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

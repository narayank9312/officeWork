import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EnquiryForm } from '../components/EnquiryForm';
import { ErrorState, LoadingState } from '../components/States';
import { catalogApi } from '../lib/api';
import { formatPrice } from '../lib/format';
import { useRemoteData } from '../lib/use-remote-data';

export function ProductPage() {
  const { id = '' } = useParams();
  const loadProduct = useCallback((signal: AbortSignal) => catalogApi.getProduct(id, signal), [id]);
  const { data: product, error, loading, retry } = useRemoteData(loadProduct);

  return (
    <div className="page-width inner-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Catalogue</Link>
        {product && <><span aria-hidden="true">/</span><Link to={`/category/${encodeURIComponent(product.category)}`}>{product.category}</Link></>}
      </nav>
      {loading && <LoadingState label="Loading product details" />}
      {error && <ErrorState message={error} retry={retry} />}
      {product && !loading && !error && (
        <>
          <article className="product-detail">
            <div className="product-detail-image-wrap">
              <img src={product.image} alt={product.title} className="product-detail-image" />
            </div>
            <div className="product-detail-copy">
              <p className="eyebrow">{product.category}</p>
              <h1>{product.title}</h1>
              <p className="detail-price">{formatPrice(product.price)}</p>
              <div className="detail-rating">
                <span className="rating">
                  <span aria-hidden="true">★</span> {product.rating.rate.toFixed(1)} out of 5
                </span>
                <span>{product.rating.count} customer reviews</span>
              </div>
              <div className="description">
                <h2>About this product</h2>
                <p>{product.description}</p>
              </div>
              <EnquiryForm product={product} />
            </div>
          </article>
        </>
      )}
    </div>
  );
}

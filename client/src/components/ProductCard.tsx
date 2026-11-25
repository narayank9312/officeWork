import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/format';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <li>
      <article className="product-card">
        <Link to={`/products/${product.id}`} className="product-card-link">
          <div className="product-image-wrap">
            <img src={product.image} alt="" loading="lazy" className="product-image" />
          </div>
          <div className="product-card-body">
            <p className="eyebrow">{product.category}</p>
            <h3>{product.title}</h3>
            <div className="product-card-meta">
              <span className="price">{formatPrice(product.price)}</span>
              <span className="rating" aria-label={`${product.rating.rate} out of 5, ${product.rating.count} reviews`}>
                <span aria-hidden="true">★</span> {product.rating.rate.toFixed(1)}
              </span>
            </div>
            <span className="view-product">
              View product <span aria-hidden="true">↗</span>
            </span>
          </div>
        </Link>
      </article>
    </li>
  );
}

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { catalogApi } from './lib/api';
import { backpack, cottonShirt, featuredProducts, leatherBag, overshirt } from './test/fixtures';

function renderHome() {
  vi.spyOn(catalogApi, 'getFeaturedProducts').mockResolvedValue(featuredProducts);
  vi.spyOn(catalogApi, 'getCategories').mockResolvedValue(['clothing', 'electronics', 'jewelry']);
  return render(<MemoryRouter><App /></MemoryRouter>);
}

afterEach(() => vi.restoreAllMocks());

describe('catalogue critical path', () => {
  it('renders all five featured products and opens product details from a tile', async () => {
    const getProduct = vi.spyOn(catalogApi, 'getProduct').mockResolvedValue(cottonShirt);
    const user = userEvent.setup();
    renderHome();

    expect(await screen.findByRole('heading', { name: 'Five worth a closer look' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /view product/i })).toHaveLength(5);
    await user.click(screen.getByRole('link', { name: /Cotton Essential T-Shirt/i }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Cotton Essential T-Shirt' })).toBeInTheDocument();
    expect(screen.queryByText('A considered collection of useful objects and wardrobe staples, chosen for how they work and how long they last.')).not.toBeInTheDocument();
    expect(getProduct).toHaveBeenCalledWith('1', expect.any(AbortSignal));
  });

  it('submits the search term and renders only matching API results', async () => {
    const search = vi.spyOn(catalogApi, 'searchProducts').mockResolvedValue([cottonShirt]);
    const user = userEvent.setup();
    renderHome();
    await screen.findByRole('heading', { name: 'Five worth a closer look' });

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), '  cotton  ');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Results for “cotton”' })).toBeInTheDocument();
    expect(screen.getByText('1 product found. Results match product names, descriptions and categories.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /view product/i })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Cotton Essential T-Shirt/i })).toBeInTheDocument();
    expect(screen.queryByText('Studio Headphones')).not.toBeInTheDocument();
    expect(search).toHaveBeenCalledWith('cotton', expect.any(AbortSignal));
  });

  it('opens category top-rated picks and additional products', async () => {
    const getCategory = vi.spyOn(catalogApi, 'getCategoryProducts').mockResolvedValue({
      category: 'clothing',
      topRated: [leatherBag, cottonShirt, backpack],
      additional: [overshirt],
    });
    const user = userEvent.setup();
    renderHome();
    await screen.findByRole('heading', { name: 'Five worth a closer look' });

    const categorySection = screen.getByText('Browse by category').closest('section');
    expect(categorySection).not.toBeNull();
    await user.click(within(categorySection as HTMLElement).getByRole('link', { name: /clothing/i }));

    expect(await screen.findByRole('heading', { name: 'Top rated in clothing' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'More to explore' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Linen Overshirt/i })).toBeInTheDocument();
    expect(getCategory).toHaveBeenCalledWith('clothing', expect.any(AbortSignal));
  });
});

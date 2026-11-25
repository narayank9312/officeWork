import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogueUnavailableError } from '../errors';
import { testProducts } from '../test/fixtures';
import { FakeStoreProductSource } from './fake-store-product-source';

const config = {
  FAKE_STORE_API_URL: 'https://fakestore.example.test',
  PRODUCT_CACHE_TTL_MS: 300_000,
  UPSTREAM_TIMEOUT_MS: 1_000,
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => vi.unstubAllGlobals());

describe('FakeStoreProductSource', () => {
  it('validates the upstream payload and caches the product list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(testProducts));
    vi.stubGlobal('fetch', fetchMock);
    const source = new FakeStoreProductSource(config);

    const first = await source.listProducts();
    const second = await source.listProducts();
    const detail = await source.getProductById(3);

    expect(first).toEqual(testProducts);
    expect(second).toEqual(testProducts);
    expect(detail?.title).toBe('Studio Headphones');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps invalid provider data to a catalogue availability error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{ id: 'not-a-number' }])));
    const source = new FakeStoreProductSource(config);

    await expect(source.listProducts()).rejects.toBeInstanceOf(CatalogueUnavailableError);
  });

  it('maps non-success upstream responses to a catalogue availability error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, 503)));
    const source = new FakeStoreProductSource(config);

    await expect(source.listProducts()).rejects.toBeInstanceOf(CatalogueUnavailableError);
  });
});

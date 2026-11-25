import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { CatalogService } from './catalog/catalog-service';
import { loadConfig } from './config';
import { EmailMessage, EmailSender } from './email/email-sender';
import { EmailDeliveryError } from './errors';
import { EnquiryService } from './enquiries/enquiry-service';
import { FakeProductSource } from './test/fixtures';

class FakeEmailSender implements EmailSender {
  messages: EmailMessage[] = [];
  error: Error | undefined;

  async send(message: EmailMessage): Promise<void> {
    if (this.error) throw this.error;
    this.messages.push(message);
  }
}

function makeTestApp() {
  const products = new FakeProductSource();
  const emails = new FakeEmailSender();
  const config = { ...loadConfig({}), NODE_ENV: 'test' as const, ENQUIRY_RATE_LIMIT_MAX: 100 };
  const app = createApp({
    config,
    logger: pino({ enabled: false }),
    catalog: new CatalogService(products),
    enquiries: new EnquiryService(products, emails, 'sales@example.test'),
  });
  return { app, emails };
}

const validEnquiry = {
  productId: 1,
  name: 'Alice Example',
  email: 'alice@example.test',
  phone: '+44 (0)20 1234 5678',
  message: '<b>Is this in stock?</b>',
};

describe('API critical path', () => {
  it('serves five featured products', async () => {
    const response = await request(makeTestApp().app).get('/api/products/featured').expect(200);
    expect(response.body.products).toHaveLength(5);
    expect(response.body.products[0].id).toBe(2);
  });

  it('serves separate top-rated and additional category groups', async () => {
    const response = await request(makeTestApp().app).get('/api/categories/clothing/products').expect(200);
    expect(response.body.topRated).toHaveLength(3);
    expect(response.body.additional).toHaveLength(1);
  });

  it('returns only products with matching text', async () => {
    const response = await request(makeTestApp().app).get('/api/products').query({ search: 'cotton' }).expect(200);
    expect(response.body.products).toHaveLength(2);
    expect(response.body.products.map((product: { id: number }) => product.id)).toEqual([1, 7]);
  });

  it('rejects a blank search instead of returning the full catalogue', async () => {
    const response = await request(makeTestApp().app).get('/api/products?search=%20%20').expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns product details and a controlled 404 for unknown products', async () => {
    const { app } = makeTestApp();
    const detail = await request(app).get('/api/products/1').expect(200);
    expect(detail.body.product.title).toBe('Cotton Essential T-Shirt');
    const missing = await request(app).get('/api/products/999').expect(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('delivers a valid enquiry to the sales inbox and escapes customer HTML', async () => {
    const { app, emails } = makeTestApp();
    const response = await request(app).post('/api/enquiries').send(validEnquiry).expect(201);

    expect(response.body.message).toContain('Thank you');
    expect(emails.messages).toHaveLength(1);
    expect(emails.messages[0]).toMatchObject({
      to: 'sales@example.test',
      replyTo: { address: 'alice@example.test', name: 'Alice Example' },
    });
    expect(emails.messages[0]?.html).toContain('&lt;b&gt;Is this in stock?&lt;/b&gt;');
    expect(emails.messages[0]?.html).not.toContain('<b>Is this in stock?</b>');
  });

  it('rejects invalid contact details without sending email', async () => {
    const { app, emails } = makeTestApp();
    const response = await request(app).post('/api/enquiries').send({ ...validEnquiry, email: 'not-an-email' }).expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(emails.messages).toHaveLength(0);
  });

  it('rejects enquiries for products that do not exist', async () => {
    const { app, emails } = makeTestApp();
    await request(app).post('/api/enquiries').send({ ...validEnquiry, productId: 999 }).expect(404);
    expect(emails.messages).toHaveLength(0);
  });

  it('reports a delivery failure instead of returning a thank-you response', async () => {
    const { app, emails } = makeTestApp();
    emails.error = new EmailDeliveryError();
    const response = await request(app).post('/api/enquiries').send(validEnquiry).expect(502);

    expect(response.body.error.code).toBe('EMAIL_UNAVAILABLE');
    expect(response.body.message).toBeUndefined();
  });

  it('exposes a health check and security headers', async () => {
    const response = await request(makeTestApp().app).get('/api/health').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

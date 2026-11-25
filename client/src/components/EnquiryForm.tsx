import { FormEvent, useState } from 'react';
import { ApiError, catalogApi } from '../lib/api';
import { Product } from '../types';

export function EnquiryForm({ product }: { product: Product }) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thankYouMessage, setThankYouMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phone = String(form.get('phone') ?? '').trim();
    const message = String(form.get('message') ?? '').trim();

    setSubmitting(true);
    setError(null);
    try {
      const result = await catalogApi.submitEnquiry({
        productId: product.id,
        name: String(form.get('name') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        ...(phone ? { phone } : {}),
        ...(message ? { message } : {}),
      });
      setThankYouMessage(result.message);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'We could not send your enquiry. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (thankYouMessage) {
    return (
      <div className="thank-you" role="status">
        <span className="thank-you-icon" aria-hidden="true">✓</span>
        <div>
          <h2>Thank you</h2>
          <p>{thankYouMessage}</p>
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button className="button enquire-button" onClick={() => setIsOpen(true)}>
        Enquire about this product <span aria-hidden="true">↗</span>
      </button>
    );
  }

  return (
    <form className="enquiry-form" onSubmit={submit}>
      <div className="enquiry-form-heading">
        <div>
          <p className="eyebrow">Product enquiry</p>
          <h2>Let’s talk about it.</h2>
        </div>
        <p>Leave your details and our team will be in touch.</p>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="enquiry-name">Full name <span aria-hidden="true">*</span></label>
          <input id="enquiry-name" name="name" autoComplete="name" minLength={2} maxLength={100} required />
        </div>
        <div className="field">
          <label htmlFor="enquiry-email">Email address <span aria-hidden="true">*</span></label>
          <input id="enquiry-email" name="email" type="email" autoComplete="email" maxLength={254} required />
        </div>
        <div className="field field-full">
          <label htmlFor="enquiry-phone">Phone <span className="optional">(optional)</span></label>
          <input id="enquiry-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} pattern="[0-9+() .\-]*" />
        </div>
        <div className="field field-full">
          <label htmlFor="enquiry-message">What would you like to know? <span className="optional">(optional)</span></label>
          <textarea id="enquiry-message" name="message" rows={4} maxLength={2000} placeholder="Ask about availability, delivery, or anything else." />
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send enquiry'}
        </button>
        <button type="button" className="text-button" disabled={submitting} onClick={() => setIsOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

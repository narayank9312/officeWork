import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, catalogApi } from '../lib/api';
import { cottonShirt } from '../test/fixtures';
import { EnquiryForm } from './EnquiryForm';

afterEach(() => vi.restoreAllMocks());

describe('EnquiryForm', () => {
  it('opens from the product, submits contact details and shows the server thank-you message', async () => {
    const submit = vi.spyOn(catalogApi, 'submitEnquiry').mockResolvedValue({
      message: 'Thank you! Your enquiry has been sent. We will be in touch shortly.',
    });
    const user = userEvent.setup();
    render(<EnquiryForm product={cottonShirt} />);

    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /enquire about this product/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Alice Example');
    await user.type(screen.getByLabelText(/email address/i), 'alice@example.test');
    await user.type(screen.getByLabelText(/^phone/i), '+44 20 1234 5678');
    await user.type(screen.getByLabelText(/what would you like to know/i), 'Is this in stock?');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('heading', { name: 'Thank you' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('We will be in touch shortly');
    expect(submit).toHaveBeenCalledWith({
      productId: 1,
      name: 'Alice Example',
      email: 'alice@example.test',
      phone: '+44 20 1234 5678',
      message: 'Is this in stock?',
    });
    expect(screen.queryByRole('button', { name: 'Send enquiry' })).not.toBeInTheDocument();
  });

  it('keeps the form visible and explains a failed delivery', async () => {
    vi.spyOn(catalogApi, 'submitEnquiry').mockRejectedValue(
      new ApiError('We could not send your enquiry. Please try again.', 502, 'EMAIL_UNAVAILABLE'),
    );
    const user = userEvent.setup();
    render(<EnquiryForm product={cottonShirt} />);

    await user.click(screen.getByRole('button', { name: /enquire about this product/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Alice Example');
    await user.type(screen.getByLabelText(/email address/i), 'alice@example.test');
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('could not send your enquiry');
    expect(screen.getByRole('button', { name: 'Send enquiry' })).toBeEnabled();
    expect(screen.queryByRole('heading', { name: 'Thank you' })).not.toBeInTheDocument();
  });
});

import { ProductSource } from '../catalog/product';
import { EmailSender } from '../email/email-sender';
import { NotFoundError } from '../errors';
import { EnquiryInput } from './enquiry';

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character] ?? character;
  });
}

function formatMessageHtml(enquiry: EnquiryInput, productTitle: string): string {
  const rows = [
    ['Product', `${productTitle} (#${enquiry.productId})`],
    ['Name', enquiry.name],
    ['Email', enquiry.email],
    ['Phone', enquiry.phone || 'Not provided'],
    ['Message', enquiry.message || 'Not provided'],
  ];

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" valign="top" style="padding:8px">${escapeHtml(label ?? '')}</th><td style="padding:8px">${escapeHtml(value ?? '').replace(/\n/g, '<br>')}</td></tr>`,
    )
    .join('');

  return `<h1>New product enquiry</h1><table>${htmlRows}</table>`;
}

export class EnquiryService {
  constructor(
    private readonly products: ProductSource,
    private readonly emails: EmailSender,
    private readonly salesInbox: string,
  ) {}

  async submit(enquiry: EnquiryInput): Promise<void> {
    const product = await this.products.getProductById(enquiry.productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const optionalDetails = [
      enquiry.phone ? `Phone: ${enquiry.phone}` : null,
      enquiry.message ? `\nMessage:\n${enquiry.message}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await this.emails.send({
      to: this.salesInbox,
      replyTo: { name: enquiry.name, address: enquiry.email },
      subject: `New enquiry: ${product.title.replace(/[\r\n]+/g, ' ')} (#${product.id})`,
      text: [
        'New product enquiry',
        `Product: ${product.title} (#${product.id})`,
        `Name: ${enquiry.name}`,
        `Email: ${enquiry.email}`,
        optionalDetails,
      ]
        .filter(Boolean)
        .join('\n'),
      html: formatMessageHtml(enquiry, product.title),
    });
  }
}

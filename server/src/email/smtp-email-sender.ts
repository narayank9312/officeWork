import nodemailer, { Transporter } from 'nodemailer';
import { EmailDeliveryError } from '../errors';
import { EmailMessage, EmailSender } from './email-sender';

export class SmtpEmailSender implements EmailSender {
  private readonly transporter: Transporter;

  constructor(
    smtpUrl: string,
    private readonly from: string,
  ) {
    this.transporter = nodemailer.createTransport(smtpUrl);
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    } catch (error) {
      throw new EmailDeliveryError({ cause: error });
    }
  }
}

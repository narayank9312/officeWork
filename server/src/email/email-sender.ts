export interface EmailMessage {
  to: string;
  replyTo: {
    name: string;
    address: string;
  };
  subject: string;
  text: string;
  html: string;
}

/** Delivery is a port so SMTP can be replaced by SES or another provider later. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

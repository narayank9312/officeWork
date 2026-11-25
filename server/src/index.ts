import pino from 'pino';
import { createApp } from './app';
import { CatalogService } from './catalog/catalog-service';
import { FakeStoreProductSource } from './catalog/fake-store-product-source';
import { loadConfig } from './config';
import { SmtpEmailSender } from './email/smtp-email-sender';
import { EnquiryService } from './enquiries/enquiry-service';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

try {
  const config = loadConfig();
  const products = new FakeStoreProductSource(config);
  const emails = new SmtpEmailSender(config.SMTP_URL, config.MAIL_FROM);
  const app = createApp({
    config,
    logger,
    catalog: new CatalogService(products),
    enquiries: new EnquiryService(products, emails, config.SALES_INBOX),
  });

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'API listening');
  });

  function shutdown(signal: string): void {
    logger.info({ signal }, 'shutting down');
    server.close((error) => {
      if (error) {
        logger.error({ errorName: error.name }, 'shutdown failed');
        process.exitCode = 1;
      }
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
} catch (error) {
  logger.fatal({ errorName: error instanceof Error ? error.name : 'UnknownError' }, 'startup failed');
  process.exitCode = 1;
}

import express, { ErrorRequestHandler, Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { Logger } from 'pino';
import { ZodError } from 'zod';
import { CatalogService } from './catalog/catalog-service';
import { createCatalogRouter } from './catalog/catalog-routes';
import { AppConfig } from './config';
import { EnquiryService } from './enquiries/enquiry-service';
import { createEnquiryRouter } from './enquiries/enquiry-routes';
import { CatalogueUnavailableError, EmailDeliveryError, NotFoundError } from './errors';

interface AppServices {
  config: AppConfig;
  logger: Logger;
  catalog: CatalogService;
  enquiries: EnquiryService;
}

export function createApp({ config, logger, catalog, enquiries }: AppServices): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY);
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));

  app.use((request, response, next) => {
    response.on('finish', () => {
      logger.info(
        { method: request.method, path: request.path, status: response.statusCode },
        'request completed',
      );
    });
    next();
  });

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api', createCatalogRouter(catalog));
  app.use(
    '/api/enquiries',
    rateLimit({
      windowMs: config.ENQUIRY_RATE_LIMIT_WINDOW_MS,
      limit: config.ENQUIRY_RATE_LIMIT_MAX,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (_request, response) => {
        response.status(429).json({
          error: { code: 'RATE_LIMITED', message: 'Too many enquiries. Please try again later.' },
        });
      },
    }),
    createEnquiryRouter(enquiries),
  );

  app.use((_request, response) => {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    if (error instanceof ZodError) {
      response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the submitted details.',
          details: error.flatten().fieldErrors,
        },
      });
      return;
    }

    if (error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed') {
      response.status(400).json({ error: { code: 'INVALID_JSON', message: 'Invalid JSON body.' } });
      return;
    }

    if (error instanceof NotFoundError) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: error.message } });
      return;
    }

    if (error instanceof CatalogueUnavailableError) {
      logger.error({ errorName: error.name }, 'catalogue unavailable');
      response.status(502).json({
        error: { code: 'CATALOGUE_UNAVAILABLE', message: 'The catalogue is temporarily unavailable. Please try again.' },
      });
      return;
    }

    if (error instanceof EmailDeliveryError) {
      logger.error({ errorName: error.name }, 'enquiry email delivery failed');
      response.status(502).json({
        error: { code: 'EMAIL_UNAVAILABLE', message: 'We could not send your enquiry. Please try again.' },
      });
      return;
    }

    if (error.type === 'entity.too.large') {
      response.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' } });
      return;
    }

    logger.error({ errorName: error instanceof Error ? error.name : 'UnknownError' }, 'unhandled request error');
    response.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
    });
  };

  app.use(errorHandler);
  return app;
}

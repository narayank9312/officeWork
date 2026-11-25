import { Router } from 'express';
import { asyncRoute } from '../http/async-route';
import { enquirySchema } from './enquiry';
import { EnquiryService } from './enquiry-service';

export function createEnquiryRouter(enquiries: EnquiryService): Router {
  const router = Router();

  router.post(
    '/',
    asyncRoute(async (request, response) => {
      const enquiry = enquirySchema.parse(request.body);
      await enquiries.submit(enquiry);
      response.status(201).json({
        message: 'Thank you! Your enquiry has been sent. We will be in touch shortly.',
      });
    }),
  );

  return router;
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class CatalogueUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super('Catalogue upstream request failed', options);
    this.name = 'CatalogueUnavailableError';
  }
}

export class EmailDeliveryError extends Error {
  constructor(options?: ErrorOptions) {
    super('Email delivery failed', options);
    this.name = 'EmailDeliveryError';
  }
}

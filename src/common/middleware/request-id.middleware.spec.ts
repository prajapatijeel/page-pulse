import { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER, RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should generate a new UUID if x-request-id header is missing', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    const generatedId = mockRequest.headers?.[REQUEST_ID_HEADER];
    expect(generatedId).toBeDefined();
    expect(typeof generatedId).toBe('string');
    expect(mockResponse.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, generatedId);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should preserve an existing x-request-id header if provided', () => {
    const customId = 'existing-uuid-12345';
    mockRequest.headers = {
      [REQUEST_ID_HEADER]: customId,
    };

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.headers[REQUEST_ID_HEADER]).toBe(customId);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, customId);
    expect(nextFunction).toHaveBeenCalled();
  });
});

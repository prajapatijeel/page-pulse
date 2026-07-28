import {
  ArgumentsHost,
  BadRequestException,
  GatewayTimeoutException,
  InternalServerErrorException,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockArgumentsHost: Partial<ArgumentsHost>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockRequest = {
      url: '/api/v1/test',
      method: 'GET',
      headers: { 'x-request-id': 'filter-test-id' },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    };
  });

  it('returns structured field errors for validation failures', () => {
    const exception = new BadRequestException({
      message: 'Validation failed.',
      errorCode: 'VALIDATION_ERROR',
      fieldErrors: [{ field: 'url', messages: ['url must be a URL address'] }],
    });

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed.',
        fieldErrors: [{ field: 'url', messages: ['url must be a URL address'] }],
        requestId: 'filter-test-id',
        path: '/api/v1/test',
      }),
    );
  });

  it('maps resource-not-found errors to a consistent response', () => {
    filter.catch(new NotFoundException('Audit not found.'), mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        errorCode: 'RESOURCE_NOT_FOUND',
        message: 'Audit not found.',
      }),
    );
  });

  it('does not expose internal-server-error details', () => {
    filter.catch(
      new InternalServerErrorException('Database connection failed'),
      mockArgumentsHost as ArgumentsHost,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error.',
      }),
    );
    expect(mockResponse.json).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Database connection failed' }),
    );
  });

  it('formats timeout exceptions without exposing upstream details', () => {
    filter.catch(
      new GatewayTimeoutException({
        message: 'AxiosError: connect ETIMEDOUT',
        errorCode: 'AUDIT_TIMEOUT',
      }),
      mockArgumentsHost as ArgumentsHost,
    );

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 504,
        errorCode: 'AUDIT_TIMEOUT',
        message: 'The upstream service did not respond in time.',
      }),
    );
  });

  it('handles unexpected exceptions without exposing the original error', () => {
    const exception = new Error('Database connection failed');

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error.',
        requestId: 'filter-test-id',
      }),
    );
  });
});

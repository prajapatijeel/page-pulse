import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: Partial<ExecutionContext>;
  let mockCallHandler: Partial<CallHandler>;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    mockExecutionContext = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'GET',
          originalUrl: '/api/v1/health',
          headers: { 'x-request-id': 'test-uuid-999' },
        }),
        getResponse: jest.fn().mockReturnValue({
          statusCode: 200,
        }),
      }),
    };

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ status: 'ok' })),
    };
  });

  it('should intercept request and call next handler', (done) => {
    interceptor
      .intercept(mockExecutionContext as ExecutionContext, mockCallHandler as CallHandler)
      .subscribe({
        next: (result) => {
          expect(result).toEqual({ status: 'ok' });
          expect(mockCallHandler.handle).toHaveBeenCalled();
          done();
        },
      });
  });
});

import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Logger } from '@nestjs/common';
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
          requestId: 'test-uuid-999',
          ip: '127.0.0.1',
          socket: { remoteAddress: '127.0.0.1' },
          get: jest.fn().mockReturnValue('Jest'),
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
    const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    interceptor
      .intercept(mockExecutionContext as ExecutionContext, mockCallHandler as CallHandler)
      .subscribe({
        next: (result) => {
          expect(result).toEqual({ status: 'ok' });
          expect(mockCallHandler.handle).toHaveBeenCalled();
          expect(loggerSpy).toHaveBeenCalledWith(
            expect.stringContaining('"requestId":"test-uuid-999"'),
          );
          expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('"clientIp"'));
          loggerSpy.mockRestore();
          done();
        },
      });
  });
});

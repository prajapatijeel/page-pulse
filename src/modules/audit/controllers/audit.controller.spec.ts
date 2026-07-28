import { BadRequestException, GatewayTimeoutException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from '../services/audit.service';
import { CreateAuditDto } from '../dto/create-audit.dto';

describe('AuditController', () => {
  let controller: AuditController;
  let auditService: { createAudit: jest.Mock };

  beforeEach(async () => {
    auditService = { createAudit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: auditService }],
    }).compile();

    controller = module.get(AuditController);
  });

  it('delegates a valid audit request and returns a successful response', async () => {
    const dto = { url: 'https://example.com' };
    const response = { success: true, message: 'Audit completed successfully', data: {} };
    auditService.createAudit.mockResolvedValue(response);

    await expect(controller.createAudit(dto)).resolves.toEqual(response);
    expect(auditService.createAudit).toHaveBeenCalledWith(dto);
  });

  it('returns a cached response from the audit service unchanged', async () => {
    const response = {
      success: true,
      message: 'Audit completed successfully',
      data: { cached: true },
    };
    auditService.createAudit.mockResolvedValue(response);

    await expect(controller.createAudit({ url: 'https://example.com' })).resolves.toEqual(response);
  });

  it('propagates timeout exceptions to the global exception filter', async () => {
    auditService.createAudit.mockRejectedValue(new GatewayTimeoutException());

    await expect(controller.createAudit({ url: 'https://slow.example.com' })).rejects.toThrow(
      GatewayTimeoutException,
    );
  });

  it('rejects an invalid URL through the validation boundary before invoking the service', async () => {
    const validationPipe = new ValidationPipe({ transform: true });

    await expect(
      validationPipe.transform({ url: 'not-a-url' }, { type: 'body', metatype: CreateAuditDto }),
    ).rejects.toThrow(BadRequestException);
    expect(auditService.createAudit).not.toHaveBeenCalled();
  });

  it('returns service-level audit failure responses unchanged', async () => {
    const response = {
      success: false,
      message: 'Audit failed',
      data: { id: 'audit-id', status: 'FAILED', error: 'DNS resolution failed', cached: false },
    };
    auditService.createAudit.mockResolvedValue(response);

    await expect(controller.createAudit({ url: 'https://missing.example' })).resolves.toEqual(
      response,
    );
  });
});

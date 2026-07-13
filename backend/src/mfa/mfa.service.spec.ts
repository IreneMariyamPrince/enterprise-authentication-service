import { Test, TestingModule } from '@nestjs/testing';
import { MfaService } from './mfa.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as OTPAuth from 'otpauth';

describe('MfaService', () => {
  let service: MfaService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    userMfa: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setupMfa', () => {
    it('should generate a secret and qrCode', async () => {
      mockPrismaService.userMfa.findUnique.mockResolvedValue(null);
      mockPrismaService.userMfa.create.mockResolvedValue({ id: 'mfa-id', userId: 'user-1', enabled: false });
      mockPrismaService.userMfa.update.mockResolvedValue({});

      const result = await service.setupMfa('user-1', 'test@example.com');
      
      expect(result.secret).toBeDefined();
      expect(result.qrCode).toBeDefined();
      expect(result.otpauthUrl).toBeDefined();
      expect(mockPrismaService.userMfa.update).toHaveBeenCalled();
    });

    it('should throw if MFA already enabled', async () => {
      mockPrismaService.userMfa.findUnique.mockResolvedValue({ enabled: true });
      await expect(service.setupMfa('user-1', 'test@example.com')).rejects.toThrow(BadRequestException);
    });
  });

  describe('enableMfa', () => {
    it('should throw if setup not initiated', async () => {
      mockPrismaService.userMfa.findUnique.mockResolvedValue({ enabled: false, encryptedSecret: null });
      await expect(service.enableMfa('user-1', '123456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('lockout logic', () => {
    it('should throw ForbiddenException if locked', async () => {
      const futureDate = new Date(Date.now() + 10000);
      mockPrismaService.userMfa.findUnique.mockResolvedValue({
        enabled: true,
        encryptedSecret: 'some-secret',
        lockedUntil: futureDate
      });

      await expect(service.verifyMfa('user-1', '123456')).rejects.toThrow(ForbiddenException);
    });
  });
});

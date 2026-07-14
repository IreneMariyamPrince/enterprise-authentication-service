import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtMfaGuard extends AuthGuard('jwt-mfa') {}

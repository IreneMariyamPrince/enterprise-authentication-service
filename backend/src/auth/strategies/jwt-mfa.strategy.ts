import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtMfaStrategy extends PassportStrategy(Strategy, 'jwt-mfa') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_MFA_SECRET || 'your-mfa-token-secret-key',
    });
  }

  async validate(payload: any) {
    if (!payload.mfa) {
      throw new UnauthorizedException('Invalid MFA token');
    }
    return { id: payload.sub, mfa: true, sessionId: payload.sessionId };
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Platform, User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/common/types/jwt-payload.type';

type GoogleOAuthProfile = {
  id: string;
  displayName?: string;
  emails?: Array<{ value?: string }>;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async generateTokens(userId: string, email: string, role: string | null) {
    const payload = {
      sub: userId,
      email,
      role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    await this.userService.updateRefreshToken(userId, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  async validateGoogleUser(
    profile: GoogleOAuthProfile,
    accessToken: string,
    refreshToken: string,
  ): Promise<User> {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new UnauthorizedException(
        'Nao foi possivel recuperar o email da conta Google',
      );
    }

    const user = await this.userService.findOrCreateGoogleUser({
      email,
      googleId: profile.id,
      name: profile.displayName || null,
    });

    await this.userService.upsertSocialAccount({
      userId: user.id,
      platform: Platform.YOUTUBE,
      accessToken,
      refreshToken,
    });

    return user;
  }

  async loginWithGoogle(user: User) {
    return this.generateTokens(user.id, user.email, user.role);
  }

  async login(email: string, password: string) {
    const user = await this.userService.findUserByEmail(email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    return this.generateTokens(user.id, user.email, user.role);

    // const payload = {
    //   sub: user.id,
    //   email: user.email,
    //   role: user.role,
    // };

    // const token = this.jwtService.sign(payload);

    // return {
    //   token,
    //   // expiresIn: 3600, // 1 hora
    // };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      const user = await this.userService.getUserIfRefreshTokenMatches(
        payload.sub,
        token,
      );

      if (!user) {
        throw new UnauthorizedException('Token de refresh inválido');
      }

      return this.generateTokens(user.id, user.email, user.role);
    } catch (err) {
      console.log(err);
      throw new UnauthorizedException('Refresh token inválido');
    }
  }
}

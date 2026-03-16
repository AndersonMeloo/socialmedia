import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/common/types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) { }

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

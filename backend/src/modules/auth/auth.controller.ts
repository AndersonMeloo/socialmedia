import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-auth.dto';

type GoogleAuthRequest = {
  user: User;
};

type RedirectResponse = {
  redirect: (url: string) => void;
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    return;
  }

  @Get('google/test')
  googleAuthTest(
    @Query('accessToken') accessToken?: string,
    @Query('refreshToken') refreshToken?: string,
    @Query('provider') provider?: string,
  ) {
    return {
      message: 'Login Google testado sem frontend',
      provider,
      accessToken,
      refreshToken,
    };
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: GoogleAuthRequest,
    @Res() res: RedirectResponse,
  ) {
    const tokens = await this.authService.loginWithGoogle(req.user);
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const frontendGooglePath =
      this.configService.get<string>('FRONTEND_GOOGLE_REDIRECT_PATH') ||
      '/auth/google/callback';

    if (!frontendUrl) {
      throw new InternalServerErrorException('FRONTEND_URL nao configurada');
    }

    const redirectUrl = new URL(frontendGooglePath, frontendUrl);
    redirectUrl.searchParams.set('accessToken', tokens.accessToken);
    redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);
    redirectUrl.searchParams.set('provider', 'google');

    res.redirect(redirectUrl.toString());
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const { email, password } = loginDto;
    const result = await this.authService.login(email, password);

    return result;
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }
}

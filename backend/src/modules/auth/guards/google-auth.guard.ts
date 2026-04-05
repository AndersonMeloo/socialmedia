import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticateOptionsGoogle } from 'passport-google-oauth20';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(): AuthenticateOptionsGoogle {
    return {
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
      ],
      accessType: 'offline',
      prompt: 'consent',
      includeGrantedScopes: true,
    };
  }
}

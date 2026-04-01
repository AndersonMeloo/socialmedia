import { ConfigService } from '@nestjs/config';

export interface GoogleOAuthConfig {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

export function getGoogleOAuthConfig(
  configService: ConfigService,
): GoogleOAuthConfig {
  const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
  const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
  const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

  if (!clientID || !clientSecret || !callbackURL) {
    throw new Error(
      'Variaveis GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_CALLBACK_URL sao obrigatorias',
    );
  }

  return {
    clientID,
    clientSecret,
    callbackURL,
  };
}

import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    // Importa o UsersModule usando forwardRef para resolver dependência circular,
    // pois o UsersModule também importa o AuthModule
    forwardRef(() => UsersModule),

    PassportModule.register({ session: false }),

    // Configura o JwtModule de forma assíncrona usando ConfigService para acessar a variável de ambiente JWT_SECRET
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' }, // Token expira em 1 hora
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy],
  exports: [JwtModule],
})
export class AuthModule {}

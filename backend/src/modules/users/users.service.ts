import { Injectable, NotFoundException } from '@nestjs/common';
import { Platform, Prisma, SocialAccount, User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateGoogleUser(data: {
    email: string;
    googleId: string;
    name: string | null;
  }): Promise<User> {
    const existingByGoogleId = await this.prisma.user.findUnique({
      where: { googleId: data.googleId },
    });

    if (existingByGoogleId) return existingByGoogleId;

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingByEmail) {
      return this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: data.googleId,
          name: existingByEmail.name ?? data.name,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        googleId: data.googleId,
      },
    });
  }

  async upsertSocialAccount(data: {
    userId: string;
    platform: Platform;
    accessToken: string;
    refreshToken?: string | null;
    tokenExpiry?: Date | null;
  }): Promise<SocialAccount> {
    const existingAccount = await this.prisma.socialAccount.findFirst({
      where: {
        userId: data.userId,
        platform: data.platform,
      },
    });

    if (existingAccount) {
      return this.prisma.socialAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: data.accessToken,
          refreshToken:
            data.refreshToken ?? existingAccount.refreshToken ?? null,
          tokenExpiry: data.tokenExpiry ?? existingAccount.tokenExpiry,
        },
      });
    }

    return this.prisma.socialAccount.create({
      data: {
        userId: data.userId,
        platform: data.platform,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? null,
        tokenExpiry: data.tokenExpiry ?? null,
      },
    });
  }

  // Criação do Usuário
  async create(createUserDto: CreateUserDto) {
    if (!createUserDto.password) {
      throw new Error('Password é obrigatório');
    }
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password: hashedPassword,
      },
    });

    const userWithoutPassword = Object.fromEntries(
      Object.entries(user).filter(([key]) => key !== 'password'),
    ) as Omit<User, 'password'>;

    return userWithoutPassword;
  }

  // Buscando Usuário por E-mail
  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Buscando todos os E-mails
  async findAllEmails() {
    return this.prisma.user.findMany({
      select: {
        email: true,
      },
    });
  }

  // Buscando todos os Usuários
  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não foi encontrado`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não foi encontrado`);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
      },
    });
  }

  // Deletar um Usuário
  async remove(id: string) {
    try {
      const user = await this.prisma.user.delete({
        where: { id },
      });

      return {
        message: `Usuário ${user.name} foi deletado com sucesso`,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException(`Usuário com ID ${id} não foi encontrado`);
      }

      throw err;
    }
  }

  // Atualiza refresh token do usuário
  async updateRefreshToken(userId: string, token: string): Promise<User> {
    const hashedToken: string = await bcrypt.hash(token, 10);

    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }

  // Verifica se refresh token corresponde ao usuário
  async getUserIfRefreshTokenMatches(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) return null;

    const isMatch = await bcrypt.compare(token, user.refreshToken);

    if (!isMatch) return null;

    return user;
  }

  // Remove refresh token (logout)
  async removeRefreshToken(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }
}

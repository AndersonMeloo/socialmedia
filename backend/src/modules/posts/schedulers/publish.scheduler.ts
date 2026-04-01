import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Platform, Post, SocialAccount } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class PublishScheduler {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handlePublish() {
    console.log('Verificando posts para publicar...');

    const now = new Date();

    try {
      const posts = await this.prisma.post.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: {
            lte: now,
          },
        },
      });

      for (const post of posts) {
        console.log(
          `🚀 Publicando post ${post.id} | Plataforma: ${post.platform}`,
        );

        try {
          await this.publishToPlatform(post);

          await this.prisma.post.update({
            where: { id: post.id },
            data: {
              status: 'POSTED',
              postedAt: new Date(),
            },
          });
        } catch (publishError) {
          console.error(
            `Falha ao publicar post ${post.id} | Plataforma: ${post.platform}`,
            publishError,
          );

          await this.prisma.post.update({
            where: { id: post.id },
            data: {
              status: 'FAILED',
            },
          });
        }
      }

      console.log('Publicação finalizada');
    } catch (error) {
      console.error('Erro na publicação:', error);
    }
  }

  private async publishToPlatform(post: Post): Promise<void> {
    if (post.platform !== Platform.YOUTUBE) {
      throw new Error(`Somente YOUTUBE esta habilitado no momento`);
    }

    const socialAccount = await this.prisma.socialAccount.findFirst({
      where: {
        userId: post.userId,
        platform: post.platform,
      },
    });

    if (!socialAccount) {
      throw new Error(
        `Conta social nao encontrada para user ${post.userId} na plataforma ${post.platform}`,
      );
    }

    await this.publishToYoutube(post, socialAccount);
  }

  private async publishToYoutube(
    post: Post,
    socialAccount: SocialAccount,
  ): Promise<void> {
    if (!socialAccount.accessToken) {
      throw new Error('Access token do YouTube ausente');
    }

    // Placeholder da integração real com YouTube Data API.
    await this.simulateExternalPublish('YOUTUBE', post.id);
  }

  private async simulateExternalPublish(
    platform: 'YOUTUBE',
    postId: string,
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log(
      `Publicacao simulada com sucesso: ${platform} | post ${postId}`,
    );
  }
}

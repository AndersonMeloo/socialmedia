import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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

        // Aqui futuramente entrara a API do TikTok / YouTube
        // await this.publishToPlatform(post);

        await this.prisma.post.update({
          where: { id: post.id },
          data: {
            status: 'POSTED',
            postedAt: new Date(),
          },
        });
      }

      console.log('Publicação finalizada');
    } catch (error) {
      console.error('Erro na publicação:', error);
    }
  }
}

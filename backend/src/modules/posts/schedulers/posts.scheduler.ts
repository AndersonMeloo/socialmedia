import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostsService } from '../posts.service';

@Injectable()
export class PostsScheduler {
  constructor(private readonly postsService: PostsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    console.log('Iniciando automação de posts...');

    try {
      const users = await this.postsService.getUsersWithNiches();

      for (const user of users) {
        if (!user.niches.length) continue;

        for (const niche of user.niches) {
          console.log(
            `  Gerando Posts | User: ${user.id} | Niche: ${niche.id}`,
          );

          await this.postsService.createAutoPosts(user.id, niche.id);
        }
      }

      console.log('Automação finalizada');
    } catch (error) {
      console.error('Erro na automação:', error);
    }
  }
}

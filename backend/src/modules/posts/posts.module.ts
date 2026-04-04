import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PrismaModule } from 'src/database/prisma.module';
import { PublishScheduler } from './schedulers/publish.scheduler';
import { PostsScheduler } from './schedulers/posts.scheduler';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [PostsService, PostsScheduler, PublishScheduler],
  controllers: [PostsController],
})
export class PostsModule {}

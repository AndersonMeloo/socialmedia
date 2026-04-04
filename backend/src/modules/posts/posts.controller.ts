import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/common/guards/jwt-auth.guards';
import { ImportYoutubePostDto } from './dto/import-youtube-post.dto';
import { UploadVideoPostDto } from './dto/upload-video-post.dto';
import { PostsService } from './posts.service';
import type { Multer } from 'multer';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  private getUserIdFromRequest(req: { user?: { sub?: string } }): string {
    const userId = req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException(
        'Usuario autenticado nao encontrado na requisicao',
      );
    }

    return userId;
  }

  @UseGuards(AuthGuard)
  @Get()
  findAllPosts(@Req() req: { user?: { sub?: string } }) {
    const userId = this.getUserIdFromRequest(req);
    return this.postsService.listPosts(userId);
  }

  @UseGuards(AuthGuard)
  @Get('overview')
  getOverview(
    @Req() req: { user?: { sub?: string } },
    @Query('date') date?: string,
  ) {
    const userId = this.getUserIdFromRequest(req);
    return this.postsService.getPostsOverviewByDate(userId, date);
  }

  @UseGuards(AuthGuard)
  @Post('import-youtube-url')
  importYoutubeUrl(
    @Req() req: { user?: { sub?: string } },
    @Body() body: ImportYoutubePostDto,
  ) {
    const userId = this.getUserIdFromRequest(req);

    return this.postsService.createPostFromYoutubeUrl({
      ...body,
      userId,
    });
  }

  @UseGuards(AuthGuard)
  @Post('upload-video')
  @UseInterceptors(FileInterceptor('video'))
  uploadVideo(
    @Req() req: { user?: { sub?: string } },
    @UploadedFile() file: Multer.File,
    @Body() data: UploadVideoPostDto,
  ) {
    const userId = this.getUserIdFromRequest(req);

    return this.postsService.uploadVideoPost(file, {
      ...data,
      userId,
    });
  }
}

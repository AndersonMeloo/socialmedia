import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ImportYoutubePostDto } from './dto/import-youtube-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAllPosts() {
    return this.postsService.listPosts();
  }

  @Get('overview')
  getOverview(@Query('date') date?: string) {
    return this.postsService.getPostsOverviewByDate(date);
  }

  @Post('import-youtube-url')
  importYoutubeUrl(@Body() body: ImportYoutubePostDto) {
    return this.postsService.createPostFromYoutubeUrl(body);
  }
}

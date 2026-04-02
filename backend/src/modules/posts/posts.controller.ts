import { Body, Controller, Post } from '@nestjs/common';
import { ImportYoutubePostDto } from './dto/import-youtube-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post('import-youtube-url')
  importYoutubeUrl(@Body() body: ImportYoutubePostDto) {
    return this.postsService.createPostFromYoutubeUrl(body);
  }
}

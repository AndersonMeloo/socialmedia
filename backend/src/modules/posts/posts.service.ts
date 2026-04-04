import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Post } from '@prisma/client';
import { ImportYoutubePostDto } from './dto/import-youtube-post.dto';
import { UploadVideoPostDto } from './dto/upload-video-post.dto';
import { mkdir, writeFile } from 'fs/promises';
import { resolve, extname } from 'path';

type UploadVideoFile = {
  originalname: string;
  buffer: Buffer;
};

type UserWithNiches = {
  id: string;
  niches: {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
  }[];
};

type PostOverview = {
  date: string;
  totalsForDay: {
    views: number;
    likes: number;
    comments: number;
  };
  totalViewsAllVideos: number;
  postedToday: {
    id: string;
    title: string;
    videoUrl: string | null;
    platform: string;
    status: string;
    postedAt: Date | null;
    scheduledAt: Date | null;
    latestAnalytics: {
      views: number;
      likes: number;
      comments: number;
      collectedAt: Date;
    } | null;
  }[];
};

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  private isUploadVideoFile(file: unknown): file is UploadVideoFile {
    if (!file || typeof file !== 'object') {
      return false;
    }

    const candidate = file as Record<string, unknown>;

    return (
      typeof candidate.originalname === 'string' &&
      candidate.originalname.length > 0 &&
      Buffer.isBuffer(candidate.buffer)
    );
  }

  async listPosts(userId: string) {
    return this.prisma.post.findMany({
      where: {
        userId,
      },
      orderBy: [
        {
          postedAt: 'desc',
        },
        {
          scheduledAt: 'desc',
        },
      ],
      include: {
        niche: {
          select: {
            id: true,
            name: true,
          },
        },
        analytics: {
          orderBy: {
            collectedAt: 'desc',
          },
          take: 1,
        },
      },
      take: 50,
    });
  }

  async getPostsOverviewByDate(
    userId: string,
    inputDate?: string,
  ): Promise<PostOverview> {
    const targetDate = inputDate ? new Date(inputDate) : new Date();

    if (Number.isNaN(targetDate.getTime())) {
      throw new BadRequestException('Data invalida. Use YYYY-MM-DD.');
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [analyticsOfDay, totalViews, postedToday] = await Promise.all([
      this.prisma.postAnalytics.findMany({
        where: {
          post: {
            userId,
          },
          collectedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          views: true,
          likes: true,
          comments: true,
        },
      }),
      this.prisma.postAnalytics.aggregate({
        where: {
          post: {
            userId,
          },
        },
        _sum: {
          views: true,
        },
      }),
      this.prisma.post.findMany({
        where: {
          userId,
          postedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: {
          postedAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          videoUrl: true,
          platform: true,
          status: true,
          postedAt: true,
          scheduledAt: true,
          analytics: {
            orderBy: {
              collectedAt: 'desc',
            },
            take: 1,
            select: {
              views: true,
              likes: true,
              comments: true,
              collectedAt: true,
            },
          },
        },
      }),
    ]);

    const totalsForDay = analyticsOfDay.reduce(
      (acc, item) => {
        acc.views += item.views;
        acc.likes += item.likes;
        acc.comments += item.comments;
        return acc;
      },
      { views: 0, likes: 0, comments: 0 },
    );

    return {
      date: startOfDay.toISOString().slice(0, 10),
      totalsForDay,
      totalViewsAllVideos: totalViews._sum.views ?? 0,
      postedToday: postedToday.map((post) => ({
        id: post.id,
        title: post.title,
        videoUrl: post.videoUrl,
        platform: post.platform,
        status: post.status,
        postedAt: post.postedAt,
        scheduledAt: post.scheduledAt,
        latestAnalytics: post.analytics[0] ?? null,
      })),
    };
  }

  async createPostFromYoutubeUrl(data: ImportYoutubePostDto) {
    const [user, niche, youtubeAccount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true },
      }),
      this.prisma.niche.findUnique({
        where: { id: data.nicheId },
        select: { id: true, active: true },
      }),
      this.prisma.socialAccount.findFirst({
        where: {
          userId: data.userId,
          platform: 'YOUTUBE',
        },
        select: { id: true },
      }),
    ]);

    if (!user) {
      throw new NotFoundException(`Usuario ${data.userId} nao encontrado`);
    }

    if (!niche || !niche.active) {
      throw new BadRequestException('Nicho nao encontrado ou inativo');
    }

    if (!youtubeAccount) {
      throw new BadRequestException(
        'Conta YouTube nao conectada para este usuario',
      );
    }

    const videoId = this.extractYouTubeVideoId(data.youtubeUrl);

    if (!videoId) {
      throw new BadRequestException('URL do YouTube invalida');
    }

    const scheduledAt = new Date(data.scheduledAt);

    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('scheduledAt invalido');
    }

    const metadata = await this.fetchYoutubeMetadata(data.youtubeUrl);
    const title =
      metadata?.title ?? `Video do YouTube importado | ${videoId.slice(0, 8)}`;
    const description =
      metadata?.description ?? `Importado de ${data.youtubeUrl}`;

    return this.prisma.post.create({
      data: {
        title,
        description,
        videoUrl: data.youtubeUrl,
        platform: 'YOUTUBE',
        status: 'PENDING',
        scheduledAt,
        niche: {
          connect: { id: data.nicheId },
        },
        user: {
          connect: { id: data.userId },
        },
      },
    });
  }

  // Buscar usuários com nichos (VIA POSTS)
  async getUsersWithNiches(): Promise<UserWithNiches[]> {
    const [activeNiches, usersWithYoutube] = await Promise.all([
      this.prisma.niche.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          description: true,
          active: true,
        },
      }),
      this.prisma.user.findMany({
        where: {
          socialAccounts: {
            some: {
              platform: 'YOUTUBE',
            },
          },
        },
        select: {
          id: true,
        },
      }),
    ]);

    return usersWithYoutube.map((user): UserWithNiches => {
      return {
        id: user.id,
        niches: activeNiches,
      };
    });
  }

  // Criar posts automáticos (SEM DUPLICAR + MULTI-PLATAFORMA)
  async createAutoPosts(userId: string, nicheId: string) {
    const now = new Date();

    const niche = await this.prisma.niche.findUnique({
      where: { id: nicheId },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
      },
    });

    if (!niche || !niche.active) {
      return [];
    }

    // Evitar duplicação usando scheduledAt
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const existingPosts = await this.prisma.post.count({
      where: {
        userId,
        nicheId,
        scheduledAt: {
          gte: startOfDay,
        },
      },
    });

    // 3 posts = 3 horários x 1 plataforma (YouTube)
    if (existingPosts >= 3) {
      console.log(
        `⚠️ Já existem ${existingPosts} posts hoje para user ${userId} e niche ${nicheId}`,
      );
      return [];
    }

    const posts: Post[] = [];

    const platforms = ['YOUTUBE'] as const;

    // Cálculo correto baseado nas plataformas
    const startIndex = Math.floor(existingPosts / platforms.length);

    for (let i = startIndex; i < 3; i++) {
      const scheduledDate = new Date(now);

      // Horários: 9h, 13h, 17h
      // scheduledDate.setHours(9 + i * 4, 0, 0, 0);

      // TESTE DOS POSTS A CADA MINUTO
      scheduledDate.setMinutes(now.getMinutes() + 1 + i);

      for (const platform of platforms) {
        const post = await this.prisma.post.create({
          data: {
            title: `${niche.name} | Conteudo automatico #${i + 1}`,
            description:
              niche.description ?? `Post automatico para o nicho ${niche.name}`,
            platform,
            status: 'PENDING',
            scheduledAt: scheduledDate,
            niche: {
              connect: { id: nicheId },
            },
            user: {
              connect: { id: userId },
            },
          },
        });

        posts.push(post);
      }
    }

    return posts;
  }

  private extractYouTubeVideoId(url: string): string | null {
    try {
      const parsed = new URL(url);

      if (parsed.hostname.includes('youtu.be')) {
        const value = parsed.pathname.replace('/', '').trim();
        return value || null;
      }

      if (parsed.hostname.includes('youtube.com')) {
        const v = parsed.searchParams.get('v');
        if (v) return v;

        const shorts = parsed.pathname.match(/^\/shorts\/([^/?]+)/);
        if (shorts?.[1]) return shorts[1];

        const embed = parsed.pathname.match(/^\/embed\/([^/?]+)/);
        if (embed?.[1]) return embed[1];
      }

      return null;
    } catch {
      return null;
    }
  }

  private async fetchYoutubeMetadata(url: string): Promise<{
    title?: string;
    description?: string;
  } | null> {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oembedUrl);

      if (!response.ok) return null;

      const payload = (await response.json()) as { title?: string };

      return {
        title: payload.title,
      };
    } catch {
      return null;
    }
  }

  async uploadVideoPost(file: unknown, data: UploadVideoPostDto) {
    if (!data) {
      throw new BadRequestException(
        'Body ausente. Envie multipart/form-data com userId, nicheId, title e scheduledAt.',
      );
    }

    if (!data.userId || !data.nicheId || !data.title || !data.scheduledAt) {
      throw new BadRequestException(
        'Campos obrigatorios ausentes: userId, nicheId, title e scheduledAt.',
      );
    }

    const [user, niche, youtubeAccount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true },
      }),
      this.prisma.niche.findUnique({
        where: { id: data.nicheId },
        select: { id: true, active: true },
      }),
      this.prisma.socialAccount.findFirst({
        where: {
          userId: data.userId,
          platform: 'YOUTUBE',
        },
        select: { id: true },
      }),
    ]);

    if (!user) {
      throw new NotFoundException(`Usuario ${data.userId} nao encontrado`);
    }

    if (!niche || !niche.active) {
      throw new BadRequestException('Nicho nao encontrado ou inativo');
    }

    if (!youtubeAccount) {
      throw new BadRequestException(
        'Conta YouTube nao conectada para este usuario',
      );
    }

    if (!this.isUploadVideoFile(file)) {
      throw new BadRequestException('Conteudo do arquivo de vídeo invalido');
    }

    const validExtensions = ['.mp4', '.mov', '.webm', '.mkv'];
    const fileExtension = extname(file.originalname).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        `Extensão invalida. Aceitos: ${validExtensions.join(', ')}`,
      );
    }

    const queueDir = 'uploads/queue';
    await mkdir(queueDir, { recursive: true });

    const scheduledAt = new Date(data.scheduledAt);

    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('scheduledAt invalido');
    }

    // Salvar arquivo em uploads/queue com nome único
    const fileName = `${Date.now()}_${data.userId.slice(0, 8)}${fileExtension}`;
    const filePath = resolve(queueDir, fileName);

    await writeFile(filePath, file.buffer);

    // Criar post PENDING
    const post = await this.prisma.post.create({
      data: {
        title: data.title,
        description: data.description,
        videoUrl: filePath,
        platform: 'YOUTUBE',
        status: 'PENDING',
        scheduledAt,
        niche: {
          connect: { id: data.nicheId },
        },
        user: {
          connect: { id: data.userId },
        },
      },
    });

    return {
      ...post,
      message: '✅ Vídeo enviado! Será publicado no horário agendado.',
    };
  }
}

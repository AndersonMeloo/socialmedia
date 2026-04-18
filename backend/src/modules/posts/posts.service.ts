import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/database/prisma.service';
import { Post } from '@prisma/client';
import { ImportYoutubePostDto } from './dto/import-youtube-post.dto';
import { UploadVideoPostDto } from './dto/upload-video-post.dto';
import { mkdir, readdir, rename, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { basename, resolve, extname } from 'path';

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

type ImportedInboxVideo = {
  postId: string;
  fileName: string;
  scheduledAt: Date;
};

type PostOverview = {
  date: string;
  totalsForDay: {
    views: number;
    likes: number;
    comments: number;
  };
  totalsAllTime: {
    views: number;
    likes: number;
    comments: number;
  };
  totalPostedVideos: number;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

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

  private isVideoFile(fileName: string): boolean {
    const extension = extname(fileName).toLowerCase();
    return ['.mp4', '.mov', '.webm', '.mkv'].includes(extension);
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

    const [postedToday, postedVideos] = await Promise.all([
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
      this.prisma.post.findMany({
        where: {
          userId,
          status: 'POSTED',
        },
        select: {
          analytics: {
            orderBy: {
              collectedAt: 'desc',
            },
            take: 1,
            select: {
              views: true,
              likes: true,
              comments: true,
            },
          },
        },
      }),
    ]);

    const totalsForDay = postedToday.reduce(
      (acc, item) => {
        acc.views += item.analytics[0]?.views ?? 0;
        acc.likes += item.analytics[0]?.likes ?? 0;
        acc.comments += item.analytics[0]?.comments ?? 0;
        return acc;
      },
      { views: 0, likes: 0, comments: 0 },
    );

    const totalViewsAllVideos = postedVideos.reduce(
      (acc, item) => acc + (item.analytics[0]?.views ?? 0),
      0,
    );

    const totalsAllTime = postedVideos.reduce(
      (acc, item) => {
        acc.views += item.analytics[0]?.views ?? 0;
        acc.likes += item.analytics[0]?.likes ?? 0;
        acc.comments += item.analytics[0]?.comments ?? 0;
        return acc;
      },
      { views: 0, likes: 0, comments: 0 },
    );

    return {
      date: startOfDay.toISOString().slice(0, 10),
      totalsForDay,
      totalsAllTime,
      totalPostedVideos: postedVideos.length,
      totalViewsAllVideos,
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

      // POST NA HORA (teste/imediato)
      // Se quiser publicar logo, deixe esta linha ativa e comente a de baixo.
      scheduledDate.setMinutes(now.getMinutes() + 1 + i);

      // 9h, 13h e 17h (produção)
      // Se quiser publicar na hora, comente este bloco e descomente o de cima.
      // scheduledDate.setHours(9 + i * 4, 0, 0, 0);

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

  async importInboxVideosAsShorts(): Promise<ImportedInboxVideo[]> {
    const inboxDir = this.getInboxDir();
    const queueDir = this.getQueueDir();

    if (!existsSync(inboxDir)) {
      return [];
    }

    const [user, niche] = await Promise.all([
      this.findDefaultAutoPostUser(),
      this.findDefaultAutoPostNiche(),
    ]);

    if (!user || !niche) {
      return [];
    }

    const inboxFiles = await readdir(inboxDir);
    const videoFiles = inboxFiles
      .filter((fileName) => this.isVideoFile(fileName))
      .sort((a, b) => a.localeCompare(b));

    if (!videoFiles.length) {
      return [];
    }

    await mkdir(queueDir, { recursive: true });

    const latestScheduledPost = await this.prisma.post.findFirst({
      where: {
        userId: user.id,
        platform: 'YOUTUBE',
        scheduledAt: {
          not: null,
        },
      },
      orderBy: {
        scheduledAt: 'desc',
      },
      select: {
        scheduledAt: true,
      },
    });

    const scheduleReferenceDate =
      latestScheduledPost?.scheduledAt &&
      latestScheduledPost.scheduledAt > new Date()
        ? latestScheduledPost.scheduledAt
        : new Date();

    const importedVideos: ImportedInboxVideo[] = [];

    for (const [index, fileName] of videoFiles.entries()) {
      const sourcePath = resolve(inboxDir, fileName);
      const extension = extname(fileName).toLowerCase();
      const baseName = basename(fileName, extension)
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const title = baseName || 'Short automatica';
      const scheduledAt = this.getInboxScheduledAt(
        scheduleReferenceDate,
        index,
      );

      const post = await this.prisma.post.create({
        data: {
          title: title.length > 255 ? title.slice(0, 255) : title,
          description: `#Shorts\n\n${title}`,
          platform: 'YOUTUBE',
          status: 'PENDING',
          scheduledAt,
          niche: {
            connect: { id: niche.id },
          },
          user: {
            connect: { id: user.id },
          },
        },
      });

      const targetPath = resolve(queueDir, `${post.id}${extension}`);
      await rename(sourcePath, targetPath);

      await this.prisma.post.update({
        where: { id: post.id },
        data: {
          videoUrl: targetPath,
        },
      });

      importedVideos.push({
        postId: post.id,
        fileName,
        scheduledAt,
      });

      console.log(
        `📥 Short importado automaticamente | arquivo: ${fileName} | post: ${post.id}`,
      );
    }

    return importedVideos;
  }

  private getInboxScheduledAt(referenceDate: Date, offset: number): Date {
    const slotHours = [9, 13, 17];
    const baseDate = new Date(referenceDate);
    const currentMinutes = baseDate.getHours() * 60 + baseDate.getMinutes();

    let slotIndex = slotHours.findIndex((hour) => hour * 60 > currentMinutes);
    let dayOffset = 0;

    if (slotIndex === -1) {
      slotIndex = 0;
      dayOffset = 1;
    }

    const totalIndex = slotIndex + offset;
    dayOffset += Math.floor(totalIndex / slotHours.length);

    const scheduledDate = new Date(baseDate);
    scheduledDate.setHours(0, 0, 0, 0);
    scheduledDate.setDate(scheduledDate.getDate() + dayOffset);
    scheduledDate.setHours(slotHours[totalIndex % slotHours.length], 0, 0, 0);

    return scheduledDate;
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

  private async findDefaultAutoPostUser(): Promise<{ id: string } | null> {
    const preferredUserId =
      this.configService.get<string>('AUTO_POST_USER_ID')?.trim() ?? '';

    if (preferredUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: preferredUserId },
        select: { id: true },
      });

      if (user) {
        return user;
      }
    }

    return this.prisma.user.findFirst({
      where: {
        socialAccounts: {
          some: {
            platform: 'YOUTUBE',
          },
        },
      },
      select: { id: true },
    });
  }

  private async findDefaultAutoPostNiche(): Promise<{ id: string } | null> {
    const preferredNicheId =
      this.configService.get<string>('AUTO_POST_NICHE_ID')?.trim() ?? '';

    if (preferredNicheId) {
      const niche = await this.prisma.niche.findUnique({
        where: { id: preferredNicheId },
        select: { id: true, active: true },
      });

      if (niche?.active) {
        return { id: niche.id };
      }
    }

    return this.prisma.niche.findFirst({
      where: { active: true },
      select: { id: true },
    });
  }

  private getInboxDir(): string {
    return resolve(
      this.configService.get<string>('LOCAL_VIDEO_INBOX_DIR') ??
        'uploads/inbox',
    );
  }

  private getQueueDir(): string {
    return resolve(
      this.configService.get<string>('LOCAL_VIDEO_QUEUE_DIR') ??
        'uploads/queue',
    );
  }
}

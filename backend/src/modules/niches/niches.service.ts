import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { CreateNichDto } from './dto/create-nich.dto';
import { UpdateNichDto } from './dto/update-nich.dto';

@Injectable()
export class NichesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createNichDto: CreateNichDto) {
    return this.prisma.niche.create({
      data: {
        name: createNichDto.name,
        description: createNichDto.description ?? null,
        active: createNichDto.active ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.niche.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const niche = await this.prisma.niche.findUnique({
      where: { id },
    });

    if (!niche) {
      throw new NotFoundException(`Nicho com ID ${id} nao encontrado`);
    }

    return niche;
  }

  async update(id: string, updateNichDto: UpdateNichDto) {
    await this.findOne(id);

    return this.prisma.niche.update({
      where: { id },
      data: {
        name: updateNichDto.name,
        description:
          updateNichDto.description === undefined
            ? undefined
            : updateNichDto.description,
        active: updateNichDto.active,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.niche.delete({
      where: { id },
    });
  }
}

import {
  IsUUID,
  IsISO8601,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class UploadVideoPostDto {
  @IsUUID('4', { message: 'userId deve ser um UUID valido' })
  userId: string = '';

  @IsUUID('4', { message: 'nicheId deve ser um UUID valido' })
  nicheId: string = '';

  @IsString({ message: 'title deve ser uma string' })
  @MaxLength(255, { message: 'title muito grande' })
  title: string = '';

  @IsString({ message: 'description deve ser uma string' })
  @IsOptional()
  @MaxLength(500, { message: 'description muito grande' })
  description?: string;

  @IsISO8601({}, { message: 'scheduledAt deve estar no formato ISO8601' })
  scheduledAt: string = '';
}

import { IsISO8601, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator';

export class ImportYoutubePostDto {
  @IsUUID('4', { message: 'userId deve ser um UUID valido' })
  userId: string = '';

  @IsUUID('4', { message: 'nicheId deve ser um UUID valido' })
  nicheId: string = '';

  @IsUrl({}, { message: 'youtubeUrl deve ser uma URL valida' })
  @MaxLength(500, { message: 'youtubeUrl muito grande' })
  youtubeUrl: string = '';

  @IsISO8601({}, { message: 'scheduledAt deve estar no formato ISO8601' })
  @IsString()
  scheduledAt: string = '';
}

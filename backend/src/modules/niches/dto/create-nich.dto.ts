import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateNichDto {
  @IsString({ message: 'Nome do nicho deve ser texto' })
  @MinLength(2, { message: 'Nome do nicho deve ter ao menos 2 caracteres' })
  @MaxLength(60, { message: 'Nome do nicho deve ter no maximo 60 caracteres' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Descricao do nicho deve ser texto' })
  @MaxLength(255, {
    message: 'Descricao do nicho deve ter no maximo 255 caracteres',
  })
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'active deve ser true ou false' })
  active?: boolean;
}

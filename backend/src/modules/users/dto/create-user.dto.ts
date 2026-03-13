import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: `Preencha o campo` })
  @IsEmail({ message: `Endereço de e-mail inválido` })
  email: string;

  @IsOptional()
  @IsString({ message: `Preencha o campo` })
  @MinLength(3, {
    message: `O Nome deve conter no mínimo 3 caracteres`,
  })
  @MaxLength(10, {
    message: `O Nome deve conter no máximo 10 caracteres`,
  })
  name?: string;

  @IsOptional()
  @IsString({ message: `Preencha o campo` })
  @MinLength(3, {
    message: `A Senha deve conter no mínimo 3 caracteres`,
  })
  @MaxLength(20, {
    message: `A Senha deve conter no máximo 20 caracteres`,
  })
  password?: string;
}

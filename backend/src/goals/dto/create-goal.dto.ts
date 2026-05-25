import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsEmail,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CheckInInterval } from '@prisma/client';

class CreateForfeitDto {
  @ApiProperty({ example: 'Pay €20 to charity' })
  @IsString()
  @MinLength(5)
  description: string;
}

export class CreateGoalDto {
  @ApiProperty({ example: 'Run 5km three times a week' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ example: 'Training for the Dublin Marathon' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: '2025-10-01T00:00:00.000Z' })
  @IsDateString()
  deadline: string;

  @ApiPropertyOptional({ enum: CheckInInterval, default: CheckInInterval.NONE })
  @IsOptional()
  @IsEnum(CheckInInterval)
  checkInInterval?: CheckInInterval;

  @ApiProperty({ example: 'friend@example.com' })
  @IsEmail()
  partnerEmail: string;

  @ApiProperty({ type: CreateForfeitDto })
  @ValidateNested()
  @Type(() => CreateForfeitDto)
  forfeit: CreateForfeitDto;
}

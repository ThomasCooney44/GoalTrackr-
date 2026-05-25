import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsMimeType } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

class PresignedUrlDto {
  @IsString() filename: string;
  @IsString() contentType: string;
}

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('presigned-url')
  getPresignedUrl(@Request() req, @Body() dto: PresignedUrlDto) {
    return this.uploadsService.getPresignedUrl(req.user.id, dto.filename, dto.contentType);
  }
}

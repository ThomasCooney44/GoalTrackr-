import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUrl } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubmissionsService } from './submissions.service';

class CreateSubmissionDto {
  @IsString() content: string;
  @IsOptional() @IsUrl() mediaUrl?: string;
}

class ReviewSubmissionDto {
  @IsEnum(['APPROVED', 'REJECTED']) status: 'APPROVED' | 'REJECTED';
  @IsOptional() @IsString() reviewNote?: string;
}

@ApiTags('submissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  @Post('goals/:goalId/submissions')
  create(
    @Param('goalId') goalId: string,
    @Request() req,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.submissionsService.create(goalId, req.user.id, dto);
  }

  @Get('goals/:goalId/submissions')
  findAll(@Param('goalId') goalId: string, @Request() req) {
    return this.submissionsService.findAllForGoal(goalId, req.user.id);
  }

  @Patch('submissions/:id/review')
  review(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.submissionsService.review(id, req.user.id, dto);
  }
}

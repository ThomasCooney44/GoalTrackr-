import { Controller, Get, Post, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ForfeitsService } from './forfeits.service';

@ApiTags('forfeits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goals/:goalId/forfeit')
export class ForfeitsController {
  constructor(private forfeitsService: ForfeitsService) {}

  @Get()
  findOne(@Param('goalId') goalId: string, @Request() req) {
    return this.forfeitsService.findByGoal(goalId, req.user.id);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@Param('goalId') goalId: string, @Request() req) {
    return this.forfeitsService.confirm(goalId, req.user.id);
  }

  @Post('waive')
  @HttpCode(HttpStatus.OK)
  waive(@Param('goalId') goalId: string, @Request() req) {
    return this.forfeitsService.waive(goalId, req.user.id);
  }
}

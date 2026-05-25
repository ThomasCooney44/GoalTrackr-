import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private goalsService: GoalsService) {}

  @Get()
  @ApiOperation({ summary: "List current user's goals" })
  findAll(@Request() req) {
    return this.goalsService.findAll(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new goal' })
  create(@Request() req, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get goal detail' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.goalsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a goal (owner only)' })
  update(@Param('id') id: string, @Request() req, @Body() body) {
    return this.goalsService.update(id, req.user.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a goal (owner only)' })
  cancel(@Param('id') id: string, @Request() req) {
    return this.goalsService.cancel(id, req.user.id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a goal as completed (owner only)' })
  complete(@Param('id') id: string, @Request() req) {
    return this.goalsService.complete(id, req.user.id);
  }
}

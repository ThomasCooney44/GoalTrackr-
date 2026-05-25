import { Controller, Get, Patch, Query, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@Request() req) {
    return this.usersService.findMe(req.user.id);
  }

  @Patch('me')
  updateMe(@Request() req, @Body() body: { name?: string; avatarUrl?: string }) {
    return this.usersService.update(req.user.id, body);
  }

  @Get('search')
  search(@Query('q') q: string, @Request() req) {
    return this.usersService.search(q, req.user.id);
  }
}

import { Controller, Get, Post, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParticipantsService } from './participants.service';

@ApiTags('invites')
@Controller('invites')
export class ParticipantsController {
  constructor(private participantsService: ParticipantsService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Get invite details (public)' })
  getInvite(@Param('token') token: string) {
    return this.participantsService.getInviteByToken(token);
  }

  @Post(':token/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a partner invite' })
  accept(@Param('token') token: string, @Request() req) {
    return this.participantsService.accept(token, req.user.id);
  }

  @Post(':token/decline')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline a partner invite' })
  decline(@Param('token') token: string, @Request() req) {
    return this.participantsService.decline(token, req.user.id);
  }
}

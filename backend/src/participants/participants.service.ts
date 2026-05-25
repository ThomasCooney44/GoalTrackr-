import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class ParticipantsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async getInviteByToken(token: string) {
    const participant = await this.prisma.goalParticipant.findUnique({
      where: { inviteToken: token },
      include: {
        goal: {
          include: { owner: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });
    if (!participant) throw new NotFoundException('Invite not found');
    return participant;
  }

  async accept(token: string, userId: string) {
    const participant = await this.prisma.goalParticipant.findUnique({
      where: { inviteToken: token },
      include: { goal: { include: { owner: true } } },
    });

    if (!participant) throw new NotFoundException('Invite not found');
    if (participant.status !== 'PENDING')
      throw new BadRequestException('Invite has already been responded to');

    const updated = await this.prisma.goalParticipant.update({
      where: { id: participant.id },
      data: {
        status: 'ACCEPTED',
        userId,
        respondedAt: new Date(),
      },
    });

    // Notify goal owner
    await this.notifications.create({
      userId: participant.goal.ownerId,
      type: NotificationType.INVITE_ACCEPTED,
      title: 'Partner accepted your invite!',
      body: `Someone accepted to be your accountability partner for "${participant.goal.title}"`,
      relatedGoalId: participant.goalId,
    });

    return updated;
  }

  async decline(token: string, userId: string) {
    const participant = await this.prisma.goalParticipant.findUnique({
      where: { inviteToken: token },
      include: { goal: true },
    });

    if (!participant) throw new NotFoundException('Invite not found');
    if (participant.status !== 'PENDING')
      throw new BadRequestException('Invite has already been responded to');

    const updated = await this.prisma.goalParticipant.update({
      where: { id: participant.id },
      data: { status: 'DECLINED', respondedAt: new Date() },
    });

    await this.notifications.create({
      userId: participant.goal.ownerId,
      type: NotificationType.INVITE_DECLINED,
      title: 'Partner declined your invite',
      body: `Your invite for "${participant.goal.title}" was declined. You can invite someone else.`,
      relatedGoalId: participant.goalId,
    });

    return updated;
  }
}

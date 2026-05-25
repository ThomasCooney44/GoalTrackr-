import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ForfeitsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findByGoal(goalId: string, userId: string) {
    const forfeit = await this.prisma.forfeit.findUnique({
      where: { goalId },
      include: { goal: { include: { participants: { where: { status: 'ACCEPTED' } } } } },
    });
    if (!forfeit) throw new NotFoundException('Forfeit not found');

    const isOwner = forfeit.goal.ownerId === userId;
    const isPartner = forfeit.goal.participants.some((p) => p.userId === userId);
    if (!isOwner && !isPartner) throw new ForbiddenException();

    return forfeit;
  }

  async confirm(goalId: string, userId: string) {
    return this.updateForfeitStatus(goalId, userId, 'CONFIRMED', NotificationType.FORFEIT_CONFIRMED,
      'Forfeit confirmed', 'Your accountability partner confirmed the forfeit.');
  }

  async waive(goalId: string, userId: string) {
    return this.updateForfeitStatus(goalId, userId, 'WAIVED', NotificationType.FORFEIT_WAIVED,
      'Forfeit waived', 'Your accountability partner chose to waive the forfeit. Lucky you!');
  }

  private async updateForfeitStatus(
    goalId: string,
    userId: string,
    newStatus: 'CONFIRMED' | 'WAIVED',
    notifType: NotificationType,
    notifTitle: string,
    notifBody: string,
  ) {
    const forfeit = await this.prisma.forfeit.findUnique({
      where: { goalId },
      include: { goal: { include: { participants: { where: { status: 'ACCEPTED' } } } } },
    });
    if (!forfeit) throw new NotFoundException('Forfeit not found');
    if (forfeit.status !== 'TRIGGERED')
      throw new BadRequestException('Forfeit is not in TRIGGERED state');

    const isPartner = forfeit.goal.participants.some((p) => p.userId === userId);
    if (!isPartner) throw new ForbiddenException('Only the accountability partner can confirm/waive');

    const updated = await this.prisma.forfeit.update({
      where: { id: forfeit.id },
      data: { status: newStatus, confirmedAt: new Date() },
    });

    await this.notifications.create({
      userId: forfeit.goal.ownerId,
      type: notifType,
      title: notifTitle,
      body: notifBody,
      relatedGoalId: goalId,
    });

    return updated;
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { GoalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { CreateGoalDto } from './dto/create-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mail: MailService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.goal.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { participants: { some: { userId, status: 'ACCEPTED' } } },
        ],
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        forfeit: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        participants: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        submissions: {
          orderBy: { createdAt: 'desc' },
          include: { submittedBy: { select: { id: true, name: true } } },
        },
        forfeit: true,
      },
    });

    if (!goal) throw new NotFoundException('Goal not found');

    // Only owner or accepted partner can view
    const isOwner = goal.ownerId === userId;
    const isPartner = goal.participants.some(
      (p) => p.userId === userId && p.status === 'ACCEPTED',
    );
    if (!isOwner && !isPartner) throw new ForbiddenException();

    return goal;
  }

  async create(userId: string, dto: CreateGoalDto) {
    const goal = await this.prisma.goal.create({
      data: {
        ownerId: userId,
        title: dto.title,
        description: dto.description,
        deadline: new Date(dto.deadline),
        checkInInterval: dto.checkInInterval ?? 'NONE',
        forfeit: { create: { description: dto.forfeit.description } },
        participants: {
          create: { inviteEmail: dto.partnerEmail },
        },
      },
      include: {
        participants: true,
        forfeit: true,
      },
    });

    // Send invite email
    const participant = goal.participants[0];
    await this.mail.sendPartnerInvite({
      toEmail: dto.partnerEmail,
      inviteToken: participant.inviteToken,
      goalTitle: goal.title,
      ownerName: (await this.prisma.user.findUnique({ where: { id: userId } }))!.name,
    });

    return goal;
  }

  async update(id: string, userId: string, data: Partial<{ title: string; description: string; deadline: string }>) {
    await this.assertOwner(id, userId);
    return this.prisma.goal.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.deadline && { deadline: new Date(data.deadline) }),
      },
    });
  }

  async cancel(id: string, userId: string) {
    await this.assertOwner(id, userId);
    return this.prisma.goal.update({
      where: { id },
      data: { status: GoalStatus.CANCELLED },
    });
  }

  async complete(id: string, userId: string) {
    await this.assertOwner(id, userId);
    return this.prisma.goal.update({
      where: { id },
      data: { status: GoalStatus.COMPLETED },
    });
  }

  private async assertOwner(goalId: string, userId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException('Goal not found');
    if (goal.ownerId !== userId) throw new ForbiddenException('Not the goal owner');
    return goal;
  }
}

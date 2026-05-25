import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SubmissionStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(goalId: string, userId: string, data: { content: string; mediaUrl?: string }) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
      include: { participants: { where: { status: 'ACCEPTED' }, include: { user: true } } },
    });
    if (!goal) throw new NotFoundException('Goal not found');
    if (goal.ownerId !== userId) throw new ForbiddenException('Only the goal owner can submit proof');
    if (goal.status !== 'ACTIVE') throw new BadRequestException('Goal is not active');

    const submission = await this.prisma.submission.create({
      data: { goalId, submittedById: userId, content: data.content, mediaUrl: data.mediaUrl },
    });

    // Notify partner(s)
    for (const p of goal.participants) {
      if (!p.user) continue;
      await this.notifications.create({
        userId: p.user.id,
        type: NotificationType.SUBMISSION_PENDING,
        title: 'New proof submitted',
        body: `Review the latest submission for "${goal.title}"`,
        relatedGoalId: goalId,
      });
    }

    return submission;
  }

  async findAllForGoal(goalId: string, userId: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
      include: { participants: { where: { userId, status: 'ACCEPTED' } } },
    });
    if (!goal) throw new NotFoundException('Goal not found');

    const isOwner = goal.ownerId === userId;
    const isPartner = goal.participants.length > 0;
    if (!isOwner && !isPartner) throw new ForbiddenException();

    return this.prisma.submission.findMany({
      where: { goalId },
      include: {
        submittedBy: { select: { id: true, name: true, avatarUrl: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async review(
    submissionId: string,
    reviewerId: string,
    data: { status: 'APPROVED' | 'REJECTED'; reviewNote?: string },
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { goal: { include: { participants: { where: { status: 'ACCEPTED' } } } } },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    const isPartner = submission.goal.participants.some((p) => p.userId === reviewerId);
    if (!isPartner) throw new ForbiddenException('Only the accountability partner can review');

    if (submission.status !== SubmissionStatus.PENDING)
      throw new BadRequestException('Submission has already been reviewed');

    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: data.status,
        reviewNote: data.reviewNote,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });

    const notifType =
      data.status === 'APPROVED'
        ? NotificationType.SUBMISSION_APPROVED
        : NotificationType.SUBMISSION_REJECTED;

    await this.notifications.create({
      userId: submission.submittedById,
      type: notifType,
      title: data.status === 'APPROVED' ? 'Proof approved!' : 'Proof rejected',
      body:
        data.status === 'APPROVED'
          ? 'Your accountability partner approved your submission. Keep it up!'
          : `Your submission was rejected. Note: ${data.reviewNote ?? 'No reason given'}`,
      relatedGoalId: submission.goalId,
    });

    return updated;
  }
}

import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { MailService } from '../../mail/mail.service';
import { GoalStatus, NotificationType } from '@prisma/client';

@Processor('scheduled-jobs')
export class ScheduledProcessor {
  private readonly logger = new Logger(ScheduledProcessor.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mail: MailService,
  ) {}

  // ─── 1. Weekly Partner Reminder ──────────────────────────────────────────────

  @Process('weekly-partner-reminder')
  async handleWeeklyPartnerReminder(job: Job) {
    this.logger.log('Running weekly-partner-reminder');

    const activeParticipations = await this.prisma.goalParticipant.findMany({
      where: {
        status: 'ACCEPTED',
        goal: { status: GoalStatus.ACTIVE, deadline: { gt: new Date() } },
      },
      include: {
        goal: { include: { owner: true } },
        user: true,
      },
    });

    for (const p of activeParticipations) {
      if (!p.user) continue;

      await this.notifications.create({
        userId: p.user.id,
        type: NotificationType.WEEKLY_REMINDER,
        title: `Check in on ${p.goal.owner.name}'s goal`,
        body: `"${p.goal.title}" — how are they getting on?`,
        relatedGoalId: p.goalId,
      });

      await this.mail.sendWeeklyReminder({
        toEmail: p.user.email,
        partnerName: p.user.name,
        ownerName: p.goal.owner.name,
        goalTitle: p.goal.title,
        deadline: p.goal.deadline,
        goalId: p.goalId,
      });
    }

    this.logger.log(`Sent ${activeParticipations.length} weekly reminders`);
  }

  // ─── 2. Missing Submission Check ─────────────────────────────────────────────

  @Process('missing-submission-check')
  async handleMissingSubmissionCheck(job: Job) {
    this.logger.log('Running missing-submission-check');

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const activeGoals = await this.prisma.goal.findMany({
      where: {
        status: GoalStatus.ACTIVE,
        checkInInterval: { not: 'NONE' },
        deadline: { gt: new Date() },
      },
      include: { owner: true },
    });

    let notified = 0;
    for (const goal of activeGoals) {
      const recentSubmission = await this.prisma.submission.findFirst({
        where: { goalId: goal.id, createdAt: { gt: oneWeekAgo } },
      });

      if (!recentSubmission) {
        await this.notifications.create({
          userId: goal.ownerId,
          type: NotificationType.MISSING_SUBMISSION,
          title: 'Proof submission overdue',
          body: `You haven't submitted proof for "${goal.title}" this week.`,
          relatedGoalId: goal.id,
        });

        await this.mail.sendMissingSubmission({
          toEmail: goal.owner.email,
          ownerName: goal.owner.name,
          goalTitle: goal.title,
          goalId: goal.id,
        });

        notified++;
      }
    }

    this.logger.log(`Notified ${notified} users about missing submissions`);
  }

  // ─── 3. Deadline Approaching ─────────────────────────────────────────────────

  @Process('deadline-approaching')
  async handleDeadlineApproaching(job: Job) {
    this.logger.log('Running deadline-approaching');

    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Goals with deadline in exactly ~3 or ~1 days (within a 2-hour window)
    const twoHours = 2 * 60 * 60 * 1000;
    const goals = await this.prisma.goal.findMany({
      where: {
        status: GoalStatus.ACTIVE,
        OR: [
          {
            deadline: {
              gte: new Date(in3Days.getTime() - twoHours),
              lte: new Date(in3Days.getTime() + twoHours),
            },
          },
          {
            deadline: {
              gte: new Date(in1Day.getTime() - twoHours),
              lte: new Date(in1Day.getTime() + twoHours),
            },
          },
        ],
      },
      include: {
        owner: true,
        participants: { where: { status: 'ACCEPTED' }, include: { user: true } },
      },
    });

    for (const goal of goals) {
      const daysLeft = Math.round((goal.deadline.getTime() - now.getTime()) / 86400000);
      const label = daysLeft === 1 ? '1 day' : '3 days';

      // Notify owner
      await this.notifications.create({
        userId: goal.ownerId,
        type: NotificationType.DEADLINE_APPROACHING,
        title: `${label} left on your goal`,
        body: `"${goal.title}" deadline is in ${label}!`,
        relatedGoalId: goal.id,
      });

      // Notify partner(s)
      for (const p of goal.participants) {
        if (!p.user) continue;
        await this.notifications.create({
          userId: p.user.id,
          type: NotificationType.DEADLINE_APPROACHING,
          title: `${goal.owner.name}'s goal ends in ${label}`,
          body: `"${goal.title}" — keep the pressure on!`,
          relatedGoalId: goal.id,
        });
      }
    }

    this.logger.log(`Sent deadline reminders for ${goals.length} goals`);
  }

  // ─── 4. Forfeit Trigger ──────────────────────────────────────────────────────

  @Process('forfeit-trigger')
  async handleForfeitTrigger(job: Job) {
    this.logger.log('Running forfeit-trigger');

    const overdueGoals = await this.prisma.goal.findMany({
      where: {
        status: GoalStatus.ACTIVE,
        deadline: { lt: new Date() },
      },
      include: {
        owner: true,
        forfeit: true,
        participants: { where: { status: 'ACCEPTED' }, include: { user: true } },
      },
    });

    for (const goal of overdueGoals) {
      const approvedSubmission = await this.prisma.submission.findFirst({
        where: { goalId: goal.id, status: 'APPROVED' },
      });

      if (approvedSubmission) {
        // Goal completed — approved proof exists
        await this.prisma.goal.update({
          where: { id: goal.id },
          data: { status: GoalStatus.COMPLETED },
        });
        this.logger.log(`Goal ${goal.id} marked COMPLETED`);
      } else {
        // Goal failed — trigger forfeit
        await this.prisma.goal.update({
          where: { id: goal.id },
          data: { status: GoalStatus.FAILED },
        });

        if (goal.forfeit) {
          await this.prisma.forfeit.update({
            where: { id: goal.forfeit.id },
            data: { status: 'TRIGGERED', triggeredAt: new Date() },
          });
        }

        // Notify owner
        await this.notifications.create({
          userId: goal.ownerId,
          type: NotificationType.FORFEIT_TRIGGERED,
          title: 'Goal deadline missed — forfeit triggered',
          body: goal.forfeit
            ? `Forfeit: "${goal.forfeit.description}"`
            : `You missed the deadline for "${goal.title}"`,
          relatedGoalId: goal.id,
        });

        // Notify partner(s)
        for (const p of goal.participants) {
          if (!p.user) continue;
          await this.notifications.create({
            userId: p.user.id,
            type: NotificationType.FORFEIT_TRIGGERED,
            title: `${goal.owner.name} missed their goal`,
            body: `Please confirm the forfeit for "${goal.title}"`,
            relatedGoalId: goal.id,
          });

          await this.mail.sendForfeitTriggered({
            toEmail: p.user.email,
            partnerName: p.user.name,
            ownerName: goal.owner.name,
            goalTitle: goal.title,
            forfeitDescription: goal.forfeit?.description ?? 'No forfeit defined',
            goalId: goal.id,
          });
        }

        this.logger.log(`Goal ${goal.id} marked FAILED — forfeit triggered`);
      }
    }
  }
}

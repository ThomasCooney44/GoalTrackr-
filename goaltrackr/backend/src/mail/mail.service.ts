import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend;
  private from: string;
  private frontendUrl: string;

  constructor(private config: ConfigService) {
    this.resend = new Resend(config.get('RESEND_API_KEY'));
    this.from = config.get('EMAIL_FROM', 'noreply@goaltrackr.com');
    this.frontendUrl = config.get('FRONTEND_URL', 'http://localhost:3000');
  }

  async sendPartnerInvite(data: {
    toEmail: string;
    inviteToken: string;
    goalTitle: string;
    ownerName: string;
  }) {
    const inviteUrl = `${this.frontendUrl}/invite/${data.inviteToken}`;
    await this.send({
      to: data.toEmail,
      subject: `${data.ownerName} wants you as their accountability partner`,
      html: `
        <h2>You've been invited!</h2>
        <p><strong>${data.ownerName}</strong> has invited you to be their accountability partner for:</p>
        <blockquote><strong>${data.goalTitle}</strong></blockquote>
        <p>As their partner, you'll receive weekly check-ins and verify their progress.</p>
        <a href="${inviteUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
          View & Accept Invite
        </a>
        <p style="margin-top:24px;font-size:12px;color:#888">If you didn't expect this, you can safely ignore this email.</p>
      `,
    });
  }

  async sendWeeklyReminder(data: {
    toEmail: string;
    partnerName: string;
    ownerName: string;
    goalTitle: string;
    deadline: Date;
    goalId: string;
  }) {
    const goalUrl = `${this.frontendUrl}/goals/${data.goalId}`;
    await this.send({
      to: data.toEmail,
      subject: `Weekly check-in: ${data.ownerName}'s goal`,
      html: `
        <h2>Time to check in on ${data.ownerName}!</h2>
        <p>Hi ${data.partnerName},</p>
        <p>This is your weekly reminder to check in on <strong>${data.ownerName}'s</strong> progress towards their goal:</p>
        <blockquote><strong>${data.goalTitle}</strong></blockquote>
        <p>Deadline: <strong>${data.deadline.toLocaleDateString()}</strong></p>
        <a href="${goalUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
          View Goal
        </a>
      `,
    });
  }

  async sendMissingSubmission(data: {
    toEmail: string;
    ownerName: string;
    goalTitle: string;
    goalId: string;
  }) {
    const submitUrl = `${this.frontendUrl}/goals/${data.goalId}/submit`;
    await this.send({
      to: data.toEmail,
      subject: `Reminder: Submit your proof for "${data.goalTitle}"`,
      html: `
        <h2>Don't forget to submit proof!</h2>
        <p>Hi ${data.ownerName},</p>
        <p>You haven't submitted any progress proof this week for:</p>
        <blockquote><strong>${data.goalTitle}</strong></blockquote>
        <p>Your accountability partner is waiting to see your progress.</p>
        <a href="${submitUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
          Submit Proof Now
        </a>
      `,
    });
  }

  async sendForfeitTriggered(data: {
    toEmail: string;
    partnerName: string;
    ownerName: string;
    goalTitle: string;
    forfeitDescription: string;
    goalId: string;
  }) {
    const goalUrl = `${this.frontendUrl}/goals/${data.goalId}`;
    await this.send({
      to: data.toEmail,
      subject: `${data.ownerName} missed their goal — forfeit triggered`,
      html: `
        <h2>Forfeit Triggered</h2>
        <p>Hi ${data.partnerName},</p>
        <p><strong>${data.ownerName}</strong> missed the deadline for:</p>
        <blockquote><strong>${data.goalTitle}</strong></blockquote>
        <p>The agreed forfeit is: <strong>${data.forfeitDescription}</strong></p>
        <p>Please confirm or waive the forfeit.</p>
        <a href="${goalUrl}" style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
          Confirm or Waive Forfeit
        </a>
      `,
    });
  }

  private async send(opts: { to: string; subject: string; html: string }) {
    try {
      await this.resend.emails.send({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
    } catch (err) {
      // Log but don't throw — email failure shouldn't break the main flow
      this.logger.error(`Failed to send email to ${opts.to}: ${err.message}`);
    }
  }
}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JobSchedulerService } from './job-scheduler.service';
import { ScheduledProcessor } from './processors/scheduled.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'scheduled-jobs' },
      { name: 'transactional-jobs' },
    ),
    NotificationsModule,
    MailModule,
  ],
  providers: [JobSchedulerService, ScheduledProcessor],
  exports: [BullModule],
})
export class JobsModule {}

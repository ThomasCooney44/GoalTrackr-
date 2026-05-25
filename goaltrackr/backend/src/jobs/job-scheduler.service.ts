import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

/**
 * Registers all repeatable (cron-based) jobs on app startup.
 * BullMQ deduplicates by job name — safe to run on every restart.
 */
@Injectable()
export class JobSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobSchedulerService.name);

  constructor(
    @InjectQueue('scheduled-jobs') private scheduledQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    await this.registerJobs();
    this.logger.log('All background jobs registered');
  }

  private async registerJobs() {
    // Remove stale repeatable jobs first (avoids duplicates on config change)
    const existing = await this.scheduledQueue.getRepeatableJobs();
    for (const job of existing) {
      await this.scheduledQueue.removeRepeatableByKey(job.key);
    }

    // 1. Weekly partner reminder — every Monday 09:00
    await this.scheduledQueue.add(
      'weekly-partner-reminder',
      {},
      {
        repeat: { cron: '0 9 * * 1' },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: false,
      },
    );

    // 2. Missing submission check — every Friday 09:00
    await this.scheduledQueue.add(
      'missing-submission-check',
      {},
      {
        repeat: { cron: '0 9 * * 5' },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: false,
      },
    );

    // 3. Deadline approaching — daily 09:00
    await this.scheduledQueue.add(
      'deadline-approaching',
      {},
      {
        repeat: { cron: '0 9 * * *' },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: false,
      },
    );

    // 4. Forfeit trigger — daily 00:05
    await this.scheduledQueue.add(
      'forfeit-trigger',
      {},
      {
        repeat: { cron: '5 0 * * *' },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: false,
      },
    );
  }
}

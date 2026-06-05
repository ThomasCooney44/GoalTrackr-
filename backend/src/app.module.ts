import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GoalsModule } from './goals/goals.module';
import { ParticipantsModule } from './participants/participants.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { ForfeitsModule } from './forfeits/forfeits.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadsModule } from './uploads/uploads.module';
import { JobsModule } from './jobs/jobs.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    // Config — loads .env automatically
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // BullMQ / Redis — supports REDIS_URL (Railway) or REDIS_HOST/PORT (local)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          const url = new URL(redisUrl);
          return {
            redis: {
              host: url.hostname,
              port: parseInt(url.port) || 6379,
              password: url.password || undefined,
            },
          };
        }
        return {
          redis: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
          },
        };
      },
    }),

    // Feature modules
    PrismaModule,
    AuthModule,
    UsersModule,
    GoalsModule,
    ParticipantsModule,
    SubmissionsModule,
    ForfeitsModule,
    NotificationsModule,
    UploadsModule,
    JobsModule,
    MailModule,
  ],
})
export class AppModule {}

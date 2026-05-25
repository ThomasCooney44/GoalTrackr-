import { Module } from '@nestjs/common';
import { ForfeitsController } from './forfeits.controller';
import { ForfeitsService } from './forfeits.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ForfeitsController],
  providers: [ForfeitsService],
})
export class ForfeitsModule {}

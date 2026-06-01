import { Module } from '@nestjs/common';
import { AchatsService } from './achats.service';
import { AchatsController } from './achats.controller';
import { PawapayWebhooksController } from './pawapay-webhooks.controller';
import { PawapayModule } from '../pawapay/pawapay.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PawapayModule, CloudinaryModule, NotificationsModule],
  controllers: [AchatsController, PawapayWebhooksController],
  providers: [AchatsService],
  exports: [AchatsService],
})
export class AchatsModule {}

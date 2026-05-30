import { Module } from '@nestjs/common';
import { AchatsService } from './achats.service';
import { AchatsController } from './achats.controller';
import { PawapayWebhooksController } from './pawapay-webhooks.controller';
import { PawapayModule } from '../pawapay/pawapay.module';

@Module({
  imports: [PawapayModule],
  controllers: [AchatsController, PawapayWebhooksController],
  providers: [AchatsService],
  exports: [AchatsService],
})
export class AchatsModule {}

import { Module } from '@nestjs/common';
import { PawapayService } from './pawapay.service';
import { PawapayController } from './pawapay.controller';

@Module({
  controllers: [PawapayController],
  providers: [PawapayService],
  exports: [PawapayService],
})
export class PawapayModule {}

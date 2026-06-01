import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AchatsModule } from '../achats/achats.module';

@Module({
  imports: [CloudinaryModule, AchatsModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { LectureService } from './lecture.service';
import { LectureController } from './lecture.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [LectureController],
  providers: [LectureService],
})
export class LectureModule {}

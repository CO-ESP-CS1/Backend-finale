import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LivresModule } from './livres/livres.module';
import { CategoriesModule } from './categories/categories.module';
import { AchatsModule } from './achats/achats.module';
import { PawapayModule } from './pawapay/pawapay.module';
import { LectureModule } from './lecture/lecture.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AppBootstrapService } from './app-bootstrap.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    LivresModule,
    CategoriesModule,
    AchatsModule,
    PawapayModule,
    LectureModule,
    AdminModule,
    NotificationsModule,
  ],
  providers: [AppBootstrapService],
})
export class AppModule {}

import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  lister(@CurrentUser() user: { sub: string }) {
    return this.notifications.lister(user.sub);
  }

  @Get('non-lues/count')
  compterNonLues(@CurrentUser() user: { sub: string }) {
    return this.notifications.compterNonLues(user.sub).then((count) => ({ count }));
  }

  @Patch(':id/lu')
  marquerLue(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.marquerLue(id, user.sub);
  }

  @Post('marquer-toutes-lues')
  marquerToutesLues(@CurrentUser() user: { sub: string }) {
    return this.notifications.marquerToutesLues(user.sub);
  }
}

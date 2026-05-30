import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { AchatsService } from './achats.service';

/**
 * Callbacks Pawapay — URLs à configurer dans le dashboard (sandbox / prod).
 * Préfixe global : /api → ex. /api/webhooks/pawapay/deposits
 */
@Controller('webhooks/pawapay')
export class PawapayWebhooksController {
  private readonly logger = new Logger(PawapayWebhooksController.name);

  constructor(private achats: AchatsService) {}

  @Post('deposits')
  @HttpCode(HttpStatus.OK)
  async deposit(
    @Body()
    body: {
      depositId: string;
      status: string;
      providerTransactionId?: string;
    },
  ) {
    this.logger.log(
      `Callback dépôt ${body.depositId} → ${body.status}`,
    );
    return this.achats.traiterCallback({
      depositId: body.depositId,
      status: body.status as 'COMPLETED' | 'FAILED',
      providerTransactionId: body.providerTransactionId,
    });
  }

  /** Non utilisé par Bibliothec ; requis par le dashboard Pawapay. */
  @Post('payouts')
  @HttpCode(HttpStatus.OK)
  payout(@Body() body: Record<string, unknown>) {
    this.logger.log(`Callback payout reçu : ${JSON.stringify(body)}`);
    return { recu: true };
  }

  /** Non utilisé par Bibliothec ; requis par le dashboard Pawapay. */
  @Post('refunds')
  @HttpCode(HttpStatus.OK)
  refund(@Body() body: Record<string, unknown>) {
    this.logger.log(`Callback refund reçu : ${JSON.stringify(body)}`);
    return { recu: true };
  }
}

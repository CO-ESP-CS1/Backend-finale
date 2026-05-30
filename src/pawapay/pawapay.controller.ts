import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PAWAPAY_DEVISE_DEFAUT,
  PAWAPAY_OPERATEURS,
  PAWAPAY_PROVIDER_DEFAUT,
  PAWAPAY_MSISDN_TEST,
} from './pawapay.constants';

@Controller('pawapay')
export class PawapayController {
  constructor(private config: ConfigService) {}

  /** Liste des opérateurs Mobile Money acceptés (MTN + Airtel, Congo-Brazzaville). */
  @Get('operateurs')
  listerOperateurs() {
    return {
      pays: 'Congo-Brazzaville',
      devise: this.config.get('PAWAPAY_DEFAULT_CURRENCY', PAWAPAY_DEVISE_DEFAUT),
      operateurParDefaut: this.config.get(
        'PAWAPAY_DEFAULT_PROVIDER',
        PAWAPAY_PROVIDER_DEFAUT,
      ),
      operateurs: PAWAPAY_OPERATEURS,
      numerosTestSandbox: PAWAPAY_MSISDN_TEST,
    };
  }
}

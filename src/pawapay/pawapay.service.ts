import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  PawapayDepositCallback,
  PawapayDepositInitResponse,
} from './pawapay.types';

@Injectable()
export class PawapayService {
  private readonly logger = new Logger(PawapayService.name);
  private readonly client: AxiosInstance;
  private readonly mode: string;

  constructor(private config: ConfigService) {
    this.mode = config.get<string>('PAWAPAY_MODE', 'simulate');
    const baseURL = config.get<string>(
      'PAWAPAY_API_URL',
      'https://api.sandbox.pawapay.io',
    );
    const token = config.get<string>('PAWAPAY_API_TOKEN', '');

    this.client = axios.create({
      baseURL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 30000,
    });
  }

  isSimulate(): boolean {
    return this.mode === 'simulate';
  }

  isSandbox(): boolean {
    return this.mode === 'sandbox' || this.mode === 'live';
  }

  private ensureToken(): void {
    if (this.isSandbox() && !this.config.get<string>('PAWAPAY_API_TOKEN')) {
      throw new BadRequestException(
        'PAWAPAY_API_TOKEN manquant — générez-le dans le dashboard Pawapay après avoir enregistré les callback URLs',
      );
    }
  }

  /**
   * Initie un dépôt Pawapay. depositId = id de l'achat (UUID).
   * @see https://docs.pawapay.io/v2/api-reference/deposits/initiate-deposit
   */
  async initierDepot(params: {
    depositId: string;
    amount: string;
    currency: string;
    phoneNumber: string;
    provider: string;
  }): Promise<PawapayDepositInitResponse> {
    if (this.isSimulate()) {
      this.logger.log(`[SIMULATE] Dépôt ${params.depositId} accepté`);
      return {
        depositId: params.depositId,
        status: 'ACCEPTED',
        created: new Date().toISOString(),
      };
    }

    this.ensureToken();

    const { data } = await this.client.post<PawapayDepositInitResponse>(
      '/v2/deposits',
      {
        depositId: params.depositId,
        amount: params.amount,
        currency: params.currency,
        payer: {
          type: 'MMO',
          accountDetails: {
            phoneNumber: params.phoneNumber,
            provider: params.provider,
          },
        },
      },
    );
    return data;
  }

  /** @see https://docs.pawapay.io/v2/api-reference/deposits/check-deposit-status */
  async verifierStatut(depositId: string) {
    if (this.isSimulate()) {
      return { depositId, status: 'COMPLETED' as const };
    }
    const { data } = await this.client.get(`/v2/deposits/${depositId}`);
    return data;
  }

  /** Simule le callback Pawapay (sandbox ou mode simulate). */
  callbackSimule(depositId: string): PawapayDepositCallback {
    return {
      depositId,
      status: 'COMPLETED',
      amount: undefined,
      currency: this.config.get('PAWAPAY_DEFAULT_CURRENCY', 'XAF'),
      providerTransactionId: `sim-${depositId.slice(0, 8)}`,
    };
  }
}

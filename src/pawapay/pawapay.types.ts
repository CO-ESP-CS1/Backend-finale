export type PawapayDepositInitStatus =
  | 'ACCEPTED'
  | 'REJECTED'
  | 'DUPLICATE_IGNORED';

export type PawapayDepositFinalStatus =
  | 'COMPLETED'
  | 'FAILED'
  | 'NOT_FOUND'
  | 'ACCEPTED'
  | 'PROCESSING';

export interface PawapayDepositInitResponse {
  depositId: string;
  status: PawapayDepositInitStatus;
  created?: string;
  failureReason?: { failureCode: string; failureMessage: string };
}

export interface PawapayDepositCallback {
  depositId: string;
  status: PawapayDepositFinalStatus;
  amount?: string;
  currency?: string;
  providerTransactionId?: string;
  failureReason?: { failureCode: string; failureMessage: string };
}

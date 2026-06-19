// Context the JWT authorizer Lambda forwards to downstream handlers.
export interface AuthContext {
  userId: string;
  email: string;
}

// One SQS message == one (commitment, missed date) penalty to process.
export interface ChargeMessage {
  goalId: string;
  userId: string;
  missedDate: string; // YYYY-MM-DD
  amountCents: number;
  title: string;
}

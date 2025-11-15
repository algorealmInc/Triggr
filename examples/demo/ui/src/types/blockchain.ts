export interface BlockchainEvent {
  id: string;
  from: string | null;
  value: number;
  message: string;
  timestamp: Date;
}

import { BlockchainEvent } from "@/types/blockchain";

const messages = [
  "Transaction confirmed on chain",
  "Smart contract executed successfully",
  "Value transferred between accounts",
  "New block mined and validated",
  "Deployment completed",
  "Token swap executed",
  "Staking rewards distributed",
  "NFT minted successfully",
  "Governance vote recorded",
  "Liquidity pool updated",
];

const generateRandomAddress = (): string => {
  const chars = "0123456789abcdef";
  let address = "0x";
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
};

export const generateMockEvent = (previousValue: number): BlockchainEvent => {
  const increment = Math.floor(Math.random() * 100) + 1;
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    from: Math.random() > 0.1 ? generateRandomAddress() : null,
    value: previousValue + increment,
    message: messages[Math.floor(Math.random() * messages.length)],
    timestamp: new Date(),
  };
};

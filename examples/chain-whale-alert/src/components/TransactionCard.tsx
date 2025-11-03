import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Transaction {
  id: string;
  from: string;
  amount: number;
  timestamp: Date;
  hash: string;
}

interface TransactionCardProps {
  transaction: Transaction;
}

const TransactionCard = ({ transaction }: TransactionCardProps) => {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <Card className="p-4 bg-card border-border hover:border-primary/50 transition-all duration-300 animate-in slide-in-from-top-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">From</span>
            <code className="text-sm text-foreground font-mono">{formatAddress(transaction.from)}</code>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatTime(transaction.timestamp)}</span>
            <span>•</span>
            <code className="font-mono">{formatAddress(transaction.hash)}</code>
          </div>
        </div>
        
        <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-primary font-mono">
            {formatAmount(transaction.amount)}
          </div>
          <div className="text-xs text-muted-foreground">PAS</div>
        </div>
      </div>
    </Card>
  );
};

export default TransactionCard;

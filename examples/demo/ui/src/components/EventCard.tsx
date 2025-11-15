import { Card } from "@/components/ui/card";
import { BlockchainEvent } from "@/types/blockchain";
import { Activity } from "lucide-react";

interface EventCardProps {
  event: BlockchainEvent;
}

const EventCard = ({ event }: EventCardProps) => {
  const formatAddress = (address: string | null) => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <Card className="p-4 bg-card border-border hover:border-primary/50 transition-all duration-300 animate-fade-in backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Activity className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-muted-foreground font-mono">
              {formatTime(event.timestamp)}
            </span>
            <span className="text-sm font-mono text-primary">
              {event.value.toLocaleString()} units
            </span>
          </div>
          <div className="mb-2">
            <span className="text-xs text-muted-foreground">From: </span>
            <span className="text-sm font-mono text-foreground">
              {formatAddress(event.from)}
            </span>
          </div>
          <p className="text-sm text-foreground/80 break-words">
            {event.message}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default EventCard;

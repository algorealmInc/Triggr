import { Card } from "@/components/ui/card";
import { TrendingUp, Activity } from "lucide-react";

interface StatsPanelProps {
  totalEvents: number;
  totalValue: number;
}

const StatsPanel = ({ totalEvents, totalValue }: StatsPanelProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Card className="p-6 bg-gradient-primary border-0 shadow-glow">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-background/20 backdrop-blur-sm">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-primary-foreground/80 font-medium">Total Events</p>
            <p className="text-3xl font-bold text-primary-foreground font-mono">
              {totalEvents.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card border-primary/30">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Cumulative Value</p>
            <p className="text-3xl font-bold text-foreground font-mono">
              {totalValue.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StatsPanel;

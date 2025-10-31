import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";

interface LeaderboardEntryProps {
  rank: number;
  minter: string;
  mintCount: number;
  totalValue: string;
  trend: "up" | "down" | "same";
}

const LeaderboardEntry = ({ rank, minter, mintCount, totalValue, trend }: LeaderboardEntryProps) => {
  const getRankIcon = () => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-accent-foreground" />;
      case 2:
        return <Medal className="w-6 h-6 text-secondary-foreground" />;
      case 3:
        return <Award className="w-6 h-6 text-primary-foreground" />;
      default:
        return <span className="text-xl font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankStyle = () => {
    switch (rank) {
      case 1:
        return "gradient-accent glow-accent border-accent/30";
      case 2:
        return "gradient-secondary glow-secondary border-secondary/30";
      case 3:
        return "gradient-primary glow-primary border-primary/30";
      default:
        return "bg-card/70 border-border";
    }
  };

  return (
    <Card className={`p-4 transition-all duration-300 hover:scale-102 ${getRankStyle()} backdrop-blur-sm`}>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
          {getRankIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-foreground truncate">{minter}</h4>
          <p className="text-sm text-muted-foreground">
            {mintCount} NFTs minted • {totalValue} ETH
          </p>
        </div>
        <div className="flex items-center gap-2">
          {trend === "up" && (
            <TrendingUp className="w-4 h-4 text-secondary" />
          )}
          <Badge variant="outline" className="border-current">
            {mintCount}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

export default LeaderboardEntry;

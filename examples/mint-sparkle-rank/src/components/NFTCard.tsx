import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";

interface NFTCardProps {
  id: string;
  name: string;
  image: string;
  minter: string;
  timestamp: string;
  rarity?: "common" | "rare" | "legendary";
}

const NFTCard = ({ name, image, minter, timestamp, rarity = "common" }: NFTCardProps) => {
  const rarityColors = {
    common: "bg-muted text-muted-foreground",
    rare: "gradient-secondary text-secondary-foreground",
    legendary: "gradient-accent text-accent-foreground glow-accent",
  };

  return (
    <Card className="overflow-hidden border-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-slide-up">
      <div className="relative aspect-square overflow-hidden">
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
        {rarity === "legendary" && (
          <div className="absolute top-2 right-2">
            <Flame className="w-6 h-6 text-accent-foreground animate-pulse-glow" />
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-foreground truncate">{name}</h3>
          <Badge className={rarityColors[rarity]}>
            {rarity}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Minted by <span className="text-secondary font-semibold">{minter}</span>
        </p>
        <p className="text-xs text-muted-foreground">{timestamp}</p>
      </div>
    </Card>
  );
};

export default NFTCard;

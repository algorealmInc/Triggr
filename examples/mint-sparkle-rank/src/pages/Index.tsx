import { useState, useEffect } from "react";
import NFTCard from "@/components/NFTCard";
import LeaderboardEntry from "@/components/LeaderboardEntry";
import StatsCard from "@/components/StatsCard";
import { Zap, Users, Flame, TrendingUp } from "lucide-react";
import logo from "@/assets/nft-xp-logo.png";

interface NFT {
  id: string;
  name: string;
  image: string;
  minter: string;
  timestamp: string;
  rarity: "common" | "rare" | "legendary";
}

interface Minter {
  name: string;
  mintCount: number;
  totalValue: string;
  trend: "up" | "down" | "same";
}

const Index = () => {
  const [nfts, setNfts] = useState<NFT[]>([
    {
      id: "1",
      name: "Cosmic Warrior #1",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop",
      minter: "CryptoMaster",
      timestamp: "2 mins ago",
      rarity: "legendary",
    },
    {
      id: "2",
      name: "Digital Dreams #42",
      image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=400&fit=crop",
      minter: "NFTCollector",
      timestamp: "5 mins ago",
      rarity: "rare",
    },
    {
      id: "3",
      name: "Neon Galaxy #7",
      image: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=400&h=400&fit=crop",
      minter: "ArtLover99",
      timestamp: "8 mins ago",
      rarity: "common",
    },
    {
      id: "4",
      name: "Cyber Punk #23",
      image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&h=400&fit=crop",
      minter: "DigitalArtist",
      timestamp: "12 mins ago",
      rarity: "rare",
    },
  ]);

  const [leaderboard, setLeaderboard] = useState<Minter[]>([
    { name: "CryptoMaster", mintCount: 47, totalValue: "12.5", trend: "up" },
    { name: "NFTCollector", mintCount: 38, totalValue: "9.8", trend: "up" },
    { name: "DigitalArtist", mintCount: 32, totalValue: "8.2", trend: "same" },
    { name: "ArtLover99", mintCount: 28, totalValue: "7.1", trend: "up" },
    { name: "MetaCreator", mintCount: 24, totalValue: "6.3", trend: "down" },
  ]);

  // Simulate new NFT minting
  useEffect(() => {
    const interval = setInterval(() => {
      const newNFT: NFT = {
        id: Date.now().toString(),
        name: `NFT #${Math.floor(Math.random() * 1000)}`,
        image: `https://images.unsplash.com/photo-${1618005182384 + Math.floor(Math.random() * 1000)}-a83a8bd57fbe?w=400&h=400&fit=crop`,
        minter: ["CryptoMaster", "NFTCollector", "ArtLover99", "DigitalArtist"][Math.floor(Math.random() * 4)],
        timestamp: "Just now",
        rarity: Math.random() > 0.8 ? "legendary" : Math.random() > 0.5 ? "rare" : "common",
      };
      
      setNfts(prev => [newNFT, ...prev].slice(0, 8));
    }, 10000); // New NFT every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="text-center space-y-4 mb-12">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="NFT-XP Logo" className="h-24 md:h-32 animate-glow" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold">
            <span className="gradient-primary bg-clip-text text-transparent">
              NFT Leaderboard
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track the hottest mints and top collectors in real-time
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <StatsCard title="Total Mints" value="1,247" icon={Zap} trend="+12% today" />
          <StatsCard title="Active Minters" value="342" icon={Users} trend="+8 new" />
          <StatsCard title="Total Volume" value="156 PAS" icon={Flame} trend="+23% today" />
          <StatsCard title="Floor Price" value="0.5 PAS" icon={TrendingUp} trend="+5%" />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Mints */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-foreground">Recent Mints</h2>
              <div className="flex items-center gap-2 text-secondary">
                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse-glow" />
                <span className="text-sm font-medium">Live</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nfts.map((nft) => (
                <NFTCard key={nft.id} {...nft} />
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-foreground">Top Minters</h2>
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <LeaderboardEntry
                  key={entry.name}
                  rank={index + 1}
                  minter={entry.name}
                  mintCount={entry.mintCount}
                  totalValue={entry.totalValue}
                  trend={entry.trend}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

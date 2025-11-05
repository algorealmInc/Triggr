import { useState } from "react";
import ThresholdConfig from "@/components/ThresholdConfig";
import TransactionFeed from "@/components/TransactionFeed";
import { Waves } from "lucide-react";

const Index = () => {
  const [threshold, setThreshold] = useState(10);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10 backdrop-blur-sm">
              <Waves className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              WhaleWatcher
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Monitor large blockchain transactions in real-time
          </p>
        </header>

        {/* Threshold Configuration */}
        <div className="mb-8 p-6 rounded-2xl bg-card border border-border shadow-lg">
          <ThresholdConfig
            currentThreshold={threshold}
            onThresholdChange={setThreshold}
          />
        </div>

        {/* Transaction Feed */}
        <TransactionFeed threshold={threshold} />
      </div>
    </div>
  );
};

export default Index;

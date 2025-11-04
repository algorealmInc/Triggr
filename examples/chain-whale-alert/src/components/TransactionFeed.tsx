import { useEffect, useState } from "react";
import TransactionCard from "./TransactionCard";
import { Activity } from "lucide-react";
import { TriggrSDK } from "triggr-ts-sdk";

interface Transaction {
  id: string;
  from: string;
  amount: number;
  timestamp: Date;
  hash: string;
}

interface TransactionFeedProps {
  threshold: number;
}

const TransactionFeed = ({ threshold }: TransactionFeedProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize a triggr client
    const client = new TriggrSDK({
      apiKey: "R1hwSv7Eeg7vaTf_0t5cudPEYgqkf9-geXY8NuXs26A",
    });

    client.connect();

    client.on("open", () => {
      console.log("Connected to Triggr");
      setIsConnected(true);

      // Listen for changes in the "transactions" collection
      client.onCollectionChange("transactions", (change: any) => {
        const tx = change.document;

        // Only keep transactions above threshold
        if (tx.amount >= threshold) {
          setTransactions((prev) => {
            const updated = [tx, ...prev].slice(0, 20);
            // Sort newest first
            return updated.sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            );
          });
        }
      });
    });

    client.on("close", () => {
      console.log("Disconnected from Triggr");
      setIsConnected(false);
    });

    return () => {
      client.disconnect();
      client.offCollectionChange("transactions", () => {});
    };
  }, [threshold]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Activity className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Live Transactions</h2>
        <div className="ml-auto flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-primary animate-pulse" : "bg-gray-400"
            }`}
          />
          <span className="text-sm">
            {isConnected ? "Monitoring" : "Disconnected"}
          </span>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Waiting for transactions above {threshold} PAS...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <TransactionCard key={tx.id} transaction={tx} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionFeed;

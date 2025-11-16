import { useState, useEffect } from "react";
import { BlockchainEvent } from "@/types/blockchain";
import { generateMockEvent } from "@/utils/mockEvents";
import EventCard from "@/components/EventCard";
import StatsPanel from "@/components/StatsPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TriggrSDK } from "triggr-ts-sdk";

const Index = () => {
  const [events, setEvents] = useState<BlockchainEvent[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize a triggr client
    const client = new TriggrSDK({
      apiKey: "Scit-1vK9yaVzFcWcpbnx6-xxcqWwoT6DAH8Qpc_nw4",
    });

    // Connect
    client.connect();

    client.on("connected", () => {
      console.log("Connected to Triggr");
      setIsConnected(true);
  
      // Subscribe to "transfers" collection
      client.onCollectionChange("transactions", (payload: any) => {
        const event = payload.data;
  
        // Add event to list
        setEvents((prev) => {
          const next = [event, ...prev].slice(0, 50);
          return next;
        });
  
        // Update total value based on event.amount
        setTotalValue(event.amount);
      });
    });
  
    // Handle disconnect
    client.on("disconnected", () => {
      console.log("Disconnected from Triggr");
      setIsConnected(false);
    });

    return () => {
      client.disconnect();
      client.offCollectionChange("transactions", () => {});
    };
  },  []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <span className="text-2xl font-bold text-primary-foreground">T</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Triggr Demo</h1>
              <p className="text-sm text-muted-foreground">Monitor smart contract events in real-time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <StatsPanel totalEvents={events.length} totalValue={totalValue} />

        {/* Event Stream */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse-glow"></span>
            Live Event Stream
          </h2>
        </div>

        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              Waiting for events...
            </div>
          ) : (
            events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;

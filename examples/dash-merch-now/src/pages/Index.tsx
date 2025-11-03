import { useState, useEffect } from "react";
import { DollarSign, ShoppingCart, Package, AlertTriangle } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PurchasesFeed } from "@/components/dashboard/PurchasesFeed";
import { InventoryTable } from "@/components/dashboard/InventoryTable";
import { mockPurchases, mockProducts, mockStats, simulateRealtimeUpdate } from "@/data/mockData";
import { Purchase } from "@/types/dashboard";

const Index = () => {
  const [purchases, setPurchases] = useState<Purchase[]>(mockPurchases);

  useEffect(() => {
    // Simulate real-time purchases - replace with your real backend subscription
    const cleanup = simulateRealtimeUpdate((newPurchase) => {
      setPurchases((prev) => [newPurchase, ...prev].slice(0, 10));
    }, 8000);

    return cleanup;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ecommerce Dashboard</h1>
            <p className="text-muted-foreground mt-1">Real-time sales and inventory tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">Live</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Revenue"
            value={`$${mockStats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatsCard
            title="Total Orders"
            value={mockStats.totalOrders}
            icon={ShoppingCart}
            trend={{ value: 8.2, isPositive: true }}
          />
          <StatsCard
            title="Low Stock Items"
            value={mockStats.lowStockItems}
            icon={AlertTriangle}
          />
          <StatsCard
            title="Active Products"
            value={mockStats.activeProducts}
            icon={Package}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <PurchasesFeed purchases={purchases} />
          <InventoryTable products={mockProducts} />
        </div>
      </div>
    </div>
  );
};

export default Index;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Purchase } from "@/types/dashboard";
import { formatDistanceToNow } from "date-fns";

interface PurchasesFeedProps {
  purchases: Purchase[];
}

export const PurchasesFeed = ({ purchases }: PurchasesFeedProps) => {
  const getStatusColor = (status: Purchase['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Recent Purchases</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {purchases.map((purchase) => (
            <div
              key={purchase.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">{purchase.product}</p>
                <p className="text-sm text-muted-foreground">{purchase.customer}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(purchase.timestamp, { addSuffix: true })}
                </p>
              </div>
              <div className="text-right space-y-2">
                <p className="font-semibold">${purchase.amount.toFixed(2)}</p>
                <Badge variant="outline" className={getStatusColor(purchase.status)}>
                  {purchase.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

import { useState } from "react";
import { CreditCard, FileText, Settings, ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface BillingPageProps {
  onBack: () => void;
}

// Mock payment history data
const mockPaymentHistory = [
  { id: 1, date: "2025-01-15", plan: "Pro Plan", amount: "$29.00", status: "Paid" },
  { id: 2, date: "2024-12-15", plan: "Pro Plan", amount: "$29.00", status: "Paid" },
  { id: 3, date: "2024-11-15", plan: "Pro Plan", amount: "$29.00", status: "Paid" },
  { id: 4, date: "2024-10-15", plan: "Starter Plan", amount: "$9.00", status: "Paid" },
  { id: 5, date: "2024-09-15", plan: "Starter Plan", amount: "$9.00", status: "Paid" },
];

export function BillingPage({ onBack }: BillingPageProps) {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // Mock billing data
  const [currentPlan] = useState("Pro Plan");
  const [expiryDate] = useState("2025-02-15");
  const [cardLast4] = useState("4242");

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Billing & Subscription
            </h1>
          </div>
          
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Current Plan Card */}
          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-2xl font-bold">{currentPlan}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Renews on {new Date(expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsUpgradeModalOpen(true)}>
                      Change Plan
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Projects</p>
                    <p className="text-lg font-semibold">Unlimited</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Storage</p>
                    <p className="text-lg font-semibold">100 GB</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">API Calls</p>
                    <p className="text-lg font-semibold">1M / month</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Card */}
          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">•••• •••• •••• {cardLast4}</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2027</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsPaymentModalOpen(true)}>
                  Update Payment Method
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment History Card */}
          <Card className="shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Payment History
              </CardTitle>
              <CardDescription>View your transaction history and invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockPaymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {new Date(payment.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{payment.plan}</TableCell>
                        <TableCell>{payment.amount}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "Paid" ? "default" : "secondary"}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground border-t border-border pt-8">
          © 2025 Triggr. All rights reserved.
        </footer>
      </main>

      {/* Upgrade/Change Plan Modal */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>Choose the plan that works best for you</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <Card className="cursor-pointer hover:shadow-elevated transition-all">
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <p className="text-3xl font-bold">$9<span className="text-sm text-muted-foreground">/mo</span></p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✓ 5 Projects</li>
                  <li>✓ 10 GB Storage</li>
                  <li>✓ 100K API Calls</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="border-primary cursor-pointer shadow-glow">
              <CardHeader>
                <Badge className="w-fit mb-2">Current Plan</Badge>
                <CardTitle>Pro</CardTitle>
                <p className="text-3xl font-bold">$29<span className="text-sm text-muted-foreground">/mo</span></p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✓ Unlimited Projects</li>
                  <li>✓ 100 GB Storage</li>
                  <li>✓ 1M API Calls</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-elevated transition-all">
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <p className="text-3xl font-bold">$99<span className="text-sm text-muted-foreground">/mo</span></p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✓ Unlimited Everything</li>
                  <li>✓ Priority Support</li>
                  <li>✓ Custom SLA</li>
                </ul>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Payment Method Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Method</DialogTitle>
            <DialogDescription>Enter your card details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="card-number">Card Number</Label>
              <Input
                id="card-number"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>
              <div>
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  placeholder="123"
                  maxLength={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsPaymentModalOpen(false)}>Save Payment Method</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

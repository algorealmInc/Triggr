import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface Rule {
  id: string;
  name: string;
  description: string;
  code: string;
  status: "active" | "inactive" | "pending";
  deployedAt?: Date;
  lastRun?: Date;
  targetCollection?: string;
  targetDocument?: string;
}

interface ViewRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: Rule | null;
}

export function ViewRuleModal({
  open,
  onOpenChange,
  rule,
}: ViewRuleModalProps) {
  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <DialogTitle>{rule.name}</DialogTitle>
                <Badge 
                  variant={rule.status === "active" ? "default" : "secondary"}
                  className={rule.status === "active" ? "bg-success" : ""}
                >
                  {rule.status}
                </Badge>
              </div>
              <DialogDescription className="mt-1">
                {rule.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Rule ID:</span>
              <p className="font-mono mt-1">{rule.id}</p>
            </div>
            {rule.deployedAt && (
              <div>
                <span className="text-muted-foreground">Deployed:</span>
                <p className="mt-1">{rule.deployedAt.toLocaleString()}</p>
              </div>
            )}
            {rule.lastRun && (
              <div>
                <span className="text-muted-foreground">Last Run:</span>
                <p className="mt-1">{rule.lastRun.toLocaleString()}</p>
              </div>
            )}
            {rule.targetCollection && (
              <div>
                <span className="text-muted-foreground">Target:</span>
                <p className="mt-1 text-primary">
                  {rule.targetCollection}{rule.targetDocument ? `/${rule.targetDocument}` : ""}
                </p>
              </div>
            )}
          </div>

          {/* Code */}
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Rule Code:</span>
            <ScrollArea className="max-h-[400px]">
              <div className="bg-console-bg border border-console-border rounded-lg p-4 font-mono text-sm">
                <pre className="text-foreground overflow-x-auto">
                  {rule.code}
                </pre>
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

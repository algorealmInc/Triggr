import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";

interface ViewDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentData: Record<string, any>;
  documentId: string;
  collectionName: string;
}

export function ViewDocumentModal({
  open,
  onOpenChange,
  documentData,
  documentId,
  collectionName,
}: ViewDocumentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>View Document</DialogTitle>
              <DialogDescription className="mt-1">
                {collectionName} / {documentId}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          <div className="bg-console-bg border border-console-border rounded-lg p-4 font-mono text-sm">
            <pre className="text-foreground overflow-x-auto">
              {JSON.stringify(documentData, null, 2)}
            </pre>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

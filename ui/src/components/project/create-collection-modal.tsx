import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";

interface CreateCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCollection: (name: string) => void;
}

export function CreateCollectionModal({
  open,
  onOpenChange,
  onCreateCollection,
}: CreateCollectionModalProps) {
  const [collectionName, setCollectionName] = useState("");

  const handleCreate = () => {
    if (collectionName.trim()) {
      onCreateCollection(collectionName.trim());
      setCollectionName("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Create Collection</DialogTitle>
          </div>
          <DialogDescription>
            Collections are containers for documents. Choose a descriptive name for your collection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="collection-name">Collection Name</Label>
            <Input
              id="collection-name"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="e.g., users, products, orders"
              className="transition-all duration-300 focus:shadow-glow"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Use lowercase letters, numbers, and underscores only
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!collectionName.trim()}
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            Create Collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

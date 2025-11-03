import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDocument: (data: Record<string, any>) => void;
  collectionName: string;
}

interface Field {
  id: string;
  key: string;
  value: string;
}

export function AddDocumentModal({
  open,
  onOpenChange,
  onAddDocument,
  collectionName,
}: AddDocumentModalProps) {
  const [fields, setFields] = useState<Field[]>([
    { id: "1", key: "", value: "" }
  ]);

  const addField = () => {
    setFields([...fields, { id: Date.now().toString(), key: "", value: "" }]);
  };

  const removeField = (id: string) => {
    if (fields.length > 1) {
      setFields(fields.filter(field => field.id !== id));
    }
  };

  const updateField = (id: string, type: "key" | "value", newValue: string) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, [type]: newValue } : field
    ));
  };

  const handleCreate = () => {
    const data: Record<string, any> = {};
    fields.forEach(field => {
      if (field.key.trim()) {
        // Try to parse value as JSON, otherwise keep as string
        try {
          const parsed = JSON.parse(field.value);
          data[field.key.trim()] = parsed;
        } catch {
          data[field.key.trim()] = field.value;
        }
      }
    });

    if (Object.keys(data).length > 0) {
      onAddDocument(data);
      setFields([{ id: "1", key: "", value: "" }]);
      onOpenChange(false);
    }
  };

  const isValid = fields.some(field => field.key.trim() !== "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Document to {collectionName}</DialogTitle>
          <DialogDescription>
            Add key-value pairs to create a new document. Values can be strings, numbers, booleans, or JSON.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3 py-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start space-x-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    {index === 0 && <Label className="text-xs">Key</Label>}
                    <Input
                      value={field.key}
                      onChange={(e) => updateField(field.id, "key", e.target.value)}
                      placeholder="field_name"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    {index === 0 && <Label className="text-xs">Value</Label>}
                    <Input
                      value={field.value}
                      onChange={(e) => updateField(field.id, "value", e.target.value)}
                      placeholder="value or JSON"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeField(field.id)}
                  disabled={fields.length === 1}
                  className="mt-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Button
          variant="outline"
          size="sm"
          onClick={addField}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Field
        </Button>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!isValid}
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            Add Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

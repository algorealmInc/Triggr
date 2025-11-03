import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditDocument: (data: Record<string, any>) => void;
  collectionName: string;
  documentData: Record<string, any>;
}

interface Field {
  id: string;
  key: string;
  value: string;
}

export function EditDocumentModal({
  open,
  onOpenChange,
  onEditDocument,
  collectionName,
  documentData,
}: EditDocumentModalProps) {
  const [fields, setFields] = useState<Field[]>([]);

  useEffect(() => {
    if (open && documentData) {
      const initialFields = Object.entries(documentData).map(([key, value], index) => ({
        id: `field_${index}`,
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      }));
      setFields(initialFields.length > 0 ? initialFields : [{ id: "1", key: "", value: "" }]);
    }
  }, [open, documentData]);

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

  const handleSave = () => {
    const data: Record<string, any> = {};
    fields.forEach(field => {
      if (field.key.trim()) {
        try {
          const parsed = JSON.parse(field.value);
          data[field.key.trim()] = parsed;
        } catch {
          data[field.key.trim()] = field.value;
        }
      }
    });

    if (Object.keys(data).length > 0) {
      onEditDocument(data);
      onOpenChange(false);
    }
  };

  const isValid = fields.some(field => field.key.trim() !== "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Document in {collectionName}</DialogTitle>
          <DialogDescription>
            Update key-value pairs. Values can be strings, numbers, booleans, or JSON.
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
            onClick={handleSave}
            disabled={!isValid}
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

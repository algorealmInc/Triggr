import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Zap, Type, Check, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AddDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDocument: (data: Record<string, any>, documentId?: string) => void;
  collectionName: string;
}

interface Field {
  id: string;
  key: string;
  value: string;
}

type ModalStep = "id-selection" | "document-data";
type IDMode = "auto" | "custom" | null;

export function AddDocumentModal({
  open,
  onOpenChange,
  onAddDocument,
  collectionName,
}: AddDocumentModalProps) {
  const [step, setStep] = useState<ModalStep>("id-selection");
  const [idMode, setIdMode] = useState<IDMode>(null);
  const [customId, setCustomId] = useState("");
  const [fields, setFields] = useState<Field[]>([
    { id: "1", key: "", value: "" },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  const addField = () => {
    setFields([...fields, { id: Date.now().toString(), key: "", value: "" }]);
  };

  const removeField = (id: string) => {
    if (fields.length > 1) {
      setFields(fields.filter((field) => field.id !== id));
    }
  };

  const updateField = (id: string, type: "key" | "value", newValue: string) => {
    setFields(
      fields.map((field) =>
        field.id === id ? { ...field, [type]: newValue } : field
      )
    );
  };

  const handleIDSelection = (mode: IDMode) => {
    setIdMode(mode);
    setStep("document-data");
  };

  const handleCreate = async () => {
    const data: Record<string, any> = {};
    fields.forEach((field) => {
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
      // If custom ID mode and no ID provided, don't submit
      if (idMode === "custom" && !customId.trim()) {
        return;
      }

      setIsCreating(true);
      try {
        await Promise.resolve(
          onAddDocument(data, idMode === "custom" ? customId.trim() : undefined)
        );

        // Reset form
        setFields([{ id: "1", key: "", value: "" }]);
        setIdMode(null);
        setCustomId("");
        setStep("id-selection");
        onOpenChange(false);
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleBack = () => {
    setStep("id-selection");
    setIdMode(null);
    setCustomId("");
  };

  const handleClose = () => {
    setFields([{ id: "1", key: "", value: "" }]);
    setIdMode(null);
    setCustomId("");
    setStep("id-selection");
    onOpenChange(false);
  };

  const isDataValid = fields.some((field) => field.key.trim() !== "");
  const isCustomIdValid =
    idMode === "custom" ? customId.trim().length > 0 : true;
  const canSubmit = isDataValid && isCustomIdValid;

  // Step 1: ID Selection
  if (step === "id-selection") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Document in {collectionName}</DialogTitle>
            <DialogDescription>
              How would you like to identify this document?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-6">
            {/* Auto-Generate Option */}
            <Card
              className={`p-4 cursor-pointer transition-all duration-200 border-2 ${
                idMode === "auto"
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:border-primary/30 hover:bg-muted/50"
              }`}
              onClick={() => handleIDSelection("auto")}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    idMode === "auto"
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  }`}
                >
                  {idMode === "auto" && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div>
                      <p className="font-semibold text-base">
                        Auto-Generate ID
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Let the system generate a unique ID (UUID) for this
                        document
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Badge className="bg-primary/20 text-primary border-0">
                    Recommended
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Custom ID Option */}
            <Card
              className={`p-4 cursor-pointer transition-all duration-200 border-2 ${
                idMode === "custom"
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:border-primary/30 hover:bg-muted/50"
              }`}
              onClick={() => handleIDSelection("custom")}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    idMode === "custom"
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  }`}
                >
                  {idMode === "custom" && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div>
                      <p className="font-semibold text-base">Custom ID</p>
                      <p className="text-sm text-muted-foreground">
                        Provide your own ID for this document
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={() => handleIDSelection(idMode)}
              disabled={idMode === null}
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 2: Document Data
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Document to {collectionName}</DialogTitle>
          <DialogDescription>
            {idMode === "custom"
              ? "Set the document ID and add key-value pairs"
              : "Add key-value pairs to create a new document"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Custom ID Input - if custom mode selected */}
          {idMode === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-doc-id" className="text-sm font-medium">
                Document ID
              </Label>
              <Input
                id="custom-doc-id"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                placeholder="Enter a unique document ID"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Choose a unique identifier for this document
              </p>
            </div>
          )}

          {/* Document Fields */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Document Fields</Label>
            <p className="text-xs text-muted-foreground">
              Add key-value pairs. Values can be strings, numbers, booleans, or
              JSON.
            </p>
          </div>

          <ScrollArea className="max-h-[350px] pr-4">
            <div className="space-y-3 py-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start space-x-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      {index === 0 && <Label className="text-xs">Key</Label>}
                      <Input
                        value={field.key}
                        onChange={(e) =>
                          updateField(field.id, "key", e.target.value)
                        }
                        placeholder="field_name"
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      {index === 0 && <Label className="text-xs">Value</Label>}
                      <Input
                        value={field.value}
                        onChange={(e) =>
                          updateField(field.id, "value", e.target.value)
                        }
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isCreating}
          >
            Back
          </Button>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!canSubmit || isCreating}
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : idMode === "custom" ? (
              "Create Document"
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

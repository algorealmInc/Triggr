import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface EditRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: Rule | null;
  onEditRule: (updatedRule: Rule) => void;
  collections: string[];
}

export function EditRuleModal({
  open,
  onOpenChange,
  rule,
  onEditRule,
  collections,
}: EditRuleModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [targetCollection, setTargetCollection] = useState<string>("");
  const [targetDocument, setTargetDocument] = useState<string>("");

  useEffect(() => {
    if (open && rule) {
      setName(rule.name);
      setDescription(rule.description);
      setCode(rule.code);
      setTargetCollection(rule.targetCollection || "");
      setTargetDocument(rule.targetDocument || "");
    }
  }, [open, rule]);

  const handleSave = () => {
    if (!rule) return;

    const updatedRule: Rule = {
      ...rule,
      name,
      description,
      code,
      targetCollection: targetCollection || undefined,
      targetDocument: targetDocument || undefined,
    };

    onEditRule(updatedRule);
    onOpenChange(false);
  };

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Edit Rule</DialogTitle>
              <DialogDescription className="mt-1">
                Update rule configuration and code
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-rule-name">Rule Name</Label>
              <Input
                id="edit-rule-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter rule name"
                className="transition-all duration-300 focus:shadow-glow"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rule-description">Description</Label>
              <Input
                id="edit-rule-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this rule does"
                className="transition-all duration-300 focus:shadow-glow"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-target-collection">Target Collection (Optional)</Label>
              <Select value={targetCollection} onValueChange={setTargetCollection}>
                <SelectTrigger id="edit-target-collection" className="transition-all duration-300 focus:shadow-glow">
                  <SelectValue placeholder="Select a collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {collections.map((col) => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-target-document">Target Document ID (Optional)</Label>
              <Input
                id="edit-target-document"
                value={targetDocument}
                onChange={(e) => setTargetDocument(e.target.value)}
                placeholder="e.g., user_123 or doc_456"
                className="transition-all duration-300 focus:shadow-glow"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-rule-code">Rule Code</Label>
            <Textarea
              id="edit-rule-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Write your trigger rule code here..."
              className="font-mono text-sm h-64 bg-console-bg border-console-border transition-all duration-300 focus:shadow-glow resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!name.trim() || !code.trim()}
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

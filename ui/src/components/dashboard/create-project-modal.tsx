import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Project {
  id: string;
  name: string;
  contractNodeAddress: string;
  contractHash: string;
  description?: string;
  createdAt: Date;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Omit<Project, "id" | "createdAt">) => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onCreateProject,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [contractNodeAddress, setContractNodeAddress] = useState("");
  const [contractHash, setContractHash] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name || !contractNodeAddress || !contractHash) return;

    setIsSubmitting(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onCreateProject({
      name,
      contractNodeAddress,
      contractHash,
      description: description || undefined,
    });

    // Reset form
    setName("");
    setContractNodeAddress("");
    setContractHash("");
    setDescription("");
    setIsSubmitting(false);
    onClose();
  };

  const isValid = name && contractNodeAddress && contractHash;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Project</DialogTitle>
          <DialogDescription>
            Set up a new project on the Triggr platform
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name *</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome DApp"
              className="transition-all duration-300 focus:shadow-glow"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contract-address">Contract Node Address *</Label>
            <Input
              id="contract-address"
              value={contractNodeAddress}
              onChange={(e) => setContractNodeAddress(e.target.value)}
              placeholder="wss://rpc.polkadot.io"
              className="transition-all duration-300 focus:shadow-glow"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contract-hash">Contract Hash *</Label>
            <Input
              id="contract-hash"
              value={contractHash}
              onChange={(e) => setContractHash(e.target.value)}
              placeholder="0x1234567890abcdef..."
              className="transition-all duration-300 focus:shadow-glow"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of your project"
              className="transition-all duration-300 focus:shadow-glow resize-none"
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            {isSubmitting ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileJson, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  validateContractFile,
  getValidationErrorMessage,
} from "@/lib/validators/contract-metadata";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading?: boolean;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [contractAddr, setContractAddr] = useState("");
  const [description, setDescription] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (uploadedFile) {
      // File has been uploaded and validated
    }
  }, [uploadedFile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setValidationResult(null);

    try {
      // Validate JSON file structure
      const result = await validateContractFile(file);

      if (!result.isValid) {
        setValidationResult(result);
        const errorMessage = getValidationErrorMessage(result.errors);
        toast({
          title: "Invalid contract JSON",
          description: errorMessage,
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      // File is valid, store it
      setValidationResult(result);
      setUploadedFile(file);

      toast({
        title: "File validated",
        description: `${file.name} is ready to submit`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!name || !contractAddr || !description || !uploadedFile) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields and upload your contract JSON.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Verify file is valid
      if (!(uploadedFile instanceof File)) {
        toast({
          title: "Invalid file",
          description: "Please re-upload a valid JSON file.",
          variant: "destructive",
        });
        return;
      }

      // Verify validation result exists and is valid
      if (!validationResult || !validationResult.isValid) {
        toast({
          title: "Invalid contract JSON",
          description:
            "Please re-upload a valid contract JSON file with required fields.",
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      formData.append("project_name", name);
      formData.append("contract_addr", contractAddr);
      formData.append("description", description);

      // Append file with explicit filename
      formData.append("contracts_json", uploadedFile, uploadedFile.name);

      await onSubmit(formData);

      // Reset form after successful submission
      setName("");
      setContractAddr("");
      setDescription("");
      setUploadedFile(null);
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong while creating the project.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    if (!isLoading && !isUploading) {
      setName("");
      setContractAddr("");
      setDescription("");
      setUploadedFile(null);
      setValidationResult(null);
      onClose();
    }
  };

  const isValid = !!name && !!contractAddr && !!description && !!uploadedFile;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Project</DialogTitle>
          <DialogDescription>
            Set up a new project on the Triggr platform
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name *</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome DApp"
              className="transition-all duration-300 focus:shadow-glow"
              disabled={isLoading}
            />
          </div>

          {/* Contract Address */}
          <div className="space-y-2">
            <Label htmlFor="contract-addr">Contract Address *</Label>
            <Input
              id="contract-addr"
              value={contractAddr}
              onChange={(e) => setContractAddr(e.target.value)}
              placeholder="0x1234567890abcdef..."
              className="transition-all duration-300 focus:shadow-glow"
              disabled={isLoading}
            />
          </div>

          {/* Contracts JSON Upload */}
          <div className="space-y-2">
            <Label htmlFor="contracts_json">Contracts JSON *</Label>

            {!uploadedFile ? (
              <div
                onClick={() =>
                  !isLoading && !isUploading && fileInputRef.current?.click()
                }
                className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-300 ${
                  isLoading || isUploading
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                } ${
                  isUploading
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary hover:bg-primary/5"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading || isLoading}
                />

                <div className="flex flex-col items-center justify-center gap-3">
                  {isUploading ? (
                    <>
                      <div className="relative">
                        <Upload className="h-10 w-10 text-primary animate-bounce" />
                        <div className="absolute inset-0 animate-ping">
                          <Upload className="h-10 w-10 text-primary opacity-20" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-primary">
                        Uploading...
                      </p>
                      <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary animate-[slideRight_1.5s_ease-in-out_infinite]"
                          style={{
                            animation: "slideRight 1.5s ease-in-out infinite",
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <FileJson className="h-10 w-10 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          Click to upload contract JSON
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Only .json files are accepted
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative border border-primary rounded-lg p-4 bg-primary/5 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    className="flex-shrink-0"
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description of your project"
              className="transition-all duration-300 focus:shadow-glow resize-none"
              rows={3}
              disabled={isLoading || isUploading}
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading || isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isLoading || isUploading}
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            {isLoading ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

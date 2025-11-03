import { useState, useEffect } from "react";
import { Copy, Key, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ApiKeyDisplayModalProps {
  isOpen: boolean;
  apiKey: string;
  projectName: string;
  onClose: () => void;
  onContinue?: () => void;
}

export function ApiKeyDisplayModal({
  isOpen,
  apiKey,
  projectName,
  onClose,
  onContinue,
}: ApiKeyDisplayModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setHasCopied(false);
    }
  }, [isOpen]);

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setHasCopied(true);

    toast({
      title: "Copied!",
      description: "API key copied to clipboard",
    });

    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = () => {
    onContinue?.();
    onClose();
  };

  // Prevent closing the dialog by passing false to onOpenChange
  const handleOpenChange = (open: boolean) => {
    if (!open && !hasCopied) {
      // Only prevent closing if they haven't copied yet
      toast({
        title: "Please copy your API key",
        description: "You must copy your API key before continuing",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">API Key Created</DialogTitle>
          <DialogDescription>
            Your project "{projectName}" has been successfully created!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Alert */}
          <div className="flex gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 dark:text-amber-200">
              <p className="font-semibold mb-1">Important</p>
              <p>
                This API key will only be shown once. Save it now in a secure
                location.
              </p>
            </div>
          </div>

          {/* API Key Display */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Your API Key</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="pl-10 pr-3 py-2 font-mono text-sm bg-muted border border-border rounded-md flex items-center select-none text-muted-foreground">
                  {"*".repeat(Math.min(apiKey.length, 50))}
                </div>
              </div>
              <Button
                onClick={handleCopyApiKey}
                className="flex-shrink-0 bg-gradient-primary hover:shadow-glow transition-all duration-300"
                title="Copy API key to clipboard"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-white" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Information */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground">
            <p className="font-medium mb-2">Next Steps:</p>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>• Store this API key securely (e.g., in your .env file)</li>
              <li>• You can use it immediately to authenticate requests</li>
              <li>• You'll need it to access your project via the API</li>
            </ul>
          </div>
        </div>

        {/* Footer Buttons */}
        <DialogFooter className="gap-2">
          <Button
            onClick={handleContinue}
            disabled={!hasCopied}
            className={`${
              hasCopied
                ? "bg-gradient-primary hover:shadow-glow"
                : "opacity-50 cursor-not-allowed"
            } transition-all duration-300`}
          >
            {hasCopied ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Continue to Project
              </>
            ) : (
              "Copy key first to continue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

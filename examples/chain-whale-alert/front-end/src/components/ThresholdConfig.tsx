import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ThresholdConfigProps {
  onThresholdChange: (threshold: number) => void;
  currentThreshold: number;
}

const ThresholdConfig = ({ onThresholdChange, currentThreshold }: ThresholdConfigProps) => {
  const [inputValue, setInputValue] = useState(currentThreshold.toString());
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(inputValue);
    if (!isNaN(value) && value > 0) {
      onThresholdChange(value);
      toast({
        title: "Threshold Updated",
        description: `New alert threshold set to ${value} UNITs.`,
      });
    } else {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid number greater than 0.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
      <div className="flex-1 w-full">
        <Label htmlFor="threshold" className="text-sm text-muted-foreground mb-2 block">
          Alert Threshold (UNIT)
        </Label>
        <Input
          id="threshold"
          type="number"
          step="0.1"
          min="0.1"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="bg-secondary border-border"
          placeholder="Enter threshold amount..."
        />
      </div>
      <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
        <Settings className="w-4 h-4 mr-2" />
        Update
      </Button>
    </form>
  );
};

export default ThresholdConfig;

import { useState } from "react";
import { Play, Square, Check, Terminal, Zap, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViewRuleModal } from "./view-rule-modal";
import { EditRuleModal } from "./edit-rule-modal";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  contractNodeAddress: string;
  contractHash: string;
  description?: string;
  createdAt: Date;
}

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

interface TriggersPageProps {
  project: Project;
}

export function TriggersPage({ project }: TriggersPageProps) {
  const { toast } = useToast();
  const [consoleCode, setConsoleCode] = useState(`// Write your trigger rule here
function onTransactionReceived(event) {
  const { amount, sender, receiver } = event.data;
  
  if (amount > 1000) {
    // Notify large transaction
    console.log(\`Large transaction: \${amount} from \${sender}\`);
    
    // Add to monitoring collection
    database.collection("large_transactions").add({
      amount,
      sender, 
      receiver,
      timestamp: new Date(),
      flagged: true
    });
  }
  
  return { success: true };
}`);

  const [ruleName, setRuleName] = useState("Large Transaction Monitor");
  const [ruleDescription, setRuleDescription] = useState("Monitors and flags transactions over 1000 tokens");
  const [targetCollection, setTargetCollection] = useState<string>("");
  const [targetDocument, setTargetDocument] = useState<string>("");

  // Mock collections for targeting
  const mockCollections = ["users", "transactions", "contracts", "large_transactions"];
  
  const [rules, setRules] = useState<Rule[]>([
    {
      id: "rule1",
      name: "Balance Checker",
      description: "Validates user balance before transactions",
      code: "function validateBalance(event) { ... }",
      status: "active",
      deployedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      lastRun: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
      id: "rule2", 
      name: "Spam Detection",
      description: "Detects and blocks spam transactions",
      code: "function detectSpam(event) { ... }",
      status: "active",
      deployedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      lastRun: new Date(Date.now() - 2 * 60 * 1000),
    },
    {
      id: "rule3",
      name: "Gas Optimizer", 
      description: "Optimizes gas usage for contract calls",
      code: "function optimizeGas(event) { ... }",
      status: "inactive",
      deployedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  ]);

  const [consoleOutput, setConsoleOutput] = useState<string[]>([
    "Triggr Console v1.0.0",
    "Connected to: " + project.contractNodeAddress,
    "Ready for deployment...",
  ]);

  // Modals
  const [showViewRule, setShowViewRule] = useState(false);
  const [showEditRule, setShowEditRule] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);

  const handleDeploy = () => {
    if (!consoleCode.trim()) return;
    
    setConsoleOutput(prev => [...prev, 
      "> Deploying rule...",
      "✓ Validating code syntax",
      "✓ Checking permissions", 
      "✓ Uploading to blockchain",
      "✓ Rule deployed successfully!",
      `Rule ID: rule_${Date.now()}`,
    ]);

    const newRule: Rule = {
      id: `rule_${Date.now()}`,
      name: ruleName,
      description: ruleDescription,
      code: consoleCode,
      status: "active",
      deployedAt: new Date(),
      targetCollection: targetCollection || undefined,
      targetDocument: targetDocument || undefined,
    };

    setRules(prev => [newRule, ...prev]);
    setConsoleCode("");
    setRuleName("");
    setRuleDescription("");
    setTargetCollection("");
    setTargetDocument("");
  };

  const handleValidate = () => {
    setConsoleOutput(prev => [...prev,
      "> Validating code...",
      "✓ Syntax check passed",
      "✓ Security scan completed", 
      "✓ Performance analysis OK",
      "Code is valid and ready for deployment!",
    ]);
  };

  const handleClear = () => {
    setConsoleOutput([
      "Triggr Console v1.0.0",
      "Connected to: " + project.contractNodeAddress,
      "Console cleared. Ready for new commands...",
    ]);
  };

  const toggleRuleStatus = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { ...rule, status: rule.status === "active" ? "inactive" : "active" }
        : rule
    ));
  };

  const handleEditRule = (updatedRule: Rule) => {
    setRules(prev => prev.map(rule => 
      rule.id === updatedRule.id ? updatedRule : rule
    ));
    toast({
      title: "Rule updated",
      description: "Trigger rule has been updated successfully.",
    });
  };

  const deleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
    toast({
      title: "Rule deleted",
      description: "Trigger rule has been deleted.",
    });
  };

  return (
    <div className="p-6 space-y-8">
      {/* Console Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Terminal className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Developer Console</h2>
        </div>

        {/* Rule Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name">Rule Name</Label>
            <Input
              id="rule-name"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="Enter rule name"
              className="transition-all duration-300 focus:shadow-glow"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-description">Description</Label>
            <Input
              id="rule-description"
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder="Describe what this rule does"
              className="transition-all duration-300 focus:shadow-glow"
            />
          </div>
        </div>

        {/* Target Collection & Document (Optional) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="target-collection">Target Collection (Optional)</Label>
            <Select value={targetCollection} onValueChange={setTargetCollection}>
              <SelectTrigger id="target-collection" className="transition-all duration-300 focus:shadow-glow">
                <SelectValue placeholder="Select a collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {mockCollections.map((col) => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-document">Target Document ID (Optional)</Label>
            <Input
              id="target-document"
              value={targetDocument}
              onChange={(e) => setTargetDocument(e.target.value)}
              placeholder="e.g., user_123 or doc_456"
              className="transition-all duration-300 focus:shadow-glow"
            />
          </div>
        </div>

        {/* Code Editor */}
        <div className="space-y-3">
          <Label>Rule Code</Label>
          <Textarea
            value={consoleCode}
            onChange={(e) => setConsoleCode(e.target.value)}
            placeholder="Write your trigger rule code here..."
            className="font-mono text-sm h-64 bg-console-bg border-console-border transition-all duration-300 focus:shadow-glow resize-none"
          />
        </div>

        {/* Console Actions */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={handleDeploy}
            disabled={!consoleCode.trim() || !ruleName.trim()}
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            <Play className="mr-2 h-4 w-4" />
            Deploy
          </Button>
          <Button 
            variant="outline"
            onClick={handleValidate}
            disabled={!consoleCode.trim()}
            className="transition-all duration-300 hover:shadow-glow"
          >
            <Check className="mr-2 h-4 w-4" />
            Validate
          </Button>
          <Button 
            variant="secondary"
            onClick={handleClear}
            className="transition-all duration-300"
          >
            <Square className="mr-2 h-4 w-4" />
            Clear Console
          </Button>
        </div>

        {/* Console Output */}
        <div className="bg-console-bg border border-console-border rounded-lg p-4 h-32 overflow-y-auto">
          <div className="font-mono text-sm space-y-1">
            {consoleOutput.map((line, index) => (
              <div 
                key={index}
                className={`${
                  line.startsWith(">") ? "text-primary" : 
                  line.startsWith("✓") ? "text-success" :
                  line.startsWith("✗") ? "text-destructive" :
                  "text-muted-foreground"
                }`}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deployed Rules Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Zap className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Deployed Rules</h2>
          </div>
          <Badge variant="secondary">
            {rules.length} rules
          </Badge>
        </div>

        {rules.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No rules deployed yet</p>
              <p className="text-sm text-muted-foreground">
                Deploy your first rule using the console above
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {rules.map((rule) => (
              <Card 
                key={rule.id}
                className="transition-all duration-300 hover:shadow-elevated"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center space-x-3">
                        <span>{rule.name}</span>
                        <Badge 
                          variant={rule.status === "active" ? "default" : "secondary"}
                          className={rule.status === "active" ? "bg-success" : ""}
                        >
                          {rule.status}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {rule.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {rule.deployedAt && (
                          <span>Deployed {rule.deployedAt.toLocaleString()}</span>
                        )}
                        {rule.lastRun && (
                          <span>Last run {rule.lastRun.toLocaleString()}</span>
                        )}
                        {rule.targetCollection && (
                          <span className="text-primary">→ {rule.targetCollection}{rule.targetDocument ? `/${rule.targetDocument}` : ""}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant={rule.status === "active" ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleRuleStatus(rule.id)}
                      >
                        {rule.status === "active" ? (
                          <>
                            <Square className="mr-1 h-3 w-3" />
                            Disable
                          </>
                        ) : (
                          <>
                            <Play className="mr-1 h-3 w-3" />
                            Enable
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedRule(rule);
                          setShowViewRule(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedRule(rule);
                          setShowEditRule(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteRule(rule.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="bg-console-bg border border-console-border rounded p-3">
                    <code className="text-xs text-muted-foreground font-mono">
                      {rule.code.length > 100 
                        ? `${rule.code.substring(0, 100)}...` 
                        : rule.code
                      }
                    </code>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ViewRuleModal
        open={showViewRule}
        onOpenChange={setShowViewRule}
        rule={selectedRule}
      />

      <EditRuleModal
        open={showEditRule}
        onOpenChange={setShowEditRule}
        rule={selectedRule}
        onEditRule={handleEditRule}
        collections={mockCollections}
      />
    </div>
  );
}
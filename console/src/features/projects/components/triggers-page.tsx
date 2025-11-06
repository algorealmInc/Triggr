import { useState, useEffect } from "react";
import {
  Play,
  Square,
  Check,
  Terminal,
  Zap,
  Eye,
  Trash2,
  Loader2,
  ArrowUpLeft,
  ArrowUpRight,
} from "lucide-react";
import { DSLCodeEditor } from "@/components/dsl-code-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ViewRuleModal } from "./view-rule-modal";
import { useToast } from "@/hooks/use-toast";
import { useTriggerService, Trigger } from "@/lib/api/triggers.service";
import { useConsoleService } from "@/lib/api/console.service";
import { Link, useParams } from "react-router-dom";
import { ContractEvent, generateDSL } from "@/lib/generateDsl";
import {
  DSLValidator,
  logValidationResult,
} from "@/lib/validators/dsl-validator";

interface Project {
  id: string;
  contract_address: string;
  contract_events: ContractEvent[];
  description?: string;
  createdAt: Date;
}

interface TriggersPageProps {
  project: Project;
}

export function TriggersPage({ project }: TriggersPageProps) {
  const { toast } = useToast();
  // const params = useParams();
  // const projectId = params.projectId || "";
  // const { useGetProject } = useConsoleService();
  // const projectQuery = useGetProject(projectId);
  // console.log({ project, uery: projectQuery.data });
  const {
    useListTriggers,
    useCreateTrigger,
    useUpdateTriggerState,
    useDeleteTrigger,
  } = useTriggerService();

  // Queries and Mutations
  const {
    data: triggers,
    isLoading: isTriggersLoading,
    error,
  } = useListTriggers(project.contract_address);
  const createTrigger = useCreateTrigger();
  const updateTriggerState = useUpdateTriggerState();
  const deleteTrigger = useDeleteTrigger();

  const [consoleCode, setConsoleCode] = useState(() =>
    project.contract_events ? generateDSL(project.contract_events) : ``
  );

  const [triggerName, setTriggerName] = useState("");
  const [triggerDescription, setTriggerDescription] = useState("");
  const [contractAddress, setContractAddress] = useState(
    project.contract_address
  );

  const [consoleOutput, setConsoleOutput] = useState<string[]>([
    "Triggr Console v1.0.0",
    "Contract Address: " + project.contract_address,
    "Ready for deployment...",
  ]);

  // Modals
  const [showViewRule, setShowViewRule] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Trigger | null>(null);

  // Update console output on error
  useEffect(() => {
    if (error) {
      setConsoleOutput((prev) => [
        ...prev,
        "✗ Error loading triggers",
        `✗ ${error.message}`,
      ]);
    }
  }, [error]);

  const handleDeploy = async () => {
    if (!consoleCode.trim() || !triggerName.trim()) return;

    setConsoleOutput((prev) => [
      ...prev,
      "> Deploying trigger...",
      "✓ Validating code syntax",
      "✓ Removing comments",
      "✓ Uploading to server",
    ]);

    try {
      // Remove comments from code before sending to server
      const cleanedCode = consoleCode.replace(/\/\*[\s\S]*?\*\//g, "");

      // Format the trigger code as expected by the API
      const triggerPayload = `const events = ${JSON.stringify([
        {
          name: triggerName,
          description: triggerDescription,
        },
      ])}`;

      await createTrigger.mutateAsync({
        id: triggerName.toLowerCase().replace(/\s+/g, "_"),
        contract_addr: contractAddress,
        description: triggerDescription,
        trigger: cleanedCode,
      });

      setConsoleOutput((prev) => [
        ...prev,
        "✓ Trigger deployed successfully!",
        `Trigger ID: ${triggerName.toLowerCase().replace(/\s+/g, "_")}`,
      ]);

      toast({
        title: "Trigger deployed",
        description: "Your trigger has been deployed successfully.",
      });

      // Reset form
      setConsoleCode("");
      setTriggerName("");
      setTriggerDescription("");
      setContractAddress(project.contract_address);
    } catch (err: any) {
      setConsoleOutput((prev) => [
        ...prev,
        "✗ Deployment failed",
        `✗ ${err.message || "Unknown error occurred"}`,
      ]);

      toast({
        title: "Deployment failed",
        description: err.message || "Failed to deploy trigger",
        variant: "destructive",
      });
    }
  };

  const handleValidate = () => {
    setConsoleOutput((prev) => [...prev, "> Validating DSL code..."]);

    const validator = new DSLValidator();
    const result = validator.validate(consoleCode);

    // Log to browser console
    logValidationResult(result);

    // Log to console output
    if (result.valid) {
      setConsoleOutput((prev) => [
        ...prev,
        "✓ Syntax validation passed",
        `✓ Found ${result.events.length} event(s)`,
        `✓ Found ${result.rules.length} rule(s)`,
        "✓ DSL is valid and ready for deployment!",
      ]);

      toast({
        title: "Validation successful",
        description: "Your DSL code is valid and ready to deploy.",
      });
    } else {
      setConsoleOutput((prev) => [
        ...prev,
        `✗ Validation failed with ${result.errors.length} error(s)`,
        ...result.errors.map((err) => {
          const lineInfo = err.line > 0 ? ` (Line ${err.line})` : "";
          return `✗ ${err.message}${lineInfo}`;
        }),
        ...result.warnings.map((warn) => `⚠ ${warn.message}`),
      ]);

      toast({
        title: "Validation failed",
        description: `Found ${result.errors.length} error(s) in your DSL code.`,
        variant: "destructive",
      });
    }
  };

  const handleClear = () => {
    setConsoleOutput([
      "Triggr Console v1.0.0",
      "Connected to: " + project.contract_address,
      "Console cleared. Ready for new commands...",
    ]);
  };

  const toggleTriggerStatus = async (
    triggerId: string,
    currentActive: boolean
  ) => {
    const isEnabling = !currentActive;
    const action = isEnabling ? "enabled" : "disabled";
    const actionUpper = isEnabling ? "ENABLED" : "DISABLED";

    // Log to console output
    setConsoleOutput((prev) => [
      ...prev,
      `> Trigger ${action}: ${triggerId}`,
      `✓ Trigger "${triggerId}" has been ${action} successfully`,
    ]);

    try {
      await updateTriggerState.mutateAsync({
        triggerId,
        active: !currentActive,
        contractId: project.contract_address,
      });

      toast({
        title: currentActive ? "Trigger disabled" : "Trigger enabled",
        description: `Trigger has been ${
          currentActive ? "disabled" : "enabled"
        } successfully.`,
      });

      // Log successful status change
      console.log(`🔄 Trigger ${actionUpper}: ${triggerId}`, {
        triggerId,
        newStatus: isEnabling ? "active" : "inactive",
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      // Log error to console output
      setConsoleOutput((prev) => [
        ...prev,
        `✗ Failed to ${action} trigger: ${triggerId}`,
        `✗ ${err.message || "Unknown error occurred"}`,
      ]);

      toast({
        title: "Failed to update trigger",
        description: err.message || "Could not update trigger status",
        variant: "destructive",
      });

      // Log error to browser console
      console.error(`❌ Trigger ${actionUpper} Failed: ${triggerId}`, {
        triggerId,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleDeleteTrigger = async (triggerId: string) => {
    try {
      await deleteTrigger.mutateAsync({
        triggerId,
        contractAddress: project.contract_address,
      });

      toast({
        title: "Trigger deleted",
        description: "Trigger has been deleted successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to delete trigger",
        description: err.message || "Could not delete trigger",
        variant: "destructive",
      });
    }
  };

  const isLoading = isTriggersLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading triggers...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !triggers) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="text-destructive text-4xl mb-2">⚠️</div>
            <h3 className="text-lg font-semibold">Failed to Load Triggers</h3>
            <p className="text-sm text-muted-foreground">
              {error.message || "An error occurred while loading triggers"}
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Console Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Terminal className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Developer Console</h2>
        </div>

        {/* Trigger Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="trigger-name">Trigger Name</Label>
            <Input
              id="trigger-name"
              value={triggerName}
              onChange={(e) => setTriggerName(e.target.value)}
              placeholder="Enter trigger name"
              className="transition-all duration-300 focus:shadow-glow"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trigger-description">Description</Label>
            <Input
              id="trigger-description"
              value={triggerDescription}
              onChange={(e) => setTriggerDescription(e.target.value)}
              placeholder="Describe what this trigger does"
              className="transition-all duration-300 focus:shadow-glow"
            />
          </div>
        </div>

        {/* Code Editor */}
        <div className="space-y-3">
          <Label>Trigger Code</Label>
          <DSLCodeEditor
            value={consoleCode}
            onChange={(value) => setConsoleCode(value)}
            placeholder="Write your trigger code here..."
            minHeight={256}
          />
          <Link
            to={"/"}
            className="hover:underline text-primary font-medium inline-flex items-center gap-x-2 text-sm"
          >
            <span>Learn more on writing triggrs here</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Console Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleDeploy}
            disabled={
              !consoleCode.trim() ||
              !triggerName.trim() ||
              createTrigger.isPending
            }
            className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            {createTrigger.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Deploy
              </>
            )}
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
        <div className="bg-console-bg border border-console-border rounded-lg p-4 h-48 overflow-y-auto scrollbar-hide">
          <div className="font-mono text-sm space-y-1">
            {consoleOutput.map((line, index) => (
              <div
                key={index}
                className={`${
                  line.startsWith(">")
                    ? "text-primary"
                    : line.startsWith("✓")
                    ? "text-success"
                    : line.startsWith("✗")
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deployed Triggers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Zap className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Deployed Triggers</h2>
          </div>
          <Badge variant="secondary">{triggers?.length || 0} triggers</Badge>
        </div>

        {!triggers || triggers.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Zap className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                No triggers deployed yet
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Deploy your first trigger using the developer console above to
                start automating your smart contract events.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 max-w-lg mx-auto text-left">
                <p className="text-xs text-muted-foreground mb-2 font-semibold">
                  Quick Start:
                </p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Write your trigger function in the code editor</li>
                  <li>Give it a descriptive name and description</li>
                  <li>Validate your code for syntax errors</li>
                  <li>Click Deploy to activate your trigger</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {triggers.map((trigger) => {
              // Parse trigger code if it's a JSON string
              let displayCode = trigger.dsl.trim();
              let displayDescription = trigger.description;

              // try {
              //   if (trigger.dsl.startsWith("const events")) {
              //     const parsed = JSON.parse(
              //       trigger.dsl.replace("const events = ", "")
              //     );
              //     if (Array.isArray(parsed) && parsed[0]) {
              //       displayCode = parsed[0].code || trigger.trigger;
              //       displayDescription =
              //         parsed[0].description || trigger.description;
              //     }
              //   }
              // } catch (e) {
              //   // Use original if parsing fails
              // }

              return (
                <Card
                  key={trigger.id}
                  className="transition-all duration-300 hover:shadow-elevated"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="flex items-center space-x-3">
                          <span>{trigger.id}</span>
                          <Badge
                            variant={trigger.active ? "default" : "secondary"}
                            className={trigger.active ? "bg-success" : ""}
                          >
                            {trigger.active ? "active" : "inactive"}
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {displayDescription}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {trigger.last_run ? (
                            <span>
                              Last run:{" "}
                              {new Date(trigger.last_run).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/70">
                              Never run
                            </span>
                          )}
                          {trigger.created && (
                            <span>
                              Deployed{" "}
                              {new Date(trigger.created).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant={trigger.active ? "outline" : "default"}
                          size="sm"
                          onClick={() =>
                            toggleTriggerStatus(
                              trigger.id,
                              trigger.active || false
                            )
                          }
                          disabled={updateTriggerState.isPending}
                        >
                          {updateTriggerState.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : trigger.active ? (
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
                            setSelectedRule(trigger);
                            setShowViewRule(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTrigger(trigger.id)}
                          disabled={deleteTrigger.isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          {deleteTrigger.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="bg-console-bg border border-console-border rounded p-3">
                      <code className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all">
                        {displayCode.length > 150
                          ? `${displayCode.substring(0, 150)}...`
                          : displayCode}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* View Modal */}
      <ViewRuleModal
        open={showViewRule}
        onOpenChange={setShowViewRule}
        rule={
          selectedRule
            ? {
                id: selectedRule.id,
                name: selectedRule.id,
                description: selectedRule.description,
                code: selectedRule.dsl.trim(),
                status: selectedRule.active ? "active" : "inactive",
              }
            : null
        }
      />
    </div>
  );
}

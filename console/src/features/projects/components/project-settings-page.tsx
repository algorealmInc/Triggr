import { useState } from "react";
import { Copy, Key, Settings, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface Project {
  id: string;
  contract_address: string;
  description?: string;
  contract_events: any[];
  createdAt: Date;
}

interface ProjectSettingsPageProps {
  project: Project;
}

export function ProjectSettingsPage({ project }: ProjectSettingsPageProps) {
  const { toast } = useToast();

  // Mock API keys generation
  const [apiKey] = useState(
    `triggr_${project.id}_${Math.random().toString(36).substring(2, 15)}`
  );
  const [secretKey] = useState(
    `sk_${project.id}_${Math.random().toString(36).substring(2, 25)}`
  );

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="p-6 space-y-8">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Project Settings</h2>
        <p className="text-muted-foreground">
          Manage your project configuration and API credentials
        </p>
      </div>

      {/* Project Info */}
      <Card className="hover:shadow-elevated transition-all duration-300">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Project Information</CardTitle>
          </div>
          <CardDescription>Basic details about your project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Project ID</Label>
            <div className="flex items-center space-x-2">
              <Input value={project.id} readOnly className="bg-muted flex-1" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(project.id, "Project ID")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Contract Node Address</Label>
            <div className="flex items-center space-x-2">
              <Input
                value={project.contract_address}
                readOnly
                className="bg-muted flex-1 font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  copyToClipboard(
                    project.contractNodeAddress,
                    "Contract Node Address"
                  )
                }
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {project.description && (
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={project.description}
                readOnly
                className="bg-muted"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Keys */}
      {/* <Card className="hover:shadow-elevated transition-all duration-300">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>API Keys</CardTitle>
          </div>
          <CardDescription>
            Use these credentials to connect your application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Key (Public)</Label>
            <div className="flex items-center space-x-2">
              <Input
                value={apiKey}
                readOnly
                className="bg-muted flex-1 font-mono text-sm"
                type="password"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(apiKey, "API Key")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Safe to use in client-side code
            </p>
          </div>
        </CardContent>
      </Card> */}

      {/* How to Connect */}
      <Card className="border-primary/20 hover:shadow-elevated transition-all duration-300">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <CardTitle>How to Connect Your App</CardTitle>
          </div>
          <CardDescription>
            Follow these steps to integrate Triggr into your application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Install the SDK</h4>
                <div className="bg-console-bg border border-console-border rounded p-3">
                  <code className="text-sm font-mono text-foreground">
                    npm install @triggr/sdk
                  </code>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Initialize the client</h4>
                <div className="bg-console-bg border border-console-border rounded p-3">
                  <pre className="text-sm font-mono text-foreground overflow-x-auto">
                    {`import { TriggClient } from '@triggr/sdk';

const triggr = new TriggClient({
  apiKey: '${apiKey}',
  projectId: '${project.id}'
});`}
                  </pre>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Start using the database</h4>
                <div className="bg-console-bg border border-console-border rounded p-3">
                  <pre className="text-sm font-mono text-foreground overflow-x-auto">
                    {`// Add a document
await triggr.collection('users').add({
  name: 'John Doe',
  email: 'john@example.com'
});

// Query documents
const users = await triggr
  .collection('users')
  .where('verified', '==', true)
  .get();`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

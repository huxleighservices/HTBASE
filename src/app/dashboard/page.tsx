import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, Bot, Palette } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Welcome to your HTBase Portal
        </h1>
        <p className="text-muted-foreground">
          Your central hub for managing your AI-powered training.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="size-6" />
              </div>
              <CardTitle className="font-headline">AI Trainer Integration</CardTitle>
            </div>
            <CardDescription className="pt-2">
              Engage with the core of Huxleigh's AI technology. Start a training
              session, review progress, and get personalized feedback.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1" />
          <CardFooter>
            <Button>
              Launch Trainer <ArrowRight className="ml-2" />
            </Button>
          </CardFooter>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Palette className="size-6" />
              </div>
              <CardTitle className="font-headline">Portal Customization</CardTitle>
            </div>
            <CardDescription className="pt-2">
              Tailor the look and feel of your portal. Customize logos, colors,
              and features to match your brand's unique identity.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1" />
          <CardFooter>
            <Button variant="outline">Customize Your Brand</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

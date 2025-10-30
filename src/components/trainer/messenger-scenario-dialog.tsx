
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  UserCheck,
  FileText,
  Goal,
  ArrowRight,
} from 'lucide-react';
import { ProspectingSimulatorDialog } from './prospecting-simulator-dialog';
import { QualificationSimulatorDialog } from './qualification-simulator-dialog';
import { ProposalSimulatorDialog } from './proposal-simulator-dialog';
import { ClosingSimulatorDialog } from './closing-simulator-dialog';

type Scenario = 'prospecting' | 'qualification' | 'proposal' | 'closing';

export function MessengerScenarioDialog({
  open,
  onOpenChange,
  activeSessionId,
  clientPath,
  trainingData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSessionId: string | null;
  clientPath: string | null;
  trainingData?: string;
}) {
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);

  const handleScenarioSelect = (scenario: Scenario) => {
    setActiveScenario(scenario);
  };

  const handleSubDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setActiveScenario(null);
    }
  };

  const scenarios = [
    {
      id: 'prospecting' as Scenario,
      icon: Search,
      title: 'Prospecting',
      description: 'Practice your initial outreach and making a first impression.',
    },
    {
      id: 'qualification' as Scenario,
      icon: UserCheck,
      title: 'Qualification',
      description: 'Learn to identify if a lead is a good fit for your product.',
    },
    {
      id: 'proposal' as Scenario,
      icon: FileText,
      title: 'Proposal',
      description: 'Practice presenting your solution and its value.',
    },
    {
      id: 'closing' as Scenario,
      icon: Goal,
      title: 'Closing',
      description: 'Hone your skills in handling objections and closing the deal.',
    },
  ];

  return (
    <>
      <Dialog open={open && !activeScenario} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose a Messenger Scenario</DialogTitle>
            <DialogDescription>
              Select which part of the sales conversation you want to practice.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
            {scenarios.map(scenario => (
              <button
                key={scenario.id}
                onClick={() => handleScenarioSelect(scenario.id)}
                className="group relative rounded-lg border p-4 text-left transition-all hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <scenario.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{scenario.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {scenario.description}
                    </p>
                  </div>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border bg-background p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <ArrowRight className="h-4 w-4 text-primary" />
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      
      <ProspectingSimulatorDialog
        open={activeScenario === 'prospecting'}
        onOpenChange={handleSubDialogChange}
        activeSessionId={activeSessionId}
        clientPath={clientPath}
        trainingData={trainingData}
      />
      <QualificationSimulatorDialog
        open={activeScenario === 'qualification'}
        onOpenChange={handleSubDialogChange}
        activeSessionId={activeSessionId}
        clientPath={clientPath}
        trainingData={trainingData}
      />
      <ProposalSimulatorDialog
        open={activeScenario === 'proposal'}
        onOpenChange={handleSubDialogChange}
        activeSessionId={activeSessionId}
        clientPath={clientPath}
        trainingData={trainingData}
      />
      <ClosingSimulatorDialog
        open={activeScenario === 'closing'}
        onOpenChange={handleSubDialogChange}
        activeSessionId={activeSessionId}
        clientPath={clientPath}
        trainingData={trainingData}
      />
    </>
  );
}

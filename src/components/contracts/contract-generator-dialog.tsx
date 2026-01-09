
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import type { Client, Lead } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { FileText, ChevronRight, Loader2, Download, UserCheck } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';

type ContractGeneratorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

type Stage = 'select-lead' | 'configure' | 'download';

const contractItems = [
    { id: 'item1', label: 'Inspection Completion' },
    { id: 'item2', label: 'Service Agreement Contract' },
    { id: 'item3', label: 'Conditional Lien Agreement' },
    { id: 'item5', label: 'Prevailing Wage Addendum' },
    { id: 'item6', label: 'Production Pre-Check Completion' },
    { id: 'item7', label: 'Insurance Addendum' },
    { id: 'item8', label: 'Build Completion Checkpoint' },
    { id: 'item9', label: 'Post Production Authorization' },
    { id: 'item10', label: 'Supplement & Completion Addendum' },
    { id: 'item11', label: 'Payment Collection Confirmation' },
];

export function ContractGeneratorDialog({ open, onOpenChange, client, activeUser }: ContractGeneratorDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [stage, setStage] = useState<Stage>('select-lead');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  const leadsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'leads');
  }, [firestore, client.path]);

  const { data: leads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsCollectionRef);
  
  const contractsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'contracts');
  }, [firestore, client.path]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(lead =>
      `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.homeAddress?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [leads, searchQuery]);
  
  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
    setStage('configure');
  };

  const handleGenerate = () => {
    if (!selectedLead || !contractsCollectionRef) return;
    
    const includedItems = Object.keys(selectedItems).filter(key => selectedItems[key]);

    if(includedItems.length === 0) {
        toast({ title: "No items selected", description: "Please select at least one item to include in the contract.", variant: "destructive" });
        return;
    }

    addDocumentNonBlocking(contractsCollectionRef, {
        leadId: selectedLead.id,
        leadName: `${selectedLead.firstName} ${selectedLead.lastName}`,
        includedItems: includedItems,
        createdAt: serverTimestamp(),
    });

    toast({ title: "Contract Generated!", description: "The contract is now ready for download." });
    setStage('download');
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state on close after a small delay
    setTimeout(() => {
        setStage('select-lead');
        setSelectedLead(null);
        setSearchQuery('');
        setSelectedItems({});
    }, 200);
  };

  const renderContent = () => {
    switch (stage) {
      case 'select-lead':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><UserCheck /> Step 1: Select a Lead</DialogTitle>
              <DialogDescription>Choose the lead you want to generate a contract for.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Input
                placeholder="Search leads by name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <ScrollArea className="h-72">
                <div className="space-y-2 pr-4">
                  {areLeadsLoading && <div className="flex justify-center items-center"><Loader2 className="animate-spin" /></div>}
                  {!areLeadsLoading && filteredLeads.map(lead => (
                    <Card key={lead.id} className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{lead.firstName} {lead.lastName}</p>
                          <p className="text-sm text-muted-foreground">{lead.homeAddress}</p>
                        </div>
                        <Button size="sm" onClick={() => handleLeadSelect(lead)}>
                          Select <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        );

      case 'configure':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Step 2: Configure Contract</DialogTitle>
              <DialogDescription>Select items to include for {selectedLead?.firstName} {selectedLead?.lastName}.</DialogDescription>
            </DialogHeader>
            <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {contractItems.map(item => (
                    <div key={item.id} className="flex items-center space-x-2 rounded-md border p-4">
                        <Checkbox 
                            id={item.id}
                            checked={selectedItems[item.label] || false}
                            onCheckedChange={(checked) => setSelectedItems(prev => ({...prev, [item.label]: !!checked}))}
                        />
                        <label htmlFor={item.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                           {item.label}
                        </label>
                    </div>
                ))}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setStage('select-lead')}>Back</Button>
                <Button onClick={handleGenerate}>Generate</Button>
            </DialogFooter>
          </>
        );

      case 'download':
        return (
            <>
            <DialogHeader>
                <DialogTitle>Step 3: Download Contract</DialogTitle>
                <DialogDescription>The contract for {selectedLead?.firstName} {selectedLead?.lastName} is ready.</DialogDescription>
            </DialogHeader>
            <div className="py-8 text-center">
                <p className="text-muted-foreground mb-4">Click below to download the PDF.</p>
                <Button size="lg">
                    <Download className="mr-2" />
                    Download PDF (Placeholder)
                </Button>
            </div>
             <DialogFooter>
                <Button variant="outline" onClick={handleClose}>Finish</Button>
            </DialogFooter>
            </>
        );
    }
  };


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl h-auto flex flex-col">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

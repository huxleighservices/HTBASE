
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
import type { Client, Lead, ContractTemplate, ClientContractTemplate } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { FileText, ChevronRight, Loader2, Download, UserCheck } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { contractItems as defaultContractItems } from './contract-items';
import jsPDF from 'jspdf';
import { format } from 'date-fns';


type ContractGeneratorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

type Stage = 'select-lead' | 'configure' | 'download';

export function ContractGeneratorDialog({ open, onOpenChange, client, activeUser }: ContractGeneratorDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [stage, setStage] = useState<Stage>('select-lead');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContractId, setGeneratedContractId] = useState<string | null>(null);

  const leadsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'leads');
  }, [firestore, client.path]);

  const { data: leads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsCollectionRef);
  
  const contractsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'contracts');
  }, [firestore, client.path]);

  const templatesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'contractTemplates');
  }, [firestore, client.path]);

  const clientTemplatesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'clientContractTemplates');
  }, [firestore, client.path]);

  const { data: customContractItems, isLoading: areCustomItemsLoading } = useCollection<ClientContractTemplate>(clientTemplatesCollectionRef);

  const allContractItems = useMemo(() => {
    const combined = [...defaultContractItems];
    if (customContractItems) {
        customContractItems.forEach(customItem => {
            if (!combined.some(item => item.id === customItem.id)) {
                combined.push(customItem);
            }
        });
    }
    return combined;
  }, [customContractItems]);

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

  const handleGenerate = async () => {
    if (!selectedLead || !contractsCollectionRef) return;
    
    const includedItems = Object.keys(selectedItems).filter(key => selectedItems[key]);

    if(includedItems.length === 0) {
        toast({ title: "No items selected", description: "Please select at least one item to include in the contract.", variant: "destructive" });
        return;
    }

    setIsGenerating(true);
    try {
        const docRef = await addDocumentNonBlocking(contractsCollectionRef, {
            leadId: selectedLead.id,
            leadName: `${selectedLead.firstName} ${selectedLead.lastName}`,
            includedItems: includedItems,
            createdAt: serverTimestamp(),
        });

        if (docRef) {
            setGeneratedContractId(docRef.id);
            toast({ title: "Contract Generated!", description: "The contract is now ready for download." });
            setStage('download');
        } else {
            throw new Error("Failed to get document reference after creation.");
        }

    } catch (error: any) {
        toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleDownload = async () => {
    if (!selectedLead || !templatesCollectionRef || !clientTemplatesCollectionRef) {
        toast({ title: 'Error', description: 'Missing lead or template data.', variant: 'destructive' });
        return;
    }
    
    setIsGenerating(true);
    try {
        const includedItemLabels = Object.keys(selectedItems).filter(key => selectedItems[key]);

        const defaultTemplatesQuery = query(templatesCollectionRef, where('title', 'in', includedItemLabels));
        const customTemplatesQuery = query(clientTemplatesCollectionRef, where('label', 'in', includedItemLabels));

        const [defaultSnapshot, customSnapshot] = await Promise.all([
            getDocs(defaultTemplatesQuery),
            getDocs(customTemplatesQuery),
        ]);

        const templatesMap = new Map<string, string>();
        defaultSnapshot.forEach(doc => {
            const data = doc.data() as ContractTemplate;
            templatesMap.set(data.title, data.content);
        });
        customSnapshot.forEach(doc => {
            const data = doc.data() as {label: string, content: string}; // Client templates have `label` and `content`
            templatesMap.set(data.label, data.content);
        });

        const leadFullName = `${selectedLead.firstName} ${selectedLead.lastName}`;
        const placeholders = {
            '{{firstName}}': selectedLead.firstName,
            '{{lastName}}': selectedLead.lastName,
            '{{leadname}}': leadFullName,
            '{{homeAddress}}': selectedLead.homeAddress || '',
            '{{phoneNumber}}': selectedLead.phoneNumber || '',
            '{{Phone}}': selectedLead.phoneNumber || '',
            '{{email}}': selectedLead.email || '',
            '{{Email}}': selectedLead.email || '',
            '{{jobType}}': selectedLead.jobType || '',
            '{{type}}': selectedLead.jobType || '',
            '{{projectedRevenue}}': selectedLead.projectedRevenue || '',
        };

        const doc = new jsPDF();
        doc.setFont('times', 'normal');
        const margin = 15;
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        let y = pageHeight / 2;

        // --- Cover Page ---
        doc.setFontSize(22);
        doc.text("Service Agreement Contract", pageWidth / 2, y - 20, { align: 'center' });
        doc.setFontSize(16);
        doc.text("M&T Roofing and Restoration", pageWidth / 2, y, { align: 'center' });
        doc.setFontSize(14);
        doc.text(leadFullName, pageWidth / 2, y + 10, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Generated: ${format(new Date(), 'PPP p')}`, pageWidth / 2, y + 30, { align: 'center' });

        allContractItems.forEach(item => {
            if (includedItemLabels.includes(item.label)) {
                const templateContent = templatesMap.get(item.label);
                if (templateContent) {
                    
                    doc.addPage();
                    y = margin;

                    let populatedText = templateContent;
                    for (const [placeholder, value] of Object.entries(placeholders)) {
                        populatedText = populatedText.replace(new RegExp(placeholder, 'g'), value);
                    }
                    
                    // Replace bullet points
                    populatedText = populatedText.replace(/(\* |• |● )/g, '- ');

                    const title = item.label;
                    doc.setFont('times', 'bold');
                    doc.text(title, margin, y);
                    y += 10;
                    doc.setFont('times', 'normal');

                    const splitText = doc.splitTextToSize(populatedText, pageWidth - margin * 2);
                    
                    for (const line of splitText) {
                         if (y > pageHeight - margin) {
                            doc.addPage();
                            y = margin;
                        }
                        doc.text(line, margin, y);
                        y += 7; // Line height
                    }

                    y += 10; // Space after a section
                }
            }
        });
        
        doc.save(`${selectedLead.lastName}_Contract.pdf`);

    } catch (error: any) {
        toast({ title: 'Download Failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsGenerating(false);
    }
  };


  const handleClose = () => {
    onOpenChange(false);
    // Reset state on close after a small delay
    setTimeout(() => {
        setStage('select-lead');
        setSelectedLead(null);
        setSearchQuery('');
        setSelectedItems({});
        setGeneratedContractId(null);
        setIsGenerating(false);
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
            <ScrollArea className="h-80">
              <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                  {allContractItems.map(item => (
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
            </ScrollArea>
            <DialogFooter>
                <Button variant="outline" onClick={() => setStage('select-lead')} disabled={isGenerating}>Back</Button>
                <Button onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate
                </Button>
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
                <Button size="lg" onClick={handleDownload} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                    {isGenerating ? 'Generating...' : 'Download PDF'}
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

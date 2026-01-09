
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import type { Client, ContractTemplate } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { BookCopy, Loader2, Save } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { contractItems } from './contract-items';


type ManageTemplatesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

export function ManageTemplatesDialog({ open, onOpenChange, client, activeUser }: ManageTemplatesDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [selectedItem, setSelectedItem] = useState<(typeof contractItems)[0] | null>(null);
  const [currentContent, setCurrentContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const templatesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'contractTemplates');
  }, [firestore, client.path]);

  const { data: templates, isLoading: areTemplatesLoading } = useCollection<ContractTemplate>(templatesCollectionRef);

  const templatesMap = useMemo(() => {
    if (!templates) return new Map<string, string>();
    return new Map(templates.map(t => [t.title, t.content]));
  }, [templates]);

  useEffect(() => {
    if (selectedItem) {
      setCurrentContent(templatesMap.get(selectedItem.label) || '');
    } else {
      setCurrentContent('');
    }
  }, [selectedItem, templatesMap]);

  const handleSaveTemplate = () => {
    if (!templatesCollectionRef || !selectedItem) return;
    setIsSaving(true);
    
    const templateDocRef = doc(templatesCollectionRef, selectedItem.id);
    const templateData: ContractTemplate = {
      id: selectedItem.id,
      title: selectedItem.label,
      content: currentContent,
    };

    setDocumentNonBlocking(templateDocRef, templateData, { merge: true });

    setTimeout(() => {
        setIsSaving(false);
        toast({
            title: "Template Saved!",
            description: `The template for "${selectedItem.label}" has been updated.`
        });
    }, 500);
  };
  
  const handleItemClick = (item: (typeof contractItems)[0]) => {
    setSelectedItem(item);
    setCurrentContent(templatesMap.get(item.label) || '');
  }

  const isLoading = areTemplatesLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold font-headline">
            <BookCopy /> Manage Contract Templates
          </DialogTitle>
          <DialogDescription>
            Select a contract section to edit its text template. Use placeholders like {"{{firstName}}"} or {"{{homeAddress}}"} to automatically insert lead data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow grid grid-cols-3 gap-6 min-h-0 py-4">
            <div className="col-span-1 flex flex-col gap-2">
                <h3 className="font-semibold px-1">Contract Sections</h3>
                <div className="flex-grow rounded-lg border bg-muted/50 p-2 overflow-y-auto">
                    {isLoading ? (
                         <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
                    ) : (
                        <div className="space-y-1">
                            {contractItems.map(item => (
                                <Button 
                                    key={item.id} 
                                    variant={selectedItem?.id === item.id ? 'secondary' : 'ghost'}
                                    className="w-full justify-start"
                                    onClick={() => handleItemClick(item)}
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="col-span-2 flex flex-col gap-2">
                 <div className="px-1">
                    <h3 className="font-semibold">Template Content for:</h3>
                    <p className="text-sm text-muted-foreground">{selectedItem?.label || 'Select a section from the left'}</p>
                 </div>
                 <Textarea 
                    className="flex-grow resize-none"
                    placeholder="Select a section to edit its template..."
                    value={currentContent}
                    onChange={(e) => setCurrentContent(e.target.value)}
                    disabled={!selectedItem || isSaving}
                 />
            </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSaving}>Close</Button>
          </DialogClose>
          <Button onClick={handleSaveTemplate} disabled={!selectedItem || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

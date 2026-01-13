
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import type { Client, ContractTemplate, ClientContractTemplate } from '@/types/client';
import type { AccessKey } from '@/types/session';
import { BookCopy, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { contractItems as defaultContractItems } from './contract-items';
import { cn } from '@/lib/utils';


type ManageTemplatesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  activeUser: AccessKey | null;
};

type ContractItem = {
    id: string;
    label: string;
    isCustom?: boolean;
};

const AddTemplateDialog = ({ open, onOpenChange, onAdd }: { open: boolean, onOpenChange: (open: boolean) => void, onAdd: (title: string) => void }) => {
    const [title, setTitle] = useState('');
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Template</DialogTitle>
                    <DialogDescription>Enter a title for the new contract section.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Warranty Information" />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button onClick={() => { onAdd(title); onOpenChange(false); setTitle(''); }} disabled={!title.trim()}>Add Template</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export function ManageTemplatesDialog({ open, onOpenChange, client, activeUser }: ManageTemplatesDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [selectedItem, setSelectedItem] = useState<ContractItem | null>(null);
  const [currentContent, setCurrentContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);

  const defaultTemplatesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'contractTemplates');
  }, [firestore, client.path]);

  const clientTemplatesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client.path) return null;
    return collection(firestore, client.path, 'clientContractTemplates');
  }, [firestore, client.path]);

  const { data: defaultTemplates, isLoading: areDefaultTemplatesLoading } = useCollection<ContractTemplate>(defaultTemplatesCollectionRef);
  const { data: customTemplates, isLoading: areCustomTemplatesLoading } = useCollection<ClientContractTemplate>(clientTemplatesCollectionRef);
  
  const allContractItems = useMemo(() => {
    const combined: ContractItem[] = [...defaultContractItems];
    if(customTemplates) {
        customTemplates.forEach(custom => {
             if (!combined.some(item => item.id === custom.id)) {
                combined.push({ ...custom, isCustom: true });
            }
        });
    }
    return combined.sort((a, b) => a.label.localeCompare(b.label));
  }, [customTemplates]);


  const templatesContentMap = useMemo(() => {
    if (!defaultTemplates) return new Map<string, string>();
    return new Map(defaultTemplates.map(t => [t.title, t.content]));
  }, [defaultTemplates]);

  useEffect(() => {
    if (selectedItem) {
      setCurrentContent(templatesContentMap.get(selectedItem.label) || '');
    } else {
      setCurrentContent('');
    }
  }, [selectedItem, templatesContentMap]);

  const handleSaveTemplate = () => {
    if (!defaultTemplatesCollectionRef || !selectedItem) return;
    setIsSaving(true);
    
    // Custom templates save content to their own document, default templates save to the shared one
    const templateDocRef = doc(defaultTemplatesCollectionRef, selectedItem.id);
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
  
  const handleAddTemplate = (label: string) => {
    if (!clientTemplatesCollectionRef) return;
    const newId = label.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    addDocumentNonBlocking(clientTemplatesCollectionRef, { id: newId, label });
    toast({ title: "Template Added", description: `"${label}" has been created.` });
  };
  
  const handleDeleteTemplate = (itemToDelete: ContractItem) => {
    if (!clientTemplatesCollectionRef || !itemToDelete.isCustom) return;
    const docToDelete = customTemplates?.find(t => t.id === itemToDelete.id);
    if (docToDelete) {
        const docRef = doc(clientTemplatesCollectionRef, docToDelete.id);
        deleteDocumentNonBlocking(docRef);
        toast({ title: 'Template Deleted', variant: 'destructive' });
        if(selectedItem?.id === itemToDelete.id) {
            setSelectedItem(null);
        }
    }
  };

  const handleItemClick = (item: ContractItem) => {
    setSelectedItem(item);
  }

  const isLoading = areDefaultTemplatesLoading || areCustomTemplatesLoading;

  return (
    <>
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
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-semibold">Contract Sections</h3>
                    <Button variant="ghost" size="sm" onClick={() => setIsAddTemplateOpen(true)}>
                        <PlusCircle className="mr-2"/> New
                    </Button>
                </div>
                <div className="flex-grow rounded-lg border bg-muted/50 p-2 overflow-y-auto">
                    {isLoading ? (
                         <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
                    ) : (
                        <div className="space-y-1">
                            {allContractItems.map(item => (
                                <div key={item.id} className="group flex items-center">
                                    <Button 
                                        variant={selectedItem?.id === item.id ? 'secondary' : 'ghost'}
                                        className="w-full justify-start flex-grow"
                                        onClick={() => handleItemClick(item)}
                                    >
                                        {item.label}
                                    </Button>
                                    {item.isCustom && (
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="shrink-0 opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the template "{item.label}".
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDeleteTemplate(item)}
                                                    className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
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
    
    <AddTemplateDialog open={isAddTemplateOpen} onOpenChange={setIsAddTemplateOpen} onAdd={handleAddTemplate} />
    </>
  );
}

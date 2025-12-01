
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Label } from '../ui/label';
import { writeBatch, doc, CollectionReference } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Project, ProjectItem } from '@/types/client';

type BulkAddItemsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  itemsCollectionRef: CollectionReference<ProjectItem>;
};

type Stage = 'paste' | 'map' | 'confirm';

export function BulkAddItemsDialog({
  open,
  onOpenChange,
  project,
  itemsCollectionRef,
}: BulkAddItemsDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>('paste');
  const [pastedData, setPastedData] = useState('');
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [header, setHeader] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<number, string | 'ignore'>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStage('paste');
        setPastedData('');
        setParsedRows([]);
        setHeader([]);
        setColumnMap({});
        setIsProcessing(false);
      }, 200);
    }
  }, [open]);

  const handleNextToMap = () => {
    if (!pastedData.trim()) {
      toast({ title: 'No data pasted', variant: 'destructive' });
      return;
    }
    const rows = pastedData.trim().split('\n').map(row => row.split('\t'));
    if (rows.length === 0) {
      toast({ title: 'No rows found', variant: 'destructive' });
      return;
    }
    
    setParsedRows(rows);
    const numColumns = rows[0]?.length || 0;
    const initialHeader = rows[0] || Array.from({ length: numColumns }, (_, i) => `Column ${i + 1}`);
    setHeader(initialHeader);

    // Auto-map based on header names from project
    const newColumnMap: typeof columnMap = {};
    initialHeader.forEach((cell, index) => {
        const matchingHeader = project.headers.find(h => h.toLowerCase() === cell.toLowerCase().trim());
        newColumnMap[index] = matchingHeader || 'ignore';
    });
    setColumnMap(newColumnMap);

    setStage('map');
  };

  const handleMapChange = (columnIndex: number, field: string | 'ignore') => {
    setColumnMap(prev => ({ ...prev, [columnIndex]: field }));
  };

  const getMappedItems = () => {
    const dataRows = parsedRows.slice(1);
    return dataRows.map(row => {
      const item: Partial<Omit<ProjectItem, 'id'>> = { data: {} };
      Object.entries(columnMap).forEach(([colIndexStr, headerField]) => {
        const colIndex = parseInt(colIndexStr, 10);
        if (headerField !== 'ignore' && item.data) {
          item.data[headerField] = row[colIndex] || '';
        }
      });
      return item as Omit<ProjectItem, 'id'>;
    });
  };

  const handleBulkAdd = async () => {
    if (!firestore) return;
    setIsProcessing(true);
    const itemsToAdd = getMappedItems();

    if (itemsToAdd.length === 0) {
        toast({title: "No items to add", variant: "destructive"});
        setIsProcessing(false);
        return;
    }

    const batch = writeBatch(firestore);
    itemsToAdd.forEach(itemData => {
        const newDocRef = doc(itemsCollectionRef);
        batch.set(newDocRef, itemData);
    });

    try {
        await batch.commit();
        toast({ title: "Success!", description: `${itemsToAdd.length} items added to project.` });
        onOpenChange(false);
    } catch (error: any) {
        toast({ title: 'Bulk add failed', description: error.message, variant: 'destructive'});
        console.error("Bulk add error:", error);
    } finally {
        setIsProcessing(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import to "{project.name}"</DialogTitle>
          <DialogDescription>
            {stage === 'paste' && 'Paste data from your spreadsheet (including headers).'}
            {stage === 'map' && 'Map your columns to the correct project headers.'}
            {stage === 'confirm' && 'Review the items to be added.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto pr-2">
            {stage === 'paste' && (
                <Textarea
                placeholder="Paste your data here..."
                className="h-full min-h-[400px] font-mono"
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                />
            )}

            {stage === 'map' && (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">The first row of your data is used as headers. Map them to your project's custom headers. Select 'Ignore' for columns you don't want to import.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {header.map((colName, index) => (
                        <div key={index} className="space-y-2 p-3 border rounded-md bg-muted/50">
                            <Label className="font-bold">{colName}</Label>
                            <p className="text-xs text-muted-foreground truncate">Sample: {parsedRows[1]?.[index] || 'N/A'}</p>
                            <Select
                                value={columnMap[index] || 'ignore'}
                                onValueChange={(value) => handleMapChange(index, value as any)}
                            >
                            <SelectTrigger>
                                <SelectValue placeholder="Select field..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ignore">Ignore</SelectItem>
                                {project.headers.map(field => (
                                <SelectItem key={field} value={field}>{field}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                        </div>
                        ))}
                    </div>
                </div>
            )}

            {stage === 'confirm' && (
                 <div className="border rounded-md">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                {project.headers.map(field => <TableHead key={field}>{field}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {getMappedItems().map((item, index) => (
                                <TableRow key={index}>
                                    {project.headers.map(field => <TableCell key={field}>{item.data[field] || ''}</TableCell>)}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </div>
            )}
        </div>

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          {stage === 'paste' && (
            <Button onClick={handleNextToMap}>Next <ArrowRight className='ml-2'/></Button>
          )}
          {stage === 'map' && (
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStage('paste')}>Back</Button>
                <Button onClick={() => setStage('confirm')}>Review <ArrowRight className='ml-2'/></Button>
            </div>
          )}
          {stage === 'confirm' && (
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStage('map')}>Back</Button>
                <Button onClick={handleBulkAdd} disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 animate-spin" />}
                    {isProcessing ? 'Adding...' : `Add ${getMappedItems().length} Items`}
                </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
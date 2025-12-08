
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
import { writeBatch, doc, CollectionReference, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { OpaCustomer } from '@/types/client';

type BulkAddCustomersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionRef: CollectionReference;
};

type Stage = 'paste' | 'map' | 'confirm';

const customerFields: (keyof Omit<OpaCustomer, 'id' | 'notes' | 'activityLog' | 'createdAt'>)[] = [
  'firstName',
  'lastName',
  'franchise',
  'writingAgent',
  'planCode',
  'planType',
  'phoneNumber',
  'policyFaceAmount',
  'extraInfo',
];

export function BulkAddCustomersDialog({
  open,
  onOpenChange,
  collectionRef,
}: BulkAddCustomersDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>('paste');
  const [pastedData, setPastedData] = useState('');
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [header, setHeader] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<number, keyof OpaCustomer | 'ignore'>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
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
    // Parse tab-separated data
    const rows = pastedData.trim().split('\n').map(row => row.split('\t'));
    if (rows.length === 0) {
      toast({ title: 'No rows found', variant: 'destructive' });
      return;
    }
    
    setParsedRows(rows);
    const numColumns = rows[0]?.length || 0;
    const initialHeader = Array.from({ length: numColumns }, (_, i) => `Column ${i + 1}`);
    setHeader(initialHeader);

    // Auto-map based on common names
    const newColumnMap: typeof columnMap = {};
    rows[0]?.forEach((cell, index) => {
        const lowerCell = cell.toLowerCase().replace(/\s/g, '');
        if (lowerCell.includes('first')) newColumnMap[index] = 'firstName';
        else if (lowerCell.includes('last')) newColumnMap[index] = 'lastName';
        else if (lowerCell.includes('phone')) newColumnMap[index] = 'phoneNumber';
        else if (lowerCell.includes('franchise')) newColumnMap[index] = 'franchise';
        else if (lowerCell.includes('writingagent')) newColumnMap[index] = 'writingAgent';
        else if (lowerCell.includes('policyface')) newColumnMap[index] = 'policyFaceAmount';
        else if (lowerCell.includes('plancode')) newColumnMap[index] = 'planCode';
        else if (lowerCell.includes('plantype')) newColumnMap[index] = 'planType';
        else newColumnMap[index] = 'ignore';
    });
    setColumnMap(newColumnMap);

    setStage('map');
  };

  const handleMapChange = (columnIndex: number, field: keyof OpaCustomer | 'ignore') => {
    setColumnMap(prev => ({ ...prev, [columnIndex]: field }));
  };

  const getMappedCustomers = () => {
    const dataRows = parsedRows.slice(1); // Assume first row is header
    return dataRows.map(row => {
      const customer: Partial<Omit<OpaCustomer, 'id'>> = { activityLog: [] };
      Object.entries(columnMap).forEach(([colIndexStr, field]) => {
        const colIndex = parseInt(colIndexStr, 10);
        if (field !== 'ignore') {
          (customer as any)[field] = row[colIndex] || '';
        }
      });
      return customer as Omit<OpaCustomer, 'id'>;
    });
  };

  const handleBulkAdd = async () => {
    if (!firestore) return;
    setIsProcessing(true);
    const customersToAdd = getMappedCustomers();

    if (customersToAdd.length === 0) {
        toast({title: "No customers to add", variant: "destructive"});
        setIsProcessing(false);
        return;
    }

    const batch = writeBatch(firestore);
    customersToAdd.forEach(customerData => {
        const newDocRef = doc(collectionRef); // Creates a new doc with a random ID
        batch.set(newDocRef, {...customerData, createdAt: serverTimestamp()});
    });

    try {
        await batch.commit();
        toast({ title: "Success!", description: `${customersToAdd.length} customers added.` });
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
          <DialogTitle>Bulk Add Customers</DialogTitle>
          <DialogDescription>
            {stage === 'paste' && 'Paste data from your spreadsheet (including headers).'}
            {stage === 'map' && 'Map your columns to the correct customer fields.'}
            {stage === 'confirm' && 'Review the customers to be added.'}
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
                    <p className="text-sm text-muted-foreground">The first row of your data is used as headers. Map them to the corresponding customer fields. Select 'Ignore' for columns you don't want to import.</p>
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
                                {customerFields.map(field => (
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
                                {customerFields.map(field => <TableHead key={field}>{field}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {getMappedCustomers().map((customer, index) => (
                                <TableRow key={index}>
                                    {customerFields.map(field => <TableCell key={field}>{(customer as any)[field] || ''}</TableCell>)}
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
                    {isProcessing ? 'Adding...' : `Add ${getMappedCustomers().length} Customers`}
                </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

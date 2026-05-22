'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { InventoryCollection } from '@/types/client';

type AddItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: InventoryCollection;
  onAdd: (item: { name: string; descriptor: string; quantity: number }) => void;
};

export function AddItemDialog({ open, onOpenChange, collection, onAdd }: AddItemDialogProps) {
  const [name, setName] = useState('');
  const [descriptor, setDescriptor] = useState('');
  const [quantity, setQuantity] = useState('0');

  const reset = () => {
    setName('');
    setDescriptor('');
    setQuantity('0');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      descriptor: descriptor.trim(),
      quantity: Math.max(0, parseInt(quantity) || 0),
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Item to &ldquo;{collection.name}&rdquo;</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="item-name">Item Name</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Drill Bits"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-descriptor">
              Descriptor{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="item-descriptor"
              value={descriptor}
              onChange={(e) => setDescriptor(e.target.value)}
              placeholder="e.g. 1/4 inch, titanium coated"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-quantity">Initial Amount</Label>
            <Input
              id="item-quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

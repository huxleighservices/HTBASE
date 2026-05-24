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
  DialogDescription,
} from '@/components/ui/dialog';
import { DEPARTMENTS, deptPill } from '@/lib/departments';
import type { DepartmentId } from '@/types/erp';
import type { Department } from '@/lib/departments';

type AddPersonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabledDepartments: Department[];
  onAdd: (person: {
    name: string;
    email: string;
    phone: string;
    departments: DepartmentId[];
  }) => void;
};

export function AddPersonDialog({
  open,
  onOpenChange,
  enabledDepartments,
  onAdd,
}: AddPersonDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<DepartmentId[]>([]);

  const reset = () => {
    setName(''); setEmail(''); setPhone('');
    setSelectedDepts([]);
  };

  const toggleDept = (id: DepartmentId) => {
    setSelectedDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), email: email.trim(), phone: phone.trim(), departments: selectedDepts });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Record</DialogTitle>
          <DialogDescription>
            Add a person or customer to Base.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ep-name">Name *</Label>
              <Input id="ep-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-email">Email</Label>
              <Input id="ep-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-phone">Phone</Label>
              <Input id="ep-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Departments</Label>
            <div className="flex flex-wrap gap-2">
              {enabledDepartments.map((dept) => {
                const active = selectedDepts.includes(dept.id);
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => toggleDept(dept.id)}
                    className="rounded-full px-3 py-1 text-xs font-medium transition-all duration-150"
                    style={
                      active
                        ? { ...deptPill(dept), boxShadow: `0 0 10px rgba(${dept.rgb}, 0.4)` }
                        : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--muted-foreground)' }
                    }
                  >
                    {dept.label}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()} className="w-full sm:w-auto">
              Add Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

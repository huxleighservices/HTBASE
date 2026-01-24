
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  setDocumentNonBlocking,
} from '@/firebase';
import type { UserProfile } from '@/types/user';
import type { Client } from '@/types/client';
import { collection, doc, query, collectionGroup } from 'firebase/firestore';
import { Loader2, Shield, Unlock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useState } from 'react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const ADMIN_PASSCODE = "CROMEYELLOW1337";

export function AdminPanel() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersCollectionRef);

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'clients'));
  }, [firestore]);

  const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(clientsQuery);
  
  const handleRoleChange = (userId: string, role: 'admin' | 'manager' | 'user') => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', userId);
    setDocumentNonBlocking(userDocRef, { role }, { merge: true });
    toast({ title: 'User Role Updated' });
  };

  const handleAssignmentChange = (userId: string, clientId: string) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', userId);
    const newAssignedId = clientId === 'none' ? '' : clientId;
    setDocumentNonBlocking(userDocRef, { assignedClientId: newAssignedId }, { merge: true });
    toast({ title: 'Client Assignment Updated' });
  };
  
  const handleUnlock = () => {
    if (passwordInput === ADMIN_PASSCODE) {
        setIsUnlocked(true);
        setError('');
        toast({ title: 'Admin Panel Unlocked' });
    } else {
        setError('Incorrect passcode.');
    }
  };

  const isLoading = areUsersLoading || areClientsLoading;

  if (!isUnlocked) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield /> Admin Panel Access</CardTitle>
                <CardDescription>Enter the passcode to manage users and clients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <Label htmlFor="admin-passcode">Admin Passcode</Label>
                <Input
                    id="admin-passcode"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter>
                <Button onClick={handleUnlock}><Unlock className="mr-2"/> Unlock</Button>
            </CardFooter>
        </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Assign roles and client access to users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned Client</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.firstName} {u.lastName}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Select
                        defaultValue={u.role || 'user'}
                        onValueChange={value =>
                          handleRoleChange(u.id, value as 'admin' | 'manager' | 'user')
                        }
                        disabled={u.email === 'service@huxleigh.com'}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={u.assignedClientId || 'none'}
                        onValueChange={value =>
                          handleAssignmentChange(u.id, value)
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {clients?.map(c => (
                            <SelectItem key={c.id} value={c.displayId}>
                              {c.firmName} ({c.displayId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

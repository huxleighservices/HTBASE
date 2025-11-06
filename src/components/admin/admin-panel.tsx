
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
} from '@/firebase';
import type { UserProfile } from '@/types/user';
import type { Client } from '@/types/client';
import { collection, doc, writeBatch, collectionGroup } from 'firebase/firestore';
import { Loader2, Shield } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';

export function AdminPanel() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);
  
  const clientsQueryRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collectionGroup(firestore, 'clients');
  }, [firestore]);

  const { data: initialUsers, isLoading: isUsersLoading } = useCollection<UserProfile>(usersCollectionRef);
  const { data: allClients, isLoading: isClientsLoading } = useCollection<Client>(clientsQueryRef);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialUsersMap = useMemo(() => {
    if (!initialUsers) return new Map();
    return new Map(initialUsers.map(user => [user.id, user]));
  }, [initialUsers]);

  useEffect(() => {
    if (initialUsers) {
      const sortedUsers = [...initialUsers].sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      setUsers(sortedUsers);
      setIsDirty(false);
    }
  }, [initialUsers]);

  const handleUserUpdate = (userId: string, field: keyof UserProfile, value: string | boolean) => {
    setUsers(currentUsers =>
      currentUsers.map(user => {
        if (user.id === userId) {
          const updatedUser: UserProfile = { ...user };
  
          if (field === 'role' && typeof value === 'boolean') {
            // This handles the 'isAdmin' checkbox
            updatedUser.role = value ? 'admin' : (updatedUser.assignedClientId ? 'manager' : 'user');
          } else if (field === 'assignedClientId' && typeof value === 'string') {
            updatedUser.assignedClientId = value === 'none' ? '' : value; // Handle "none" value
            // If user is not an admin, their role becomes manager or user based on assignment
            if (updatedUser.role !== 'admin') {
              updatedUser.role = value !== 'none' && value ? 'manager' : 'user';
            }
          } else if (typeof value === 'string') {
            // Fallback for other potential string fields, though not used in the current UI
            (updatedUser as any)[field] = value;
          }
          
          return updatedUser;
        }
        return user;
      })
    );
    setIsDirty(true);
  };
  
  const handleSaveChanges = async () => {
    if (!firestore || !isDirty) return;
    setIsSaving(true);
    
    const batch = writeBatch(firestore);
    let changesFound = false;

    users.forEach(user => {
      const initialUser = initialUsersMap.get(user.id);
      if (!initialUser) return;

      const roleChanged = user.role !== initialUser.role;
      const assignedClientChanged = (user.assignedClientId || '') !== (initialUser.assignedClientId || '');
      
      const somethingChanged = roleChanged || assignedClientChanged;

      if (somethingChanged) {
        changesFound = true;
        const userDocRef = doc(firestore, 'users', user.id);
        
        // Ensure assignedClientId is cleared if the role is not 'manager' or 'admin'
        // An admin can be assigned a client, but a 'user' cannot.
        const finalAssignedClientId = (user.role === 'manager' || user.role === 'admin') ? (user.assignedClientId || '') : '';

        const dataToUpdate: Partial<UserProfile> = {
          role: user.role,
          assignedClientId: finalAssignedClientId,
        };

        batch.update(userDocRef, dataToUpdate);
      }
    });
    
    if (!changesFound) {
      toast({
        title: "No Changes",
        description: "There were no changes to save.",
      });
      setIsSaving(false);
      setIsDirty(false);
      return;
    }

    try {
        await batch.commit();
        toast({
            title: "Users Updated",
            description: "All pending changes have been saved successfully.",
        });
        setIsDirty(false);
    } catch (error) {
        console.error("Error saving user changes:", error);
        toast({
            title: "Error",
            description: "Could not save user changes. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsSaving(false);
    }
  };
  
  const isLoading = isUsersLoading || isClientsLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield />
          Admin Panel
        </CardTitle>
        <CardDescription>
          Manage user roles and client assignments. Remember to save your changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Is Admin</TableHead>
                <TableHead>Assigned Client</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map(user => {
                const isServiceAccount = user.email === 'service@huxleigh.com';
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={user.role === 'admin'}
                        onCheckedChange={(checked) => handleUserUpdate(user.id, 'role', checked as boolean)}
                        disabled={isServiceAccount}
                        aria-label={`Is ${user.firstName} an admin`}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.assignedClientId || 'none'}
                        onValueChange={newClientId => handleUserUpdate(user.id, 'assignedClientId', newClientId)}
                      >
                        <SelectTrigger className="w-[250px]">
                           <SelectValue placeholder="Select client..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allClients?.map(client => (
                            <SelectItem key={client.id} value={client.displayId}>
                              <div className='flex items-center gap-2'>
                               <span>{client.firmName}</span> 
                               {client.displayId && <Badge variant="secondary" className='font-mono'>{client.displayId}</Badge>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
       <CardFooter className="flex justify-end">
        <Button onClick={handleSaveChanges} disabled={!isDirty || isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSaving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </CardFooter>
    </Card>
  );
}

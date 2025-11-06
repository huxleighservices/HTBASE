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
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Loader2, Shield } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';

export function AdminPanel() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: initialUsers, isLoading } = useCollection<UserProfile>(usersCollectionRef);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Memoize the initial users map for efficient lookup
  const initialUsersMap = useMemo(() => {
    if (!initialUsers) return new Map();
    return new Map(initialUsers.map(user => [user.id, user]));
  }, [initialUsers]);

  useEffect(() => {
    if (initialUsers) {
      // Sort users to ensure a consistent order
      const sortedUsers = [...initialUsers].sort((a, b) => a.email.localeCompare(b.email));
      setUsers(sortedUsers);
      setIsDirty(false); // Reset dirty state when initial data loads
    }
  }, [initialUsers]);

  const handleUserUpdate = (userId: string, field: keyof UserProfile, value: string) => {
    setUsers(currentUsers =>
      currentUsers.map(user => {
        if (user.id === userId) {
          const updatedUser = { ...user, [field]: value };
          // If role is changed to not 'manager', clear assignedClientId
          if (field === 'role' && value !== 'manager') {
            updatedUser.assignedClientId = '';
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
      
      // If user did not exist initially, something is wrong, skip.
      if (!initialUser) return;

      const roleChanged = user.role !== initialUser.role;
      const assignedClientChanged = (user.assignedClientId || '') !== (initialUser.assignedClientId || '');

      if (roleChanged || assignedClientChanged) {
        changesFound = true;
        const userDocRef = doc(firestore, 'users', user.id);
        const dataToSave: Partial<Pick<UserProfile, 'role' | 'assignedClientId'>> = {};
        
        if (roleChanged) {
          dataToSave.role = user.role;
        }
        if (assignedClientChanged) {
          // Ensure assignedClientId is cleared if the role is not 'manager'
          dataToSave.assignedClientId = user.role === 'manager' ? (user.assignedClientId || '') : '';
        } else if (roleChanged && user.role !== 'manager') {
           // Handle case where only role changes away from manager
           dataToSave.assignedClientId = '';
        }

        // Only add to batch if there's something to update
        if (Object.keys(dataToSave).length > 0) {
           batch.update(userDocRef, dataToSave);
        }
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


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield />
          Admin Panel
        </CardTitle>
        <CardDescription>
          Manage users, roles, and permissions. Remember to save your changes.
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
                <TableHead>Role</TableHead>
                <TableHead>Assigned Client</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role || 'user'}
                      onValueChange={newRole => handleUserUpdate(user.id, 'role', newRole)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {user.role === 'manager' ? (
                      <Input
                        value={user.assignedClientId || ''}
                        onChange={(e) => handleUserUpdate(user.id, 'assignedClientId', e.target.value.toUpperCase())}
                        placeholder="6-digit client ID"
                        className="w-[150px]"
                        maxLength={6}
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
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

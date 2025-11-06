
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
  useAuth,
} from '@/firebase';
import {
  doc,
  collectionGroup,
  query,
  where,
  getDocs,
  collection,
  addDoc,
  serverTimestamp,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Loader2, KeyRound, PlusCircle, Trash2 } from 'lucide-react';
import type { UserProfile } from '@/types/user';
import type { Client } from '@/types/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import type { AccessKey } from '@/types/session';

const addKeyFormSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  emailPrefix: z.string().min(3, 'Prefix must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type AddKeyFormValues = z.infer<typeof addKeyFormSchema>;


export default function MyTrainerPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [isClientLoading, setIsClientLoading] = useState(true);
  const [isAddKeyOpen, setIsAddKeyOpen] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!firestore || !userProfile) {
        if (!isProfileLoading) {
          setClient(null);
          setIsClientLoading(false);
        }
        return;
      }
      
      if (userProfile.role !== 'manager' || !userProfile.assignedClientId) {
        setClient(null);
        setIsClientLoading(false);
        return;
      }

      setIsClientLoading(true);
      try {
        const clientsQuery = query(
          collectionGroup(firestore, 'clients'),
          where('displayId', '==', userProfile.assignedClientId)
        );

        const querySnapshot = await getDocs(clientsQuery);
        if (!querySnapshot.empty) {
          const clientDoc = querySnapshot.docs[0];
          setClient({ ...clientDoc.data(), id: clientDoc.id, path: clientDoc.ref.path } as Client);
        } else {
          setClient(null);
        }
      } catch (error) {
        console.error('Error fetching assigned client:', error);
        setClient(null);
      } finally {
        setIsClientLoading(false);
      }
    };
    
    fetchClientData();

  }, [firestore, userProfile, isProfileLoading]);

  const accessKeysCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client?.path) return null;
    return collection(firestore, client.path, 'accessKeys');
  }, [firestore, client]);

  const { data: accessKeys, isLoading: areKeysLoading } = useCollection<AccessKey>(accessKeysCollectionRef);

  const addKeyForm = useForm<AddKeyFormValues>({
    resolver: zodResolver(addKeyFormSchema),
    defaultValues: { displayName: '', emailPrefix: '', password: '' },
  });

  const handleAddKey: SubmitHandler<AddKeyFormValues> = async (data) => {
    if (!auth || !firestore || !client?.path) return;
    setIsCreatingKey(true);

    const email = `${data.emailPrefix}.${client.displayId}@access.key`;

    try {
      // Step 1: Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
      const newKeyUser = userCredential.user;

      // Step 2: Create the access key document in Firestore
      const keyDocRef = doc(firestore, client.path, 'accessKeys', newKeyUser.uid);
      const newKeyData: AccessKey = {
        id: newKeyUser.uid,
        email: email,
        displayName: data.displayName,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(firestore, client.path, 'accessKeys'), newKeyData);

      toast({ title: 'Access Key Created', description: `Key "${data.displayName}" has been created successfully.` });
      setIsAddKeyOpen(false);
      addKeyForm.reset();
    } catch (error: any) {
      console.error("Error creating access key:", error);
      let message = 'An unexpected error occurred.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email prefix is already in use. Please choose another one.';
      } else if (error.code === 'auth/weak-password') {
        message = 'The password is too weak. Please use at least 6 characters.';
      }
      toast({ title: 'Creation Failed', description: message, variant: 'destructive' });
    } finally {
      setIsCreatingKey(false);
    }
  };
  
  const handleDeleteKey = async (key: AccessKey) => {
      toast({
          title: "Deletion Not Implemented",
          description: "This functionality is not yet available in the prototype.",
          variant: "destructive"
      })
      // Deleting a Firebase user is a sensitive operation and should be done via a backend function
      // for security reasons. The code below is a placeholder for how it *might* look on the client,
      // but it's not recommended for production.
      /*
      if (!firestore || !client?.path) return;
      try {
          const keyDocRef = doc(firestore, client.path, 'accessKeys', key.id);
          await deleteDoc(keyDocRef);
          // You would also need a Cloud Function to delete the auth user by UID.
          // e.g., await functions.httpsCallable('deleteAuthUser')({ uid: key.id });
          toast({ title: "Access Key Deleted" });
      } catch (error: any) {
          toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
      }
      */
  };


  const isLoading = isUserLoading || isProfileLoading || isClientLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your trainer...</p>
        </div>
      </div>
    );
  }

  if (userProfile?.role !== 'manager' || !client) {
    return (
       <div className="flex flex-col gap-8 items-center text-center mt-16">
        <div className="max-w-md p-8 border rounded-lg bg-card">
            <h1 className="text-2xl font-bold font-headline tracking-tight">
            No Trainer Assigned
            </h1>
            <p className="text-muted-foreground mt-2">
            You are not assigned to a client trainer. Please contact an administrator for assistance.
            </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            My Trainer: {client.firmName}
          </h1>
          <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">Managing Client:</p>
              <Badge variant="secondary" className="font-mono">{client.displayId}</Badge>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
              <div>
                  <CardTitle>Access Keys</CardTitle>
                  <CardDescription>
                      Create and manage temporary access keys for this client.
                  </CardDescription>
              </div>
              <Button onClick={() => setIsAddKeyOpen(true)}>
                  <PlusCircle className="mr-2" />
                  Add New Key
              </Button>
          </CardHeader>
          <CardContent>
            {areKeysLoading ? (
              <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin"/></div>
            ) : !accessKeys || accessKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg bg-muted/50">
                  <KeyRound className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 font-semibold">No Access Keys Found</p>
                  <p className="text-muted-foreground text-sm">Click "Add New Key" to create the first access key for this client.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Email / User ID</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessKeys.map(key => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.displayName}</TableCell>
                      <TableCell>{key.email}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">••••••••</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteKey(key)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

       <Dialog open={isAddKeyOpen} onOpenChange={setIsAddKeyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Access Key</DialogTitle>
            <DialogDescription>Create a temporary set of credentials for a trainee.</DialogDescription>
          </DialogHeader>
          <Form {...addKeyForm}>
            <form onSubmit={addKeyForm.handleSubmit(handleAddKey)} className="space-y-4">
              <FormField
                control={addKeyForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g., Trainee 1" disabled={isCreatingKey} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addKeyForm.control}
                name="emailPrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Prefix</FormLabel>
                     <div className="flex items-center">
                        <FormControl><Input {...field} placeholder="john.doe" disabled={isCreatingKey} className="rounded-r-none"/></FormControl>
                        <span className="inline-flex items-center px-3 text-sm text-muted-foreground border border-l-0 h-10 rounded-r-md">.{client.displayId}@access.key</span>
                     </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addKeyForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input type="password" {...field} disabled={isCreatingKey} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost" disabled={isCreatingKey}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={isCreatingKey}>
                  {isCreatingKey && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  {isCreatingKey ? "Creating..." : "Create Key"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

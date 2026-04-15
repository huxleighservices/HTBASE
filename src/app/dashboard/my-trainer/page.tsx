
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import {
  doc,
  collectionGroup,
  query,
  where,
  getDocs,
  collection,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Loader2, KeyRound, PlusCircle, Trash2, Wrench, Edit } from 'lucide-react';
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
import type { AccessKey } from '@/types/session';
import { SessionObservation } from '@/components/clients/session-observation';
import { SetupTrainerDialog } from '@/components/clients/setup-trainer-dialog';
import { EditAccessKeyDialog } from '@/components/clients/edit-access-key-dialog';

const addKeyFormSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      'Username can only contain letters, numbers, and symbols: _ . -'
    ),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phoneNumber: z.string().optional(),
});
type AddKeyFormValues = z.infer<typeof addKeyFormSchema>;

export default function MyTrainerPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [isClientLoading, setIsClientLoading] = useState(true);
  const [isAddKeyOpen, setIsAddKeyOpen] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [keyToEdit, setKeyToEdit] = useState<AccessKey | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    const fetchClientData = async () => {
      if (isProfileLoading || !firestore || !userProfile?.assignedClientId) {
        setIsClientLoading(false);
        setClient(null);
        return;
      }

      setIsClientLoading(true);
      try {
        const clientQuery = query(
          collectionGroup(firestore, 'clients'),
          where('displayId', '==', userProfile.assignedClientId)
        );
        
        const querySnapshot = await getDocs(clientQuery);

        if (!querySnapshot.empty) {
          const clientDoc = querySnapshot.docs[0];
          setClient({
            ...(clientDoc.data() as Client),
            id: clientDoc.id,
            path: clientDoc.ref.path,
          });
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

  const handleUpdateTrainingData = (
    clientId: string,
    trainingData: string
  ) => {
    if (!firestore || !user || !client?.path) return;
    const clientDocRef = doc(firestore, client.path);
    updateDocumentNonBlocking(clientDocRef, { trainingData });
  };

  const accessKeysCollectionRef = useMemoFirebase(() => {
    if (!firestore || !client?.path) return null;
    return collection(firestore, client.path, 'accessKeys');
  }, [firestore, client]);

  const { data: accessKeys, isLoading: areKeysLoading } =
    useCollection<AccessKey>(accessKeysCollectionRef);

  const addKeyForm = useForm<AddKeyFormValues>({
    resolver: zodResolver(addKeyFormSchema),
    defaultValues: { displayName: '', username: '', password: '', phoneNumber: '' },
  });

  const handleAddKey: SubmitHandler<AddKeyFormValues> = async data => {
    if (!accessKeysCollectionRef) return;
    setIsCreatingKey(true);

    try {
      // Check if username already exists for this client
      const usernameExistsQuery = query(
        accessKeysCollectionRef,
        where('username', '==', data.username)
      );
      const existingKeys = await getDocs(usernameExistsQuery);
      if (!existingKeys.empty) {
        addKeyForm.setError('username', {
          type: 'manual',
          message: 'This username is already taken for this client.',
        });
        setIsCreatingKey(false);
        return;
      }

      const newKeyData = {
        ...data,
        createdAt: serverTimestamp(),
      };

      addDocumentNonBlocking(accessKeysCollectionRef, newKeyData);

      toast({
        title: 'Access Key Created',
        description: `Key "${data.displayName}" has been created successfully.`,
      });
      setIsAddKeyOpen(false);
      addKeyForm.reset();
    } catch (error: any) {
      console.error('Error creating access key:', error);
      let message = 'An unexpected error occurred.';
      toast({
        title: 'Creation Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleDeleteKey = async (key: AccessKey) => {
    if (!firestore || !client?.path) return;
    try {
      const keyDocRef = doc(firestore, client.path, 'accessKeys', key.id);
      deleteDocumentNonBlocking(keyDocRef);
      toast({ title: 'Access Key Deleted' });
    } catch (error: any) {
      toast({
        title: 'Deletion Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };
  
  const handleUpdateKey = (keyId: string, data: Partial<AccessKey>) => {
    if (!firestore || !client?.path) return;
    const keyDocRef = doc(firestore, client.path, 'accessKeys', keyId);
    updateDocumentNonBlocking(keyDocRef, data);
    toast({
      title: 'Access Key Updated',
      description: 'The key has been updated successfully.',
    });
    setKeyToEdit(null); // Close the dialog
  };

  const isLoading = isUserLoading || isProfileLoading || isClientLoading;
  const isSunmmuClient = client?.displayId === 'SUNMMU';

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading your ERP...</p>
        </div>
      </div>
    );
  }

  const isAuthorized =
    userProfile?.role === 'manager' || userProfile?.role === 'admin';
  if (!isAuthorized || !client) {
    return (
      <div className="mt-16 flex flex-col items-center gap-8 text-center">
        <div className="max-w-md rounded-lg border bg-card p-8">
          <h1 className="font-headline text-2xl font-bold tracking-tight">
            No ERP Assigned
          </h1>
          <p className="mt-2 text-muted-foreground">
            You are not assigned to a client ERP. Please contact an
            administrator for assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            My ERP: {client.firmName}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-muted-foreground">Managing Client:</p>
            <Badge variant="secondary" className="font-mono">
              {client.displayId}
            </Badge>
          </div>
        </div>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>AI ERP Setup</CardTitle>
                <CardDescription>
                  Configure the training data and materials for this client.
                </CardDescription>
              </div>
              <SetupTrainerDialog
                client={client}
                onUpdateTrainingData={handleUpdateTrainingData}
              >
                <Button>
                  <Wrench className="mr-2" />
                  Setup ERP
                </Button>
              </SetupTrainerDialog>
            </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
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
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : !accessKeys || accessKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-12 text-center">
                <KeyRound className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-semibold">No Access Keys Found</p>
                <p className="text-sm text-muted-foreground">
                  Click "Add New Key" to create the first access key for this
                  client.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessKeys.map(key => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">
                        {key.displayName}
                      </TableCell>
                      <TableCell>{key.username}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        ••••••••
                      </TableCell>
                      <TableCell>{key.phoneNumber || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setKeyToEdit(key)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteKey(key)}
                        >
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

        {isSunmmuClient && client.path && (
          <SessionObservation clientPath={client.path} />
        )}
      </div>

      <Dialog open={isAddKeyOpen} onOpenChange={setIsAddKeyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Access Key</DialogTitle>
            <DialogDescription>
              Create a temporary set of credentials for a trainee.
            </DialogDescription>
          </DialogHeader>
          <Form {...addKeyForm}>
            <form
              onSubmit={addKeyForm.handleSubmit(handleAddKey)}
              className="space-y-4"
            >
              <FormField
                control={addKeyForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Trainee 1"
                        disabled={isCreatingKey}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={addKeyForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        {...field}
                        placeholder="e.g., 1234567890"
                        disabled={isCreatingKey}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addKeyForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="trainee1"
                        disabled={isCreatingKey}
                      />
                    </FormControl>
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
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        disabled={isCreatingKey}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isCreatingKey}
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isCreatingKey}>
                  {isCreatingKey && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isCreatingKey ? 'Creating...' : 'Create Key'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {keyToEdit && (
        <EditAccessKeyDialog
          key={keyToEdit.id}
          isOpen={!!keyToEdit}
          onOpenChange={(open) => !open && setKeyToEdit(null)}
          accessKey={keyToEdit}
          onUpdateKey={handleUpdateKey}
        />
      )}
    </>
  );
}

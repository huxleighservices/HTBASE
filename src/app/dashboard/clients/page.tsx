'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  PlusCircle,
  Archive,
  Trash2,
  Eye,
  Undo,
  Edit,
  Wrench,
  Palette,
  Clipboard,
  ClipboardCheck,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddClientDialog } from '@/components/clients/add-client-dialog';
import type { Client } from '@/types/client';
import { ReviewClientDialog } from '@/components/clients/review-client-dialog';
import {
  useUser,
  useFirestore,
  useCollection,
  useDoc,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetupTrainerDialog } from '@/components/clients/setup-trainer-dialog';
import { BrandCustomizationDialog } from '@/components/clients/brand-customization-dialog';
import type { UserProfile } from '@/types/user';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';


const PortalLink = ({ displayId }: { displayId: string }) => {
    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);
    
    // This will only run on the client, so window.location.origin is safe.
    const [origin, setOrigin] = useState('');
    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const portalUrl = `${origin}/launch/${displayId}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(portalUrl).then(() => {
            setIsCopied(true);
            toast({ title: 'Link Copied!', description: 'The portal link has been copied to your clipboard.' });
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    if (!origin) {
        return <Skeleton className="h-9 w-full" />;
    }

    return (
        <div className="flex items-center gap-2">
            <Input
                readOnly
                value={portalUrl}
                className="h-9 text-xs font-mono bg-muted flex-grow"
            />
            <Button variant="outline" size="sm" onClick={handleCopy}>
                {isCopied ? <ClipboardCheck className="mr-2" /> : <Clipboard className="mr-2" />}
                {isCopied ? 'Copied' : 'Copy Link'}
            </Button>
        </div>
    );
};


export default function ClientsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    // If the profile is loaded and the user is NOT an admin, redirect them.
    if (!isProfileLoading && userProfile && userProfile.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [userProfile, isProfileLoading, router]);


  const isServiceAccount = user?.email === 'service@huxleigh.com';

  const clientsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'clients');
  }, [firestore, user]);

  const { data: clients, isLoading: areClientsLoading } = useCollection<Client>(
    clientsCollectionRef
  );

  const generateDisplayId = (currentClients: Client[] | null | undefined) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id;
    let isUnique = false;
    const existingIds = new Set(currentClients?.map(c => c.displayId));
    while (!isUnique) {
      id = '';
      for (let i = 0; i < 6; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      isUnique = !existingIds.has(id);
    }
    return id;
  };

  useEffect(() => {
    if (clients && firestore && user) {
      clients.forEach(client => {
        if (!client.displayId) {
          const updates: Partial<Client> = {
            displayId: generateDisplayId(clients)
          };
          const clientDocRef = doc(
            firestore,
            'users',
            user.uid,
            'clients',
            client.id
          );
          updateDocumentNonBlocking(clientDocRef, updates);
        }
      });
    }
  }, [clients, firestore, user]);

  const handleAddClient = (
    client: Omit<Client, 'id' | 'status' | 'displayId' | 'trainingData'>
  ) => {
    if (!clientsCollectionRef) return;
    const displayId = generateDisplayId(clients);
    addDocumentNonBlocking(clientsCollectionRef, {
      ...client,
      displayId,
      status: 'pending',
    });
  };

  const handleUpdateClient = (
    clientId: string,
    client: Omit<Client, 'id' | 'status' | 'displayId'>
  ) => {
    if (!firestore || !user) return;
    const clientDocRef = doc(
      firestore,
      'users',
      user.uid,
      'clients',
      clientId
    );
    updateDocumentNonBlocking(clientDocRef, client);
  };
  
  const handleUpdateTrainingData = (clientId: string, trainingData: string) => {
    if (!firestore || !user) return;
    const clientDocRef = doc(
      firestore,
      'users',
      user.uid,
      'clients',
      clientId
    );
    updateDocumentNonBlocking(clientDocRef, { trainingData });
  }

  const handleUpdateClientStatus = (
    clientId: string,
    status: 'active' | 'archived'
  ) => {
    if (!firestore || !user) return;
    const clientDocRef = doc(
      firestore,
      'users',
      user.uid,
      'clients',
      clientId
    );
    updateDocumentNonBlocking(clientDocRef, { status });
  };

  const handleDeleteClient = (clientId: string) => {
    if (!firestore || !user) return;
    const clientDocRef = doc(
      firestore,
      'users',
      user.uid,
      'clients',
      clientId
    );
    deleteDocumentNonBlocking(clientDocRef);
  };

  const renderClientList = (clientList: Client[], listName: string) => {
    if (clientList.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No {listName} clients found.</p>
        </div>
      );
    }
    return (
      <ul className="space-y-4">
        {clientList.map(client => (
          <ClientListItem key={client.id} client={client} />
        ))}
      </ul>
    );
  };

  const ClientListItem = ({ client }: { client: Client }) => (
    <li className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg border bg-card gap-4">
      <div className="flex items-center gap-4 flex-grow">
        {client.displayId && (
          <Badge
            variant="secondary"
            className="text-base font-mono tracking-widest"
          >
            {client.displayId}
          </Badge>
        )}
        <div>
          <p className="font-semibold">{client.firmName}</p>
          <p className="text-sm text-muted-foreground">
            {client.contactEmail}
          </p>
        </div>
      </div>
       <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
      {client.status === 'pending' && (
        <div className="flex items-center justify-end gap-2">
          <AddClientDialog
            clientToEdit={client}
            onEditClient={handleUpdateClient}
          >
            <Button variant="ghost" size="icon">
              <Edit />
            </Button>
          </AddClientDialog>
          <ReviewClientDialog
            client={client}
            onActivate={() => handleUpdateClientStatus(client.id, 'active')}
            onReject={() => handleUpdateClientStatus(client.id, 'archived')}
            triggerButton={
              <Button variant="outline" size="sm">
                Review & Activate
              </Button>
            }
            action="activate"
          />
        </div>
      )}
      {client.status === 'active' && (
        <>
            <PortalLink displayId={client.displayId} />
            <div className="flex items-center justify-end gap-2 border-t md:border-t-0 pt-2 md:pt-0 mt-2 md:mt-0">
                <SetupTrainerDialog client={client} onUpdateTrainingData={handleUpdateTrainingData}>
                <Button variant="outline" size="sm">
                    <Wrench className="mr-2" />
                    Setup
                    </Button>
                </SetupTrainerDialog>
                <BrandCustomizationDialog client={client}>
                <Button variant="outline" size="sm">
                    <Palette className="mr-2" />
                    Customize
                    </Button>
                </BrandCustomizationDialog>
                <AddClientDialog
                    clientToEdit={client}
                    onEditClient={handleUpdateClient}
                >
                    <Button variant="ghost" size="icon">
                    <Edit />
                    </Button>
                </AddClientDialog>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateClientStatus(client.id, 'archived')}
                >
                    <Archive className="mr-2" />
                    Archive
                </Button>
            </div>
        </>
      )}
      {client.status === 'archived' && (
        <div className="flex items-center justify-end gap-2">
          <ReviewClientDialog
            client={client}
            onActivate={() => {}}
            onReject={() => {}}
            action="view"
            triggerButton={
              <Button variant="ghost" size="icon">
                <Eye />
              </Button>
            }
          />
          <ReviewClientDialog
            client={client}
            onActivate={() => handleUpdateClientStatus(client.id, 'active')}
            onReject={() => {}}
            action="reactivate"
            triggerButton={
              <Button variant="outline" size="sm">
                <Undo className="mr-2" />
                Re-activate
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => handleDeleteClient(client.id)}
          >
            <Trash2 className="mr-2" />
            Delete
          </Button>
        </div>
      )}
      </div>
    </li>
  );

  const isLoading = isProfileLoading || areClientsLoading;

  // Show a loader while we verify the user's role.
  if (isLoading || (!userProfile && !isProfileLoading)) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If the user is confirmed not to be an admin, this component will have already redirected.
  // We only render the content if they are an admin.
  if (userProfile?.role !== 'admin') {
    // This return is a fallback, as the redirection in useEffect should handle this.
    return null;
  }

  const pendingClients = clients?.filter(c => c.status === 'pending') || [];
  const activeClients = clients?.filter(c => c.status === 'active') || [];
  const archivedClients = clients?.filter(c => c.status === 'archived') || [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Clients
          </h1>
          <p className="text-muted-foreground">
            Manage your clients and their training programs.
          </p>
        </div>
        <AddClientDialog onAddClient={handleAddClient}>
          <Button>
            <PlusCircle className="mr-2" />
            Add New Client
          </Button>
        </AddClientDialog>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Clients</CardTitle>
              <CardDescription>
                Clients who have been invited but have not yet accepted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderClientList(pendingClients, 'pending')}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Clients</CardTitle>
              <CardDescription>
                A list of all your current clients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderClientList(activeClients, 'active')}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="archived">
          <Card>
            <CardHeader>
              <CardTitle>Archived Clients</CardTitle>
              <CardDescription>
                Clients who are no longer active.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderClientList(archivedClients, 'archived')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

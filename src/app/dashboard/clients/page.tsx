'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlusCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { AddClientDialog } from '@/components/clients/add-client-dialog';
import type { Client } from '@/types/client';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);

  const handleAddClient = (client: Omit<Client, 'id' | 'status'>) => {
    setClients(prevClients => [
      ...prevClients,
      {
        ...client,
        id: `${Date.now()}`,
        status: 'pending',
      },
    ]);
  };

  const moveToActive = (clientId: string) => {
    setClients(prevClients =>
      prevClients.map(c =>
        c.id === clientId ? { ...c, status: 'active' } : c
      )
    );
  };

  const pendingClients = clients.filter(c => c.status === 'pending');
  const activeClients = clients.filter(c => c.status === 'active');
  const archivedClients = clients.filter(c => c.status === 'archived');

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

      <Tabs defaultValue="pending">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search clients..." className="pl-10" />
          </div>
        </div>
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Clients</CardTitle>
              <CardDescription>
                Clients who have been invited but have not yet accepted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingClients.length > 0 ? (
                <ul className="space-y-4">
                  {pendingClients.map(client => (
                    <li
                      key={client.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div>
                        <p className="font-semibold">{client.firmName}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.contactEmail}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveToActive(client.id)}
                      >
                        Review & Activate
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No pending clients found.</p>
                </div>
              )}
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
              {activeClients.length > 0 ? (
                <ul className="space-y-4">
                  {activeClients.map(client => (
                    <li
                      key={client.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div>
                        <p className="font-semibold">{client.firmName}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.contactEmail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No active clients found.</p>
                </div>
              )}
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
              {archivedClients.length > 0 ? (
                 <ul className="space-y-4">
                 {archivedClients.map(client => (
                   <li
                     key={client.id}
                     className="flex items-center justify-between p-4 rounded-lg border bg-card"
                   >
                     <div>
                       <p className="font-semibold">{client.firmName}</p>
                       <p className="text-sm text-muted-foreground">
                         {client.contactEmail}
                       </p>
                     </div>
                   </li>
                 ))}
               </ul>
              ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No archived clients found.</p>
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

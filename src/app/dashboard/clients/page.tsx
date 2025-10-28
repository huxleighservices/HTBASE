'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlusCircle, Search, Archive, Trash2, Eye, Undo } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { AddClientDialog } from '@/components/clients/add-client-dialog';
import type { Client } from '@/types/client';
import { ReviewClientDialog } from '@/components/clients/review-client-dialog';

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

  const handleUpdateClientStatus = (
    clientId: string,
    status: 'active' | 'archived'
  ) => {
    setClients(prevClients =>
      prevClients.map(c => (c.id === clientId ? { ...c, status } : c))
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
                      <div className="flex items-center gap-2">
                        <ReviewClientDialog
                          client={client}
                          onActivate={() =>
                            handleUpdateClientStatus(client.id, 'active')
                          }
                          onReject={() =>
                            handleUpdateClientStatus(client.id, 'archived')
                          }
                          triggerButton={
                            <Button variant="outline" size="sm">
                              Review & Activate
                            </Button>
                          }
                          action="activate"
                        />
                      </div>
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
                      <div className="flex items-center gap-2">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleUpdateClientStatus(client.id, 'archived')
                          }
                        >
                          <Archive className="mr-2" />
                          Archive
                        </Button>
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
                      <div className="flex items-center gap-2">
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
                          onActivate={() =>
                            handleUpdateClientStatus(client.id, 'active')
                          }
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
                          onClick={() =>
                            setClients(prev =>
                              prev.filter(c => c.id !== client.id)
                            )
                          }
                        >
                          <Trash2 className="mr-2" />
                          Delete
                        </Button>
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

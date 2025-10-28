
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function ProfilePage() {
  const { user } = useUser();
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          My Profile
        </h1>
        <p className="text-muted-foreground">
          View your account information.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>
            This is your profile information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 border-2 border-primary/50">
              {userAvatar && (
                <AvatarImage
                  src={userAvatar.imageUrl}
                  alt={userAvatar.description}
                />
              )}
              <AvatarFallback className="text-3xl">HT</AvatarFallback>
            </Avatar>
            <div>
              {/* Dummy data for now, will be replaced with actual user data from firestore */}
              <h2 className="text-2xl font-semibold">HTBase User</h2>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                First Name
              </p>
              <p className="text-lg">HTBase</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Last Name
              </p>
              <p className="text-lg">User</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground">
                Email Address
              </p>
              <p className="text-lg">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

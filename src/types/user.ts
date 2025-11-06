
export type UserProfile = {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: 'admin' | 'manager' | 'user';
    assignedClientId?: string;
};


export type Client = {
  id: string;
  displayId: string;
  firmName: string;
  legalFirstName: string;
  legalLastName: string;
  firmSize: string;
  firmEstYear: string;
  industry: string;
  contactEmail: string;
  contactPhoneNumber: string;
  location: string;
  status: 'pending' | 'active' | 'archived';
  path?: string; // Full path to the document in Firestore
  trainingData?: string;
  isEdu?: boolean;
};

export type BrandCustomization = {
  id: 'config';
  primaryColor?: string;
  backgroundColor?: string;
  accentColor?: string;
  foregroundColor?: string;
  logoUrl?: string;
  tagline?: string;
  fontFamily?: string;

  // Password Screen
  passwordScreenDescription?: string;
  passwordScreenPasswordLabel?: string;
  passwordScreenUnlockButton?: string;
  
  // Session Screen
  sessionScreenTitle?: string;
  sessionScreenDescription?: string;
  sessionScreenFirstNameLabel?: string;
  sessionScreenLastNameLabel?: string;
  sessionScreenEmailLabel?: string;
  sessionScreenCompanyLabel?: string;
  sessionScreenLaunchButton?: string;

  // Trainer Screen
  trainerScreenDescription?: string;
  messengerTitle?: string;
  messengerDescription?: string;
  messengerButton?: string;
  coldCallTitle?: string;
  coldCallDescription?: string;
  coldCallButton?: string;

};

export type Asset = {
  id: string;
  title: string;
  description: string;
};

export type ActivityLogEntry = {
    timestamp: Date;
    activity: string;
    user: string;
};

export type OpaCustomer = {
    id: string;
    firstName: string;
    lastName: string;
    franchise: string;
    writingAgent: string;
    policyFaceAmount: string;
    planCode: string;
    planType: string;
    phoneNumber: string;
    extraInfo: string;
    notes?: string;
    activityLog?: ActivityLogEntry[];
    createdAt: any;
};

export type Lead = {
    id: string;
    firstName: string;
    lastName: string;
    franchise: string;
    writingAgent: string;
    policyFaceAmount: string;
    planCode: string;
    planType: string;
    phoneNumber: string;
    extraInfo: string;
    notes?: string;
    activityLog?: ActivityLogEntry[];
    createdAt: any;
};

export type TimePunch = {
    id: string;
    accessKeyUsername: string;
    timestamp: any;
    type: 'punch-in' | 'punch-out';
    description?: string; // Optional description for punch-out
};

export type Project = {
    id: string;
    name: string;
    createdAt: any;
    columns: string[];
};

export type ProjectItem = {
    id: string;
    data: Record<string, string>;
}

export type Sop = {
  id: string;
  title: string;
  content: string;
  createdAt: any;
};
    

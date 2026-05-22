
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
  colorScheme?: 'light' | 'dark';
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
    createdAt: any;
};

export type Lead = {
    id: string;
    agent: string;
    firstName: string;
    lastName: string;
    source?: string;
    contactDate?: string;
    currentStep?: string;
    jobType?: string;
    phoneNumber?: string;
    email?: string;
    homeAddress?: string;
    projectedRevenue?: string;
    companyCam?: boolean;
    pendingNotes?: string;
    notes?: string;
    createdAt: any;
    contractPresentationDate?: string;
    nextStepDueDate?: string;
    sortOrder?: number;
};

export type SyncedLead = {
    agent: string;
    name: string;
    source: string;
    contactDate: string;
    currentStep: string;
    contractPres: string;
    nextStepDue: string;
    jobType: string;
    phone: string;
    email: string;
    address: string;
    revenue: string;
    companyCam: boolean;
    pendingNotes: string;
    sortOrder?: number;
}

export type Build = {
    id: string;
    buildName: string;
    clientName: string;
    buildStage?: string;
    projectManager?: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
    projectedRevenue?: string;
    companyCam?: boolean;
    pendingNotes?: string;
    cityPermitRegistration?: boolean;
    inspectionDate?: string;
    contractDate?: string;
    buildDate?: string;
    notes?: string;
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

export type Form = {
  id: string;
  title: string;
  fields: string[];
  createdAt: any;
};

export type FormSubmission = {
    id: string;
    data: Record<string, any>;
    createdAt: any;
};

export type QueueTask = {
    id: string;
    leadId: string;
    leadName: string;
    currentStep: string;
    nextStep: string;
    dueDate: any; // Timestamp
    status: 'current' | 'overdue';
    agent: string;
    notes?: string[];
    clientPath: string;
};
    
export type Contract = {
    id: string;
    leadId: string;
    leadName: string;
    includedItems: string[];
    createdAt: any;
};

export type ContractTemplate = {
    id: string; // Corresponds to the contract item id
    title: string;
    content: string;
};

export type ClientContractTemplate = {
    id: string;
    label: string;
};

export type AccessKey = {
  id: string; // Document ID
  username: string;
  password?: string; // Optional for security when reading lists
  displayName: string;
  createdAt: any;
  phoneNumber?: string;
  role?: 'admin' | 'user'; // 'admin' can edit widgets and request new ones
};

export type ARCustomer = {
    id: string;
    leadId?: string;
    customerName: string;
    email?: string;
    phone?: string;
    buildCompleteDate: any; // Firestore Timestamp
    initialBalance: number;
    createdAt: any; // Firestore Timestamp
    activityLog?: ARActivityLog[];
    lastActivity?: any;
};

export type AREmailTemplate = {
    id: string;
    name: string;
    subject: string;
    body: string;
    createdAt: any;
};

export type ARPayment = {
    id: string;
    amount: number;
    date: any; // Firestore Timestamp
    user: string;
};

export type ARPenalty = {
    id: string;
    amount: number;
    reason: string;
    date: any; // Firestore Timestamp
    user: string;
};

export type ARActivityLog = {
    type: 'Phone Call' | 'Email' | 'Text Message' | 'Other';
    note: string;
    date: any; // Firestore Timestamp
    user: string;
};

export type InventoryCollection = {
    id: string;
    name: string;
    createdAt: any;
};

export type InventoryItem = {
    id: string;
    collectionId: string;
    name: string;
    descriptor?: string;
    quantity: number;
    createdAt: any;
};

export type InventoryPreferences = {
    id: 'config';
    lowStockAlertsEnabled: boolean;
    alertEmail: string;
    lowStockThreshold: number;
};


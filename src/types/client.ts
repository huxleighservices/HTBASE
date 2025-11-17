
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

export type OpaCustomer = {
    id: string;
    firstName: string;
    lastName: string;
    formerCompany: string;
    planDetails: string;
    dateLeft: string;
    phoneNumber: string;
    extraInfo: string;
    notes?: string;
};

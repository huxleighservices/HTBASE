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
  launchPassword?: string;
  trainingData?: string;
};

export type BrandCustomization = {
  id: 'config';
  primaryColor?: string;
  backgroundColor?: string;
  accentColor?: string;
  logoUrl?: string;
  tagline?: string;
};

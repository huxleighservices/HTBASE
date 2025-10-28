export type Client = {
  id: string;
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
};

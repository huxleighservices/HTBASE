
export type AccessKey = {
  id: string; // Document ID
  username: string;
  password?: string; // Optional for security when reading lists
  displayName: string;
  createdAt: any;
  phoneNumber?: string;
};

// The Session type is now effectively obsolete for the new flow,
// but we keep it for potential future use or for admin-led sessions.
export type Session = {
  id: string;
  sessionName: string;
  companyName: string;
  pin: string;
  createdAt: any;
};

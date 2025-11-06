
export type AccessKey = {
  id: string; // Firebase Auth UID
  email: string;
  displayName: string;
  createdAt: any;
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

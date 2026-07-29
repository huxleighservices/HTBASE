export type BaseDoc = {
  id: string;
  title: string;
  /** Rich text HTML content from the editor */
  content: string;
  /** PNG data URL of the sketch canvas */
  sketchDataUrl?: string;
  createdBy: string;
  createdByDisplay: string;
  /** Usernames granted access in addition to the creator. Only the creator may edit this list. */
  allowedUsers: string[];
  createdAt: any;
  updatedAt?: any;
  updatedByDisplay?: string;
};

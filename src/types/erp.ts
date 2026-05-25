import type { DepartmentId, DeptStatus } from '@/lib/departments';

export type { DepartmentId, DeptStatus };

export type ERPField = {
  key: string;
  label: string;
  value: string;
};

export type ERPNote = {
  id: string;
  text: string;
  author: string;
  createdAt: any;
  updatedAt?: any;
};

export type ERPDeptEntry = {
  status: DeptStatus;
  notes: string;
  fields: ERPField[];
  notesList?: ERPNote[];
};

export type ERPPerson = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  departments: DepartmentId[];
  deptData: Partial<Record<DepartmentId, ERPDeptEntry>>;
  widgetLinks?: Record<string, string>; // collectionName → docId
  createdAt: any;
};

export type ERPConfig = {
  id: 'settings';
  enabledDepartments: DepartmentId[];
  customLabels: Partial<Record<DepartmentId, string>>;
  widgetDepts?: Record<string, string>; // collectionName → DepartmentId
};

export type ERPViewMode = 'card' | 'spreadsheet' | 'hybrid';

export type ERPChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

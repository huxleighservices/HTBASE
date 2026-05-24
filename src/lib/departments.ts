/**
 * ERP Department color system — single source of truth.
 * Colors are permanent per department; labels can be customized for custom slots.
 */

export type DepartmentId =
  | 'operations'
  | 'finance'
  | 'marketing'
  | 'accounting'
  | 'sales'
  | 'legal'
  | 'hr'
  | 'technology'
  | 'custom1'
  | 'custom2'
  | 'custom3'
  | 'custom4';

export type Department = {
  id: DepartmentId;
  label: string;
  color: string;   // hex for renders that need it
  rgb: string;     // "r, g, b" for rgba() usage
  customizable: boolean;
};

export const DEPARTMENTS: Record<DepartmentId, Department> = {
  operations:  { id: 'operations',  label: 'Operations',         color: '#C1440E', rgb: '193, 68, 14',   customizable: false },
  finance:     { id: 'finance',     label: 'Finance',            color: '#5DBF8A', rgb: '93, 191, 138',  customizable: false },
  marketing:   { id: 'marketing',   label: 'Marketing',          color: '#D91A8C', rgb: '217, 26, 140',  customizable: false },
  accounting:  { id: 'accounting',  label: 'Accounting',         color: '#78909C', rgb: '120, 144, 156', customizable: false },
  sales:       { id: 'sales',       label: 'Sales',              color: '#F4C430', rgb: '244, 196, 48',  customizable: false },
  legal:       { id: 'legal',       label: 'Legal & Compliance', color: '#795548', rgb: '121, 85, 72',   customizable: false },
  hr:          { id: 'hr',          label: 'Human Resources',    color: '#42A5F5', rgb: '66, 165, 245',  customizable: false },
  technology:  { id: 'technology',  label: 'Technology',         color: '#1A3A8F', rgb: '26, 58, 143',   customizable: false },
  custom1:     { id: 'custom1',     label: 'Custom Field 1',     color: '#8B5CF6', rgb: '139, 92, 246',  customizable: true  },
  custom2:     { id: 'custom2',     label: 'Custom Field 2',     color: '#EF5350', rgb: '239, 83, 80',   customizable: true  },
  custom3:     { id: 'custom3',     label: 'Custom Field 3',     color: '#00897B', rgb: '0, 137, 123',   customizable: true  },
  custom4:     { id: 'custom4',     label: 'Custom Field 4',     color: '#FF8F00', rgb: '255, 143, 0',   customizable: true  },
};

export const DEPARTMENT_LIST = Object.values(DEPARTMENTS);

export const CORE_DEPARTMENTS: DepartmentId[] = [
  'operations', 'finance', 'marketing', 'accounting',
  'sales', 'legal', 'hr', 'technology',
];

export const CUSTOM_DEPARTMENTS: DepartmentId[] = ['custom1', 'custom2', 'custom3', 'custom4'];

export const DEFAULT_ENABLED: DepartmentId[] = ['operations', 'sales', 'hr', 'finance'];

/** Status values with their semantic meaning */
export type DeptStatus = 'active' | 'pending' | 'complete' | 'at-risk' | 'inactive';

export const STATUS_LABELS: Record<DeptStatus, string> = {
  active:   'Active',
  pending:  'Pending',
  complete: 'Complete',
  'at-risk': 'At Risk',
  inactive: 'Inactive',
};

/** Glow + glass style for a department section panel */
export function deptGlass(dept: Department, intensity: 'low' | 'med' | 'high' = 'med') {
  const { rgb } = dept;
  const shadows = {
    low:  `0 0 10px rgba(${rgb}, 0.18), inset 0 0 0 1px rgba(${rgb}, 0.15)`,
    med:  `0 0 20px rgba(${rgb}, 0.28), 0 0 40px rgba(${rgb}, 0.12), inset 0 0 0 1px rgba(${rgb}, 0.22)`,
    high: `0 0 30px rgba(${rgb}, 0.45), 0 0 60px rgba(${rgb}, 0.22), inset 0 0 0 1px rgba(${rgb}, 0.38)`,
  };
  return {
    boxShadow: shadows[intensity],
    background: `rgba(${rgb}, 0.07)`,
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: `1px solid rgba(${rgb}, 0.22)`,
    borderRadius: '12px',
  } as React.CSSProperties;
}

/** Glowing horizontal divider bar for department sections */
export function deptDivider(dept: Department): React.CSSProperties {
  const { rgb } = dept;
  return {
    height: '2px',
    background: `linear-gradient(90deg, rgba(${rgb}, 0.9) 0%, rgba(${rgb}, 0.4) 60%, transparent 100%)`,
    boxShadow: `0 0 8px rgba(${rgb}, 0.7), 0 0 18px rgba(${rgb}, 0.35)`,
    borderRadius: '1px',
  };
}

/** Colored pill badge style */
export function deptPill(dept: Department): React.CSSProperties {
  const { rgb } = dept;
  return {
    background: `rgba(${rgb}, 0.15)`,
    border: `1px solid rgba(${rgb}, 0.4)`,
    color: dept.color,
    boxShadow: `0 0 6px rgba(${rgb}, 0.2)`,
  };
}

/** Status dot color */
export function statusColor(status: DeptStatus): string {
  switch (status) {
    case 'active':    return '#22c55e';
    case 'pending':   return '#f59e0b';
    case 'complete':  return '#3b82f6';
    case 'at-risk':   return '#ef4444';
    case 'inactive':  return '#6b7280';
  }
}

import type React from 'react';

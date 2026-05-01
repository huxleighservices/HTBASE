/**
 * WIDGET CATALOG
 * ─────────────────────────────────────────────────────────────────────────────
 * This file defines every widget type that exists in the system.
 * To add a new widget type:
 *   1. Add an entry to WIDGET_CATALOG
 *   2. Wire up the dialog/action in the launch page renderWidgetAction()
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type WidgetType =
  | 'messenger'
  | 'cold-call'
  | 'session-manager'
  | 'opac'
  | 'time-punch'
  | 'project-hub'
  | 'sop-bot'
  | 'queue'
  | 'builds'
  | 'forms'
  | 'contracts'
  | 'ar-collections'
  | 'leads'
  | 'knock-pro'
  | 'task-pipeline'
  | 'team-overview'
  | 'performance-analytics'
  | 'ai-assistant'
  | 'deal-tracker'
  | 'schedule'
  | 'resource-library'
  | 'communications';

export type WidgetCategory = 'Sales Training' | 'Operations' | 'Leads' | 'Essentials';

export interface WidgetDefinition {
  type: WidgetType;
  defaultTitle: string;
  defaultDescription: string;
  /** Name of a Lucide icon (used for lookup in the portal) */
  iconName: string;
  category: WidgetCategory;
  /** Label shown on the primary action button */
  actionLabel: string;
  /** Secondary action label (optional) */
  secondaryActionLabel?: string;
}

export const WIDGET_CATALOG: WidgetDefinition[] = [
  // ── Sales Training ──────────────────────────────────────────────────────────
  {
    type: 'messenger',
    defaultTitle: 'Messenger Scenario Runner',
    defaultDescription: 'Practice real-world conversations with an AI-powered chat simulator.',
    iconName: 'MessageSquare',
    category: 'Sales Training',
    actionLabel: 'Start Scenario',
  },
  {
    type: 'cold-call',
    defaultTitle: 'Cold Call Simulator',
    defaultDescription: 'Hone your sales skills by practicing cold calls with an AI prospect.',
    iconName: 'Phone',
    category: 'Sales Training',
    actionLabel: 'Start Simulation',
  },
  {
    type: 'session-manager',
    defaultTitle: 'Training Results',
    defaultDescription: 'View and analyze your training session history and performance.',
    iconName: 'BarChart2',
    category: 'Sales Training',
    actionLabel: 'View Results',
  },

  // ── Operations ───────────────────────────────────────────────────────────────
  {
    type: 'opac',
    defaultTitle: 'OPAC Tracker',
    defaultDescription: 'Globe Life Liberty National Customer Tracker.',
    iconName: 'Database',
    category: 'Operations',
    actionLabel: 'Open Tracker',
  },
  {
    type: 'time-punch',
    defaultTitle: 'Time Punch',
    defaultDescription: 'Track employee clock-in and clock-out with ease.',
    iconName: 'Timer',
    category: 'Operations',
    actionLabel: 'Open Time Punch',
  },
  {
    type: 'project-hub',
    defaultTitle: 'Project Hub',
    defaultDescription: 'Manage and track your projects and tasks across teams.',
    iconName: 'GanttChartSquare',
    category: 'Operations',
    actionLabel: 'Open Hub',
  },
  {
    type: 'sop-bot',
    defaultTitle: 'SOP Bot',
    defaultDescription: 'AI-powered standard operating procedure assistant.',
    iconName: 'Bot',
    category: 'Operations',
    actionLabel: 'Open SOP Bot',
  },
  {
    type: 'queue',
    defaultTitle: 'Task Queue',
    defaultDescription: 'Automated follow-up reminders and task management for leads.',
    iconName: 'ListTodo',
    category: 'Operations',
    actionLabel: 'Open Queue',
    secondaryActionLabel: 'Master Queue',
  },
  {
    type: 'builds',
    defaultTitle: 'Builds Tracker',
    defaultDescription: 'Manage and track your build projects from start to finish.',
    iconName: 'Wrench',
    category: 'Operations',
    actionLabel: 'Open Builds',
  },
  {
    type: 'forms',
    defaultTitle: 'Forms',
    defaultDescription: 'Create and manage public data-entry forms.',
    iconName: 'FileSignature',
    category: 'Operations',
    actionLabel: 'Manage Forms',
  },
  {
    type: 'contracts',
    defaultTitle: 'Contract Generator',
    defaultDescription: 'Generate and manage contracts for your leads using custom templates.',
    iconName: 'FileText',
    category: 'Operations',
    actionLabel: 'Open Generator',
    secondaryActionLabel: 'Manage Templates',
  },
  {
    type: 'ar-collections',
    defaultTitle: 'A/R Collections',
    defaultDescription: 'Manage customer balances, payments, and collections.',
    iconName: 'DollarSign',
    category: 'Operations',
    actionLabel: 'Open Hub',
  },

  // ── Knock Pro ────────────────────────────────────────────────────────────────
  {
    type: 'knock-pro',
    defaultTitle: 'Knock Pro',
    defaultDescription: 'Track and manage door-to-door sales knocks with live map pins.',
    iconName: 'MapPin',
    category: 'Leads',
    actionLabel: 'Open Knock Pro',
  },

  // ── Leads ────────────────────────────────────────────────────────────────────
  {
    type: 'leads',
    defaultTitle: 'Leads Tracker',
    defaultDescription: 'Manage and track your entire sales pipeline.',
    iconName: 'Users',
    category: 'Leads',
    actionLabel: 'Open Leads',
  },

  // ── Essentials ───────────────────────────────────────────────────────────────
  {
    type: 'task-pipeline',
    defaultTitle: 'Task Pipeline',
    defaultDescription: 'Kanban and list-view task boards with priority levels, due dates, and assignees.',
    iconName: 'KanbanSquare',
    category: 'Essentials',
    actionLabel: 'Open Pipeline',
  },
  {
    type: 'team-overview',
    defaultTitle: 'Team Overview',
    defaultDescription: "See every team member's status, active tasks, and recent activity in one glanceable widget.",
    iconName: 'Users2',
    category: 'Essentials',
    actionLabel: 'Open Overview',
  },
  {
    type: 'performance-analytics',
    defaultTitle: 'Performance Analytics',
    defaultDescription: 'Live KPI tracking, custom metric charts, and goal progress — no spreadsheets required.',
    iconName: 'TrendingUp',
    category: 'Essentials',
    actionLabel: 'Open Analytics',
  },
  {
    type: 'ai-assistant',
    defaultTitle: 'AI Smart Assistant',
    defaultDescription: 'An always-on AI layer that surfaces suggestions, flags bottlenecks, and answers questions about your own data.',
    iconName: 'Sparkles',
    category: 'Essentials',
    actionLabel: 'Open Assistant',
  },
  {
    type: 'deal-tracker',
    defaultTitle: 'Deal & Pipeline Tracker',
    defaultDescription: 'Visualize your sales pipeline from prospect to close with stage-by-stage conversion tracking.',
    iconName: 'CircleDollarSign',
    category: 'Essentials',
    actionLabel: 'Open Deals',
  },
  {
    type: 'schedule',
    defaultTitle: 'Schedule & Deadlines',
    defaultDescription: 'Calendar widget with milestone markers, deadline countdowns, and team schedule visibility.',
    iconName: 'CalendarDays',
    category: 'Essentials',
    actionLabel: 'Open Schedule',
  },
  {
    type: 'resource-library',
    defaultTitle: 'Resource Library',
    defaultDescription: 'Centralized file storage, shared links, and team assets — searchable and always accessible.',
    iconName: 'FolderOpen',
    category: 'Essentials',
    actionLabel: 'Open Library',
  },
  {
    type: 'communications',
    defaultTitle: 'Communications',
    defaultDescription: 'In-platform messaging threads pinned to tasks, deals, or team members so context is never lost.',
    iconName: 'Hash',
    category: 'Essentials',
    actionLabel: 'Open Comms',
  },
];

/** Quick lookup by type */
export const WIDGET_CATALOG_MAP = Object.fromEntries(
  WIDGET_CATALOG.map((w) => [w.type, w])
) as Record<WidgetType, WidgetDefinition>;

export const WIDGET_CATEGORIES: WidgetCategory[] = ['Sales Training', 'Operations', 'Leads', 'Essentials'];

import type { WidgetType, WidgetCategory } from '@/lib/widget-catalog';

/**
 * A Widget instance stored per-client in Firestore at:
 *   {clientPath}/widgets/{widgetId}
 *
 * The `id` field matches the `type` for built-in widgets.
 */
export type Widget = {
  id: string;
  type: WidgetType;
  title: string;
  description: string;
  enabled: boolean;
  order: number;
  category: WidgetCategory;
};

/**
 * A request for a custom widget, stored at:
 *   {clientPath}/widgetRequests/{requestId}
 *
 * The master admin (service@huxleigh.com) monitors these via a
 * collectionGroup('widgetRequests') query in the admin dashboard.
 */
export type WidgetRequest = {
  id: string;
  clientDisplayId: string;
  clientName: string;
  requestedByUsername: string;
  requestedByName: string;
  widgetName: string;
  widgetDescription: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  notes?: string;
};

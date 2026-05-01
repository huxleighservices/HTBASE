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
  tags?: string[];
};

/**
 * A request for a custom widget, stored at top-level:
 *   widgetRequests/{requestId}
 *
 * The master admin (service@huxleigh.com) monitors these in the marketplace.
 */
export type WidgetRequest = {
  id: string;
  clientDisplayId: string;
  clientName: string;
  requestedByEmail: string;
  widgetName: string;
  widgetDescription: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  notes?: string;
};

/**
 * Marketplace-level settings for a widget type, stored at:
 *   widgetMarketplace/{widgetType}
 *
 * Super admin controls availability and display overrides.
 */
export type MarketplaceListing = {
  type: import('@/lib/widget-catalog').WidgetType;
  enabled: boolean;
  nameOverride?: string;
  descriptionOverride?: string;
};

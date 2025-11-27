export interface DashboardSummary {
  totalDocuments: number;
  totalSalesAmount: number;
  pendingDocuments: number;
  recentActivities: { type: string; id: string; timestamp: string }[];
  // ... other relevant summary metrics
}

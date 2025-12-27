export interface DashboardSummary {
  totalDocuments: number;
  totalAmount: number;
  draftCount: number;
  confirmedCount: number;
  cancelledCount: number;
  newDocuments: number;
  editedDocuments: number;
  etaxSubmittedCount: number;
  documentTypeBreakdown: { [key: string]: number };
  branchRanking: { [key: string]: number };
}


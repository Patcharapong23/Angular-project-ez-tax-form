// รายการในตารางหน้า “เอกสารทั้งหมด”
export interface DocumentListItem {
  id: number;
  docUuid: string; // Add docUuid
  docNo: string;
  docTypeCode: string;
  issueDate: string;
  sellerName: string;
  buyerName: string;
  grandTotal: number;
  buyerTaxId?: string;
  branchCode?: string;
  createdAt?: string;
  status?: 'NEW' | 'UPDATED' | 'CANCELLED';
  // Snapshot fields for foreigners/persons without buyer entity
  buyerTaxIdSnapshot?: string;
  buyerNameSnapshot?: string;
  buyerPassportNoSnapshot?: string;
}

// payload สำหรับสร้างเอกสาร
export interface DocumentCreatePayload {
  header: {
    docTypeCode: string;
    docNo?: string;
    issueDate: string;
    sellerTaxId?: string;
    branchCode?: string;
    currency: string;
    vatRateStandard?: number;
  };
  party: {
    buyerDetails: {
      type: string;
      buyerNameTh: string;
      buyerTaxId?: string;
      buyerAddressTh?: string;
      buyerEmail?: string;
      buyerPhoneNumber?: string;
      buyerZipCode?: string;
      buyerCode?: string;
      buyerBranchCode?: string;
      buyerPassportNo?: string;
    };
    saveToMaster?: boolean;
  };
  items: DocumentItem[];
  moneyTaxbasisTotalamt: number;
  moneyTaxTotalamt: number;
  moneyGrandTotalamt: number;
  remarkOther?: string;
  charges?: DocumentCharge[];
  payments?: DocumentPayment[];
}

export interface DocumentCharge {
  name: string;
  amount: number;
}

export interface DocumentPayment {
  method: string;
  amount: number;
}


export interface DocumentItem {
  lineNo: number;
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
  sku?: string;
}

// รายละเอียดเต็ม (ใช้ patch ฟอร์มตอนแก้ไข)
export interface EzDocumentFull {
  id: number;
  docNo: string;
  docTypeCode: string | null;
  issueDate: string;

  sellerName?: string;
  sellerTaxId?: string;
  sellerBranchCode?: string;
  sellerBranchName?: string;
  sellerAddress?: string;
  sellerTel?: string;

  buyerType?: string;
  buyerCode?: string;
  buyerName?: string;
  buyerTaxId?: string;
  buyerPassportNo?: string;
  buyerBranchCode?: string;
  buyerAddress?: string;
  buyerEmail?: string;
  buyerTel?: string;
  buyerZip?: string;

  subtotal?: number;
  discountTotal?: number;
  netAfterDiscount?: number;
  serviceFee?: number;
  shippingFee?: number;
  vatAmount?: number;
  grandTotal?: number;

  remark?: string;
  status?: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  createdAt?: string;
}

// Backend DTOs
export interface DocumentItemRequest {
  productId: string | null;
  itemName: string;
  qty: number;
  unitPrice: number;
  vatRate: number;
}

export interface PaymentRequest {
  type: string;
  amount: number;
  reference?: string | null;
}

export interface DocumentRequest {
  sellerId: string;
  branchCode: string;
  docTypeCode: string;
  docIssueDate: string;
  buyerId: string | null;
  items: DocumentItemRequest[];
  payments: PaymentRequest[];
  charges: any[];
}

export type CreateDocumentRequest = DocumentRequest;


export interface DocumentTypeDto {
  code: string;
  thName: string;
  enName: string;
  sortOrder: number;
  sign: number;
  isAdjustment: boolean;
}

export interface DocumentItemDto {
  id: string;
  lineNo: number;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
  amount: number;
  netAmount: number;
  vatBase: number;
  vatAmount: number;
  lineTotal: number;
}

export interface BuyerDto {
  buyerId: string;
  buyerNameTh: string | null;
  buyerAddressTh: string | null;
  buyerZipCode: string | null;
  buyerEmail: string | null;
  buyerPhoneNumber: string | null;
  // …ถ้าต้องใช้ field อื่นก็เติมได้
}

export interface DocumentDto {
  docUuid: string;
  docId: string | null;
  docIssueDate: string;
  docType: DocumentTypeDto;
  seller: any;
  branch: any;
  buyer: BuyerDto;
  moneyTaxbasisTotalamt: number;
  moneyTaxTotalamt: number;
  moneyGrandTotalamt: number;
  remarkOther: string | null;
  items: DocumentItemDto[];
  charges: any[];
  payments: any[];
}

export interface CreateDocumentResponse {
  document: DocumentDto;
  exportInfo: {
    pdfAvailable: boolean;
    xmlAvailable: boolean;
    csvAvailable: boolean;
    downloadToken: string | null;
  };
}

export interface DocumentSearchParams {
  page?: number;
  size?: number;
  docType?: string;
  buyerTaxId?: string;
  issueDateFrom?: string; // ISO Date
  issueDateTo?: string; // ISO Date
  createdFrom?: string; // ISO Date
  createdTo?: string; // ISO Date
  status?: string; // e.g., "APPROVED"
  docNo?: string;
}

export interface Page<T> {
  content: T[];
  pageable: {
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    pageNumber: number;
    pageSize: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number; // current page number (0-indexed)
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

// UpdateDocumentRequest - supports both nested structure (edit-document) and flat structure (invoice-form)
// Using 'any' to allow flexibility between different component implementations
export type UpdateDocumentRequest = any;


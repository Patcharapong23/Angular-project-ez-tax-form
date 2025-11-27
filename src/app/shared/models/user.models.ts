export interface UserProfile {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  primaryRole: string;
  defaultBranchId: string;
  defaultBranchCode: string;
  defaultBranchNameTh: string;
  sellerTaxId: string;
  // roles?: { roleCode: string; roleName: string }[]; // Can be added if needed
}

export interface SellerInfo {
  sellerId: string;
  sellerNameTh: string;
  sellerNameEn?: string;
  sellerTaxId: string;
  sellerPhoneNumber?: string;
  logoUrl?: string;
}

export interface BranchInfo {
  branchId: string;
  branchCode: string;
  branchNameTh: string;
  branchNameEn?: string;
  buildingNo?: string;
  addressDetailTh?: string;
  addressDetailEn?: string;
  provinceId?: string;
  districtId?: string;
  subdistrictId?: string;
  zipCode?: string;
}

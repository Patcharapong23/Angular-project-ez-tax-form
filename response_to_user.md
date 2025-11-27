Here are the current Angular interfaces you requested:

**1. MeResponse (from src/app/shared/auth.service.ts)**
This interface represents the response structure from the `/eztax/me` endpoint, providing details about the authenticated user, their associated seller, and branch information.
```typescript
export interface MeResponse {
  user: { userId: string; username: string; fullName: string; email: string; roles?: { roleCode: string; roleName: string }[] };
  seller?: {
    sellerId: string; sellerNameTh: string; sellerNameEn?: string;
    sellerTaxId: string; sellerPhoneNumber?: string; logoUrl?: string;
  };
  branch?: {
    branchId: string; branchCode: string; branchNameTh: string; branchNameEn?: string;
    buildingNo?: string; addressDetailTh?: string; addressDetailEn?: string;
    provinceId?: string; districtId?: string; subdistrictId?: string; zipCode?: string;
  };
}
```

**2. AuthUser (from src/app/shared/auth.service.ts)**
This interface represents the internal model of the authenticated user within the Angular application, often derived from the `MeResponse` and used for displaying user-specific information. This is likely what you referred to as `UserProfile`.
```typescript
export interface AuthUser {
  userName: string;
  fullName: string;
  email: string;
  role?: string;

  // optional
  sellerNameTh?: string;
  sellerNameEn?: string;
  sellerTaxId?: string;
  sellerPhoneNumber?: string;
  logoUrl?: string;
  branchCode?: string;
  branchNameTh?: string;
  branchNameEn?: string;
  sellerAddress?: SellerAddress;
}
```

**3. SellerAddress (from src/app/shared/auth.service.ts)**
This type defines the structure for a seller's address, used within the `AuthUser` interface.
```typescript
export type SellerAddress = {
  buildingNo?: string;
  addressDetailTh?: string;
  addressDetailEn?: string;
  provinceId?: string;
  districtId?: string;
  subdistrictId?: string;
  postalCode?: string;
};
```

I could not find a specific interface named `DashboardSummaryResponse`. The `DashboardComponent` primarily uses the `AuthUser` data from `AuthService` and does not appear to fetch a separate summary response from the backend.
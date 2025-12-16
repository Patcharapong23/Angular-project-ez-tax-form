import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OrgService, SellerProfile } from './org.service';
import { environment } from '../../../environments/environment';

describe('OrgService', () => {
  let service: OrgService;
  let httpMock: HttpTestingController;
  const api = environment.apiBase;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrgService]
    });
    service = TestBed.inject(OrgService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('me', () => {
    it('should return seller profile on successful request', () => {
      const mockProfile: SellerProfile = {
        companyName: 'Test Company',
        taxId: '1234567890',
        branchCode: '00001',
        branchName: 'Test Branch',
        tel: '0123456789',
        address: 'Test Address',
        logoUrl: '',
        branches: [],
      };

      service.me().subscribe(profile => {
        expect(profile).toEqual(mockProfile);
      });

      const req = httpMock.expectOne(`${api}/auth/me`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProfile);
    });

    it('should return empty profile on error', () => {
      const emptyProfile: SellerProfile = {
        companyName: '',
        taxId: '',
        branchCode: '00000',
        branchName: 'สำนักงานใหญ่',
        tel: '',
        address: '',
        logoUrl: '',
        branches: [{ code: '00000', name: 'สำนักงานใหญ่' }],
      };

      service.me().subscribe(profile => {
        expect(profile).toEqual(emptyProfile);
      });

      const req = httpMock.expectOne(`${api}/auth/me`);
      expect(req.request.method).toBe('GET');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('loadSellerProfile', () => {
    it('should load and transform seller profile correctly', () => {
        const meResponse = {
            sellerNameTh: 'บริษัท A',
            sellerTaxId: '123',
            branchCode: '00001',
            branchNameTh: 'สาขา 1',
            sellerPhone: '02-123',
            addressDetailTh: '123 ถ.สุขุมวิท',
            logoUrl: 'logo.png',
            branches: [{ code: '00001', nameTh: 'สาขา 1' }, { code: '00002', nameTh: 'สาขา 2' }]
        };

      const expectedProfile: SellerProfile = {
        companyName: 'บริษัท A',
        taxId: '123',
        branchCode: '00001',
        branchName: 'สาขา 1',
        tel: '02-123',
        address: '123 ถ.สุขุมวิท',
        logoUrl: 'logo.png',
        branches: [
          { code: '00001', name: 'สาขา 1' },
          { code: '00002', name: 'สาขา 2' }
        ]
      };

      service.loadSellerProfile().subscribe(profile => {
        expect(profile).toEqual(expectedProfile);
      });

      const meReq = httpMock.expectOne(`${api}/auth/me`);
      expect(meReq.request.method).toBe('GET');
      meReq.flush(meResponse);
    });

    it('should handle null values in response', () => {
        const meResponse = {
            sellerNameEn: 'Company B',
            sellerTaxId: null,
            branchCode: null,
            branchNameEn: 'Branch B',
            sellerPhone: null,
            addressDetailTh: null,
            logoUrl: null,
            branches: null
        };

      const expectedProfile: SellerProfile = {
        companyName: 'Company B',
        taxId: '',
        branchCode: '00000',
        branchName: 'Branch B',
        tel: '',
        address: '',
        logoUrl: '',
        branches: []
      };

      service.loadSellerProfile().subscribe(profile => {
        expect(profile).toEqual(expectedProfile);
      });

      const meReq = httpMock.expectOne(`${api}/auth/me`);
      expect(meReq.request.method).toBe('GET');
      meReq.flush(meResponse);
    });
  });
});
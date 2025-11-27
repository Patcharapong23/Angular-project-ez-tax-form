import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UploadLogoResponse } from '../models/file.models'; // Import UploadLogoResponse

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private base = environment.apiBase;

  constructor(private http: HttpClient) { }

  uploadLogo(file: File, tenantTaxId: string): Observable<UploadLogoResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tenantTaxId', tenantTaxId);

    return this.http.post<UploadLogoResponse>(`${this.base}/files/logo`, formData);
  }
}

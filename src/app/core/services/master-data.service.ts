import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MasterDataService {

  private apiUrl = `${environment.apiBase}/master-data`;

  constructor(private http: HttpClient) { }

  getMasterData(sellerTaxId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?sellerTaxId=${sellerTaxId}`);
  }
}

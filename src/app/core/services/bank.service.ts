import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BankService {
  private apiUrl = '/api/banks';

  constructor(private http: HttpClient) {}

  getBanks(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  getBranches(bankCode: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${bankCode}/branches`);
  }

  createBranch(bankCode: string, branchName: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${bankCode}/branches`, { branchName });
  }
}

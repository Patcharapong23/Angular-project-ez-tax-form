import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  userId: string;
  fullName: string;
  email: string;
  username: string;
  role: string;
  branch?: string;
  phoneNumber?: string;
  status: string; // 'Y' | 'N'
  createDate?: string;
  updateDate?: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = `${environment.apiBase}/users`;

  constructor(private http: HttpClient) { }

  getUsers(search: string = '', page: number = 0, size: number = 10): Observable<UserListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<UserListResponse>(this.apiUrl, { params });
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  createUser(user: any): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  updateUser(id: string, user: any): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleLock(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-lock`, {});
  }

  resetPassword(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/reset-password`, {});
  }
}

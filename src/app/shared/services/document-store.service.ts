import { Injectable } from '@angular/core';
import { BaseStoreService } from './base-store.service';
import { DocumentService } from '../../features/documents/document.service';
import { DocumentListItem } from '../models/document.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DocumentStoreService extends BaseStoreService<DocumentListItem> {

  constructor(private documentService: DocumentService) {
    super();
  }

  getDocuments$(): Observable<DocumentListItem[] | null> {
    return this.get$(() => this.documentService.list({
      sortBy: 'createdAt',
      sortDir: 'desc'
    }).pipe(
      map((response: any) => {
        // Handle both array and paginated response formats
        if (Array.isArray(response)) {
          return response;
        }
        return response.content || [];
      })
    ));
  }
}

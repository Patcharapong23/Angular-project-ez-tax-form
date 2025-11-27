import { Component, OnInit } from '@angular/core';
import { DocumentService } from './document.service';
import { DocumentListItem } from '../../shared/models/document.models';

@Component({
  selector: 'app-list-documents',
  templateUrl: './list-documents.component.html',
})
export class ListDocumentsComponent implements OnInit {
  rows: DocumentListItem[] = [];
  loading = true;

  constructor(private api: DocumentService) {}

  ngOnInit() {
    this.api.list().subscribe({
      next: (r) => {
        this.rows = r.content;
        this.loading = false;
      },
      error: (_) => {
        this.loading = false;
      },
    });
  }

  exportPdf(docUuid: string) {
    this.api.exportDocument(docUuid, 'pdf').subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `document-${docUuid}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    });
  }
}

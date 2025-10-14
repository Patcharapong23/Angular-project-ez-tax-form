import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Invoice, InvoiceService } from '../invoice/invoice.service';
import { NewDocumentDialogComponent } from '../dialogs/new-document-dialog/new-document-dialog.component';

// Interface สำหรับข้อมูลที่จะแสดงในตาราง
export interface DocumentRow {
  id: string;
  docNo: string;
  taxId: string;
  customer: string;
  branch: string;
  type: string;
  issueDate: Date;
  createdAt: Date | undefined;
  status: string;
}

@Component({
  selector: 'app-documentsall',
  templateUrl: './documentsall.component.html',
  styleUrls: ['./documentsall.component.css'],
})
export class DocumentsallComponent implements OnInit {
  f: any = {};
  private allInvoices: Invoice[] = [];
  rows: DocumentRow[] = [];

  constructor(
    private invoiceService: InvoiceService,
    private router: Router,
    public dialog: MatDialog // Inject MatDialog ที่นี่
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.invoiceService.getInvoices().subscribe((data: Invoice[]) => {
      this.allInvoices = data;
      this.search();
    });
  }

  private mapInvoicesToRows(invoices: Invoice[]): DocumentRow[] {
    return invoices.map((inv) => ({
      id: inv._id!,
      docNo: inv.documentNumber || '-',
      taxId: inv.customer.taxId,
      customer: inv.customer.name,
      branch: inv.customer.branchCode || 'สำนักงานใหญ่',
      type: inv.documentType,
      issueDate: inv.issueDate,
      createdAt: inv.createdAt,
      status: inv.status,
    }));
  }

  search(): void {
    const filteredInvoices = this.allInvoices.filter((inv) => {
      const matchDocNo =
        !this.f.docNo || inv.documentNumber?.includes(this.f.docNo);
      const matchCustomerTaxId =
        !this.f.customerTaxId ||
        inv.customer.taxId.includes(this.f.customerTaxId);
      const matchDocType =
        !this.f.docType || inv.documentType === this.f.docType;
      return matchDocNo && matchCustomerTaxId && matchDocType;
    });

    this.rows = this.mapInvoicesToRows(filteredInvoices);
  }

  clear(): void {
    this.f = {};
    this.search();
  }

  getStatusClass(status: string): string {
    if (status === 'active') return 'badge-green';
    if (status === 'cancelled') return 'badge-red';
    return 'badge-gray';
  }

  getStatusText(status: string): string {
    if (status === 'active') return 'ใช้งาน';
    if (status === 'cancelled') return 'ยกเลิก';
    return status;
  }

  createNewDocument(): void {
    const dialogRef = this.dialog.open(NewDocumentDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'newdoc-dialog', // <-- คลาสหลักของ dialog
      backdropClass: 'newdoc-backdrop',
      autoFocus: false,
      // panelClass: 'custom-dialog-container',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.documentType && result.documentTemplate) {
        this.router.navigate(['/invoice/new'], {
          queryParams: {
            type: result.documentType,
            template: result.documentTemplate,
          },
        });
      }
    });
  }

  viewInvoice(id: string): void {
    console.log('View invoice:', id);
  }

  editInvoice(id: string): void {
    this.router.navigate(['/invoice/edit', id]);
  }

  cancelInvoice(id: string): void {
    if (confirm('คุณต้องการยกเลิกเอกสารนี้ใช่หรือไม่?')) {
      this.invoiceService.cancelInvoice(id).subscribe(() => {
        alert('ยกเลิกเอกสารสำเร็จ');
        this.loadInvoices();
      });
    }
  }
}

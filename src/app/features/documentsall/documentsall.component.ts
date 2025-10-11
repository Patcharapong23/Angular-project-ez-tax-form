import { Component } from '@angular/core';

@Component({
  selector: 'app-documents-all',
  templateUrl: './documentsall.component.html',
  styleUrls: ['./documentsall.component.css'],
})
export class DocumentsAllComponent {
  f = {
    docNo: '',
    customerTaxId: '',
    docType: '',
    issueDateFrom: '',
    issueDateTo: '',
    createdFrom: '',
    createdTo: '',
    status: '',
  };

  rows = [
    {
      docNo: 'TE-0001',
      taxId: '10-XXXXXXX',
      customer: 'VG Co., Ltd.',
      branch: '00000',
      type: 'ใบเสร็จรับเงิน (T01)',
      issueDate: new Date(2022, 1, 23),
      createdAt: new Date(2022, 0, 10),
      status: 'new',
    },
    {
      docNo: 'UK-0002',
      taxId: '20-XXXXXXX',
      customer: 'UK Co., Ltd.',
      branch: '00001',
      type: 'ใบแจ้งหนี้/ใบกำกับภาษี',
      issueDate: new Date(2022, 1, 24),
      createdAt: new Date(2022, 0, 10),
      status: 'latest',
    },
  ];

  search() {
    /* TODO: call API */
  }
  clear() {
    this.f = {
      docNo: '',
      customerTaxId: '',
      docType: '',
      issueDateFrom: '',
      issueDateTo: '',
      createdFrom: '',
      createdTo: '',
      status: '',
    };
  }
}

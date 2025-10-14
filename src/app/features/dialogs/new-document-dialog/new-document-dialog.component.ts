import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import {
  ConnectedPosition,
  Overlay,
  RepositionScrollStrategy,
} from '@angular/cdk/overlay';
import { CdkOverlayOrigin } from '@angular/cdk/overlay';

interface DocType {
  value: string;
  name: string;
  icon: string;
}
interface DocumentTemplate {
  value: string;
  viewValue: string;
  type: string | string[];
}

@Component({
  selector: 'app-new-document-dialog',
  templateUrl: './new-document-dialog.component.html',
  styleUrls: ['./new-document-dialog.component.css'],
})
export class NewDocumentDialogComponent implements AfterViewInit {
  // --- Data (คงเดิม) ---
  docTypes: DocType[] = [
    { value: 'T01', name: 'ใบเสร็จรับเงิน (T01)', icon: 'ti-receipt-2' },
    {
      value: 'T02',
      name: 'ใบแจ้งหนี้/ใบกำกับภาษี (T02)',
      icon: 'ti-file-invoice',
    },
    {
      value: 'T03',
      name: 'ใบเสร็จรับเงิน/ใบกำกับภาษี (T03)',
      icon: 'ti-receipt-2',
    },
    {
      value: 'T04',
      name: 'ใบส่งของ/ใบกำกับภาษี (T04)',
      icon: 'ti-file-invoice',
    },
    { value: '380', name: 'ใบแจ้งหนี้ (380)', icon: 'ti-file-invoice' },
    { value: '388', name: 'ใบกำกับภาษี (388)', icon: 'ti-file-invoice' },
    { value: '80', name: 'ใบเพิ่มหนี้ (80)', icon: 'ti-file-invoice' },
    { value: '81', name: 'ใบลดหนี้ (81)', icon: 'ti-file-invoice' },
  ];
  private allTemplates: DocumentTemplate[] = [
    { value: 'T01-default', viewValue: 'T01 - General Receipt', type: 'T01' },
    { value: 'T01-simple', viewValue: 'T01 - Simple Form', type: 'T01' },
    { value: 'T02-standard', viewValue: 'T02 - Standard Invoice', type: 'T02' },
    {
      value: '388-official',
      viewValue: '388 - Official Tax Invoice',
      type: '388',
    },
    {
      value: 'template-C',
      viewValue: 'Template C (For T02, 388)',
      type: ['T02', '388'],
    },
  ];

  filteredTemplates: DocumentTemplate[] = [];
  selectedDocType: DocType | null = null;
  selectedTemplate: DocumentTemplate | null = null;

  opened = { type: false, template: false };

  // อ้างอิง trigger เพื่อคำนวณความกว้าง panel
  @ViewChild('typeTrigger', { read: CdkOverlayOrigin })
  typeOrigin!: CdkOverlayOrigin;
  @ViewChild('tplTrigger', { read: CdkOverlayOrigin })
  tplOrigin!: CdkOverlayOrigin;

  typeTriggerWidth = 0;
  tplTriggerWidth = 0;

  // กลยุทธ์ scroll + ตำแหน่งสลับบน/ล่างอัตโนมัติ
  repositionStrategy: RepositionScrollStrategy;
  overlayPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' }, // ล่าง
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' }, // บน (fallback)
  ];

  constructor(
    public dialogRef: MatDialogRef<NewDocumentDialogComponent>,
    overlay: Overlay
  ) {
    this.repositionStrategy = overlay.scrollStrategies.reposition();
  }

  ngAfterViewInit(): void {
    // ตั้งความกว้าง panel = ความกว้างปุ่ม
    setTimeout(() => {
      this.typeTriggerWidth =
        this.typeOrigin?.elementRef.nativeElement.getBoundingClientRect()
          .width || 0;
      this.tplTriggerWidth =
        this.tplOrigin?.elementRef.nativeElement.getBoundingClientRect()
          .width || 0;
    });
  }

  toggleDropdown(which: 'type' | 'template') {
    const next = !this.opened[which];
    this.opened.type = false;
    this.opened.template = false;
    this.opened[which] = next;

    // อัปเดตความกว้างเวลาเลย์เอาต์เปลี่ยน
    setTimeout(() => {
      this.typeTriggerWidth =
        this.typeOrigin?.elementRef.nativeElement.getBoundingClientRect()
          .width || 0;
      this.tplTriggerWidth =
        this.tplOrigin?.elementRef.nativeElement.getBoundingClientRect()
          .width || 0;
    });
  }

  closeAll() {
    this.opened.type = false;
    this.opened.template = false;
  }

  selectDocType(docType: DocType) {
    this.selectedDocType = docType;
    this.opened.type = false;
    this.filteredTemplates = this.allTemplates.filter((t) =>
      Array.isArray(t.type)
        ? t.type.includes(docType.value)
        : t.type === docType.value
    );
    this.selectedTemplate = null;
  }

  selectTemplate(tpl: DocumentTemplate) {
    this.selectedTemplate = tpl;
    this.opened.template = false;
  }

  submit() {
    if (this.selectedDocType) {
      this.dialogRef.close({
        documentType: this.selectedDocType.value,
        documentTemplate: this.selectedTemplate?.value || '',
      });
    }
  }

  close() {
    this.dialogRef.close();
  }

  // ปิดด้วย ESC
  @HostListener('document:keydown.escape') onEsc() {
    this.closeAll();
  }

  // คีย์บอร์ด: เปิดด้วย ArrowDown/Enter บน trigger
  onTriggerKeydown(e: KeyboardEvent, which: 'type' | 'template') {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this.opened[which]) this.toggleDropdown(which);
    }
  }

  // คีย์บอร์ดใน option (อย่างง่าย)
  onOptionKeydown(e: KeyboardEvent, _idx: number, which: 'type' | 'template') {
    if (e.key === 'Escape') {
      this.closeAll();
    }
    if (e.key === 'Tab') {
      this.closeAll();
    }
  }
}

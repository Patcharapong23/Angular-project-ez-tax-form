import { Component, OnInit } from '@angular/core';
import { SystemAdminApiService, AuditLog, AuditLogPage } from '../services/system-admin-api.service';

@Component({
  selector: 'app-system-audit-log',
  templateUrl: './system-audit-log.component.html',
  styleUrls: ['./system-audit-log.component.css']
})
export class SystemAuditLogComponent implements OnInit {
  logs: AuditLog[] = [];
  loading = true;
  searchTerm = '';
  statusFilter = '';
  totalElements = 0;
  currentPage = 0;
  pageSize = 50;

  constructor(private systemAdminApi: SystemAdminApiService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.systemAdminApi.getAuditLogs({
      query: this.searchTerm || undefined,
      status: this.statusFilter || undefined,
      page: this.currentPage,
      size: this.pageSize
    }).subscribe({
      next: (data: AuditLogPage) => {
        this.logs = data.content;
        this.totalElements = data.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load audit logs:', err);
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadLogs();
  }

  copyTraceId(traceId: string): void {
    navigator.clipboard.writeText(traceId);
    alert('Copied: ' + traceId);
  }
}

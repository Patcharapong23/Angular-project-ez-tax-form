import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router'; // Added Router
import { Observable, Subscription } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { AuthService, AuthUser } from '../../shared/auth.service';
import { DashboardService } from '../../shared/services/dashboard.service';
import { DocumentService } from '../../features/documents/document.service';
import { DashboardSummary } from '../../shared/models/dashboard.models';
import { DocumentListItem, DocumentSearchParams } from '../../shared/models/document.models';
import { ActivityService, Activity } from '../../shared/services/activity.service';

interface ExpiringDocument {
  id: string; // UUID from backend
  docNo: string;
  cancelledAt: string;
  status: string;
  remainingTime?: string; // Calculated on frontend
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  // ... properties ...
  user: AuthUser | null = null;
  companyName = '';
  displayName = '';
  dashboardSummary: any | null = null;
  recentDocuments: DocumentListItem[] = [];
  expiringDocuments: ExpiringDocument[] = [];
  sessionActivities: Activity[] = [];
  private countdownInterval: any;
  private activitySub?: Subscription;
  // Time Filter
  selectedTimeFilter: 'daily' | 'weekly' | 'monthly' = 'weekly';

  // Dropdown Filters
  selectedCompany = 'all';
  // selectedBranch = 'all'; // Replaced by autocomplete

  // Branch Autocomplete
  branchControl = new FormControl('');
  branches: string[] = ['ทั้งหมด', 'สำนักงานใหญ่'];
  filteredBranches!: Observable<string[]>;

  // Chart Data
  totalDocuments = 0;
  totalTaxInvoices = 0;

  // ECharts options (using any for compatibility)
  chartOptions: any = {};
  barRaceOptions: any = {};

  // Document type definitions with SHORT labels for legend
  documentTypeConfig = [
    { code: 'T01', label: 'ใบรับ (ใบเสร็จรับเงิน)', color: '#10B981' },
    { code: 'T02', label: 'ใบแจ้งหนี้/ใบกำกับภาษี', color: '#3B82F6' },
    { code: 'T03', label: 'ใบเสร็จรับเงิน/ใบกำกับภาษี', color: '#8B5CF6' },
    { code: 'T04', label: 'ใบส่งของ/ใบกำกับภาษ', color: '#F59E0B' },
    { code: '80', label: 'ใบเพิ่มหนี้', color: '#F43F5E' },
    { code: '81', label: 'ใบลดหนี้', color: '#14B8A6' },
    { code: '380', label: 'ใบแจ้งหนี้', color: '#0EA5E9' },
    { code: '388', label: 'ใบกำกับภาษี', color: '#6366F1' },
  ];

  constructor(
    private auth: AuthService,
    private dashboardService: DashboardService,
    private documentService: DocumentService,
    private router: Router,
    public activityService: ActivityService
  ) {}

  viewDocument(id: string): void {
    this.router.navigate(['/documents/view', id]);
  }

  downloadDocument(id: string, docNo: string): void {
    this.documentService.exportDocument(id, 'pdf').subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${docNo}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => console.error('Download failed', err)
    });
  }

  get isSystemAdmin(): boolean {
    return this.user?.roles?.includes('SYSTEM_ADMIN') ?? false;
  }

  ngOnInit(): void {
    // Initialize Branch Autocomplete
    this.filteredBranches = this.branchControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterBranches(value || ''))
    );
    this.branchControl.setValue('ทั้งหมด');

    this.auth.user$.subscribe((u) => {
      this.user = u;
      this.companyName = this.user?.sellerNameTh || 'บริษัท ตัวอย่าง จำกัด';
      this.displayName =
        this.user?.fullName ||
        this.user?.userName ||
        (this.user?.email ? this.user.email.split('@')[0] : 'ผู้ใช้');
    });

    this.loadSyncData();
    this.startCountdown();
    
    // Subscribe to session activities (keep if needed for immediate updates, but sync loads init data)
    this.activitySub = this.activityService.activities$.subscribe(activities => {
       // If sync loaded data, we might merge or just trust sync initially
       // But ActivityService might not be updated by sync call unless we manually push?
       // Let's assume sync data is for display and ActivityService handles real-time/session stuff.
       
       // Actually, we should probably update ActivityService or just use local variable for display
       if (activities.length > 0) this.sessionActivities = activities;
    });
    
    // Note: Removed separate calls to loadDashboardData, loadRecentDocuments, loadRecentActivities
  }
  
  private loadSyncData(): void {
      const sellerTaxId = this.user?.sellerTaxId; // Use sellerTaxId, not userName
      this.dashboardService.getSyncData(this.selectedTimeFilter, sellerTaxId).subscribe({
          next: (data) => {
              // 1. Summary
              const summary = data.summary;
              if (summary) {
                  this.processSummary(summary);
              }
              
              // 2. Recent Documents
              if (data.recentDocuments) {
                  this.recentDocuments = data.recentDocuments.filter((d: any) => d.status !== 'CANCELLED').slice(0, 5);
              }
              
              // 3. Activities
              if (data.activities && Array.isArray(data.activities)) {
                  // Use ActivityService to convert DTOs to Activity objects (fixes icon, color, time)
                  this.sessionActivities = this.activityService.convertDtosToActivities(data.activities);
              }
          },
          error: (err) => console.error('Failed to load dashboard sync data', err)
      });
  }

  private processSummary(summary: any): void {
        this.dashboardSummary = summary;
        this.totalDocuments = summary.totalDocuments || 0;
        
        // Calculate tax invoices from type breakdown
        const breakdown = summary.documentTypeBreakdown || {};
        this.totalTaxInvoices = (breakdown['T02'] || 0) + (breakdown['T03'] || 0) + 
                                 (breakdown['T04'] || 0) + (breakdown['388'] || 0);

        // --- MOCK DATA REMOVED AS REQUESTED ---

        if (summary.expiringDocuments) {
            this.expiringDocuments = summary.expiringDocuments;
            this.updateRemainingTime();
        }

        // Build ECharts options
        this.buildChartOptions(breakdown);
        this.buildBarRaceOptions(summary.branchRanking || {});
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.activitySub) {
      this.activitySub.unsubscribe();
    }
  }

  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      this.updateRemainingTime();
    }, 1000);
  }

  private updateRemainingTime(): void {
    if (!this.expiringDocuments) return;
    
    const now = new Date().getTime();
    
    this.expiringDocuments.forEach(doc => {
      if (!doc.cancelledAt) {
        doc.remainingTime = '-';
        return;
      }
      
      const cancelledTime = new Date(doc.cancelledAt).getTime();
      const expirationTime = cancelledTime + (30 * 24 * 60 * 60 * 1000); // 30 days retention
      const diff = expirationTime - now;

      if (diff <= 0) {
        doc.remainingTime = 'ลบแล้ว'; // Deleted
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        doc.remainingTime = `${days} วัน ${hours} ชม. ${minutes} นาที ${seconds} วินาที`;
      }
    });
  }

  private _filterBranches(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.branches.filter(option => option.toLowerCase().includes(filterValue));
  }

  setTimeFilter(filter: 'daily' | 'weekly' | 'monthly'): void {
    this.selectedTimeFilter = filter;
    // Only reload dashboard data (period-dependent); recent documents aren't time-filtered
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.dashboardService.getDashboardSummary(this.selectedTimeFilter).subscribe({
      next: (summary: any) => {
        this.dashboardSummary = summary;
        this.totalDocuments = summary.totalDocuments || 0;
        
        // Calculate tax invoices from type breakdown
        const breakdown = summary.documentTypeBreakdown || {};
        this.totalTaxInvoices = (breakdown['T02'] || 0) + (breakdown['T03'] || 0) + 
                                 (breakdown['T04'] || 0) + (breakdown['388'] || 0);

        if (summary.expiringDocuments) {
            this.expiringDocuments = summary.expiringDocuments;
            this.updateRemainingTime();
        }

        // Build ECharts options
        this.buildChartOptions(breakdown);
        this.buildBarRaceOptions(summary.branchRanking || {});
      },
      error: (err) => {
        console.error('Failed to load dashboard data:', err);
      }
    });
  }

  private buildBarRaceOptions(ranking: { [key: string]: number }): void {
    // 1. Convert to array and sort DESC (Max value first)
    // We use Descending sort because we will set yAxis.inverse = true
    // This puts the first item (Max) at the visual TOP of the chart
    const data = Object.entries(ranking)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const yAxisData = data.map(item => item.name);
    const seriesData = data.map(item => item.value);

    this.barRaceOptions = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        boundaryGap: [0, 0.01]
      },
      yAxis: {
        type: 'category',
        data: yAxisData,
        inverse: true, // Display from Top to Bottom
        axisLabel: {
            width: 100,
            overflow: 'truncate'
        }
      },
      series: [
        {
          name: 'เอกสาร',
          type: 'bar',
          data: seriesData,
          itemStyle: {
            color: '#3b82f6',
            borderRadius: [0, 4, 4, 0]
          },
          label: {
            show: true,
            position: 'right',
            valueAnimation: true
          },
          animationDuration: 1000,
          animationDurationUpdate: 300,
          realtimeSort: true, // "Race" effect
        }
      ]
    };
  }

  private buildChartOptions(breakdown: { [key: string]: number }): void {
    // Build chart data from breakdown
    const chartData = this.documentTypeConfig
      .filter(config => (breakdown[config.code] || 0) > 0)
      .map(config => ({
        value: breakdown[config.code] || 0,
        name: config.label,
        itemStyle: { color: config.color }
      }));

    this.chartOptions = {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#fff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: [10, 15],
        textStyle: {
          color: '#1f2937',
          fontSize: 13
        },
        formatter: (params: any) => {
          return `<div style="font-weight: 500; margin-bottom: 4px;">${params.seriesName}</div>` +
                 `<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${params.color}; margin-right: 8px;"></span>` +
                 `<span style="color: #64748b;">${params.name}</span>` +
                 `<span style="float: right; font-weight: 600; margin-left: 20px;">${params.value.toLocaleString()}</span>`;
        },
        extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border-radius: 8px;'
      },
      legend: {
        orient: 'horizontal',
        bottom: '0%',
        left: 'center',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 16,
        textStyle: {
          fontSize: 12,
          color: '#475569'
        }
      },
      series: [
        {
          name: 'เอกสาร',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'inside',
            formatter: '{d}%',
            fontSize: 10,
            color: '#fff',
            fontWeight: 'bold'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold'
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)'
            }
          },
          labelLine: {
            show: false
          },
          data: chartData
        }
      ],
      graphic: {
        elements: [
          {
            type: 'text',
            left: 'center',
            top: '38%',
            style: {
              text: 'เอกสารทั้งหมด',
              fontSize: 14,
              fill: '#64748b',
              textAlign: 'center'
            }
          },
          {
            type: 'text',
            left: 'center',
            top: '46%',
            style: {
              text: this.totalDocuments.toLocaleString(),
              fontSize: 32,
              fontWeight: 'bold',
              fill: '#1e293b',
              textAlign: 'center'
            }
          }
        ]
      }
    };
  }



  getStatusClass(status: string | undefined): string {
    if (status === 'NEW') return 'status-new';
    if (status === 'UPDATED') return 'status-updated';
    if (status === 'CANCELLED') return 'status-cancelled';
    return '';
  }

  getStatusLabel(status: string | undefined): string {
    if (status === 'NEW') return 'เอกสารใหม่';
    if (status === 'UPDATED') return 'อัปเดตล่าสุด';
    if (status === 'CANCELLED') return 'เอกสารยกเลิก';
    return status || '-';
  }

  formatThaiDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    // Add 543 to year
    const thaiYear = date.getFullYear() + 543;
    
    // Format components
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${day}/${month}/${thaiYear} ${hours}:${minutes}:${seconds}`;
  }
}

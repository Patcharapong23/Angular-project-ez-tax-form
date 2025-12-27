import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SystemAdminApiService, SystemSummary, TenantDropdown, BranchDropdown, TenantDashboardStats } from '../services/system-admin-api.service';

@Component({
  selector: 'app-system-dashboard',
  templateUrl: './system-dashboard.component.html',
  styleUrls: ['./system-dashboard.component.css']
})
export class SystemDashboardComponent implements OnInit {
  // Platform summary stats
  stats: SystemSummary = {
    totalTenants: 0,
    totalUsers: 0,
    totalBranches: 0,
    activeUsers: 0,
    lockedUsers: 0,
    loginSuccess24h: 0,
    loginFailed24h: 0,
    refreshDenied24h: 0,
    topErrors: []
  };

  // Tenant-specific dashboard
  tenants: TenantDropdown[] = [];
  branches: BranchDropdown[] = [];
  selectedTenantId = '';
  selectedBranchId = '';
  dashboardStats: TenantDashboardStats | null = null;
  selectedTimeFilter: 'daily' | 'weekly' | 'monthly' = 'weekly';
  
  loading = true;
  loadingStats = false;
  error = '';

  // ECharts options (using any to avoid strict type issues)
  chartOptions: any = {};
  barRaceOptions: any = {};
  hasBarData = false;

  // Document type definitions for labels
  documentTypeConfig = [
    { code: 'T01', label: 'ใบรับ (ใบเสร็จรับเงิน)', color: '#10B981' },
    { code: 'T02', label: 'ใบแจ้งหนี้/ใบกำกับภาษี', color: '#3B82F6' },
    { code: 'T03', label: 'ใบเสร็จรับเงิน/ใบกำกับภาษี', color: '#8B5CF6' },
    { code: 'T04', label: 'ใบส่งของ/ใบกำกับภาษ', color: '#F59E0B' },
    { code: 'T05', label: 'ใบเพิ่มหนี้', color: '#F43F5E' },
    { code: 'T06', label: 'ใบลดหนี้', color: '#14B8A6' },
    { code: 'T07', label: 'ใบแจ้งหนี้', color: '#0EA5E9' },
    { code: 'T08', label: 'ใบกำกับภาษี', color: '#6366F1' },
    { code: '80', label: 'ใบเพิ่มหนี้', color: '#F43F5E' },
    { code: '81', label: 'ใบลดหนี้', color: '#14B8A6' },
    { code: '380', label: 'ใบแจ้งหนี้', color: '#0EA5E9' },
    { code: '388', label: 'ใบกำกับภาษี', color: '#6366F1' },
  ];

  constructor(
    private systemAdminApi: SystemAdminApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadPlatformStats();
    this.loadTenantDropdown();
    
    // Handle query params from tenant management navigation
    this.route.queryParams.subscribe(params => {
      if (params['sellerId']) {
        this.selectedTenantId = params['sellerId'];
        this.onTenantChange();
      }
    });
  }

  setTimeFilter(filter: 'daily' | 'weekly' | 'monthly'): void {
    this.selectedTimeFilter = filter;
    this.loadDashboardStats();
  }

  loadPlatformStats(): void {
    this.loading = true;
    this.error = '';
    this.systemAdminApi.getSummary().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load system summary:', err);
        this.error = 'Failed to load platform data';
        this.loading = false;
      }
    });
  }

  loadTenantDropdown(): void {
    this.systemAdminApi.getTenantDropdown().subscribe({
      next: (tenants) => {
        this.tenants = tenants;
        this.loadDashboardStats();
      },
      error: (err) => {
        console.error('Failed to load tenants:', err);
      }
    });
  }

  onTenantChange(): void {
    this.branches = [];
    this.selectedBranchId = '';
    
    if (this.selectedTenantId) {
      this.systemAdminApi.getTenantBranches(this.selectedTenantId).subscribe({
        next: (branches) => {
          this.branches = branches;
        },
        error: (err) => {
          console.error('Failed to load branches:', err);
        }
      });
    }
    
    this.loadDashboardStats();
  }

  onBranchChange(): void {
    this.loadDashboardStats();
  }

  loadDashboardStats(): void {
    this.loadingStats = true;
    this.systemAdminApi.getDashboardStats(
      this.selectedTenantId || undefined, 
      this.selectedBranchId || undefined
    ).subscribe({
      next: (stats) => {
        this.dashboardStats = stats;
        this.loadingStats = false;
        this.buildChartOptions();
        this.buildBarRaceOptions();
      },
      error: (err) => {
        console.error('Failed to load dashboard stats:', err);
        this.loadingStats = false;
      }
    });
  }

  buildChartOptions(): void {
    if (!this.dashboardStats?.documentTypeBreakdown) {
      this.chartOptions = {};
      return;
    }

    // Build breakdown map from API data
    const breakdownMap: { [key: string]: number } = {};
    this.dashboardStats.documentTypeBreakdown.forEach(item => {
      breakdownMap[item.docTypeCode] = item.count;
    });

    // Use documentTypeConfig to get proper labels (same approach as regular dashboard)
    const chartData = this.documentTypeConfig
      .filter(config => (breakdownMap[config.code] || 0) > 0)
      .map(config => ({
        value: breakdownMap[config.code] || 0,
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
              text: (this.dashboardStats?.totalDocuments || 0).toLocaleString(),
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

  buildBarRaceOptions(): void {
    // TODO: Replace with real API data when available
    // Mock data removed as requested by user
    const data: any[] = [];

    if (data.length === 0) {
      this.hasBarData = false;
      this.barRaceOptions = {};
      return;
    }

    this.hasBarData = true;

    this.hasBarData = true;
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
        inverse: true,
        axisLabel: {
          width: 150,
          overflow: 'truncate'
        }
      },
      series: [
        {
          name: 'เอกสาร E-TAX',
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
          realtimeSort: true
        }
      ]
    };
  }

  getSelectedTenantName(): string {
    const tenant = this.tenants.find(t => t.sellerId === this.selectedTenantId);
    return tenant ? tenant.companyName : 'ทุกบริษัท';
  }
}

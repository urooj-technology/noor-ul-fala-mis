import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendar, CalendarType } from '@/contexts/CalendarContext';
import { PermissionGuard } from '@/components/ui/permission-guard';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  CreditCard, 
  UserCheck, 
  Wallet, 
  Calendar, 
  Receipt, 
  BarChart3, 
  Settings,
  ArchiveRestore,
  ChevronDown,
  DollarSign,
  UsersIcon,
  Tag,
  FileText,
  Search,
  X,
  Activity,
  Minimize2,
  Database,
  BookOpen,
  Store,
  PieChart,
  Briefcase,
  Home,
  FileBarChart
} from 'lucide-react';

const navigationItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/', section: 'main' },

  { 
    key: 'hr', 
    icon: UsersIcon, 
    path: '/employees',
    isExpandable: true,
    section: 'hr',
    subItems: [
      { key: 'employees', icon: UserCheck, path: '/employees' },
      { key: 'payroll', icon: Wallet, path: '/payroll' },
      { key: 'advance', icon: DollarSign, path: '/advance' }
    ]
  },
  { 
    key: 'expenses', 
    icon: Receipt, 
    path: '/expenses',
    isExpandable: true,
    section: 'finance',
    subItems: [
      { key: 'expensesList', icon: Receipt, path: '/expenses' },
      { key: 'expenseCategories', icon: Tag, path: '/expense-categories' }
    ]
  },
  { 
    key: 'otherIncome', 
    icon: TrendingUp, 
    path: '/other-incomes',
    isExpandable: true,
    section: 'finance',
    subItems: [
      { key: 'otherIncomeList', icon: TrendingUp, path: '/other-incomes' },
      { key: 'incomeCategoryList', icon: Tag, path: '/income-categories' }
    ]
  },
  { 
    key: 'accounting', 
    icon: BookOpen, 
    path: '/accounts',
    isExpandable: true,
    section: 'finance',
    subItems: [
      { key: 'accounts', icon: BookOpen, path: '/accounts' },
      { key: 'transactions', icon: FileText, path: '/transactions' },
      { key: 'fiscalYears', icon: Calendar, path: '/fiscal-years' },
      { key: 'journalEntries', icon: FileText, path: '/journal-entries' },
      { key: 'trialBalance', icon: PieChart, path: '/reports/trial-balance' },
      { key: 'incomeStatement', icon: BarChart3, path: '/reports/income-statement' },
      { key: 'balanceSheet', icon: FileBarChart, path: '/reports/balance-sheet' }
    ]
  },
  { 
    key: 'students', 
    icon: BookOpen, 
    path: '/students',
    isExpandable: true,
    section: 'education',
    subItems: [
      { key: 'studentsList', icon: Users, path: '/students' },
      { key: 'feeTypes', icon: Tag, path: '/fee-types' },
      { key: 'feeAssignments', icon: Receipt, path: '/student-fee-assignments' },
      { key: 'studentPayments', icon: CreditCard, path: '/student-payments' }
    ]
  },
  { 
    key: 'shopRental', 
    icon: Store, 
    path: '/shops',
    isExpandable: true,
    section: 'business',
    subItems: [
      { key: 'shopsList', icon: Store, path: '/shops' },
      { key: 'tenantsList', icon: Users, path: '/tenants' },
      { key: 'shopRentalList', icon: Receipt, path: '/shop-rentals' },
      { key: 'shopRentalPayments', icon: CreditCard, path: '/shop-rental-payments' }
    ]
  },
  { 
    key: 'reports', 
    icon: FileBarChart, 
    path: '/reports',
    section: 'finance',
  },

  { 
    key: 'settings', 
    icon: Settings, 
    path: '/settings',
    isExpandable: true,
    section: 'system',
    subItems: [
      { key: 'calendarSettings', icon: Calendar, path: '/settings/calendar' },
      { key: 'deletedItems', icon: ArchiveRestore, path: '/settings/deleted' },
      { key: 'activityLogs', icon: Activity, path: '/activity-logs' },
      { key: 'backups', icon: Database, path: '/backups' }
    ]
  }
];

const sections = {
  main: 'Main',
  hr: 'Human Resources',
  finance: 'Finance',
  business: 'Business',
  education: 'Education',
  system: 'System'
};

export const Sidebar: React.FC = () => {
  const { t, direction } = useLanguage();
  const { user } = useAuth();
  const { calendarType, setCalendarType } = useCalendar();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    const saved = localStorage.getItem('sidebar-expanded');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const isCustomer = user?.role === 'customer';

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', JSON.stringify(expandedSections));
  }, [expandedSections]);

  useEffect(() => {
    const currentPath = location.pathname;
    const sectionsToExpand: string[] = [];
    
    if (isHRRoute(currentPath)) sectionsToExpand.push('hr');
    if (isExpensesRoute(currentPath)) sectionsToExpand.push('expenses');
    if (isOtherIncomeRoute(currentPath)) sectionsToExpand.push('otherIncome');
    if (isAccountingRoute(currentPath)) sectionsToExpand.push('accounting');
    if (isStudentsRoute(currentPath)) sectionsToExpand.push('students');
    if (isShopRentalRoute(currentPath)) sectionsToExpand.push('shopRental');
    if (isReportsRoute(currentPath)) sectionsToExpand.push('reports');
    if (isSettingsRoute(currentPath)) sectionsToExpand.push('settings');

    setExpandedSections(prev => {
      const newExpanded = [...new Set([...prev, ...sectionsToExpand])];
      return newExpanded;
    });
  }, [location.pathname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeElement = navRef.current?.querySelector('[class*="bg-primary"]');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const collapseAll = () => {
    setExpandedSections([]);
  };

  const isHRRoute = (path: string) => {
    const hrRoutes = ['/employees', '/payroll', '/advance'];
    return hrRoutes.some(route => path.startsWith(route));
  };

  const isExpensesRoute = (path: string) => {
    const expenseRoutes = ['/expenses', '/expense-categories'];
    return expenseRoutes.some(route => path.startsWith(route));
  };

  const isOtherIncomeRoute = (path: string) => {
    const otherIncomeRoutes = ['/other-incomes', '/income-categories'];
    return otherIncomeRoutes.some(route => path.startsWith(route));
  };

  const isAccountingRoute = (path: string) => {
    const accountingRoutes = ['/accounts', '/transactions', '/fiscal-years', '/journal-entries', '/reports/trial-balance', '/reports/income-statement', '/reports/balance-sheet'];
    return accountingRoutes.some(route => path.startsWith(route));
  };

  const isStudentsRoute = (path: string) => {
    const studentRoutes = ['/students', '/student-payments', '/fee-types', '/student-fee-assignments'];
    return studentRoutes.some(route => path.startsWith(route));
  };

  const isShopRentalRoute = (path: string) => {
    const shopRentalRoutes = ['/shops', '/tenants', '/shop-rentals', '/shop-rental-payments'];
    return shopRentalRoutes.some(route => path.startsWith(route));
  };

  const isReportsRoute = (path: string) => {
    return path.startsWith('/reports');
  };

  const isSettingsRoute = (path: string) => {
    return path.startsWith('/settings') || path.startsWith('/activity-logs') || path.startsWith('/backups');
  };

  const calendarOptions: { value: CalendarType; label: string; icon: any }[] = [
    { value: 'shamsi', label: t('common.calendar.shamsi', 'شمسی'), icon: Calendar },
    { value: 'qamari', label: t('common.calendar.qamari', 'قمری'), icon: Calendar },
  ];

  const groupedItems = navigationItems.reduce((acc, item) => {
    const section = item.section || 'main';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, typeof navigationItems>);

  return (
    <div className={cn(
      "h-full bg-sidebar border-sidebar-border flex flex-col shadow-xl transition-all duration-300",
      direction === 'rtl' ? 'border-l' : 'border-r'
    )}>
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border bg-sidebar">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg ring-2 ring-primary/20">
            <img 
              src="/logo.jpeg" 
              alt="Noor Ul-Falah" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className={direction === 'rtl' ? 'text-right flex-1' : 'text-left flex-1'}>
            <h1 className="text-base font-bold text-sidebar-foreground leading-tight">
              {t('core.app.companyName', 'Noor Ul-Falah')}
            </h1>
            <p className="text-xs text-sidebar-foreground/70">
              {t('core.app.subtitle', 'Management Information System')}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar & Controls */}
      <div className="p-3 border-b border-sidebar-border bg-sidebar/50">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className={cn(
              "absolute top-1/2 -translate-y-1/2 text-sidebar-foreground/50",
              direction === 'rtl' ? 'right-2.5' : 'left-2.5'
            )} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('core.navigation.search', 'Search...')}
              className={cn(
                "w-full py-2 text-sm bg-sidebar-accent border border-sidebar-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent text-sidebar-foreground placeholder:text-sidebar-foreground/50 transition-all",
                direction === 'rtl' ? 'pr-7 pl-8' : 'pl-7 pr-8'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors",
                  direction === 'rtl' ? 'left-2.5' : 'right-2.5'
                )}
              >
                <X size={12} />
              </button>
            )}
          </div>
          {expandedSections.length > 0 && (
            <button
              onClick={collapseAll}
              className="p-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-all"
              title={t('core.navigation.collapseAll', 'Collapse All')}
            >
              <Minimize2 size={14} />
            </button>
          )}
        </div>
      </div>



      {/* Navigation */}
      <nav ref={navRef} className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar">
        {/* Grouped Navigation */}
        {Object.entries(groupedItems).map(([sectionKey, items]) => {
          const visibleItems = items.filter(item => {
            if (isCustomer && ['dashboard', 'users', 'hr', 'expenses', 'settings'].includes(item.key)) {
              return false;
            }

            const itemLabel = t(`core.navigation.${item.key}`, item.key).toLowerCase();
            const matchesSearch = itemLabel.includes(searchQuery.toLowerCase());
            const hasMatchingSubItem = item.subItems?.some(sub => 
              t(`core.navigation.${sub.key}`, sub.key).toLowerCase().includes(searchQuery.toLowerCase())
            );
            return matchesSearch || hasMatchingSubItem;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={sectionKey}>
              {sectionKey !== 'main' && !isCustomer && (
                <div className={cn(
                  "px-3 mb-1 pb-1 border-b border-sidebar-border/30",
                  direction === 'rtl' ? 'text-right' : 'text-left'
                )}>
                  <h3 className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest">
                    {t(`core.sections.${sectionKey}`, sections[sectionKey as keyof typeof sections])}
                  </h3>
                </div>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = !item.isExpandable && location.pathname === item.path;
                  const isExpanded = expandedSections.includes(item.key);
                  const itemLabel = t(`core.navigation.${item.key}`, item.key);
                  const isHighlighted = searchQuery && itemLabel.toLowerCase().includes(searchQuery.toLowerCase());
                  
                  const navigationItem = (
                    <div key={item.key}>
                      {item.isExpandable ? (
                        <button
                          onClick={() => toggleSection(item.key)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                            "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:shadow-sm",
                            isHighlighted && "ring-1 ring-primary/50 bg-primary/5"
                          )}
                        >
                          <Icon size={18} className={cn(
                            "transition-colors",
                            isActive ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                          )} />
                          <span className={cn("flex-1", direction === 'rtl' ? 'text-right' : 'text-left')}>{itemLabel}</span>
                          <ChevronDown size={14} className={cn(
                            "transition-transform duration-200 text-sidebar-foreground/40",
                            isExpanded ? "rotate-180" : ""
                          )} />
                        </button>
                      ) : (
                        <NavLink
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                            isActive 
                              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" 
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:shadow-sm",
                            isHighlighted && !isActive && "ring-1 ring-primary/50 bg-primary/5"
                          )}
                        >
                          <Icon size={18} className={cn(
                            "transition-colors",
                            isActive ? "text-primary-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                          )} />
                          <span className={cn("flex-1", direction === 'rtl' ? 'text-right' : 'text-left')}>{itemLabel}</span>
                        </NavLink>
                      )}
                      
                      {item.subItems && isExpanded && (
                        <div className={cn(
                          "mt-1 space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out",
                          direction === 'rtl' ? 'pr-7' : 'pl-7'
                        )}>
                          {item.subItems.filter(subItem => {
                            if (!searchQuery) return true;
                            return t(`core.navigation.${subItem.key}`, subItem.key).toLowerCase().includes(searchQuery.toLowerCase());
                          }).map((subItem) => {
                            const SubIcon = subItem.icon;
                            const isSubActive = location.pathname === subItem.path;
                            const subLabel = t(`core.navigation.${subItem.key}`, subItem.key);
                            const isSubHighlighted = searchQuery && subLabel.toLowerCase().includes(searchQuery.toLowerCase());
                            return (
                              <NavLink
                                key={subItem.key}
                                to={subItem.path}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200",
                                  isSubActive 
                                    ? "bg-primary/10 text-primary" 
                                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                                  isSubHighlighted && !isSubActive && "ring-1 ring-primary/50 bg-primary/5"
                                )}
                              >
                                <SubIcon size={16} className={cn(
                                  "transition-colors",
                                  isSubActive ? "text-primary" : "text-sidebar-foreground/50"
                                )} />
                                <span className={cn("flex-1", direction === 'rtl' ? 'text-right' : 'text-left')}>{subLabel}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                  
                  return item.permission ? (
                    <PermissionGuard key={item.key} permission={item.permission}>
                      {navigationItem}
                    </PermissionGuard>
                  ) : navigationItem;
                })}
              </div>
            </div>
          );
        })}
      </nav>
      
      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar/50">
        <div className={cn(
          "text-[9px] text-sidebar-foreground/40 font-medium",
          direction === 'rtl' ? 'text-right' : 'text-center'
        )}>
          {t('core.app.version', 'Version')} 1.0.0
        </div>
      </div>
    </div>
  );
};

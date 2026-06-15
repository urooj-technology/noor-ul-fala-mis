import React, { ReactNode, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface TableColumn<T = any> {
  key: string;
  title: string;
  render?: (value: any, record: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface TableAction<T = any> {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: (record: T) => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
  tooltip?: string;
  show?: (record: T) => boolean;
}

export interface FilterOption {
  key: string;
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  width?: string;
}



export interface CustomFilter {
  key: string;
  label: string;
  width?: string;
  component: ReactNode;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  headerActions?: ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (value: string) => void;
  filters?: FilterOption[];
  customFilters?: CustomFilter[];
  filterValues?: Record<string, string>;
  customFilterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  showClearFilters?: boolean;
  clearFiltersLabel?: string;
  onClearFilters?: () => void;
  rowActions?: TableAction<T>[];
  bulkActions?: TableAction<T[]>[];
  selectable?: boolean;
  selectedRows?: string[] | number[];
  onSelectionChange?: (selectedRows: string[] | number[]) => void;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    onPageSizeChange?: (size: number) => void;
  };
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  loadingText?: string;
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  rowKey?: string | ((record: T) => string | number);
  onRowClick?: (record: T) => void;
  rowClassName?: string | ((record: T, index: number) => string);
  maxHeight?: string;
  stickyHeader?: boolean;
  footerContent?: ReactNode;
}

function DataTable<T extends Record<string, any>>({
  data = [],
  columns,
  loading = false,
  title,
  subtitle,
  icon,
  headerActions,
  searchable = true,
  searchPlaceholder,
  searchValue = '',
  onSearch,
  filters = [],
  customFilters = [],
  filterValues = {},
  customFilterValues = {},
  onFilterChange,
  showClearFilters = true,
  clearFiltersLabel,
  onClearFilters,
  rowActions = [],
  bulkActions = [],
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  pagination,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  loadingText,
  className,
  tableClassName,
  headerClassName,
  rowKey = 'id',
  onRowClick,
  rowClassName,
  maxHeight = '70vh',
  stickyHeader = true,
  footerContent
}: DataTableProps<T>) {
  const { direction, t } = useLanguage();
  
  const getRowKey = useCallback((record: T, index: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    const key = record?.[rowKey];
    if (key !== undefined && key !== null) {
      return key;
    }
    return index;
  }, [rowKey]);

  // Helper to check if a key is selected (handles both string and number comparison)
  const isRowSelected = useCallback((key: string | number): boolean => {
    return selectedRows.some(id => String(id) === String(key));
  }, [selectedRows]);

  const getRowClassName = useCallback((record: T, index: number): string => {
    let className = 'transition-colors';
    if (onRowClick) {
      className += ' cursor-pointer hover:bg-muted/50';
    }
    if (typeof rowClassName === 'function') {
      className += ' ' + rowClassName(record, index);
    } else if (rowClassName) {
      className += ' ' + rowClassName;
    }
    return className.trim();
  }, [onRowClick, rowClassName]);

  const renderCell = useCallback((column: TableColumn<T>, record: T, index: number) => {
    const value = record?.[column.key];
    
    if (column.render) {
      return column.render(value, record, index);
    }
    
    if (value === null || value === undefined) {
      return <span className="text-muted-foregroundtext-xs">-</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? t('common.yes') : t('common.no')}
        </Badge>
      );
    }
    
    return value?.toString?.() || value || '';
  }, []);

  const hasFilters = filters.length > 0 || !!customFilters;
  const hasActiveFilters = useMemo(() => {
    const hasFilterValues = Object.values(filterValues).some(value => value && value !== 'all');
    const hasCustomFilterValues = Object.values(customFilterValues || {}).some(value => value && value !== '' && value !== 'all');
    const hasSearchValue = searchValue && searchValue.trim() !== '';
    return hasFilterValues || hasCustomFilterValues || hasSearchValue;
  }, [filterValues, customFilterValues, searchValue]);

  const PaginationComponent = useMemo(() => {
    if (!pagination || pagination.total <= pagination.pageSize) return null;
    
    const totalPages = Math.ceil(pagination.total / pagination.pageSize);
    const startItem = (pagination.current - 1) * pagination.pageSize + 1;
    const endItem = Math.min(pagination.current * pagination.pageSize, pagination.total);
    
    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];
      
      for (let i = Math.max(2, pagination.current - delta); 
           i <= Math.min(totalPages - 1, pagination.current + delta); 
           i++) {
        range.push(i);
      }
      
      if (pagination.current - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }
      
      rangeWithDots.push(...range);
      
      if (pagination.current + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }
      
      return rangeWithDots;
    };
    
    return (
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-base text-muted-foreground">
          <span className="whitespace-nowraptext-xs">
            {t('common.showing')} <span className="font-medium text-foregroundtext-xs">{startItem}</span> {t('common.to')}{' '}
            <span className="font-medium text-foregroundtext-xs">{endItem}</span> {t('common.of')}{' '}
            <span className="font-medium text-foregroundtext-xs">{pagination.total}</span> {t('common.entries')}
          </span>
          {pagination.showSizeChanger && (
            <div className="flex items-center gap-2">
              <span className="text-base">{t('common.show')}:</span>
              <Select 
                value={pagination.pageSize.toString()} 
                onValueChange={(value) => pagination.onPageSizeChange?.(Number(value))}
              >
                <SelectTrigger className="w-16 h-8 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(pagination.pageSizeOptions || [10, 25, 50, 100]).map(size => (
                    <SelectItem key={size} value={size.toString()} className="text-base">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <div className="flex items-center">
          <div className="flex sm:hidden items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.current - 1)}
              disabled={pagination.current === 1}
              className="h-9 px-3"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('common.prev')}
            </Button>
            <div className="flex items-center gap-1 px-3 py-1 bg-muted rounded-md">
              <span className="text-base font-mediumtext-xs">{pagination.current}</span>
              <span className="text-base text-muted-foreground">of {totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.current + 1)}
              disabled={pagination.current === totalPages}
              className="h-9 px-3"
            >
              {t('common.next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.current === 1}
              className="h-9 w-9 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.current - 1)}
              disabled={pagination.current === 1}
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {getVisiblePages().map((page, index) => (
              <Button
                key={index}
                variant={page === pagination.current ? 'default' : 'outline'}
                size="sm"
                onClick={() => typeof page === 'number' && pagination.onPageChange(page)}
                disabled={page === '...'}
                className="h-9 min-w-9 px-3"
              >
                {page}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.current + 1)}
              disabled={pagination.current === totalPages}
              className="h-9 w-9 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(totalPages)}
              disabled={pagination.current === totalPages}
              className="h-9 w-9 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }, [pagination]);

  return (
    <Card className={`${className} border-0 shadow-sm`}>
      {(title || subtitle || headerActions || searchable || hasFilters) && (
        <CardHeader className={`${headerClassName} pb-4`}>
          {(title || subtitle || headerActions) && (
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                {title && (
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    {icon}
                    {title}
                  </CardTitle>
                )}
                {subtitle && (
                  <p className="text-base text-muted-foregroundtext-xs">
                    {subtitle}
                  </p>
                )}
              </div>
              <div className="shrink-0">
                {headerActions}
              </div>
            </div>
          )}
          
          {(searchable || hasFilters) && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                {searchable && (
                  <div className="relative w-64">
                    <Search className={cn(
                      "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10",
                      direction === 'rtl' ? 'right-3' : 'left-3'
                    )} />
                    <Input
                      placeholder={searchPlaceholder}
                      value={searchValue}
                      onChange={(e) => onSearch?.(e.target.value)}
                      className={cn(
                        "h-9 border bg-background focus:bg-background transition-colors",
                        direction === 'rtl' ? 'pr-10 text-right' : 'pl-10 text-left'
                      )}
                    />
                  </div>
                )}
                
                {Array.isArray(customFilters) && customFilters.length > 0 && (
                  customFilters.map((filter: any) => (
                    <div key={filter.key} className="flex-shrink-0">
                      {filter.component}
                    </div>
                  ))
                )}
                
                {filters.length > 0 && (
                  filters.map((filter) => (
                    <div key={filter.key} className="min-w-36">
                      <Select
                        value={filterValues[filter.key] || 'all'}
                        onValueChange={(value) => onFilterChange?.(filter.key, value)}
                      >
                        <SelectTrigger className="h-9 w-full border bg-background hover:bg-muted/50 transition-colors text-sm">
                          <SelectValue placeholder={filter.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            <span className="text-muted-foreground text-xs">{t('common.all')} {filter.label}</span>
                          </SelectItem>
                          {filter.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
                
                {showClearFilters && hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    onClick={onClearFilters}
                    size="sm"
                    className="h-9 px-4 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    {clearFiltersLabel || t('common.clearFilters')}
                  </Button>
                )}
              </div>
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(filterValues).map(([key, value]) => {
                    if (value && value !== 'all') {
                      const filter = filters.find(f => f.key === key);
                      const option = filter?.options.find(o => o.value === value);
                      return (
                        <Badge key={key} variant="secondary" className="text-xs h-6 px-2 bg-primary/10 text-primary border-primary/20">
                          {option?.label || value}
                          <button
                            onClick={() => onFilterChange?.(key, 'all')}
                            className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      );
                    }
                    return null;
                  })}
                  {searchValue && (
                    <Badge variant="secondary" className="text-xs h-6 px-2 bg-primary/10 text-primary border-primary/20">
                      "{searchValue}"
                      <button
                        onClick={() => onSearch?.('')}
                        className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </CardHeader>
      )}
      
      <CardContent>
        {bulkActions.length > 0 && selectedRows.length > 0 && Array.isArray(data) && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
            <span className="text-base text-muted-foregroundtext-xs">
              {selectedRows.length} {t('common.items')}
            </span>
            <div className="flex gap-2">
              {bulkActions.map((action) => (
                <Button
                  key={action.key}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={() => action.onClick(data.filter((item, index) => 
                    selectedRows.includes(getRowKey(item, index))
                  ))}
                  className={action.className}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <div className="border rounded-lg overflow-hidden bg-card">
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto" style={{ maxHeight }}>
            <Table className={`w-full min-w-[800px] ${tableClassName}`}>
              <TableHeader className={`bg-muted/50 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
                <TableRow className="border-b border-border/50 hover:bg-transparent">
                  {selectable && (
                    <TableHead className="w-12 px-4 py-4 font-medium">
                      <input
                        type="checkbox"
                        checked={
                          Array.isArray(data) &&
                          data.length > 0 &&
                          selectedRows.length === data.length &&
                          data.every((item, index) => isRowSelected(getRowKey(item, index)))
                        }
                        onChange={(e) => {
                          if (e.target.checked && Array.isArray(data)) {
                            onSelectionChange?.(data.map((item, index) => getRowKey(item, index)));
                          } else {
                            onSelectionChange?.([]);
                          }
                        }}
                        className="w-5 h-5 rounded border-input focus:ring-2 focus:ring-primary/20 cursor-pointer"
                      />
                    </TableHead>
                  )}
                  {columns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={cn(
                        "px-3 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap",
                        column.className
                      )}
                      style={{ 
                        width: column.width || 'auto',
                        minWidth: column.width ? undefined : '100px',
                        maxWidth: column.width ? undefined : '200px',
                        textAlign: column.align || (direction === 'rtl' ? 'right' : 'left')
                      }}
                    >
                      {column.title}
                    </TableHead>
                  ))}
                  {rowActions.length > 0 && (
                    <TableHead className="w-24 px-3 py-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      {t('common.actions')}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary"></div>
                        <p className="text-muted-foreground font-mediumtext-xs">{loadingText || t('common.loading')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !Array.isArray(data) || data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)} className="text-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-muted/50">
                          {emptyIcon}
                        </div>
                        <div className="space-y-2">
                          <p className="text-foreground font-semibold text-base text-base">{emptyTitle || t('common.noDataFound')}</p>
                          <p className="text-muted-foregroundtext-xs">{emptyDescription || t('common.noSearchResults')}</p>
                        </div>
                        {emptyAction}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  Array.isArray(data) && data.map((record, index) => (
                    <TableRow
                      key={getRowKey(record, index)}
                      className={`${getRowClassName(record, index)} border-b border-border/30 hover:bg-muted/30 transition-all duration-200`}
                      onClick={() => onRowClick?.(record)}
                    >
                      {selectable && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isRowSelected(getRowKey(record, index))}
                            onChange={(e) => {
                              const key = getRowKey(record, index);
                              if (e.target.checked) {
                                onSelectionChange?.([...selectedRows, key]);
                              } else {
                                onSelectionChange?.(selectedRows.filter(id => String(id) !== String(key)));
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-5 h-5 rounded border-gray-300 focus:ring-2 focus:ring-primary/20 cursor-pointer"
                          />
                        </TableCell>
                      )}
                      {columns.map((column) => (
                        <TableCell
                          key={column.key}
                          className={cn("px-3 py-2 text-sm", column.className)}
                          style={{ 
                            textAlign: column.align || (direction === 'rtl' ? 'right' : 'left'),
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {renderCell(column, record, index)}
                        </TableCell>
                      ))}
                      {rowActions.length > 0 && (
                        <TableCell className="px-3 py-2 w-24">
                          <div className="flex items-center justify-center gap-1">
                            {rowActions.filter(action => !action.show || action.show(record)).map((action) => (
                              <TooltipProvider key={action.key}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant={action.variant || 'ghost'}
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        action.onClick(record);
                                      }}
                                      className={`h-7 w-7 p-0 ${action.className || ''}`}
                                    >
                                      {action.icon}
                                    </Button>
                                  </TooltipTrigger>
                                  {action.tooltip && (
                                    <TooltipContent side="top">
                                      <p>{action.tooltip}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
                {footerContent && (
                  <>{footerContent}</>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Mobile/Tablet Card View */}
          <div className="block md:hidden" style={{ maxHeight }}>
            <div className="space-y-3 p-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary"></div>
                  <p className="text-muted-foreground font-mediumtext-xs">{loadingText || t('common.loading')}</p>
                </div>
              ) : !Array.isArray(data) || data.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <div className="p-4 rounded-full bg-muted/50">
                    {emptyIcon}
                  </div>
                  <div className="space-y-2 text-center">
                    <p className="text-foreground font-semibold text-base">{emptyTitle || t('common.noDataFound')}</p>
                    <p className="text-muted-foregroundtext-xs">{emptyDescription || t('common.noSearchResults')}</p>
                  </div>
                  {emptyAction}
                </div>
              ) : (
                Array.isArray(data) && data.map((record, index) => (
                  <Card 
                    key={getRowKey(record, index)} 
                    className={`${getRowClassName(record, index)} border shadow-sm hover:shadow-md transition-all duration-200`}
                    onClick={() => onRowClick?.(record)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* First row - most important columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {columns.slice(0, 2).map((column) => (
                            <div key={column.key} className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {column.title}
                              </p>
                              <div className="text-sm font-medium">
                                {renderCell(column, record, index)}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Second row - remaining columns */}
                        {columns.length > 2 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-border/30">
                            {columns.slice(2).map((column) => (
                              <div key={column.key} className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  {column.title}
                                </p>
                                <div className="text-sm">
                                  {renderCell(column, record, index)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Actions row */}
                        {rowActions.length > 0 && (
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
                            {rowActions.filter(action => !action.show || action.show(record)).map((action) => (
                              <TooltipProvider key={action.key}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant={action.variant || 'ghost'}
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        action.onClick(record);
                                      }}
                                      className={`h-8 w-8 p-0 ${action.className || ''}`}
                                    >
                                      {action.icon}
                                    </Button>
                                  </TooltipTrigger>
                                  {action.tooltip && (
                                    <TooltipContent side="top">
                                      <p>{action.tooltip}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
        
        
        {PaginationComponent && (
          <div className="mt-6 pt-4 border-t border-border/30">
            {PaginationComponent}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { DataTable };
export default DataTable;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import useFetchObjects from '@/api/useFetchObjects';

// Debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

interface Option {
  [key: string]: any;
}

interface AutocompleteProps {
  value?: string | number;
  onChange?: (value: string | number | null, option?: any) => void;
  onValueChange?: (value: string | number | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  endpoint?: string;
  searchParam?: string;
  pageSize?: number;
  disabled?: boolean;
  className?: string;
  options?: Option[];
  renderOption?: (option: Option) => React.ReactNode;
  getOptionLabel?: (option: Option) => string;
  getOptionValue?: (option: Option) => string | number;
  sortOptions?: (a: Option, b: Option) => number;
  labelKey?: string;
  valueKey?: string;
  apiUrl?: string;
  queryParams?: Record<string, string | number>;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  onValueChange,
  placeholder,
  searchPlaceholder,
  endpoint,
  searchParam = 'search',
  pageSize = 20,
  disabled = false,
  className,
  options: staticOptions,
  renderOption,
  getOptionLabel,
  getOptionValue,
  sortOptions,
  labelKey = 'label',
  valueKey = 'value',
  apiUrl,
  queryParams,
}) => {
  const { t, direction } = useLanguage();
  
  const defaultGetOptionLabel = useCallback((option: Option) => {
    if (getOptionLabel) return getOptionLabel(option);
    return option[labelKey] || option.name || option.title || '';
  }, [getOptionLabel, labelKey]);
  
  const defaultGetOptionValue = useCallback((option: Option) => {
    if (getOptionValue) return getOptionValue(option);
    const value = option[valueKey] || option.id || option.value || '';
    return typeof value === 'number' ? value.toString() : value;
  }, [getOptionValue, valueKey]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  const fetchParams = {
    page,
    page_size: pageSize,
    ...(debouncedSearchTerm.trim() && { [searchParam]: debouncedSearchTerm.trim() }),
    ...queryParams,
  };

  const { data, isLoading, refetch } = useFetchObjects<any>({
    queryKey: ['autocomplete', endpoint || '', JSON.stringify(fetchParams)],
    endpoint: endpoint || '',
    params: fetchParams,
    enabled: !staticOptions && !!endpoint && isOpen,
  });

  const { data: initialValueData, isError: initialValueError } = useFetchObjects<Option>({
    queryKey: ['autocomplete-initial', endpoint || '', value?.toString() || ''],
    endpoint: endpoint && endpoint.endsWith('/') ? `${endpoint}${value}` : endpoint ? `${endpoint}/${value}` : '',
    enabled: !!value && !!endpoint && !selectedOption && !staticOptions,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 text-black">{part}</mark>
        : part
    );
  };

  const rawOptions = Array.isArray(staticOptions) ? staticOptions : (Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []));
  const options = sortOptions ? [...rawOptions].sort(sortOptions) : rawOptions;
  const hasMore = data?.next ? true : false;

  useEffect(() => {
    if (isOpen && !staticOptions) {
      setPage(1);
    }
  }, [debouncedSearchTerm, isOpen, staticOptions]);

  useEffect(() => {
    if (initialValueData) {
      setSelectedOption(initialValueData);
    } else if (initialValueError && value) {
      setSelectedOption({ id: value, [labelKey]: `ID: ${value}` } as Option);
    }
  }, [initialValueData, initialValueError, value, labelKey]);

  useEffect(() => {
    if (value !== null && value !== undefined && value !== '') {
      const valueStr = value.toString();
      const selected = options.find(opt => defaultGetOptionValue(opt).toString() === valueStr);
      if (selected) {
        setSelectedOption(selected);
      }
    } else {
      setSelectedOption(null);
    }
  }, [value, options, defaultGetOptionValue]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !isLoading && endpoint) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, isLoading, endpoint]);

  const handleSelect = (option: Option) => {
    const value = defaultGetOptionValue(option);
    setSelectedOption(option);
    if (onChange) onChange(value, option);
    if (onValueChange) onValueChange(value);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    setSelectedOption(null);
    if (onChange) onChange(null, null);
    if (onValueChange) onValueChange(null);
    setSearchTerm('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || options.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(options[highlightedIndex]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const portalElement = document.querySelector('[data-autocomplete-portal]');
      
      if (dropdownRef.current && 
          !dropdownRef.current.contains(target) && 
          (!portalElement || !portalElement.contains(target))) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const updatePosition = () => {
      if (isOpen && dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        setHighlightedIndex(-1);
      }
      
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border bg-background px-3 py-1.5 text-xs ring-offset-background',
          'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
          !disabled && 'cursor-pointer hover:bg-accent',
          className
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
          {selectedOption ? defaultGetOptionLabel(selectedOption) : (placeholder || t('common.selectOption', 'Select option...'))}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', isOpen && 'rotate-180')} />
        </div>
      </div>

      {isOpen && createPortal(
        <div 
          data-autocomplete-portal
          className="fixed z-[9999] rounded-md border bg-popover shadow-lg" 
          style={{
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: '300px'
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={cn(
            "flex items-center border-b px-3 py-2",
            direction === 'rtl' ? 'flex-row-reverse' : 'flex-row'
          )}>
            <Search className={cn(
              "h-4 w-4 shrink-0 opacity-50",
              direction === 'rtl' ? 'ml-2' : 'mr-2'
            )} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder || t('common.search', 'Search...')}
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              className={cn(
                "flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground",
                direction === 'rtl' ? 'text-right' : 'text-left'
              )}
            />
          </div>
          
          <div
            ref={listRef}
            className="max-h-60 overflow-auto p-1"
            onScroll={handleScroll}
          >
            {isLoading && page === 1 ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className={cn(
                  "text-base text-muted-foreground",
                  direction === 'rtl' ? 'mr-2' : 'ml-2'
                )}>{t('common.loading', 'Loading...')}</span>
              </div>
            ) : options.length === 0 ? (
              <div className="py-6 text-center text-base text-muted-foreground">
                {t('common.noOptionsFound', 'No options found')}
              </div>
            ) : (
              <>
                {options.map((option, index) => {
                  const label = defaultGetOptionLabel(option);
                  return (
                    <div
                      key={`${defaultGetOptionValue(option)}-${index}`}
                      className={cn(
                        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-base outline-none',
                        'hover:bg-accent hover:text-accent-foreground',
                        highlightedIndex === index && 'bg-accent text-accent-foreground',
                        defaultGetOptionValue(option).toString() === value?.toString() && 'bg-accent/50'
                      )}
                      onClick={() => handleSelect(option)}
                    >
                      {renderOption ? renderOption(option) : highlightText(label, searchTerm)}
                    </div>
                  );
                })}
                
                {isLoading && page > 1 && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className={cn(
                      "text-base text-muted-foreground",
                      direction === 'rtl' ? 'mr-2' : 'ml-2'
                    )}>{t('common.loadingMore', 'Loading more...')}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Autocomplete;
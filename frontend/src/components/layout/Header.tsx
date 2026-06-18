import React from 'react';
import { Bell, User, Globe, Menu, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendar } from '@/contexts/CalendarContext';
import { formatToday } from '@/utils/calendar';
import { Language, languageNames } from '@/i18n';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { language, changeLanguage, direction } = useLanguage();
  const { user, logout } = useAuth();
  const { calendarType, dateFormat } = useCalendar();
  const navigate = useNavigate();
  const todayLabel = formatToday(calendarType, dateFormat, language as 'fa' | 'ps' | 'en');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 shadow-sm sticky top-0 z-20">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu size={20} />
        </Button>
        
        <div className="hidden sm:block">
          <h2 className="text-base font-semibold text-foregroundtext-sm">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h2>
          <p className="text-base text-muted-foreground" dir="rtl">
            {todayLabel}
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Globe size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={direction === 'rtl' ? 'start' : 'end'} className="w-40">
            <DropdownMenuLabel>Language</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(languageNames).map(([code, name]) => (
              <DropdownMenuItem
                key={code}
                onClick={() => changeLanguage(code as Language)}
                className={cn(
                  "cursor-pointer my-1",
                  language === code && 'bg-accent'
                )}
              >
                {name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={18} />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
              >
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={direction === 'rtl' ? 'start' : 'end'} className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              <DropdownMenuItem className="flex flex-col items-start py-3">
                <p className="text-base font-mediumtext-xs">New order received</p>
                <p className="text-base text-muted-foreground">Order #12345 from Ahmad Khan</p>
                <p className="text-base text-muted-foreground mt-1">2 minutes ago</p>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start py-3">
                <p className="text-base font-mediumtext-xs">Low stock alert</p>
                <p className="text-base text-muted-foreground">Product A is running low</p>
                <p className="text-base text-muted-foreground mt-1">1 hour ago</p>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start py-3">
                <p className="text-base font-mediumtext-xs">Payment received</p>
                <p className="text-base text-muted-foreground">$1,250 from Sara Ahmed</p>
                <p className="text-base text-muted-foreground mt-1">3 hours ago</p>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 hover:bg-accent">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-base shadow-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden md:inline text-base font-mediumtext-xs">
                {user?.name?.split(' ')[0] || 'User'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={direction === 'rtl' ? 'start' : 'end'} className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-mediumtext-xs">{user?.name || 'User'}</p>
                <p className="text-base text-muted-foreground font-normal">{user?.email || ''}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
              <User size={16} className="mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings/calendar')} className="cursor-pointer">
              <SettingsIcon size={16} className="mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut size={16} className="mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
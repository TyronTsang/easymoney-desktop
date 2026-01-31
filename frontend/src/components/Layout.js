import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Home
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_moneyloan/artifacts/5g3xucf8_easy_money_loans_logo_enhanced_white%20%281%29.png";

const navItems = [
  { path: '/loans', icon: CreditCard, label: 'Loan Register', roles: ['employee', 'manager', 'admin'] },
  { path: '/customers', icon: Users, label: 'Customers', roles: ['employee', 'manager', 'admin'] },
  { path: '/fraud-alerts', icon: FileText, label: 'Reports', roles: ['manager', 'admin'] },
  { path: '/admin', icon: Settings, label: 'Settings', roles: ['admin'] },
];

export default function Layout({ children }) {
  const { user, logout, lockApp } = useAuth();
  const location = useLocation();

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.role)
  );

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-50 text-red-600 border-red-200';
      case 'manager': return 'bg-blue-50 text-blue-600 border-blue-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Top Navigation Bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          {/* Left side - Logo and Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src={LOGO_URL} 
                alt="Easy Money Loans" 
                className="h-7 object-contain"
              />
              <span className="font-semibold text-gray-800">Staff Portal</span>
            </div>

            {/* Navigation Links */}
            <nav className="flex items-center gap-1">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path === '/loans' && location.pathname.startsWith('/loans/'));
                
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? 'text-red-600' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" strokeWidth={1.5} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Right side - User info */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.full_name}</span>
            <Badge className={`${getRoleBadgeColor(user?.role)} text-xs`}>
              {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            </Badge>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => window.location.href = '/dashboard'}
                  className="text-gray-500 hover:text-gray-700"
                  data-testid="home-btn"
                >
                  <Home className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Dashboard</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={logout}
                  className="text-gray-500 hover:text-red-600"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Logout</p></TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6">
              {children}
            </div>
          </ScrollArea>
        </main>
      </div>
    </TooltipProvider>
  );
}

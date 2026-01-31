import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  FileText, 
  AlertTriangle, 
  Download, 
  Settings, 
  ScrollText,
  LogOut,
  Home
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_secureloans-desk/artifacts/2f2hs30o_easy_money_loans_logo_enhanced_white%20%281%29.png";

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['employee', 'manager', 'admin'] },
  { path: '/loans', icon: CreditCard, label: 'Loan Register', roles: ['employee', 'manager', 'admin'] },
  { path: '/customers', icon: Users, label: 'Customers', roles: ['employee', 'manager', 'admin'] },
  { path: '/fraud-alerts', icon: AlertTriangle, label: 'Blog', roles: ['employee', 'manager', 'admin'] },
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
      case 'admin': return 'text-red-600';
      case 'manager': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Nav */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <img 
                  src={LOGO_URL} 
                  alt="Easy Money Loans" 
                  className="h-8 object-contain"
                />
                <span className="font-heading font-semibold text-gray-700 hidden sm:block">Staff Portal</span>
              </div>
              
              {/* Main Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                {filteredNavItems.map((item) => {
                  const isActive = location.pathname === item.path || 
                    (item.path === '/loans' && location.pathname.startsWith('/loans/'));
                  
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-red-50 text-red-600' 
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="w-4 h-4" strokeWidth={1.5} />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 hidden sm:block">{user?.email || user?.username}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getRoleBadgeColor(user?.role)}`}>
                      {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Home className="w-4 h-4 text-gray-600" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-sm">
                    <span className="font-medium">{user?.full_name}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-sm text-gray-500">
                    {user?.branch}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {['manager', 'admin'].includes(user?.role) && (
                    <DropdownMenuItem asChild>
                      <NavLink to="/export" className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export Data
                      </NavLink>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <NavLink to="/audit-logs" className="flex items-center gap-2">
                      <ScrollText className="w-4 h-4" />
                      Audit Logs
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}

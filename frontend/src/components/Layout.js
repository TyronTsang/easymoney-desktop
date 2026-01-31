import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  AlertTriangle, 
  Download, 
  Settings, 
  ScrollText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Lock,
  Building2
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_moneyloan/artifacts/5g3xucf8_easy_money_loans_logo_enhanced_white%20%281%29.png";

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['employee', 'manager', 'admin'] },
  { path: '/loans', icon: CreditCard, label: 'Loan Register', roles: ['employee', 'manager', 'admin'] },
  { path: '/customers', icon: Users, label: 'Customers', roles: ['employee', 'manager', 'admin'] },
  { path: '/fraud-alerts', icon: AlertTriangle, label: 'Fraud Alerts', roles: ['manager', 'admin'] },
  { path: '/export', icon: Download, label: 'Export', roles: ['manager', 'admin'] },
  { path: '/audit-logs', icon: ScrollText, label: 'Audit Logs', roles: ['admin'] },
  { path: '/admin', icon: Settings, label: 'Settings', roles: ['admin'] },
];

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
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
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <aside className={`${collapsed ? 'w-16' : 'w-60'} flex flex-col border-r border-gray-200 bg-white transition-all duration-300`}>
          {/* Logo area */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
            {!collapsed && (
              <img 
                src={LOGO_URL} 
                alt="Easy Money Loans" 
                className="h-8 object-contain"
              />
            )}
            {collapsed && (
              <div className="w-8 h-8 rounded-md bg-red-600 flex items-center justify-center mx-auto">
                <CreditCard className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 text-gray-500 hover:text-gray-700"
              data-testid="sidebar-toggle"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="space-y-1 px-2">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path === '/loans' && location.pathname.startsWith('/loans/'));
                
                const linkContent = (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 ${
                      isActive 
                        ? 'bg-red-50 text-red-600 border border-red-200' 
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </NavLink>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </nav>
          </ScrollArea>

          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            {!collapsed && (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-red-600">
                      {user?.full_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getRoleBadgeColor(user?.role)}`}>
                        {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                  <Building2 className="w-3 h-3" />
                  <span>{user?.branch}</span>
                </div>
                <Separator className="mb-3 bg-gray-200" />
              </>
            )}
            <div className={`flex ${collapsed ? 'flex-col' : ''} gap-2`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size={collapsed ? "icon" : "sm"}
                    onClick={lockApp}
                    className="flex-1 text-gray-500 hover:text-amber-600 hover:bg-amber-50"
                    data-testid="lock-app-btn"
                  >
                    <Lock className="w-4 h-4" />
                    {!collapsed && <span className="ml-2">Lock</span>}
                  </Button>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right"><p>Lock App</p></TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size={collapsed ? "icon" : "sm"}
                    onClick={logout}
                    className="flex-1 text-gray-500 hover:text-red-600 hover:bg-red-50"
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-4 h-4" />
                    {!collapsed && <span className="ml-2">Logout</span>}
                  </Button>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right"><p>Logout</p></TooltipContent>}
              </Tooltip>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden bg-gray-50">
          <ScrollArea className="h-full">
            <div className="p-6 page-enter">
              {children}
            </div>
          </ScrollArea>
        </main>
      </div>
    </TooltipProvider>
  );
}

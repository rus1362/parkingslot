import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Calendar, 
  Car, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Car,
    adminOnly: false
  },
  {
    title: "My Reservations", 
    href: "/reservations",
    icon: Calendar,
    adminOnly: false
  },
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
    adminOnly: true
  },
  {
    title: "Analytics",
    href: "/admin/analytics", 
    icon: BarChart3,
    adminOnly: true
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    adminOnly: true
  }
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin());

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">ParkEase</h2>
            <p className="text-sm text-gray-500 flex items-center">
              {isAdmin() && <Shield className="w-3 h-3 mr-1" />}
              {user?.role}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <a className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary text-white" 
                      : "text-gray-700 hover:bg-gray-100"
                  )}>
                    <Icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-900">{user?.username}</div>
          <div className="text-xs text-red-600">
            {user?.penaltyPoints || 0} penalty points
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={logout}
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}

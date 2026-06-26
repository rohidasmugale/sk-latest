import { Bell, BellRing, CheckCheck, Target, Calendar, Package, ArrowLeft, Menu, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "./ThemeToggle";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/context/NotificationContext";
import { useRole } from "@/context/RoleContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export const DashboardHeader = ({ title, subtitle, onMenuClick }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { role } = useRole();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  // Build the role-based path prefix
  const getRolePath = () => {
    if (!role) return '';
    switch (role) {
      case 'superadmin': return '/superadmin';
      case 'admin': return '/admin';
      case 'manager': return '/manager';
      case 'supervisor': return '/supervisor';
      case 'employee': return '/employee';
      default: return '';
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'task': return <Target className="h-4 w-4" />;
      case 'leave': return <Calendar className="h-4 w-4" />;
      case 'site': return <Package className="h-4 w-4" />;
      default: return <BellRing className="h-4 w-4" />;
    }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-card border-b border-border px-4 md:px-6 py-4 sticky top-0 z-40"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div>
            <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
            {subtitle && <p className="text-xs md:text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-10 w-64" />
          </div>

          {/* Notification Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
           <DropdownMenuContent align="end" className="w-96 p-0 shadow-xl">
  <div className="flex items-center justify-between p-3 border-b bg-muted/30">
    <div>
      <h4 className="font-semibold text-sm">Notifications</h4>
      <p className="text-xs text-muted-foreground">
        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
      </p>
    </div>
    <div className="flex items-center gap-1">
      {unreadCount > 0 && (
        <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-xs">
          <CheckCheck className="h-3 w-3 mr-1" /> Read all
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={clearAll}
        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3 w-3 mr-1" /> Clear
      </Button>
    </div>
  </div>

  <div className="max-h-80 overflow-y-auto divide-y">
    {notifications.length === 0 ? (
      <div className="p-6 text-center text-muted-foreground text-sm">
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
        No notifications yet
      </div>
    ) : (
      notifications.slice(0, 10).map((notif) => (
        <DropdownMenuItem
          key={notif.id}
          className={`p-3 cursor-pointer focus:bg-muted flex items-start gap-3 ${
            !notif.isRead ? 'bg-primary/5' : ''
          }`}
          onClick={() => {
            if (!notif.isRead) markAsRead(notif.id);
            const rolePath = getRolePath();
            navigate(`${rolePath || ''}/notifications?id=${notif.id}`);
          }}
        >
          <div className="mt-0.5 shrink-0">{getIcon(notif.type)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight truncate">{notif.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
            <span className="text-[10px] text-muted-foreground mt-1 block">
              {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
            </span>
          </div>
          {!notif.isRead && (
            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
          )}
        </DropdownMenuItem>
      ))
    )}
  </div>

  <div className="p-2 border-t text-center bg-muted/10">
    <Button
      variant="link"
      size="sm"
      onClick={() => navigate(`${getRolePath() || ''}/notifications`)}
      className="text-xs h-7"
    >
      View all notifications →
    </Button>
  </div>
</DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  );
};
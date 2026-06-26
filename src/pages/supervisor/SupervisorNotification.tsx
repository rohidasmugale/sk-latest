// pages/supervisor/SupervisorNotification.tsx
import { useState, useMemo } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Bell,
  BellOff,
  BellRing,
  Building,
  Calendar,
  CheckCheck,
  CheckCircle,
  ChevronDown,
  Clock,
  Filter,
  FilterX,
  Loader2,
  RefreshCw,
  Search,
  Target,
  Trash2,
  User,
  Users,
  X,
  XCircle,
  Eye,
  Download,
  ArrowRight,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Package,       // <-- added
} from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { useNotifications } from "@/context/NotificationContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// Animation variants (unchanged)
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};
const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } }
};
const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
};

const SupervisorNotification = () => {
  const { user: currentUser } = useRole();

  // ✅ Use context – single source of truth
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    refresh
  } = useNotifications();

  // UI state
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("notifications");
  const [viewNotification, setViewNotification] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showReadNotifications, setShowReadNotifications] = useState(true);
  const [isHoveredId, setIsHoveredId] = useState<string | null>(null);

  // ----- Helpers -----
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const formatDateTime = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ----- Handlers -----
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleMarkAsRead = (id: string) => markAsRead(id);
  const handleMarkAllAsRead = () => markAllAsRead();
  const handleDelete = (id: string) => removeNotification(id);
  const handleClearAll = () => clearAll();

  const handleViewDetails = (notification: any) => {
    setViewNotification(notification);
    setDialogOpen(true);
    if (!notification.isRead) handleMarkAsRead(notification.id);
  };

  const handleExportNotifications = () => {
    try {
      const dataStr = JSON.stringify(notifications, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', `supervisor-notifications-${new Date().toISOString().split('T')[0]}.json`);
      link.click();
      toast({ title: "Notifications exported", description: `Downloaded ${notifications.length} notifications` });
    } catch {
      toast({ title: "Export failed", description: "Could not export notifications", variant: "destructive" });
    }
  };

  // ----- UI helpers (with casting for metadata) -----
  const getTypeIcon = (type: string, isRead = false) => {
    const cls = cn("h-5 w-5", isRead ? "text-muted-foreground" : "");
    switch (type) {
      case "task": return <Target className={cls} />;
      case "leave": return <Calendar className={cls} />;
      case "approval": return <CheckCircle className={cls} />;
      case "site": return <Building className={cls} />;
      case "inventory": return <Package className={cls} />;
      default: return <Bell className={cls} />;
    }
  };
  const getAnimatedIcon = (type: string, isUnread = false) => {
    if (isUnread) {
      return (
        <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}>
          {getTypeIcon(type, false)}
        </motion.div>
      );
    }
    return getTypeIcon(type, false);
  };
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress': return 'secondary';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getFilterLabel = () => {
    switch (filter) {
      case "all": return "All Notifications";
      case "unread": return "Unread Only";
      case "task": return "Tasks";
      case "leave": return "Leave";
      case "approval": return "Approvals";
      default: return "All Notifications";
    }
  };
  const getTypeCount = (type: string) => notifications.filter(n => n.type === type).length;

  const clearAllFilters = () => {
    setFilter("all");
    setSearchQuery("");
    toast({ title: "Filters cleared", description: "All filters have been cleared" });
  };

  // ----- Filtered data (computed) -----
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    if (filter !== "all") {
      if (filter === "unread") filtered = filtered.filter(n => !n.isRead);
      else filtered = filtered.filter(n => n.type === filter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        ((n.metadata as any)?.siteName?.toLowerCase() || '').includes(q) ||
        ((n.metadata as any)?.employeeName?.toLowerCase() || '').includes(q) ||
        ((n.metadata as any)?.assignedToName?.toLowerCase() || '').includes(q) ||
        ((n.metadata as any)?.department?.toLowerCase() || '').includes(q) ||
        ((n.metadata as any)?.leaveType?.toLowerCase() || '').includes(q)
      );
    }
    return filtered;
  }, [notifications, filter, searchQuery]);

  const totalCount = notifications.length;
  const taskCount = notifications.filter(n => n.type === 'task').length;
  const leaveCount = notifications.filter(n => n.type === 'leave').length;
  const approvedCount = notifications.filter(n => (n.metadata as any)?.status === 'approved').length;
  const rejectedCount = notifications.filter(n => (n.metadata as any)?.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <DashboardHeader
        title="Supervisor Dashboard"
        subtitle="Track all your task and leave notifications"
        actions={
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="relative overflow-hidden"
            >
              <motion.div animate={{ rotate: isRefreshing ? 360 : 0 }} transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0 }}>
                <RefreshCw className="h-4 w-4 mr-2" />
              </motion.div>
              Refresh All
            </Button>
          </motion.div>
        }
      />

      <div className="p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList className="grid grid-cols-4 w-full sm:w-auto bg-muted/50 backdrop-blur-sm">
              <TabsTrigger value="notifications" className="flex items-center gap-2 relative data-[state=active]:bg-background">
                <Bell className="h-4 w-4" /> Notifications
                {unreadCount > 0 && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1">
                    <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center animate-pulse">{unreadCount}</Badge>
                  </motion.div>
                )}
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-2 data-[state=active]:bg-background">
                <Target className="h-4 w-4" /> Tasks
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">{taskCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="leaves" className="flex items-center gap-2 data-[state=active]:bg-background">
                <Calendar className="h-4 w-4" /> Leaves
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">{leaveCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="approvals" className="flex items-center gap-2 data-[state=active]:bg-background">
                <CheckCircle className="h-4 w-4" /> Approvals
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">{approvedCount}</Badge>
              </TabsTrigger>
            </TabsList>

            {(filter !== "all" || searchQuery) && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-2">
                  <FilterX className="h-4 w-4" /> Clear Filters
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* NOTIFICATIONS TAB – full list with filter */}
          <TabsContent value="notifications">
            <motion.div variants={fadeInUp} initial="initial" animate="animate" transition={{ duration: 0.4 }}>
              <Card className="border-primary/20 shadow-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
                <CardHeader className="pb-3 relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="p-2 bg-gradient-to-br from-primary to-primary/70 rounded-lg shadow-md">
                        <Bell className="h-6 w-6 text-primary-foreground" />
                      </motion.div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Notification Center
                          <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
                            className="text-sm font-normal text-primary">
                            <Sparkles className="h-4 w-4 inline mr-1" /> Live Updates
                          </motion.span>
                        </CardTitle>
                        <CardDescription>Real‑time updates for your tasks and leave requests</CardDescription>
                      </div>
                      {unreadCount > 0 && (
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                          <Badge variant="destructive" className="ml-2">{unreadCount} New</Badge>
                        </motion.div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2 relative">
                            <Filter className="h-4 w-4" /> {getFilterLabel()} <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Filter Notifications</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => setFilter("all")} className="cursor-pointer flex items-center justify-between hover:bg-primary/5">
                              <div className="flex items-center"><Bell className="mr-2 h-4 w-4" /> All</div>
                              <Badge variant="outline" className="text-xs">{notifications.length}</Badge>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilter("unread")} className="cursor-pointer flex items-center justify-between hover:bg-primary/5">
                              <div className="flex items-center"><BellRing className="mr-2 h-4 w-4" /> Unread</div>
                              {unreadCount > 0 && <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>}
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>By Type</DropdownMenuLabel>
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => setFilter("task")} className="cursor-pointer flex items-center justify-between hover:bg-primary/5">
                              <Target className="mr-2 h-4 w-4" /> Tasks <Badge variant="outline" className="text-xs">{getTypeCount("task")}</Badge>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilter("leave")} className="cursor-pointer flex items-center justify-between hover:bg-primary/5">
                              <Calendar className="mr-2 h-4 w-4" /> Leave <Badge variant="outline" className="text-xs">{getTypeCount("leave")}</Badge>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {unreadCount > 0 && (
                        <Button onClick={handleMarkAllAsRead} variant="outline" size="sm" className="gap-2">
                          <CheckCheck className="h-4 w-4" /> Mark All Read
                        </Button>
                      )}
                      {totalCount > 0 && (
                        <>
                          <Button onClick={handleExportNotifications} variant="outline" size="sm" className="gap-2">
                            <Download className="h-4 w-4" /> Export
                          </Button>
                          <Button onClick={handleClearAll} variant="destructive" size="sm" className="gap-2">
                            <Trash2 className="h-4 w-4" /> Clear All
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <div className="px-6 pb-4 relative z-10">
                  <motion.div animate={{ scale: [1, 1.01, 1] }} transition={{ duration: 3, repeat: Infinity }} className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search notifications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background/50 backdrop-blur-sm border-primary/20"
                    />
                    {searchQuery && (
                      <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </motion.div>
                </div>

                <CardContent className="pt-6 relative z-10">
                  <AnimatePresence mode="wait">
                    {isRefreshing ? (
                      <motion.div variants={fadeInUp} initial="initial" animate="animate" exit="exit" className="text-center py-12">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4" />
                        </motion.div>
                        <h3 className="text-lg font-semibold mb-2">Loading notifications...</h3>
                      </motion.div>
                    ) : filteredNotifications.length === 0 ? (
                      <motion.div variants={scaleIn} initial="initial" animate="animate" exit="exit" className="text-center py-12">
                        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                          <BellOff className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        </motion.div>
                        <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          {searchQuery ? `No notifications match "${searchQuery}".` : "You're all caught up!"}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
                        {/* Unread */}
                        {filteredNotifications.filter(n => !n.isRead).length > 0 && (
                          <motion.div variants={fadeInUp}>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold text-sm flex items-center gap-2">
                                <motion.span animate={{ rotate: [0, 20, -20, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                                  <BellRing className="h-4 w-4 text-primary" />
                                </motion.span>
                                Unread ({filteredNotifications.filter(n => !n.isRead).length})
                              </h3>
                              <Button size="sm" variant="ghost" onClick={handleMarkAllAsRead} className="h-8 text-xs">
                                <CheckCheck className="h-3 w-3 mr-1" /> Mark all as read
                              </Button>
                            </div>
                            <motion.div variants={staggerContainer} className="space-y-3">
                              {filteredNotifications.filter(n => !n.isRead).map((notification) => (
                                <motion.div
                                  key={notification.id}
                                  variants={fadeInUp}
                                  whileHover={{ scale: 1.01 }}
                                  onHoverStart={() => setIsHoveredId(notification.id)}
                                  onHoverEnd={() => setIsHoveredId(null)}
                                  className={cn(
                                    "p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 border-primary/30 shadow-sm cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden group",
                                    (notification.metadata as any)?.isSupervisorLeave && "border-l-4 border-l-blue-500"
                                  )}
                                  onClick={() => handleViewDetails(notification)}
                                >
                                  <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    initial={false}
                                    animate={{ x: isHoveredId === notification.id ? [0, 100, 0] : 0 }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                  />
                                  <div className="relative flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-start gap-3">
                                        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}
                                          className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-md">
                                          {getAnimatedIcon(notification.type, true)}
                                        </motion.div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-sm text-primary">{notification.title}</h4>
                                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                                              <Badge variant="destructive" className="text-xs animate-pulse">New</Badge>
                                            </motion.div>
                                            <Badge variant="outline" className="text-xs capitalize ml-auto">{notification.type}</Badge>
                                          </div>
                                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                                          {/* Task Metadata */}
                                          {notification.type === 'task' && notification.metadata && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ delay: 0.1 }} className="mt-3 space-y-2">
                                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                {(notification.metadata as any)?.siteName && (
                                                  <div className="flex items-center gap-1">
                                                    <Building className="h-3 w-3" />
                                                    <span className="font-medium">{(notification.metadata as any).siteName}</span>
                                                  </div>
                                                )}
                                                {(notification.metadata as any)?.assignedToName && (
                                                  <div className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    <span>Assignee: {(notification.metadata as any).assignedToName}</span>
                                                    {(notification.metadata as any)?.isAssignedToMe && " (You)"}
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex flex-wrap gap-2">
                                                {(notification.metadata as any)?.priority && (
                                                  <motion.div whileHover={{ scale: 1.1 }}>
                                                    <Badge variant={getPriorityBadge((notification.metadata as any).priority)} className="text-xs">{(notification.metadata as any).priority}</Badge>
                                                  </motion.div>
                                                )}
                                                {(notification.metadata as any)?.status && (
                                                  <motion.div whileHover={{ scale: 1.1 }}>
                                                    <Badge variant={getStatusBadge((notification.metadata as any).status)} className="text-xs capitalize">{(notification.metadata as any).status.replace('-', ' ')}</Badge>
                                                  </motion.div>
                                                )}
                                                {(notification.metadata as any)?.requiresAction && (
                                                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
                                                    <Badge variant="destructive" className="text-xs">
                                                      <AlertCircle className="h-3 w-3 mr-1" /> Action Required
                                                    </Badge>
                                                  </motion.div>
                                                )}
                                              </div>
                                            </motion.div>
                                          )}
                                          {/* Leave Metadata */}
                                          {notification.type === 'leave' && notification.metadata && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ delay: 0.1 }} className="mt-3 space-y-2">
                                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                {(notification.metadata as any)?.employeeName && (
                                                  <div className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    <span className="font-medium">{(notification.metadata as any).employeeName}</span>
                                                    {(notification.metadata as any)?.isSupervisorLeave && " (You)"}
                                                  </div>
                                                )}
                                                {(notification.metadata as any)?.leaveType && (
                                                  <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{(notification.metadata as any).leaveType}</span>
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex flex-wrap gap-2">
                                                {(notification.metadata as any)?.status && (
                                                  <motion.div whileHover={{ scale: 1.1 }}>
                                                    <Badge variant={(notification.metadata as any).status === 'approved' ? 'default' : (notification.metadata as any).status === 'rejected' ? 'destructive' : 'secondary'} className="text-xs capitalize">
                                                      {(notification.metadata as any).status}
                                                    </Badge>
                                                  </motion.div>
                                                )}
                                                {(notification.metadata as any)?.fromDate && (notification.metadata as any)?.toDate && (
                                                  <Badge variant="outline" className="text-xs">
                                                    {formatDate((notification.metadata as any).fromDate)} - {formatDate((notification.metadata as any).toDate)}
                                                  </Badge>
                                                )}
                                              </div>
                                            </motion.div>
                                          )}
                                          <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                              <motion.span animate={{ rotate: [0, 360] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                                                <Clock className="h-3 w-3" />
                                              </motion.span>
                                              {formatTime(notification.timestamp)}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-1">
                                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }} title="Mark as read" className="h-8 w-8 p-0">
                                          <CheckCheck className="h-4 w-4" />
                                        </Button>
                                      </motion.div>
                                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleViewDetails(notification); }} title="View details" className="h-8 w-8 p-0">
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </motion.div>
                                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }} title="Delete" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </motion.div>
                                    </motion.div>
                                  </div>
                                </motion.div>
                              ))}
                            </motion.div>
                          </motion.div>
                        )}

                        {/* Read */}
                        {showReadNotifications && filteredNotifications.filter(n => n.isRead).length > 0 && (
                          <motion.div variants={fadeInUp}>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold text-sm flex items-center gap-2">
                                <CheckCheck className="h-4 w-4 text-muted-foreground" /> Read ({filteredNotifications.filter(n => n.isRead).length})
                              </h3>
                              <Button size="sm" variant="ghost" onClick={() => setShowReadNotifications(!showReadNotifications)} className="h-8 text-xs">
                                <EyeOff className="h-3 w-3 mr-1" /> Hide read
                              </Button>
                            </div>
                            <motion.div variants={staggerContainer} className="space-y-3">
                              {filteredNotifications.filter(n => n.isRead).map((notification) => (
                                <motion.div
                                  key={`read-${notification.id}`}
                                  variants={fadeInUp}
                                  whileHover={{ scale: 1.005 }}
                                  className={cn(
                                    "p-4 rounded-lg border bg-background/50 hover:bg-muted/30 cursor-pointer hover:shadow-md transition-all duration-300 opacity-80 hover:opacity-100 backdrop-blur-sm",
                                    (notification.metadata as any)?.isSupervisorLeave && "border-l-4 border-l-blue-500"
                                  )}
                                  onClick={() => handleViewDetails(notification)}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-muted">{getTypeIcon(notification.type, true)}</div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-sm">{notification.title}</h4>
                                            <div className="flex items-center gap-1 text-xs text-green-600 ml-auto"><CheckCheck className="h-3 w-3" /> Read</div>
                                            <Badge variant="outline" className="text-xs capitalize ml-2">{notification.type}</Badge>
                                          </div>
                                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                                          {(notification.type === 'task' || notification.type === 'leave') && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                                              className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                              <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(notification.timestamp)}</div>
                                              {(notification.metadata as any)?.siteName && (
                                                <div className="flex items-center gap-1"><Building className="h-3 w-3" /> {(notification.metadata as any).siteName}</div>
                                              )}
                                            </motion.div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <motion.div whileHover={{ scale: 1.1 }} className="flex gap-1">
                                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleViewDetails(notification); }} title="View details" className="h-8 w-8 p-0">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }} title="Delete" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </motion.div>
                                  </div>
                                </motion.div>
                              ))}
                            </motion.div>
                          </motion.div>
                        )}
                        {!showReadNotifications && filteredNotifications.filter(n => n.isRead).length > 0 && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4 border-t">
                            <Button variant="ghost" size="sm" onClick={() => setShowReadNotifications(true)} className="text-xs">
                              <Eye className="h-3 w-3 mr-2" /> Show {filteredNotifications.filter(n => n.isRead).length} read notifications
                            </Button>
                          </motion.div>
                        )}
                        {filteredNotifications.filter(n => !n.isRead).length === 0 && filteredNotifications.filter(n => n.isRead).length > 0 && showReadNotifications && (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 border-t">
                            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                              className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-3 shadow-lg">
                              <CheckCircle2 className="h-6 w-6 text-white" />
                            </motion.div>
                            <h3 className="font-semibold mb-1">All caught up! 🎉</h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">You've read all your notifications. New notifications will appear above.</p>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* TASKS TAB – placeholder */}
          <TabsContent value="tasks">
            <Card className="border-blue-500/20 shadow-lg overflow-hidden">
              <CardHeader>
                <CardTitle>Your Tasks</CardTitle>
                <CardDescription>All task notifications are shown in the Notifications tab.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">Please use the Notifications tab to view all task updates.</div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LEAVES TAB – placeholder */}
          <TabsContent value="leaves">
            <Card className="border-amber-500/20 shadow-lg overflow-hidden">
              <CardHeader>
                <CardTitle>Leave Notifications</CardTitle>
                <CardDescription>All leave updates are shown in the Notifications tab.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">Please use the Notifications tab to view all leave updates.</div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* APPROVALS TAB – placeholder */}
          <TabsContent value="approvals">
            <Card className="border-green-500/20 shadow-lg overflow-hidden">
              <CardHeader>
                <CardTitle>Leave Approvals</CardTitle>
                <CardDescription>Approval statuses are shown in the Notifications tab.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">Please use the Notifications tab to view approval updates.</div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* DETAIL DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border-primary/30 shadow-2xl">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {viewNotification && getTypeIcon(viewNotification.type)} Notification Details
              </DialogTitle>
            </DialogHeader>
            {viewNotification && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-4">
                <div className="flex items-center gap-2">
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
                    className={cn("p-2 rounded-lg", viewNotification.isRead ? "bg-muted" : "bg-primary/10")}>
                    {getTypeIcon(viewNotification.type)}
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-semibold">{viewNotification.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">{viewNotification.type}</Badge>
                      {!viewNotification.isRead && <Badge variant="secondary" className="text-xs">New</Badge>}
                      {(viewNotification.metadata as any)?.priority && <div className={`w-2 h-2 rounded-full ${getPriorityColor((viewNotification.metadata as any).priority)}`} />}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Message</h4>
                  <div className="p-3 border rounded-md bg-muted/50"><p className="text-sm">{viewNotification.message}</p></div>
                </div>
                {viewNotification.type === 'task' && viewNotification.metadata && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Task Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {(viewNotification.metadata as any).taskTitle && <div className="col-span-2"><p className="text-xs text-muted-foreground mb-1">Title</p><p className="font-medium">{(viewNotification.metadata as any).taskTitle}</p></div>}
                      {(viewNotification.metadata as any).siteName && <div><p className="text-xs text-muted-foreground mb-1">Site</p><p className="font-medium">{(viewNotification.metadata as any).siteName}</p></div>}
                      {(viewNotification.metadata as any).assignedToName && <div><p className="text-xs text-muted-foreground mb-1">Assignee</p><p className="font-medium">{(viewNotification.metadata as any).assignedToName}</p></div>}
                      {(viewNotification.metadata as any).priority && <div><p className="text-xs text-muted-foreground mb-1">Priority</p><Badge variant={getPriorityBadge((viewNotification.metadata as any).priority)} className="capitalize">{(viewNotification.metadata as any).priority}</Badge></div>}
                      {(viewNotification.metadata as any).status && <div><p className="text-xs text-muted-foreground mb-1">Status</p><Badge variant={getStatusBadge((viewNotification.metadata as any).status)} className="capitalize">{(viewNotification.metadata as any).status.replace('-', ' ')}</Badge></div>}
                      {(viewNotification.metadata as any).deadline && <div><p className="text-xs text-muted-foreground mb-1">Deadline</p><p className="font-medium">{formatDate((viewNotification.metadata as any).deadline)}</p></div>}
                    </div>
                  </div>
                )}
                {viewNotification.type === 'leave' && viewNotification.metadata && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Leave Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {(viewNotification.metadata as any).employeeName && <div><p className="text-xs text-muted-foreground mb-1">Employee</p><p className="font-medium">{(viewNotification.metadata as any).employeeName}</p></div>}
                      {(viewNotification.metadata as any).leaveType && <div><p className="text-xs text-muted-foreground mb-1">Type</p><Badge variant="outline" className="capitalize">{(viewNotification.metadata as any).leaveType}</Badge></div>}
                      {(viewNotification.metadata as any).status && <div><p className="text-xs text-muted-foreground mb-1">Status</p><Badge variant={(viewNotification.metadata as any).status === 'approved' ? 'default' : (viewNotification.metadata as any).status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">{(viewNotification.metadata as any).status}</Badge></div>}
                      {(viewNotification.metadata as any).fromDate && (viewNotification.metadata as any).toDate && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Period</p>
                          <div className="flex items-center gap-4">
                            <span>{formatDate((viewNotification.metadata as any).fromDate)}</span> <ArrowRight className="h-4 w-4" /> <span>{formatDate((viewNotification.metadata as any).toDate)}</span>
                            {(viewNotification.metadata as any).totalDays && <Badge variant="secondary">{(viewNotification.metadata as any).totalDays} days</Badge>}
                          </div>
                        </div>
                      )}
                      {(viewNotification.metadata as any).reason && <div className="col-span-2"><p className="text-xs text-muted-foreground mb-1">Reason</p><div className="p-2 border rounded-md bg-muted/30"><p className="text-sm">{(viewNotification.metadata as any).reason}</p></div></div>}
                    </div>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-muted-foreground mb-1">Time</p><div className="flex items-center gap-1"><Clock className="h-3 w-3" /><span className="font-medium">{formatTime(viewNotification.timestamp)}</span></div></div>
                  {(viewNotification.metadata as any)?.createdAt && <div><p className="text-xs text-muted-foreground mb-1">Created</p><p className="font-medium text-sm">{formatDateTime((viewNotification.metadata as any).createdAt)}</p></div>}
                </div>
                <div className="flex gap-2 pt-4">
                  {!viewNotification.isRead ? (
                    <Button variant="outline" onClick={() => { handleMarkAsRead(viewNotification.id); setDialogOpen(false); }} className="flex-1">
                      <CheckCheck className="mr-2 h-4 w-4" /> Mark as Read
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Close</Button>
                  )}
                  <Button variant="destructive" onClick={() => { handleDelete(viewNotification.id); setDialogOpen(false); }} className="flex-1">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupervisorNotification;
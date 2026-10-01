// src/pages/superadmin/Notifications.tsx  (replaces app/superadmin/notifications/page.tsx)
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Bell,
  BellOff,
  Building,
  Calendar,
  CheckCheck,
  CheckCircle,
  Clock,
  Cpu,
  Eye,
  Filter,
  FilterX,
  Globe,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Target,
  Trash2,
  X,
} from "lucide-react";

import { useOutletContext } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/context/NotificationContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type Meta = Record<string, any>;
const metaOf = (n: { metadata?: unknown }): Meta => (n.metadata ?? {}) as Meta;

/** Turns notificationType / type into one of a few filterable groups. */
const getCategory = (n: { type: string; metadata?: unknown }): string => {
  const nt: string = metaOf(n).notificationType || "";
  if (nt.startsWith("site_")) return "site";
  if (nt.startsWith("task_")) return "task";
  if (nt.startsWith("leave_")) return "leave";
  if (nt.startsWith("inventory_")) return "inventory";
  if (nt.startsWith("machine_")) return "machine";
  if (nt.startsWith("incident")) return "incident";
  if (nt.startsWith("geofence")) return "geofence";
  return n.type || "system";
};

const CATEGORY_LABELS: Record<string, string> = {
  site: "Sites",
  task: "Tasks",
  leave: "Leave",
  inventory: "Inventory",
  machine: "Machines",
  incident: "Incidents",
  geofence: "Geofence",
  system: "System",
  approval: "Approvals",
  info: "General",
  success: "General",
  warning: "General",
};

const categoryIcon = (category: string, className = "h-5 w-5") => {
  switch (category) {
    case "site": return <Building className={className} />;
    case "task": return <Target className={className} />;
    case "leave": return <Calendar className={className} />;
    case "inventory": return <Package className={className} />;
    case "machine": return <Cpu className={className} />;
    case "incident":
    case "geofence": return <ShieldAlert className={className} />;
    case "approval": return <CheckCircle className={className} />;
    default: return <Bell className={className} />;
  }
};

const priorityDot = (priority?: string) =>
  priority === "high" || priority === "urgent"
    ? "bg-red-500"
    : priority === "low"
      ? "bg-green-500"
      : "bg-yellow-500";

const formatAgo = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Recently";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatFull = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "N/A"
    : d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
};

const humanize = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

/** Metadata keys we never show as a row in the detail dialog. */
const HIDDEN_META_KEYS = new Set([
  "notificationType", "persistent", "requiresCompletion", "soundInterval",
  "sound", "createdAt", "updatedAt", "__v",
]);

const looksLikeId = (key: string, value: unknown) =>
  /(^|_)id$/i.test(key) || /Id$/.test(key) || (typeof value === "string" && /^[a-f0-9]{24}$/i.test(value));

const formatMetaValue = (key: string, value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "object") return null; // skip nested objects/arrays
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /date|deadline/i.test(key)) {
    const d = new Date(value);
    if (!isNaN(d.getTime()))
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  return String(value);
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const Notifications = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    refresh,
  } = useNotifications();

  const [searchParams, setSearchParams] = useSearchParams();

  // UI state
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();

  // Always read the open notification from the live list so it never goes stale
  const viewNotification = useMemo(
    () => notifications.find((n) => n.id === viewId) ?? null,
    [notifications, viewId]
  );

  // ----- Open detail dialog when arriving from the bell: /notifications?id=... -----
  useEffect(() => {
    const id = searchParams.get("id");
    if (!id || viewId === id) return;
    const found = notifications.find((n) => n.id === id);
    if (found) {
      setViewId(found.id);
      if (!found.isRead) markAsRead(found.id);
    }
    // If not found yet, this re-runs when the context finishes polling.
  }, [searchParams, notifications, viewId, markAsRead]);

  const closeDialog = () => {
    setViewId(null);
    if (searchParams.get("id")) setSearchParams({}, { replace: true });
  };

  // ----- Derived data -----
  const sites = useMemo(() => {
    const set = new Set<string>();
    notifications.forEach((n) => {
      const s = metaOf(n).siteName;
      if (typeof s === "string" && s) set.add(s);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [notifications]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    notifications.forEach((n) => {
      const c = getCategory(n);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    });
    return Array.from(counts.entries());
  }, [notifications]);

  const readCount = notifications.length - unreadCount;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((n) => {
      if (readFilter === "unread" && n.isRead) return false;
      if (readFilter === "read" && !n.isRead) return false;
      if (categoryFilter !== "all" && getCategory(n) !== categoryFilter) return false;
      if (siteFilter !== "all" && metaOf(n).siteName !== siteFilter) return false;
      if (q) {
        const m = metaOf(n);
        const haystack = [
          n.title, n.message, m.siteName, m.employeeName,
          m.assignedToName, m.clientName, m.itemName, m.machineName,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [notifications, readFilter, categoryFilter, siteFilter, search]);

  const hasActiveFilters =
    readFilter !== "all" || categoryFilter !== "all" || siteFilter !== "all" || !!search;

  const clearFilters = () => {
    setReadFilter("all");
    setCategoryFilter("all");
    setSiteFilter("all");
    setSearch("");
  };

  // ----- Handlers -----
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    // refresh() resets the context caches; the next poll (≤15s) repopulates the list
    setTimeout(() => setIsRefreshing(false), 600);
    toast.success("Refreshing notifications");
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (!confirm(`Delete all ${notifications.length} notifications? This can't be undone.`)) return;
    await clearAll();
  };

  const openDetails = (id: string, isRead: boolean) => {
    setViewId(id);
    if (!isRead) markAsRead(id);
  };

  // ----- Detail dialog content -----
  const detailRows = useMemo(() => {
    if (!viewNotification) return [];
    return Object.entries(metaOf(viewNotification))
      .filter(([k, v]) => !HIDDEN_META_KEYS.has(k) && !looksLikeId(k, v))
      .map(([k, v]) => ({ label: humanize(k), value: formatMetaValue(k, v) }))
      .filter((r): r is { label: string; value: string } => r.value !== null);
  }, [viewNotification]);

  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <DashboardHeader
        title="Notifications"
        onMenuClick={onMenuClick}
      />

      <div className="p-3 md:p-6 space-y-4">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border bg-background/80 px-4 py-2">
              <Bell className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">{unreadCount} Unread</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => { markAllAsRead(); toast.success("All notifications marked as read"); }}
              disabled={unreadCount === 0}
              className="gap-2"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              disabled={notifications.length === 0}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <Tabs value={readFilter} onValueChange={(v) => setReadFilter(v as typeof readFilter)}>
            <TabsList className="grid grid-cols-3 w-full lg:w-[380px]">
              <TabsTrigger value="all" className="gap-2">
                All <Badge variant="outline" className="px-1.5 py-0 text-xs">{notifications.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="unread" className="gap-2">
                Unread <Badge className="px-1.5 py-0 text-xs">{unreadCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="read" className="gap-2">
                Read <Badge variant="outline" className="px-1.5 py-0 text-xs">{readCount}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications"
                className="pl-9 pr-8 w-[220px]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {categories.map(([c, count]) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c] ?? humanize(c)} ({count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-[170px]">
                <div className="flex items-center gap-2">
                  {siteFilter === "all" ? <Globe className="h-4 w-4" /> : <Building className="h-4 w-4" />}
                  <span className="truncate">{siteFilter === "all" ? "All sites" : siteFilter}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sites</SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                <FilterX className="h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <Card className="border-dashed border-2 text-center py-12">
            <CardContent className="space-y-3">
              <BellOff className="h-14 w-14 mx-auto text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold">
                {notifications.length === 0
                  ? "No notifications yet"
                  : "No notifications match your filters"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {notifications.length === 0
                  ? "New tasks, leave updates, incidents and alerts will show up here. The list checks for updates every 15 seconds."
                  : "Try a different search, or clear the filters to see everything."}
              </p>
              {hasActiveFilters && notifications.length > 0 && (
                <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {notifications.length}
            </p>
            <AnimatePresence initial={false}>
              {filtered.map((n) => {
                const m = metaOf(n);
                const category = getCategory(n);
                return (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Card
                      onClick={() => openDetails(n.id, n.isRead)}
                      className={cn(
                        "cursor-pointer transition-shadow hover:shadow-md",
                        !n.isRead && "border-l-4 border-l-primary bg-primary/5",
                        n.isRead && "opacity-80 hover:opacity-100"
                      )}
                    >
                      <CardContent className="p-3 md:p-4 flex items-start gap-3">
                        <div className={cn(
                          "mt-0.5 rounded-lg p-2 shrink-0",
                          n.isRead ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                        )}>
                          {categoryIcon(category)}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-sm md:text-base">{n.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {CATEGORY_LABELS[category] ?? humanize(category)}
                            </Badge>
                            {!n.isRead && <Badge className="text-xs">New</Badge>}
                            <span
                              className={cn("h-2.5 w-2.5 rounded-full", priorityDot(m.priority))}
                              title={`${m.priority ?? "medium"} priority`}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {formatAgo(n.timestamp)}
                            </span>
                            {m.siteName && (
                              <span className="flex items-center gap-1">
                                <Building className="h-3 w-3" /> {m.siteName}
                              </span>
                            )}
                            {(m.employeeName || m.assignedToName) && (
                              <span>{m.employeeName || m.assignedToName}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            title="View details"
                            onClick={(e) => { e.stopPropagation(); openDetails(n.id, n.isRead); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!n.isRead && (
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-primary"
                              title="Mark as read"
                              onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                            >
                              <CheckCheck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Delete"
                            onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" /> High</span>
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Medium</span>
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500" /> Low</span>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!viewNotification} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notification details</DialogTitle>
          </DialogHeader>

          {viewNotification && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  {categoryIcon(getCategory(viewNotification))}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{viewNotification.title}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[getCategory(viewNotification)] ?? humanize(getCategory(viewNotification))}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className={cn("h-2 w-2 rounded-full", priorityDot(metaOf(viewNotification).priority))} />
                      {metaOf(viewNotification).priority ?? "medium"} priority
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Message</h4>
                <div className="rounded-md border bg-muted/50 p-3 text-sm">{viewNotification.message}</div>
              </div>

              {detailRows.length > 0 && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {detailRows.map((row) => (
                      <div key={row.label}>
                        <p className="text-xs text-muted-foreground">{row.label}</p>
                        <p className="text-sm font-medium break-words">{row.value}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <Separator />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                Received {formatFull(viewNotification.timestamp)}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={closeDialog}>Close</Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={() => { removeNotification(viewNotification.id); closeDialog(); }}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Notifications;
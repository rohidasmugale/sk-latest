import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Calendar, Download, Loader2, RefreshCw, ChevronLeft, ChevronRight, Search, Users, CalendarDays, CalendarRange, CalendarCheck
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, startOfWeek, addDays, subDays, addWeeks, subWeeks } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { siteService, Site } from "@/services/SiteService";
import axios from "axios";
import { rosterService } from "@/services/rosterService";
import * as XLSX from "xlsx";

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5001/api" : "https://sk-backend-btbj.onrender.com/api");

// ============================================================
// TYPES
// ============================================================
interface RosterEntry {
  _id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  siteId: string;
  siteClient: string;
  department: string;
  designation: string;
  remark: string;
  createdBy?: string;
  updatedAt?: string;
}

// NOTE: "type" on a roster entry is a fixed backend-required tag, NOT tied to which
// tab (daily/weekly/monthly...) happened to be open when the entry was created.
// The tabs below are just different ways of *viewing* the same flat set of entries —
// keeping "type" constant is what makes that safe (see ROSTER_ENTRY_TYPE below).
const ROSTER_ENTRY_TYPE = "roster";

const STATUS_OPTIONS = [
  { code: "", label: "Working", short: "", swatch: "bg-green-50 border", cell: "bg-green-50 text-green-700 hover:bg-green-100" },
  { code: "WO", label: "Week Off", short: "WO", swatch: "bg-red-100 border", cell: "bg-red-100 text-red-700" },
  { code: "AB", label: "Absent", short: "AB", swatch: "bg-gray-300 border", cell: "bg-gray-200 text-gray-800" },
] as const;

const statusMeta = (code: string) => STATUS_OPTIONS.find(s => s.code === code) || STATUS_OPTIONS[0];

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  department: string;
  position: string;
  designation?: string;
  status: "active" | "inactive" | "left";
  siteName?: string;
  assignedSites?: string[];
  assignedWeekOff?: string;
}

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const normalize = (s?: string) => (s || "").trim().toLowerCase();

// ============================================================
// MAIN COMPONENT
// ============================================================
const RosterSection = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  // VIEW TYPE & DATE STATES — these only control what date range is fetched/shown,
  // they never change how an entry is written or tagged.
  const [viewType, setViewType] = useState<"daily" | "weekly" | "fortnightly" | "monthly">("monthly");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [searchTerm, setSearchTerm] = useState("");
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // Calculate days based on view
  const daysInView = useMemo(() => {
    if (viewType === "daily") return [selectedDate];
    if (viewType === "weekly") {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    }
    if (viewType === "fortnightly") {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 13) });
    }
    return eachDayOfInterval({ start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) });
  }, [selectedDate, viewType]);

  const selectedSite = useMemo(() => sites.find(s => s._id === selectedSiteId) || null, [sites, selectedSiteId]);

  // Load Sites
  useEffect(() => {
    (async () => {
      try {
        setLoadingSites(true);
        const data = await siteService.getAllSites();
        const unique = Array.from(new Map(data.map(s => [s._id, s])).values());
        setSites(unique);
        if (unique.length > 0) setSelectedSiteId(unique[0]._id);
      } catch (err) { console.error(err); toast.error("Failed to load sites"); } finally { setLoadingSites(false); }
    })();
  }, []);

  // Load Employees
  useEffect(() => {
    if (!selectedSite) { setEmployees([]); return; }
    (async () => {
      try {
        setLoadingEmployees(true);
        const response = await axios.get(`${API_URL}/employees`, { params: { limit: 10000 } });
        if (!response.data.success) throw new Error(response.data.message || "Failed to fetch employees");
        const all: Employee[] = response.data.data || [];
        const forSite = all.filter(emp => emp.status === "active" && (normalize(emp.siteName) === normalize(selectedSite.name) || emp.assignedSites?.some(id => String(id) === String(selectedSite._id))));
        setEmployees(forSite);
      } catch (err) { console.error(err); toast.error("Failed to load employees for this site"); } finally { setLoadingEmployees(false); }
    })();
  }, [selectedSite]);

  // Fetch Roster — always the full flat set for the site + visible date range,
  // regardless of which tab is active. This is what keeps the tabs "just a view."
  const fetchRoster = async () => {
    if (!selectedSite || daysInView.length === 0) return;
    try {
      setLoadingRoster(true);
      const start = daysInView[0];
      const end = daysInView[daysInView.length - 1];
      const response = await rosterService.getRosterEntries({ startDate: format(start, "yyyy-MM-dd"), endDate: format(end, "yyyy-MM-dd") });
      if (!response.success) throw new Error(response.message || "Failed to fetch roster");
      const forSite = (response.roster || []).filter((e: RosterEntry) => e.siteId === selectedSite._id);
      setRoster(forSite);
    } catch (err) { console.error(err); toast.error("Failed to load roster entries"); } finally { setLoadingRoster(false); }
  };

  useEffect(() => {
    fetchRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSite, selectedDate, viewType]);

  // Date Navigation
  const navigateDate = (direction: "prev" | "next") => {
    if (viewType === "daily") setSelectedDate(prev => direction === "next" ? addDays(prev, 1) : subDays(prev, 1));
    else if (viewType === "weekly") setSelectedDate(prev => direction === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1));
    else if (viewType === "fortnightly") setSelectedDate(prev => direction === "next" ? addWeeks(prev, 2) : subWeeks(prev, 2));
    else setSelectedDate(prev => direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  // Handle Assigned Week Off
  const handleAssignedWeekOffChange = async (employee: Employee, day: string) => {
    const previous = employee.assignedWeekOff;
    setEmployees(prev => prev.map(e => (e._id === employee._id ? { ...e, assignedWeekOff: day } : e)));
    try {
      const res = await axios.patch(`${API_URL}/employees/${employee._id}`, { assignedWeekOff: day });
      if (!res.data.success) throw new Error(res.data.message || "Failed to save");
      toast.success(`${employee.name}'s week off set to ${day || "none"}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save assigned week off — check your /employees update endpoint");
      setEmployees(prev => prev.map(e => (e._id === employee._id ? { ...e, assignedWeekOff: previous } : e)));
    }
  };

  const isAutoWeekOff = (employee: Employee, date: Date) => !!employee.assignedWeekOff && format(date, "EEEE") === employee.assignedWeekOff;
  const defaultStatus = (employee: Employee, date: Date) => (isAutoWeekOff(employee, date) ? "WO" : "");
  const getEffectiveStatus = (employee: Employee, date: Date, dateStr: string): string => {
    const entry = roster.find(e => e.employeeId === employee._id && e.date === dateStr);
    if (entry) return entry.remark;
    return defaultStatus(employee, date);
  };

  const handleSetStatus = async (employee: Employee, date: Date, dateStr: string, code: string) => {
    if (!selectedSite) return;
    const cellKey = `${employee._id}-${dateStr}`;
    const entry = roster.find(e => e.employeeId === employee._id && e.date === dateStr);
    const isDefault = code === defaultStatus(employee, date);

    setSavingCell(cellKey);
    try {
      if (isDefault) {
        if (entry) {
          const res = await rosterService.deleteRosterEntry(entry._id);
          if (!res.success) throw new Error(res.message || "Failed to update");
          setRoster(prev => prev.filter(e => e._id !== entry._id));
        }
      } else if (entry) {
        const res = await rosterService.updateRosterEntry(entry._id, { remark: code });
        if (!res.success) throw new Error(res.message || "Failed to update");
        setRoster(prev => prev.map(e => (e._id === entry._id ? { ...e, remark: code } : e)));
      } else {
        const res = await rosterService.createRosterEntry(buildEntry(employee, dateStr, code));
        if (!res.success) throw new Error(res.message || "Failed to update");
        setRoster(prev => [...prev, res.roster]);
      }
    } catch (err: any) { console.error(err); toast.error(err.message || "Failed to update status"); } finally { setSavingCell(null); }
  };

  const buildEntry = (employee: Employee, dateStr: string, remark: string) => ({
    date: dateStr, employeeName: employee.name, employeeId: employee._id,
    department: employee.department || employee.position || "General",
    designation: employee.designation || employee.position || "Staff",
    shift: "", shiftTiming: "", assignedTask: "", assignedTaskId: "", hours: 0,
    remark,
    type: ROSTER_ENTRY_TYPE, // fixed — not tied to whichever view tab is open
    siteClient: selectedSite!.name, siteId: selectedSite!._id, supervisors: [], managers: [],
  });

  // Export
  const handleExport = () => {
    if (!selectedSite) { toast.error("Select a site first"); return; }
    if (employees.length === 0) { toast.error("No employees to export"); return; }

    const header = ["Emp ID", "Employee Name", "Assigned Week Off", ...daysInView.map(d => format(d, "d-MMM")), "Total Working"];
    const rows = employees.map((emp, idx) => {
      let working = 0;
      const cells = daysInView.map(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        const code = getEffectiveStatus(emp, day, dateStr);
        if (!code) working++;
        return code;
      });
      return [idx + 1, emp.name, emp.assignedWeekOff || "—", ...cells, working];
    });

    const titleRow = [`${selectedSite.name} — ${viewType.toUpperCase()} Roster`];
    const worksheet = XLSX.utils.aoa_to_sheet([titleRow, [], header, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Roster");
    XLSX.writeFile(workbook, `Roster_${selectedSite.name}_${viewType}_${format(selectedDate, "MMM_yyyy")}.xlsx`);
    toast.success("Roster exported successfully!");
  };

  const filteredEmployees = employees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { WO: 0, AB: 0 };
    for (const emp of employees) {
      for (const day of daysInView) {
        const code = getEffectiveStatus(emp, day, format(day, "yyyy-MM-dd"));
        if (code && code in counts) counts[code]++;
      }
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, roster, daysInView]);

  const isLoading = loadingSites || loadingEmployees || loadingRoster;
  const viewLabel = viewType === "daily" ? "Daily" : viewType === "weekly" ? "Weekly" : viewType === "fortnightly" ? "Fortnightly" : "Monthly";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2"><Calendar className="h-5 w-5 md:h-6 md:w-6" /><CardTitle className="text-lg md:text-xl">Roster Management</CardTitle></div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchRoster} disabled={isLoading}><RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh</Button>
              <Button onClick={handleExport} disabled={isLoading}><Download className="mr-2 h-4 w-4" /> Export</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6 space-y-6">

          {/* Daily / Weekly / Fortnightly / Monthly — VIEW FILTERS ONLY, same underlying data */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: "daily", label: "Daily", icon: Calendar },
              { value: "weekly", label: "Weekly", icon: CalendarDays },
              { value: "fortnightly", label: "Fortnightly", icon: CalendarRange },
              { value: "monthly", label: "Monthly", icon: CalendarCheck }
            ].map((type) => {
              const IconComponent = type.icon;
              return (
                <Button key={type.value} variant={viewType === type.value ? "default" : "outline"}
                  onClick={() => setViewType(type.value as any)}
                  className="flex items-center gap-2">
                  <IconComponent className="h-4 w-4" /><span>{type.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Controls: Site & Date */}
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="w-full md:w-64">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Site / Client</label>
              {loadingSites ? (
                <div className="flex items-center gap-2 h-10"><Loader2 className="h-4 w-4 animate-spin" /> Loading sites...</div>
              ) : (
                <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select a site" /></SelectTrigger>
                  <SelectContent>{sites.map(site => (<SelectItem key={site._id} value={site._id}>{site.name}</SelectItem>))}</SelectContent>
                </Select>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{viewLabel} Range</label>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => navigateDate("prev")}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="w-40 text-center font-medium text-sm border rounded-md h-10 flex items-center justify-center">
                  {viewType === "daily" ? format(selectedDate, "dd MMM yyyy") :
                    viewType === "weekly" ? `Week of ${format(daysInView[0], "dd MMM")}` :
                      viewType === "fortnightly" ? `Fortnight of ${format(daysInView[0], "dd MMM")}` :
                        format(selectedDate, "MMMM yyyy")}
                </div>
                <Button variant="outline" size="icon" onClick={() => navigateDate("next")}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="flex-1 md:max-w-xs">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Search Employee</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10" />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Employees</p><p className="text-xl font-bold">{employees.length}</p></div><Users className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
            <Card className="col-span-2"><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-2">Status Breakdown</p><div className="flex flex-wrap gap-2">{STATUS_OPTIONS.filter(s => s.code).map(s => (<Badge key={s.code} variant="outline" className={cn("gap-1", s.cell)}>{s.label}: {statusCounts[s.code] ?? 0}</Badge>))}</div></CardContent></Card>
            <Card className="hidden md:block"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Days in View</p><p className="text-xl font-bold">{daysInView.length}</p></CardContent></Card>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {STATUS_OPTIONS.map(s => (<div key={s.code || "working"} className="flex items-center gap-1.5"><span className={cn("h-3 w-3 rounded-sm", s.swatch)} /> {s.label}</div>))}
            <span>Click any box to choose a status</span>
          </div>

          {/* Grid */}
          {!selectedSite ? (
            <div className="text-center py-12 text-muted-foreground"><Calendar className="h-10 w-10 mx-auto mb-3" />Select a site to view its roster.</div>
          ) : loadingEmployees || loadingRoster ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" /><p className="text-sm text-muted-foreground">Loading roster...</p></div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No active employees found for {selectedSite.name}.</div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">Employee ({filteredEmployees.length})</TableHead>
                    <TableHead className="min-w-[140px]">Assigned Week Off</TableHead>
                    {daysInView.map((day, idx) => (
                      <TableHead key={idx} className={cn("text-center min-w-[36px] text-xs px-1", isWeekend(day) && "bg-muted/40")}>
                        <div>{format(day, "d")}</div>
                        <div className="text-[10px] text-muted-foreground">{format(day, "EEEEE")}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[70px]">Working</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => {
                    const workingCount = daysInView.filter((day) => !getEffectiveStatus(emp, day, format(day, "yyyy-MM-dd"))).length;
                    return (
                      <TableRow key={emp._id}>
                        <TableCell className="sticky left-0 bg-background z-10">
                          <div className="font-medium text-sm">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">{emp.employeeId}</div>
                        </TableCell>
                        <TableCell>
                          <Select value={emp.assignedWeekOff || "none"} onValueChange={(val) => handleAssignedWeekOffChange(emp, val === "none" ? "" : val)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {WEEK_DAYS.map(day => (<SelectItem key={day} value={day}>{day}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {daysInView.map((day, idx) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const code = getEffectiveStatus(emp, day, dateStr);
                          const meta = statusMeta(code);
                          const entry = roster.find(e => e.employeeId === emp._id && e.date === dateStr);
                          const cellKey = `${emp._id}-${dateStr}`;
                          const isSaving = savingCell === cellKey;
                          return (
                            <TableCell key={idx} className="text-center p-0 h-9 w-9">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button type="button" disabled={isSaving} className={cn("w-full h-full flex items-center justify-center text-[10px] font-semibold transition-colors", meta.cell, isSaving && "opacity-50")}>
                                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : meta.short}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-44 p-2" align="center">
                                  <div className="space-y-0.5">
                                    {STATUS_OPTIONS.map(opt => (
                                      <button key={opt.code || "working"} type="button" onClick={() => handleSetStatus(emp, day, dateStr, opt.code)} className={cn("w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 hover:bg-muted", opt.code === code && "bg-muted font-medium")}>
                                        <span className={cn("h-2.5 w-2.5 rounded-sm", opt.swatch)} /> {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                  {entry && (entry.createdBy || entry.updatedAt) && (
                                    <div className="text-[10px] text-muted-foreground border-t mt-2 pt-2 space-y-0.5">
                                      {entry.createdBy && <div>Set by {entry.createdBy}</div>}
                                      {entry.updatedAt && <div>{format(new Date(entry.updatedAt), "dd MMM, hh:mm a")}</div>}
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center"><Badge variant="outline">{workingCount}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RosterSection;
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Calendar, Download, Loader2, RefreshCw, ChevronLeft, ChevronRight, Search, Menu,
  CalendarDays, CalendarRange, CalendarCheck
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, addDays, subDays } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { siteService, Site } from "@/services/SiteService";
import assignTaskService, { AssignTask } from "@/services/assignTaskService";
import { rosterService } from "@/services/rosterService";
import { useRole } from "@/context/RoleContext";
import axios from "axios";
import { useOutletContext } from 'react-router-dom';
import * as XLSX from "xlsx";

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

interface RosterEntry {
  _id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  remark: string;
  type: string;
  siteClient: string;
  siteId?: string;
  createdBy?: string;
  updatedAt?: string;
}

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
  status: "active" | "inactive" | "left";
  siteName?: string;
  assignedSites?: string[];
  assignedWeekOff?: string;
}

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const normalize = (s?: string) => (s || "").trim().toLowerCase();

const SupervisorRosterSection = () => {
  const { user: authUser, isAuthenticated } = useRole();
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  
  const [selectedRoster, setSelectedRoster] = useState<"daily" | "weekly" | "fortnightly" | "monthly">("monthly");
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  
  const [supervisorAssignedSites, setSupervisorAssignedSites] = useState<string[]>([]);
  const [supervisorAssignedSiteNames, setSupervisorAssignedSiteNames] = useState<string[]>([]);

  const supervisorId = authUser?._id || authUser?.id || "";
  
  const daysInView = (() => {
    if (selectedRoster === "daily") return [selectedDate];
    if (selectedRoster === "weekly") {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    }
    if (selectedRoster === "fortnightly") {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 13) });
    }
    return eachDayOfInterval({ start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) });
  })();

  const selectedSite = sites.find(s => s._id === selectedSiteId) || null;

  const fetchSupervisorAssignedSites = useCallback(async () => {
    if (!supervisorId) return;
    try {
      const allTasks = await assignTaskService.getAllAssignTasks();
      const assignedSitesSet = new Set<string>();
      const assignedSiteNamesSet = new Set<string>();
      allTasks.forEach((task: AssignTask) => {
        const isSupervisorAssigned = task.assignedSupervisors?.some(sup => sup.userId === supervisorId);
        if (isSupervisorAssigned && task.siteId) {
          assignedSitesSet.add(task.siteId);
          if (task.siteName) assignedSiteNamesSet.add(task.siteName);
        }
      });
      setSupervisorAssignedSites(Array.from(assignedSitesSet));
      setSupervisorAssignedSiteNames(Array.from(assignedSiteNamesSet));
    } catch (error) {
      console.error("Error fetching supervisor assigned sites:", error);
      toast.error("Failed to load your assigned sites");
    }
  }, [supervisorId]);

  useEffect(() => {
    if (supervisorId && isAuthenticated) fetchSupervisorAssignedSites();
  }, [supervisorId, isAuthenticated, fetchSupervisorAssignedSites]);

  useEffect(() => {
    if (!supervisorId) return;
    (async () => {
      try {
        setLoadingSites(true);
        const data = await siteService.getAllSites();
        const filtered = data.filter(site => supervisorAssignedSites.includes(site._id));
        setSites(filtered);
        if (filtered.length > 0) setSelectedSiteId(filtered[0]._id);
      } catch (err) { console.error(err); toast.error("Failed to load sites"); } 
      finally { setLoadingSites(false); }
    })();
  }, [supervisorId, supervisorAssignedSites]);

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
      } catch (err) { console.error(err); toast.error("Failed to load employees"); } 
      finally { setLoadingEmployees(false); }
    })();
  }, [selectedSite]);

  const fetchRosterEntries = useCallback(async () => {
    if (!selectedSite || daysInView.length === 0) return;
    try {
      setLoadingRoster(true);
      const response = await rosterService.getRosterEntries({
        startDate: format(daysInView[0], "yyyy-MM-dd"),
        endDate: format(daysInView[daysInView.length - 1], "yyyy-MM-dd"),
      });
      if (response.success) {
        const filtered = (response.roster || []).filter((e: RosterEntry) => e.siteId === selectedSite._id);
        setRoster(filtered);
      } else throw new Error(response.message);
    } catch (err: any) { console.error(err); toast.error(err.message || "Failed to load roster"); } 
    finally { setLoadingRoster(false); }
  }, [selectedSite, daysInView]);

  useEffect(() => { fetchRosterEntries(); }, [selectedSite, selectedRoster, selectedDate, fetchRosterEntries]);

  const handleAssignedWeekOffChange = async (employee: Employee, day: string) => {
    const previous = employee.assignedWeekOff;
    setEmployees(prev => prev.map(e => (e._id === employee._id ? { ...e, assignedWeekOff: day } : e)));
    try {
      const res = await axios.patch(`${API_URL}/employees/${employee._id}`, { assignedWeekOff: day });
      if (!res.data.success) throw new Error(res.data.message || "Failed to save");
      toast.success(`${employee.name}'s week off set to ${day || "none"}`);
    } catch (err: any) {
      console.error(err); toast.error("Failed to save assigned week off");
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
        const res = await rosterService.createRosterEntry({
          date: dateStr, employeeName: employee.name, employeeId: employee._id,
          department: employee.department || employee.position || "General",
          designation: employee.designation || employee.position || "Staff",
          shift: "", shiftTiming: "", assignedTask: "", assignedTaskId: "", hours: 0,
          remark: code, type: selectedRoster,
          siteClient: selectedSite.name, siteId: selectedSite._id, supervisors: [], managers: [], createdBy: supervisorId
        });
        if (!res.success) throw new Error(res.message || "Failed to update");
        setRoster(prev => [...prev, res.roster]);
      }
    } catch (err: any) { console.error(err); toast.error(err.message || "Failed to update status"); } finally { setSavingCell(null); }
  };

  const handleExportReport = () => {
    if (!selectedSite) { toast.error("Select a site first"); return; }
    if (employees.length === 0) { toast.error("No employees to export"); return; }

    const header = ["Emp ID", "Employee Name", "Assigned Week Off", ...daysInView.map(d => format(d, "d-MMM")), "Total Working"];
    const rows = employees.map((emp, idx) => {
      let working = 0;
      const cells = daysInView.map(day => {
        const code = getEffectiveStatus(emp, day, format(day, "yyyy-MM-dd"));
        if (!code) working++;
        return code;
      });
      return [idx + 1, emp.name, emp.assignedWeekOff || "—", ...cells, working];
    });

    const titleRow = [`${selectedSite.name} — ${selectedRoster.toUpperCase()} Roster`];
    const worksheet = XLSX.utils.aoa_to_sheet([titleRow, [], header, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Roster");
    XLSX.writeFile(workbook, `Roster_${selectedSite.name}_${selectedRoster}_${format(selectedDate, "MMM_yyyy")}.xlsx`);
    toast.success("Roster exported successfully!");
  };

  const filteredEmployees = employees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));
  const isLoading = loadingSites || loadingEmployees || loadingRoster;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 md:p-6 bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Supervisor Roster Management</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Manage rosters for your assigned sites</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRosterEntries} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" onClick={handleExportReport} disabled={isLoading}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        <Card>
          <CardContent className="p-4 md:p-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              {[
                { value: "daily", label: "Daily", icon: Calendar },
                { value: "weekly", label: "Weekly", icon: CalendarDays },
                { value: "fortnightly", label: "Fortnightly", icon: CalendarRange },
                { value: "monthly", label: "Monthly", icon: CalendarCheck }
              ].map((type) => {
                const IconComponent = type.icon;
                return (
                  <Button key={type.value} variant={selectedRoster === type.value ? "default" : "outline"} onClick={() => { setSelectedRoster(type.value as any); setSelectedDate(new Date()); }} className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4" /><span>{type.label}</span>
                  </Button>
                );
              })}
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:items-end">
              <div className="w-full md:w-64">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Site / Client</label>
                {loadingSites ? (
                  <div className="flex items-center gap-2 h-10"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                ) : (
                  <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select a site" /></SelectTrigger>
                    <SelectContent>{sites.length > 0 ? sites.map(site => (<SelectItem key={site._id} value={site._id}>{site.name}</SelectItem>)) : (<div className="p-2 text-center text-sm text-muted-foreground">No sites assigned</div>)}</SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date Range</label>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={() => setSelectedDate(prev => { if (selectedRoster === "daily") return subDays(prev, 1); if (selectedRoster === "weekly") return subDays(prev, 7); if (selectedRoster === "fortnightly") return subDays(prev, 14); return subMonths(prev, 1); })}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="w-36 text-center font-medium text-sm border rounded-md h-10 flex items-center justify-center">
                    {selectedRoster === "daily" ? format(selectedDate, "dd MMM yyyy") : selectedRoster === "weekly" ? `Week of ${format(daysInView[0], "dd MMM")}` : selectedRoster === "fortnightly" ? `Fortnight of ${format(daysInView[0], "dd MMM")}` : format(selectedDate, "MMMM yyyy")}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setSelectedDate(prev => { if (selectedRoster === "daily") return addDays(prev, 1); if (selectedRoster === "weekly") return addDays(prev, 7); if (selectedRoster === "fortnightly") return addDays(prev, 14); return addMonths(prev, 1); })}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
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

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {STATUS_OPTIONS.map(s => (
                <div key={s.code || "working"} className="flex items-center gap-1.5">
                  <span className={cn("h-3 w-3 rounded-sm", s.swatch)} /> {s.label}
                </div>
              ))}
              <span>Click any box to choose a status</span>
            </div>

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
                        <TableHead key={idx} className={cn("text-center min-w-[36px] text-xs px-1", (day.getDay() === 0 || day.getDay() === 6) && "bg-muted/40")}>
                          <div>{format(day, "d")}</div><div className="text-[10px] text-muted-foreground">{format(day, "EEEEE")}</div>
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
    </div>
  );
};

export default SupervisorRosterSection;
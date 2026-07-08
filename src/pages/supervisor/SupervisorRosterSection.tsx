import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Plus, Calendar, Download, Edit, Trash2, ChevronLeft, ChevronRight, Loader2, RefreshCw, User, UserCog, Clock, X, Check, ChevronDown, ChevronUp, MoreVertical, Filter, Users, CalendarDays, CalendarRange, CalendarCheck, Eye, Info, Building, Menu } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addWeeks, subWeeks, addDays, differenceInDays, getWeek, getYear } from "date-fns";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { siteService, Site } from "@/services/SiteService";
import assignTaskService, { AssignTask } from "@/services/assignTaskService";
import { rosterService, RosterEntryData, GetRosterParams } from "@/services/rosterService";
import { useRole } from "@/context/RoleContext";
import axios from "axios";
import { useOutletContext } from 'react-router-dom';
import { motion } from "framer-motion";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
// Define interfaces
interface RosterEntry {
  id: string;
  _id: string;
  date: string;
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
  shift: string;
  shiftTiming: string;
  assignedTask: string;
  assignedTaskId?: string;
  hours: number;
  remark: string;
  type: "daily" | "weekly" | "fortnightly" | "monthly";
  siteClient: string;
  siteId?: string;
  supervisors?: Array<{ id: string; name: string }>;
  managers?: Array<{ id: string; name: string }>;
  supervisor?: string;
  supervisorId?: string;
  manager?: string;
  managerId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

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
}

interface Supervisor {
  _id: string;
  name: string;
  email: string;
  role: 'supervisor';
  department?: string;
  site?: string;
  assignedSites?: string[];
}

interface Manager {
  _id: string;
  name: string;
  email: string;
  role: 'manager';
  department?: string;
  site?: string;
  assignedSites?: string[];
}

// Date range picker component
const DateRangePicker = ({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange,
  label = "Select Date Range"
}: { 
  startDate: Date; 
  endDate: Date; 
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  label?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  const handleApply = () => {
    onStartDateChange(tempStartDate);
    onEndDateChange(tempEndDate);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[260px] justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="truncate">
            {format(startDate, "dd MMM yyyy")} - {format(endDate, "dd MMM yyyy")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="font-semibold">{label}</div>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={format(tempStartDate, "yyyy-MM-dd")}
                onChange={(e) => setTempStartDate(new Date(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={format(tempEndDate, "yyyy-MM-dd")}
                onChange={(e) => setTempEndDate(new Date(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApply} className="flex-1">Apply</Button>
              <Button onClick={handleCancel} variant="outline" className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Week Picker Component
const WeekPicker = ({ selectedWeek, onWeekChange, year, onYearChange }: { 
  selectedWeek: number; 
  onWeekChange: (week: number) => void;
  year: number;
  onYearChange: (year: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [tempWeek, setTempWeek] = useState(selectedWeek);
  const [tempYear, setTempYear] = useState(year);

  const getWeekRange = (weekNum: number, yearNum: number) => {
    const firstDayOfYear = new Date(yearNum, 0, 1);
    const daysOffset = (weekNum - 1) * 7;
    const startDate = addDays(firstDayOfYear, daysOffset);
    const endDate = addDays(startDate, 6);
    return { startDate, endDate };
  };

  const handleApply = () => {
    onWeekChange(tempWeek);
    onYearChange(tempYear);
    setOpen(false);
  };

  const { startDate, endDate } = getWeekRange(selectedWeek, year);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[260px] justify-start text-left font-normal"
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          <span className="truncate">
            Week {selectedWeek}, {year} ({format(startDate, "dd MMM")} - {format(endDate, "dd MMM")})
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="font-semibold">Select Week</div>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Year</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTempYear(prev => prev - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={tempYear}
                  onChange={(e) => setTempYear(parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-24 text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTempYear(prev => prev + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Week Number (1-52)</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTempWeek(prev => Math.max(1, prev - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  max="52"
                  value={tempWeek}
                  onChange={(e) => setTempWeek(Math.min(52, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-20 text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTempWeek(prev => Math.min(52, prev + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Range: {format(getWeekRange(tempWeek, tempYear).startDate, "dd MMM yyyy")} - {format(getWeekRange(tempWeek, tempYear).endDate, "dd MMM yyyy")}
            </div>
            <Button onClick={handleApply}>Apply Week</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Month Year Picker Component
const MonthYearPicker = ({ selectedMonth, selectedYear, onMonthChange, onYearChange }: { 
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[260px] justify-start text-left font-normal"
        >
          <CalendarCheck className="mr-2 h-4 w-4" />
          <span className="truncate">
            {months[selectedMonth]} {selectedYear}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="font-semibold">Select Month</div>
          <div>
            <label className="text-sm font-medium mb-2 block">Year</label>
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onYearChange(selectedYear - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={selectedYear}
                onChange={(e) => onYearChange(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-24 text-center"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => onYearChange(selectedYear + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {months.map((month, index) => (
                <Button
                  key={month}
                  variant={selectedMonth === index ? "default" : "outline"}
                  className="text-sm"
                  onClick={() => {
                    onMonthChange(index);
                    setOpen(false);
                  }}
                >
                  {month.substring(0, 3)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Custom Date Range Picker for Fortnightly
const FortnightlyPicker = ({ startDate, endDate, onStartDateChange, onEndDateChange }: {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  const handleApply = () => {
    onStartDateChange(tempStartDate);
    onEndDateChange(tempEndDate);
    setOpen(false);
  };

  const handlePreset = (days: number) => {
    const newStartDate = new Date();
    const newEndDate = addDays(newStartDate, days - 1);
    setTempStartDate(newStartDate);
    setTempEndDate(newEndDate);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[260px] justify-start text-left font-normal"
        >
          <CalendarRange className="mr-2 h-4 w-4" />
          <span className="truncate">
            {format(startDate, "dd MMM")} - {format(endDate, "dd MMM yyyy")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="font-semibold">Select 15-Day Range</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePreset(15)}>Next 15 Days</Button>
            <Button variant="outline" size="sm" onClick={() => handlePreset(15)}>This Fortnight</Button>
          </div>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={format(tempStartDate, "yyyy-MM-dd")}
                onChange={(e) => setTempStartDate(new Date(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={format(tempEndDate, "yyyy-MM-dd")}
                onChange={(e) => setTempEndDate(new Date(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApply} className="flex-1">Apply</Button>
              <Button onClick={() => setOpen(false)} variant="outline" className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Mobile responsive stat card
const MobileStatCard = ({ title, value, icon: Icon, color = "primary" }: { 
  title: string; 
  value: string; 
  icon: any; 
  color?: string;
}) => {
  const colorClasses = {
    primary: "text-primary bg-primary/10",
    success: "text-green-600 bg-green-100",
    warning: "text-yellow-600 bg-yellow-100",
    danger: "text-red-600 bg-red-100"
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-lg font-bold mt-1">{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Mobile responsive employee selection card
const MobileEmployeeCard = ({ 
  employee, 
  selected, 
  onToggle 
}: { 
  employee: Employee; 
  selected: boolean; 
  onToggle: (id: string) => void;
}) => {
  return (
    <div
      onClick={() => onToggle(employee._id)}
      className={`p-3 border rounded-lg mb-2 cursor-pointer transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/20'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center h-5 w-5 rounded border ${
          selected ? 'bg-primary border-primary' : 'border-gray-300'
        }`}>
          {selected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{employee.name}</h4>
            <Badge variant="outline" className="text-xs">
              {employee.employeeId}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{employee.position}</p>
        </div>
      </div>
    </div>
  );
};

// Mobile responsive supervisor selection card
const MobileSupervisorCard = ({ 
  supervisor, 
  selected, 
  onToggle 
}: { 
  supervisor: Supervisor; 
  selected: boolean; 
  onToggle: (id: string) => void;
}) => {
  return (
    <div
      onClick={() => onToggle(supervisor._id)}
      className={`p-3 border rounded-lg mb-2 cursor-pointer transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/20'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center h-5 w-5 rounded border ${
          selected ? 'bg-primary border-primary' : 'border-gray-300'
        }`}>
          {selected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{supervisor.name}</h4>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{supervisor.department}</p>
        </div>
      </div>
    </div>
  );
};

// Mobile responsive manager selection card
const MobileManagerCard = ({ 
  manager, 
  selected, 
  onToggle 
}: { 
  manager: Manager; 
  selected: boolean; 
  onToggle: (id: string) => void;
}) => {
  return (
    <div
      onClick={() => onToggle(manager._id)}
      className={`p-3 border rounded-lg mb-2 cursor-pointer transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/20'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center h-5 w-5 rounded border ${
          selected ? 'bg-primary border-primary' : 'border-gray-300'
        }`}>
          {selected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{manager.name}</h4>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{manager.department}</p>
        </div>
      </div>
    </div>
  );
};

// Mobile responsive roster entry card with view details
const MobileRosterCard = ({ 
  entry, 
  onEdit, 
  onDelete,
  onViewDetails,
  tasks,
  sites,
  supervisors,
  managers,
  index
}: { 
  entry: RosterEntry; 
  onEdit: (entry: RosterEntry) => void;
  onDelete: (id: string) => void;
  onViewDetails: (entry: RosterEntry) => void;
  tasks: AssignTask[];
  sites: Site[];
  supervisors: Supervisor[];
  managers: Manager[];
  index: number;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="mb-3 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10">
              #{index + 1}
            </Badge>
            <h3 className="font-semibold text-base">{entry.employeeName}</h3>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails(entry)}>
                  <Eye className="h-4 w-4 mr-2" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(entry)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(entry.id || entry._id)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <p className="text-xs text-muted-foreground">Employee ID</p>
            <p className="text-sm font-medium">{entry.employeeId}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Shift</p>
            <p className="text-sm font-medium">{entry.shift}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs">{entry.date}</span>
          </div>
          <Badge variant="outline" className="bg-green-50">
            {entry.hours}h
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate max-w-[150px]">{entry.siteClient}</span>
          <span>•</span>
          <span>{entry.shiftTiming}</span>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm">{entry.department}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Designation</p>
                <p className="text-sm">{entry.designation}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Supervisors</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.supervisors && entry.supervisors.length > 0 ? (
                    entry.supervisors.map((sup, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {sup.name}
                      </Badge>
                    ))
                  ) : entry.supervisor ? (
                    <Badge variant="outline" className="text-xs">{entry.supervisor}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Managers</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.managers && entry.managers.length > 0 ? (
                    entry.managers.map((mgr, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {mgr.name}
                      </Badge>
                    ))
                  ) : entry.manager ? (
                    <Badge variant="outline" className="text-xs">{entry.manager}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Assigned Task</p>
                <p className="text-sm">{entry.assignedTask}</p>
              </div>
              {entry.remark && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Remarks</p>
                  <p className="text-sm">{entry.remark}</p>
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => onViewDetails(entry)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Full Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Mobile responsive calendar day with view details button
const MobileCalendarDay = ({ 
  day, 
  dateStr, 
  entries, 
  totalHours, 
  isCurrentMonth, 
  isToday,
  onDayClick,
  onViewDetails
}: { 
  day: Date; 
  dateStr: string; 
  entries: RosterEntry[]; 
  totalHours: number; 
  isCurrentMonth: boolean; 
  isToday: boolean;
  onDayClick: (date: Date) => void;
  onViewDetails: (entry: RosterEntry) => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "border rounded p-2 text-sm transition-colors cursor-pointer",
        isCurrentMonth ? "bg-background" : "bg-muted/50",
        isToday && "border-primary border-2"
      )}
    >
      <div className="flex justify-between items-center mb-1">
        <span 
          onClick={() => onDayClick(day)}
          className={cn(
            "font-semibold hover:text-primary transition-colors",
            !isCurrentMonth && "text-muted-foreground",
            isToday && "text-primary"
          )}
        >
          {format(day, "d")}
        </span>
        {totalHours > 0 && (
          <Badge variant="secondary" className="h-5 text-xs">
            {totalHours}h
          </Badge>
        )}
      </div>
      <div className="space-y-1 max-h-16 overflow-y-auto">
        {entries.slice(0, expanded ? undefined : 2).map(entry => (
          <div 
            key={entry.id || entry._id} 
            className="text-xs p-1 bg-secondary rounded truncate flex items-center justify-between group cursor-pointer hover:bg-secondary/80"
            onClick={() => onViewDetails(entry)}
          >
            <span>{entry.employeeName.split(' ')[0]}: {entry.shift}</span>
            <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
          </div>
        ))}
        {entries.length > 2 && !expanded && (
          <div 
            className="text-xs text-primary text-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
          >
            +{entries.length - 2} more
          </div>
        )}
        {expanded && entries.length > 2 && (
          <div 
            className="text-xs text-primary text-center cursor-pointer mt-1"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
          >
            Show less
          </div>
        )}
      </div>
    </div>
  );
};

// Detailed View Dialog Component
const RosterDetailDialog = ({ entry, open, onClose }: { entry: RosterEntry | null; open: boolean; onClose: () => void }) => {
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Info className="h-5 w-5" />
            Roster Entry Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Header Section */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="font-semibold text-base md:text-lg">{entry.employeeName}</h3>
                <p className="text-sm text-muted-foreground">Employee ID: {entry.employeeId}</p>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {entry.type.toUpperCase()} Roster
              </Badge>
            </div>
          </div>

          {/* Basic Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{format(new Date(entry.date), "dd MMMM yyyy")}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Shift</label>
              <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{entry.shift}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Shift Timing</label>
              <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{entry.shiftTiming}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Hours</label>
              <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{entry.hours} hours</span>
              </div>
            </div>
          </div>

          {/* Site and Assignment Information */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Building className="h-4 w-4" />
              Site & Assignment Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Site/Client</label>
                <div className="p-2 bg-muted/20 rounded-lg">
                  <p className="text-sm font-medium">{entry.siteClient}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Assigned Task</label>
                <div className="p-2 bg-muted/20 rounded-lg">
                  <p className="text-sm font-medium">{entry.assignedTask}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Supervisors</label>
                <div className="p-2 bg-muted/20 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {entry.supervisors && entry.supervisors.length > 0 ? (
                      entry.supervisors.map((sup, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">{sup.name}</p>
                        </div>
                      ))
                    ) : entry.supervisor ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{entry.supervisor}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">N/A</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Managers</label>
                <div className="p-2 bg-muted/20 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {entry.managers && entry.managers.length > 0 ? (
                      entry.managers.map((mgr, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">{mgr.name}</p>
                        </div>
                      ))
                    ) : entry.manager ? (
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{entry.manager}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">N/A</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Details */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employee Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Department</label>
                <div className="p-2 bg-muted/20 rounded-lg">
                  <p className="text-sm">{entry.department}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Designation</label>
                <div className="p-2 bg-muted/20 rounded-lg">
                  <p className="text-sm">{entry.designation}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          {entry.remark && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Remarks
              </h4>
              <div className="p-3 bg-muted/20 rounded-lg">
                <p className="text-sm">{entry.remark}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm mb-2">System Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Created At:</span>
                <span className="font-medium">{format(new Date(entry.createdAt), "dd MMM yyyy, hh:mm a")}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="font-medium">{format(new Date(entry.updatedAt), "dd MMM yyyy, hh:mm a")}</span>
              </div>
              {entry.createdBy && (
                <div className="flex justify-between col-span-2">
                  <span>Created By:</span>
                  <span className="font-medium">{entry.createdBy}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => onClose()}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SupervisorRosterSection = () => {
  const { user: authUser, isAuthenticated } = useRole();
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const [selectedRoster, setSelectedRoster] = useState<"daily" | "weekly" | "fortnightly" | "monthly">("daily");
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [addEntryDialogOpen, setAddEntryDialogOpen] = useState(false);
  const [editEntryDialogOpen, setEditEntryDialogOpen] = useState(false);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [selectedEntryForDetails, setSelectedEntryForDetails] = useState<RosterEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<RosterEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState({
    sites: true,
    supervisors: true,
    managers: true,
    employees: true,
    roster: true,
    tasks: true
  });
  
  // Mobile responsive state
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMobileStats, setShowMobileStats] = useState(false);
  
  // Date states for different roster types
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Custom date range for weekly, fortnightly, and monthly views
  const [weeklyStartDate, setWeeklyStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeklyEndDate, setWeeklyEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const [fortnightlyStartDate, setFortnightlyStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [fortnightlyEndDate, setFortnightlyEndDate] = useState<Date>(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 13));
  
  const [monthlyStartDate, setMonthlyStartDate] = useState<Date>(startOfMonth(new Date()));
  const [monthlyEndDate, setMonthlyEndDate] = useState<Date>(endOfMonth(new Date()));
  
  // Add Entry Form specific date states based on roster type
  const [addEntryFormType, setAddEntryFormType] = useState<"daily" | "weekly" | "fortnightly" | "monthly">("daily");
  
  // Daily entry date
  const [dailyEntryDate, setDailyEntryDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  
  // Weekly entry - week picker
  const [weeklyEntryWeek, setWeeklyEntryWeek] = useState<number>(getWeek(new Date(), { weekStartsOn: 1 }));
  const [weeklyEntryYear, setWeeklyEntryYear] = useState<number>(new Date().getFullYear());
  
  // Fortnightly entry - date range
  const [fortnightlyEntryStartDate, setFortnightlyEntryStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [fortnightlyEntryEndDate, setFortnightlyEntryEndDate] = useState<Date>(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 13));
  
  // Monthly entry - month picker
  const [monthlyEntryMonth, setMonthlyEntryMonth] = useState<number>(new Date().getMonth());
  const [monthlyEntryYear, setMonthlyEntryYear] = useState<number>(new Date().getFullYear());
  
  // Edit form state
  const [editFormData, setEditFormData] = useState({
    date: "",
    employeeName: "",
    employeeId: "",
    department: "",
    designation: "",
    shift: "",
    shiftTiming: "",
    assignedTask: "",
    assignedTaskId: "",
    hours: 8,
    remark: "",
    siteClient: "",
    siteId: "",
    supervisors: [] as Array<{ id: string; name: string }>,
    managers: [] as Array<{ id: string; name: string }>
  });
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("17:00");
  const [editSelectedSupervisors, setEditSelectedSupervisors] = useState<string[]>([]);
  const [editSelectedManagers, setEditSelectedManagers] = useState<string[]>([]);
  const [editSupervisorSearchQuery, setEditSupervisorSearchQuery] = useState("");
  const [editManagerSearchQuery, setEditManagerSearchQuery] = useState("");
  
  // Data states
  const [sites, setSites] = useState<Site[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<AssignTask[]>([]);
  
  // Supervisor's assigned sites (for access control)
  const [supervisorAssignedSites, setSupervisorAssignedSites] = useState<string[]>([]);
  const [supervisorAssignedSiteNames, setSupervisorAssignedSiteNames] = useState<string[]>([]);
  
  // Filtered states based on selected site
  const [filteredSupervisors, setFilteredSupervisors] = useState<Supervisor[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<Manager[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<AssignTask[]>([]);
  
  // Multi-select states
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [supervisorSearchQuery, setSupervisorSearchQuery] = useState("");
  const [managerSearchQuery, setManagerSearchQuery] = useState("");
  
  // Time picker state
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  
  // Form state
  const [newRosterEntry, setNewRosterEntry] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    employeeName: "",
    employeeId: "",
    department: "",
    designation: "",
    shift: "",
    shiftTiming: "",
    assignedTask: "",
    assignedTaskId: "",
    hours: 8,
    remark: "",
    type: "daily" as "daily" | "weekly" | "fortnightly" | "monthly",
    siteClient: "",
    siteId: "",
    supervisor: "",
    supervisorId: "",
    manager: "",
    managerId: ""
  });

  // Get current supervisor info
  const supervisorId = authUser?._id || authUser?.id || "";
  const supervisorName = authUser?.name || "Supervisor";

  // Check for mobile view on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Helper to create unique values for Select
  const createUniqueValue = (type: string, item: any) => {
    if (!item || !item._id) return "";
    if (type === 'site') {
      return `${item._id}-${item.name || ''}-${item.clientName || ''}`;
    } else if (type === 'supervisor') {
      return `${item._id}-${item.name || ''}-${item.department || ''}`;
    } else if (type === 'manager') {
      return `${item._id}-${item.name || ''}-${item.department || ''}`;
    } else if (type === 'employee') {
      return `${item._id}-${item.name || ''}-${item.employeeId || ''}`;
    } else if (type === 'task') {
      return `${item._id}-${item.taskTitle || ''}`;
    }
    return item._id || "";
  };

  // Helper to find item by unique value
  const findItemByUniqueValue = (type: string, uniqueValue: string) => {
    if (!uniqueValue) return null;
    if (type === 'site') {
      return sites.find(site => createUniqueValue('site', site) === uniqueValue);
    } else if (type === 'supervisor') {
      return supervisors.find(sup => createUniqueValue('supervisor', sup) === uniqueValue);
    } else if (type === 'manager') {
      return managers.find(mgr => createUniqueValue('manager', mgr) === uniqueValue);
    } else if (type === 'employee') {
      return employees.find(emp => createUniqueValue('employee', emp) === uniqueValue);
    } else if (type === 'task') {
      return tasks.find(task => createUniqueValue('task', task) === uniqueValue);
    }
    return null;
  };

  // Get current value for Select components
  const getCurrentSelectValue = (type: 'site' | 'supervisor' | 'manager' | 'employee' | 'task') => {
    if (type === 'site' && newRosterEntry.siteClient) {
      const site = sites.find(s => s.name === newRosterEntry.siteClient);
      return site ? createUniqueValue('site', site) : "";
    }
    if (type === 'supervisor' && newRosterEntry.supervisor) {
      const supervisor = supervisors.find(s => s.name === newRosterEntry.supervisor);
      return supervisor ? createUniqueValue('supervisor', supervisor) : "";
    }
    if (type === 'manager' && newRosterEntry.manager) {
      const manager = managers.find(m => m.name === newRosterEntry.manager);
      return manager ? createUniqueValue('manager', manager) : "";
    }
    if (type === 'employee' && newRosterEntry.employeeId) {
      const employee = employees.find(e => e._id === newRosterEntry.employeeId);
      return employee ? createUniqueValue('employee', employee) : "";
    }
    if (type === 'task' && newRosterEntry.assignedTaskId) {
      const task = tasks.find(t => t._id === newRosterEntry.assignedTaskId);
      return task ? createUniqueValue('task', task) : "";
    }
    return "";
  };

  // Get current value for Edit form Select components
  const getEditCurrentSelectValue = (type: 'site' | 'supervisor' | 'manager' | 'employee' | 'task') => {
    if (type === 'site' && editFormData.siteClient) {
      const site = sites.find(s => s.name === editFormData.siteClient);
      return site ? createUniqueValue('site', site) : "";
    }
    if (type === 'supervisor') {
      return "";
    }
    if (type === 'manager') {
      return "";
    }
    if (type === 'employee' && editFormData.employeeId) {
      const employee = employees.find(e => e._id === editFormData.employeeId);
      return employee ? createUniqueValue('employee', employee) : "";
    }
    if (type === 'task' && editFormData.assignedTaskId) {
      const task = tasks.find(t => t._id === editFormData.assignedTaskId);
      return task ? createUniqueValue('task', task) : "";
    }
    return "";
  };

  // Get supervisor's assigned sites from tasks
  const fetchSupervisorAssignedSites = useCallback(async () => {
    if (!supervisorId) return;
    
    try {
      const allTasks = await assignTaskService.getAllAssignTasks();
      const assignedSitesSet = new Set<string>();
      const assignedSiteNamesSet = new Set<string>();
      
      allTasks.forEach((task: AssignTask) => {
        // Check if supervisor is assigned to this task
        const isSupervisorAssigned = task.assignedSupervisors?.some(sup => sup.userId === supervisorId);
        if (isSupervisorAssigned && task.siteId) {
          assignedSitesSet.add(task.siteId);
          if (task.siteName) {
            assignedSiteNamesSet.add(task.siteName);
          }
        }
      });
      
      setSupervisorAssignedSites(Array.from(assignedSitesSet));
      setSupervisorAssignedSiteNames(Array.from(assignedSiteNamesSet));
      console.log("Supervisor assigned sites:", Array.from(assignedSitesSet));
      console.log("Supervisor assigned site names:", Array.from(assignedSiteNamesSet));
    } catch (error) {
      console.error("Error fetching supervisor assigned sites:", error);
      toast.error("Failed to load your assigned sites");
    }
  }, [supervisorId]);

  // Fetch all data
  useEffect(() => {
    if (supervisorId && isAuthenticated) {
      fetchSupervisorAssignedSites();
    }
  }, [supervisorId, isAuthenticated, fetchSupervisorAssignedSites]);

  // Fetch data after supervisor assigned sites are loaded
  useEffect(() => {
    if (supervisorAssignedSites.length > 0) {
      fetchAllData();
    }
  }, [supervisorAssignedSites]);

  // Fetch roster when date range changes
  useEffect(() => {
    if (supervisorId && supervisorAssignedSites.length > 0) {
      fetchRosterEntries();
    }
  }, [selectedDate, selectedRoster, weeklyStartDate, weeklyEndDate, fortnightlyStartDate, fortnightlyEndDate, monthlyStartDate, monthlyEndDate, supervisorAssignedSites]);

  // Filter data when site changes for add form
  useEffect(() => {
    if (newRosterEntry.siteClient) {
      filterDataBySite(newRosterEntry.siteClient);
    } else {
      setFilteredSupervisors([]);
      setFilteredManagers([]);
      setFilteredEmployees([]);
      setFilteredTasks([]);
    }
  }, [newRosterEntry.siteClient, supervisors, managers, employees, tasks]);

  // Filter data when site changes for edit form
  useEffect(() => {
    if (editFormData.siteClient) {
      filterDataBySiteForEdit(editFormData.siteClient);
    }
  }, [editFormData.siteClient, supervisors, managers, employees, tasks]);

  // Update shift timing when start or end time changes
  useEffect(() => {
    setNewRosterEntry(prev => ({
      ...prev,
      shiftTiming: `${startTime}-${endTime}`
    }));
  }, [startTime, endTime]);

  // Update edit shift timing when start or end time changes
  useEffect(() => {
    setEditFormData(prev => ({
      ...prev,
      shiftTiming: `${editStartTime}-${editEndTime}`
    }));
  }, [editStartTime, editEndTime]);

  const fetchAllData = async () => {
    try {
      setLoadingData({
        sites: true,
        supervisors: true,
        managers: true,
        employees: true,
        roster: true,
        tasks: true
      });
      await Promise.all([
        fetchSites(),
        fetchSupervisorsAndManagers(),
        fetchEmployees(),
        fetchTasks()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoadingData(prev => ({
        ...prev,
        sites: false,
        supervisors: false,
        managers: false,
        employees: false,
        tasks: false
      }));
    }
  };

  const fetchSites = async () => {
    try {
      const data = await siteService.getAllSites();
      // Filter sites to only those assigned to the supervisor
      const filteredSites = data.filter(site => supervisorAssignedSites.includes(site._id));
      setSites(filteredSites);
      console.log("Filtered sites for supervisor:", filteredSites.length);
    } catch (error) {
      console.error("Error fetching sites:", error);
      toast.error("Failed to load sites");
    }
  };

  const fetchSupervisorsAndManagers = async () => {
    try {
      const tasksData = await assignTaskService.getAllAssignTasks();
      const supervisorMap = new Map<string, Supervisor>();
      const managerMap = new Map<string, Manager>();
      
      tasksData.forEach((task: AssignTask) => {
        // Only include if task site is assigned to this supervisor
        if (supervisorAssignedSites.includes(task.siteId)) {
          if (task.assignedSupervisors && Array.isArray(task.assignedSupervisors)) {
            task.assignedSupervisors.forEach(user => {
              if (!supervisorMap.has(user.userId)) {
                supervisorMap.set(user.userId, {
                  _id: user.userId,
                  name: user.name,
                  email: '',
                  role: 'supervisor',
                  department: task.taskType || 'General',
                  site: task.siteName,
                  assignedSites: [task.siteId]
                });
              } else {
                const existing = supervisorMap.get(user.userId);
                if (existing && !existing.assignedSites?.includes(task.siteId)) {
                  existing.assignedSites = [...(existing.assignedSites || []), task.siteId];
                }
              }
            });
          }
          
          if (task.assignedManagers && Array.isArray(task.assignedManagers)) {
            task.assignedManagers.forEach(user => {
              if (!managerMap.has(user.userId)) {
                managerMap.set(user.userId, {
                  _id: user.userId,
                  name: user.name,
                  email: '',
                  role: 'manager',
                  department: task.taskType || 'General',
                  site: task.siteName,
                  assignedSites: [task.siteId]
                });
              } else {
                const existing = managerMap.get(user.userId);
                if (existing && !existing.assignedSites?.includes(task.siteId)) {
                  existing.assignedSites = [...(existing.assignedSites || []), task.siteId];
                }
              }
            });
          }
        }
      });
      
      const uniqueSupervisors = Array.from(supervisorMap.values());
      const uniqueManagers = Array.from(managerMap.values());
      setSupervisors(uniqueSupervisors);
      setManagers(uniqueManagers);
      console.log("Fetched supervisors from tasks:", uniqueSupervisors.length);
      console.log("Fetched managers from tasks:", uniqueManagers.length);
    } catch (error) {
      console.error("Error fetching supervisors and managers:", error);
      toast.error("Failed to load supervisors and managers");
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/employees`);
      if (response.data.success) {
        const employeesData = response.data.data || [];
        // Filter employees based on supervisor's assigned sites
        const filteredEmployeesData = employeesData.filter((emp: Employee) => {
          return (emp.siteName && supervisorAssignedSiteNames.includes(emp.siteName)) ||
                 (emp.assignedSites && emp.assignedSites.some(site => supervisorAssignedSites.includes(site)));
        });
        const uniqueEmployees = Array.from(
          new Map(filteredEmployeesData.map((emp: Employee) => [emp._id, emp])).values()
        ).filter(emp => emp.status === "active");
        setEmployees(uniqueEmployees);
        console.log("Filtered employees for supervisor:", uniqueEmployees.length);
      } else {
        throw new Error(response.data.message || "Failed to fetch employees");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    }
  };

  const fetchTasks = async () => {
    try {
      const tasksData = await assignTaskService.getAllAssignTasks();
      // Filter tasks based on supervisor's assigned sites
      const filteredTasksData = tasksData.filter(task => 
        supervisorAssignedSites.includes(task.siteId)
      );
      setTasks(filteredTasksData);
      console.log("Filtered tasks for supervisor:", filteredTasksData.length);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    }
  };

  const fetchRosterEntries = async () => {
    try {
      setLoadingData(prev => ({ ...prev, roster: true }));
      const dateRange = getDateRange();
      const params: GetRosterParams = {
        startDate: format(dateRange.start, "yyyy-MM-dd"),
        endDate: format(dateRange.end, "yyyy-MM-dd"),
        type: selectedRoster
      };
      
      const response = await rosterService.getRosterEntries(params);
      if (response.success) {
        // Filter to only show entries for supervisor's assigned sites
        const filteredEntries = response.roster.filter((entry: RosterEntry) => 
          supervisorAssignedSites.includes(entry.siteId || "")
        );
        setRoster(filteredEntries);
        console.log("Fetched roster entries count:", filteredEntries.length);
      } else {
        throw new Error(response.message || "Failed to fetch roster");
      }
    } catch (error: any) {
      console.error("Error fetching roster:", error);
      toast.error(error.message || "Failed to load roster entries");
    } finally {
      setLoadingData(prev => ({ ...prev, roster: false }));
    }
  };

  const filterDataBySite = (siteName: string) => {
    const selectedSite = sites.find(site => site.name === siteName);
    if (!selectedSite) {
      setFilteredSupervisors([]);
      setFilteredManagers([]);
      setFilteredEmployees([]);
      setFilteredTasks([]);
      return;
    }
    const siteSupervisors = supervisors.filter(sup => 
      sup.assignedSites?.includes(selectedSite._id) || sup.site === siteName
    );
    setFilteredSupervisors(siteSupervisors);
    const siteManagers = managers.filter(mgr => 
      mgr.assignedSites?.includes(selectedSite._id) || mgr.site === siteName
    );
    setFilteredManagers(siteManagers);
    const siteEmployees = employees.filter(emp => 
      emp.siteName === siteName || emp.assignedSites?.includes(selectedSite._id)
    );
    setFilteredEmployees(siteEmployees);
    const siteTasks = tasks.filter(task => 
      task.siteName === siteName || task.siteId === selectedSite._id
    );
    setFilteredTasks(siteTasks);
  };

  const filterDataBySiteForEdit = (siteName: string) => {
    const selectedSite = sites.find(site => site.name === siteName);
    if (!selectedSite) return;
    
    const siteSupervisors = supervisors.filter(sup => 
      sup.assignedSites?.includes(selectedSite._id) || sup.site === siteName
    );
    const siteManagers = managers.filter(mgr => 
      mgr.assignedSites?.includes(selectedSite._id) || mgr.site === siteName
    );
    const siteEmployees = employees.filter(emp => 
      emp.siteName === siteName || emp.assignedSites?.includes(selectedSite._id)
    );
    const siteTasks = tasks.filter(task => 
      task.siteName === siteName || task.siteId === selectedSite._id
    );
    
    setFilteredSupervisors(siteSupervisors);
    setFilteredManagers(siteManagers);
    setFilteredEmployees(siteEmployees);
    setFilteredTasks(siteTasks);
  };

  const getDateRange = () => {
    switch (selectedRoster) {
      case "daily":
        return {
          start: selectedDate,
          end: selectedDate,
          label: format(selectedDate, "dd MMMM yyyy")
        };
      case "weekly":
        return {
          start: weeklyStartDate,
          end: weeklyEndDate,
          label: `${format(weeklyStartDate, "dd MMM")} - ${format(weeklyEndDate, "dd MMM yyyy")}`
        };
      case "fortnightly":
        return {
          start: fortnightlyStartDate,
          end: fortnightlyEndDate,
          label: `${format(fortnightlyStartDate, "dd MMM")} - ${format(fortnightlyEndDate, "dd MMM yyyy")}`
        };
      case "monthly":
        return {
          start: monthlyStartDate,
          end: monthlyEndDate,
          label: `${format(monthlyStartDate, "dd MMM")} - ${format(monthlyEndDate, "dd MMM yyyy")}`
        };
      default:
        return {
          start: selectedDate,
          end: selectedDate,
          label: format(selectedDate, "dd MMMM yyyy")
        };
    }
  };

  const dateRange = getDateRange();

  const getDaysInRange = () => {
    if (selectedRoster === "monthly") {
      return eachDayOfInterval({ start: monthlyStartDate, end: monthlyEndDate });
    } else if (selectedRoster === "weekly") {
      return eachDayOfInterval({ start: weeklyStartDate, end: weeklyEndDate });
    } else if (selectedRoster === "fortnightly") {
      return eachDayOfInterval({ start: fortnightlyStartDate, end: fortnightlyEndDate });
    } else {
      return [selectedDate];
    }
  };

  // Helper function to get dates from week number
  const getDatesFromWeek = (weekNum: number, yearNum: number) => {
    const firstDayOfYear = new Date(yearNum, 0, 1);
    const firstThursday = new Date(firstDayOfYear);
    firstThursday.setDate(firstDayOfYear.getDate() + ((4 - firstDayOfYear.getDay() + 7) % 7));
    const startDate = new Date(firstThursday);
    startDate.setDate(firstThursday.getDate() + (weekNum - 1) * 7 - 3);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return { startDate, endDate };
  };

  // Helper function to get dates from month
  const getDatesFromMonth = (month: number, year: number) => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return { startDate, endDate };
  };

  // Handle form type change and reset date fields
  const handleAddEntryFormTypeChange = (type: "daily" | "weekly" | "fortnightly" | "monthly") => {
    setAddEntryFormType(type);
    if (type === "daily") {
      setDailyEntryDate(format(new Date(), "yyyy-MM-dd"));
      setNewRosterEntry(prev => ({ ...prev, date: format(new Date(), "yyyy-MM-dd") }));
    } else if (type === "weekly") {
      const { startDate } = getDatesFromWeek(weeklyEntryWeek, weeklyEntryYear);
      setNewRosterEntry(prev => ({ ...prev, date: format(startDate, "yyyy-MM-dd") }));
    } else if (type === "fortnightly") {
      setNewRosterEntry(prev => ({ ...prev, date: format(fortnightlyEntryStartDate, "yyyy-MM-dd") }));
    } else if (type === "monthly") {
      const { startDate } = getDatesFromMonth(monthlyEntryMonth, monthlyEntryYear);
      setNewRosterEntry(prev => ({ ...prev, date: format(startDate, "yyyy-MM-dd") }));
    }
  };

  // Handle weekly entry week change
  const handleWeeklyEntryWeekChange = (week: number, year: number) => {
    setWeeklyEntryWeek(week);
    setWeeklyEntryYear(year);
    const { startDate } = getDatesFromWeek(week, year);
    setNewRosterEntry(prev => ({ ...prev, date: format(startDate, "yyyy-MM-dd") }));
  };

  // Handle fortnightly entry date range change
  const handleFortnightlyEntryDateRangeChange = (startDate: Date, endDate: Date) => {
    setFortnightlyEntryStartDate(startDate);
    setFortnightlyEntryEndDate(endDate);
    setNewRosterEntry(prev => ({ ...prev, date: format(startDate, "yyyy-MM-dd") }));
  };

  // Handle monthly entry month change
  const handleMonthlyEntryMonthChange = (month: number, year: number) => {
    setMonthlyEntryMonth(month);
    setMonthlyEntryYear(year);
    const { startDate } = getDatesFromMonth(month, year);
    setNewRosterEntry(prev => ({ ...prev, date: format(startDate, "yyyy-MM-dd") }));
  };

  // Handle daily entry date change
  const handleDailyEntryDateChange = (date: string) => {
    setDailyEntryDate(date);
    setNewRosterEntry(prev => ({ ...prev, date }));
  };

  // Supervisor selection handler
  const handleSupervisorToggle = (supervisorId: string) => {
    setSelectedSupervisors(prev => {
      if (prev.includes(supervisorId)) {
        return prev.filter(id => id !== supervisorId);
      } else {
        return [...prev, supervisorId];
      }
    });
  };

  // Manager selection handler
  const handleManagerToggle = (managerId: string) => {
    setSelectedManagers(prev => {
      if (prev.includes(managerId)) {
        return prev.filter(id => id !== managerId);
      } else {
        return [...prev, managerId];
      }
    });
  };

  // Edit supervisor selection handler
  const handleEditSupervisorToggle = (supervisorId: string) => {
    setEditSelectedSupervisors(prev => {
      if (prev.includes(supervisorId)) {
        return prev.filter(id => id !== supervisorId);
      } else {
        return [...prev, supervisorId];
      }
    });
  };

  // Edit manager selection handler
  const handleEditManagerToggle = (managerId: string) => {
    setEditSelectedManagers(prev => {
      if (prev.includes(managerId)) {
        return prev.filter(id => id !== managerId);
      } else {
        return [...prev, managerId];
      }
    });
  };

  // Check for duplicate entry
  const checkDuplicateEntry = (employeeId: string, date: string, shift: string, type: string, excludeId?: string) => {
    if (!employeeId || !date || !shift) return false;
    return roster.some(entry => 
      entry.employeeId === employeeId && 
      entry.date === date && 
      entry.shift === shift &&
      entry.type === type &&
      entry._id !== excludeId
    );
  };

  const handleViewDetails = (entry: RosterEntry) => {
    setSelectedEntryForDetails(entry);
    setViewDetailsDialogOpen(true);
  };

  const handleAddRosterEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      let entryDate = "";
      if (addEntryFormType === "daily") {
        entryDate = dailyEntryDate;
      } else if (addEntryFormType === "weekly") {
        const { startDate } = getDatesFromWeek(weeklyEntryWeek, weeklyEntryYear);
        entryDate = format(startDate, "yyyy-MM-dd");
      } else if (addEntryFormType === "fortnightly") {
        entryDate = format(fortnightlyEntryStartDate, "yyyy-MM-dd");
      } else if (addEntryFormType === "monthly") {
        const { startDate } = getDatesFromMonth(monthlyEntryMonth, monthlyEntryYear);
        entryDate = format(startDate, "yyyy-MM-dd");
      }
      
      console.log("Creating entry with date:", entryDate, "type:", addEntryFormType);
      
      // Prepare supervisors and managers arrays
      const supervisorsList = selectedSupervisors.map(supId => {
        const sup = filteredSupervisors.find(s => s._id === supId);
        return sup ? { id: sup._id, name: sup.name } : null;
      }).filter(Boolean);
      
      const managersList = selectedManagers.map(mgrId => {
        const mgr = filteredManagers.find(m => m._id === mgrId);
        return mgr ? { id: mgr._id, name: mgr.name } : null;
      }).filter(Boolean);
      
      if (supervisorsList.length === 0) {
        toast.error("Please select at least one supervisor");
        setLoading(false);
        return;
      }
      
      if (managersList.length === 0) {
        toast.error("Please select at least one manager");
        setLoading(false);
        return;
      }
      
      if (selectedEmployees.length > 0) {
        const entries = [];
        for (const employeeId of selectedEmployees) {
          const employee = employees.find(e => e._id === employeeId);
          if (!employee) continue;
          if (!newRosterEntry.shift) {
            toast.error("Please select a shift");
            setLoading(false);
            return;
          }
          if (!newRosterEntry.siteClient) {
            toast.error("Please select a site/client");
            setLoading(false);
            return;
          }
          // Verify site is assigned to supervisor
          const selectedSite = sites.find(s => s.name === newRosterEntry.siteClient);
          if (selectedSite && !supervisorAssignedSites.includes(selectedSite._id)) {
            toast.error("You don't have permission to create roster for this site");
            setLoading(false);
            return;
          }
          if (!newRosterEntry.assignedTaskId) {
            toast.error("Please select an assigned task");
            setLoading(false);
            return;
          }
          const selectedTask = tasks.find(t => t._id === newRosterEntry.assignedTaskId);
          const entryData = {
            date: entryDate,
            employeeName: employee.name,
            employeeId: employee.employeeId || employee._id,
            department: employee.department || employee.position || "General",
            designation: employee.designation || employee.position || "Staff",
            shift: newRosterEntry.shift,
            shiftTiming: newRosterEntry.shiftTiming || `${startTime}-${endTime}`,
            assignedTask: selectedTask?.taskTitle || newRosterEntry.assignedTask,
            assignedTaskId: newRosterEntry.assignedTaskId,
            hours: newRosterEntry.hours || 8,
            remark: newRosterEntry.remark || "",
            type: addEntryFormType,
            siteClient: newRosterEntry.siteClient,
            siteId: newRosterEntry.siteId,
            supervisors: supervisorsList,
            managers: managersList,
            createdBy: supervisorId
          };
          entries.push(entryData);
        }
        
        if (entries.length === 0) {
          toast.error("No valid employees selected");
          setLoading(false);
          return;
        }
        
        const response = await rosterService.bulkCreateRosterEntries(entries);
        if (response.success) {
          toast.success(`${response.created || entries.length} roster entries created successfully!`);
          await fetchRosterEntries();
          setAddEntryDialogOpen(false);
          resetForm();
          setSelectedEmployees([]);
          setSelectedSupervisors([]);
          setSelectedManagers([]);
        } else {
          throw new Error(response.message || "Failed to create roster entries");
        }
      } else {
        // Single employee entry
        const requiredFields = [
          { field: "shift", name: "Shift" },
          { field: "siteClient", name: "Site/Client" },
          { field: "siteId", name: "Site ID" },
          { field: "assignedTaskId", name: "Assigned Task" }
        ];
        
        const missingFields = requiredFields.filter(f => !newRosterEntry[f.field as keyof typeof newRosterEntry]);
        if (missingFields.length > 0) {
          toast.error(`Missing required fields: ${missingFields.map(f => f.name).join(", ")}`);
          setLoading(false);
          return;
        }
        
        if (!selectedEmployees.length && !newRosterEntry.employeeId) {
          toast.error("Please select at least one employee");
          setLoading(false);
          return;
        }
        
        let employee;
        let employeeId;
        let employeeName;
        if (selectedEmployees.length === 1) {
          employee = employees.find(e => e._id === selectedEmployees[0]);
          employeeId = employee?.employeeId || employee?._id;
          employeeName = employee?.name;
        } else if (newRosterEntry.employeeId) {
          employee = employees.find(e => e._id === newRosterEntry.employeeId);
          employeeId = newRosterEntry.employeeId;
          employeeName = newRosterEntry.employeeName;
        }
        
        if (!employeeId || !employeeName) {
          toast.error("Invalid employee selected");
          setLoading(false);
          return;
        }
        
        if (newRosterEntry.hours <= 0 || newRosterEntry.hours > 24) {
          toast.error("Hours must be between 0 and 24");
          setLoading(false);
          return;
        }
        
        if (checkDuplicateEntry(employeeId, entryDate, newRosterEntry.shift, addEntryFormType)) {
          toast.error("Roster entry already exists for this employee on selected date and shift for this roster type");
          setLoading(false);
          return;
        }
        
        const selectedTask = tasks.find(t => t._id === newRosterEntry.assignedTaskId);
        const entryData = {
          date: entryDate,
          employeeName: employeeName,
          employeeId: employeeId,
          department: newRosterEntry.department || employee?.department || "General",
          designation: newRosterEntry.designation || employee?.designation || employee?.position || "Staff",
          shift: newRosterEntry.shift,
          shiftTiming: newRosterEntry.shiftTiming || `${startTime}-${endTime}`,
          assignedTask: selectedTask?.taskTitle || newRosterEntry.assignedTask,
          assignedTaskId: newRosterEntry.assignedTaskId,
          hours: newRosterEntry.hours,
          remark: newRosterEntry.remark || "",
          type: addEntryFormType,
          siteClient: newRosterEntry.siteClient,
          siteId: newRosterEntry.siteId,
          supervisors: supervisorsList,
          managers: managersList,
          createdBy: supervisorId
        };
        
        const response = await rosterService.createRosterEntry(entryData);
        if (response.success) {
          toast.success("Roster entry created successfully!");
          await fetchRosterEntries();
          setAddEntryDialogOpen(false);
          resetForm();
          setSelectedSupervisors([]);
          setSelectedManagers([]);
        } else {
          throw new Error(response.message || "Failed to create roster entry");
        }
      }
    } catch (error: any) {
      console.error("Error creating roster:", error);
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.message) {
          toast.error(errorData.message);
        } else if (errorData.error?.includes("duplicate") || errorData.message?.includes("already exists")) {
          toast.error("A roster entry already exists for this employee on this date and shift for this roster type");
        } else if (errorData.errors) {
          const validationErrors = Object.values(errorData.errors).join(", ");
          toast.error(`Validation error: ${validationErrors}`);
        } else {
          toast.error(errorData.message || "Error creating roster entry");
        }
      } else {
        toast.error(error.message || "Error creating roster entry");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditRosterEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEntry) return;
    setLoading(true);
    try {
      const requiredFields = [
        { field: "shift", name: "Shift" },
        { field: "siteClient", name: "Site/Client" },
        { field: "siteId", name: "Site ID" },
        { field: "assignedTaskId", name: "Assigned Task" }
      ];
      const missingFields = requiredFields.filter(f => !editFormData[f.field as keyof typeof editFormData]);
      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.map(f => f.name).join(", ")}`);
        setLoading(false);
        return;
      }
      
      if (!editFormData.employeeId) {
        toast.error("Invalid employee selected");
        setLoading(false);
        return;
      }
      
      if (editFormData.hours <= 0 || editFormData.hours > 24) {
        toast.error("Hours must be between 0 and 24");
        setLoading(false);
        return;
      }
      
      // Prepare supervisors and managers arrays for edit
      const supervisorsList = editSelectedSupervisors.map(supId => {
        const sup = filteredSupervisors.find(s => s._id === supId);
        return sup ? { id: sup._id, name: sup.name } : null;
      }).filter(Boolean);
      
      const managersList = editSelectedManagers.map(mgrId => {
        const mgr = filteredManagers.find(m => m._id === mgrId);
        return mgr ? { id: mgr._id, name: mgr.name } : null;
      }).filter(Boolean);
      
      if (supervisorsList.length === 0) {
        toast.error("Please select at least one supervisor");
        setLoading(false);
        return;
      }
      
      if (managersList.length === 0) {
        toast.error("Please select at least one manager");
        setLoading(false);
        return;
      }
      
      if (checkDuplicateEntry(editFormData.employeeId, editFormData.date, editFormData.shift, editingEntry.type, editingEntry._id)) {
        toast.error("Roster entry already exists for this employee on selected date and shift for this roster type");
        setLoading(false);
        return;
      }
      
      const selectedTask = tasks.find(t => t._id === editFormData.assignedTaskId);
      const updateData = {
        date: editFormData.date,
        employeeName: editFormData.employeeName,
        employeeId: editFormData.employeeId,
        department: editFormData.department,
        designation: editFormData.designation,
        shift: editFormData.shift,
        shiftTiming: editFormData.shiftTiming,
        assignedTask: selectedTask?.taskTitle || editFormData.assignedTask,
        assignedTaskId: editFormData.assignedTaskId,
        hours: editFormData.hours,
        remark: editFormData.remark,
        siteClient: editFormData.siteClient,
        siteId: editFormData.siteId,
        supervisors: supervisorsList,
        managers: managersList
      };
      
      const response = await rosterService.updateRosterEntry(editingEntry._id, updateData);
      
      if (response.success) {
        toast.success("Roster entry updated successfully!");
        await fetchRosterEntries();
        setEditEntryDialogOpen(false);
        setEditingEntry(null);
        resetEditForm();
      } else {
        throw new Error(response.message || "Failed to update roster entry");
      }
    } catch (error: any) {
      console.error("Error updating roster:", error);
      if (error.response?.data) {
        const errorData = error.response.data;
        toast.error(errorData.message || "Error updating roster entry");
      } else {
        toast.error(error.message || "Error updating roster entry");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoster = async (rosterId: string) => {
    if (!confirm("Are you sure you want to delete this roster entry?")) return;
    try {
      const response = await rosterService.deleteRosterEntry(rosterId);
      if (response.success) {
        toast.success("Roster entry deleted successfully!");
        setRoster(prev => prev.filter(entry => entry.id !== rosterId && entry._id !== rosterId));
      } else {
        throw new Error(response.message || "Failed to delete roster entry");
      }
    } catch (error: any) {
      console.error("Error deleting roster:", error);
      toast.error(error.response?.data?.message || "Error deleting roster entry");
    }
  };

  const openEditDialog = (entry: RosterEntry) => {
    setEditingEntry(entry);
    // Parse shift timing to get start and end times
    let start = "09:00";
    let end = "17:00";
    if (entry.shiftTiming && entry.shiftTiming.includes("-")) {
      const [s, e] = entry.shiftTiming.split("-");
      if (s) start = s;
      if (e) end = e;
    }
    setEditStartTime(start);
    setEditEndTime(end);
    
    // Get existing supervisors and managers
    const existingSupervisorIds = entry.supervisors?.map(s => s.id) || [];
    const existingManagerIds = entry.managers?.map(m => m.id) || [];
    
    setEditSelectedSupervisors(existingSupervisorIds);
    setEditSelectedManagers(existingManagerIds);
    
    setEditFormData({
      date: entry.date,
      employeeName: entry.employeeName,
      employeeId: entry.employeeId,
      department: entry.department,
      designation: entry.designation,
      shift: entry.shift,
      shiftTiming: entry.shiftTiming,
      assignedTask: entry.assignedTask,
      assignedTaskId: entry.assignedTaskId || "",
      hours: entry.hours,
      remark: entry.remark,
      siteClient: entry.siteClient,
      siteId: entry.siteId || "",
      supervisors: entry.supervisors || [],
      managers: entry.managers || []
    });
    setEditEntryDialogOpen(true);
  };

  const resetForm = () => {
    setNewRosterEntry({
      date: format(new Date(), "yyyy-MM-dd"),
      employeeName: "",
      employeeId: "",
      department: "",
      designation: "",
      shift: "",
      shiftTiming: "",
      assignedTask: "",
      assignedTaskId: "",
      hours: 8,
      remark: "",
      type: "daily",
      siteClient: "",
      siteId: "",
      supervisor: "",
      supervisorId: "",
      manager: "",
      managerId: ""
    });
    setSelectedEmployees([]);
    setSelectedSupervisors([]);
    setSelectedManagers([]);
    setStartTime("09:00");
    setEndTime("17:00");
    setEmployeeSearchQuery("");
    setSupervisorSearchQuery("");
    setManagerSearchQuery("");
    setAddEntryFormType("daily");
    setDailyEntryDate(format(new Date(), "yyyy-MM-dd"));
    setWeeklyEntryWeek(getWeek(new Date(), { weekStartsOn: 1 }));
    setWeeklyEntryYear(new Date().getFullYear());
    setFortnightlyEntryStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setFortnightlyEntryEndDate(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 13));
    setMonthlyEntryMonth(new Date().getMonth());
    setMonthlyEntryYear(new Date().getFullYear());
  };

  const resetEditForm = () => {
    setEditFormData({
      date: "",
      employeeName: "",
      employeeId: "",
      department: "",
      designation: "",
      shift: "",
      shiftTiming: "",
      assignedTask: "",
      assignedTaskId: "",
      hours: 8,
      remark: "",
      siteClient: "",
      siteId: "",
      supervisors: [],
      managers: []
    });
    setEditStartTime("09:00");
    setEditEndTime("17:00");
    setEditSelectedSupervisors([]);
    setEditSelectedManagers([]);
    setEditSupervisorSearchQuery("");
    setEditManagerSearchQuery("");
    setEditingEntry(null);
  };

  const handleSiteSelect = (uniqueValue: string) => {
    const selectedSite = findItemByUniqueValue('site', uniqueValue);
    if (selectedSite) {
      setNewRosterEntry(prev => ({ 
        ...prev, 
        siteClient: selectedSite.name,
        siteId: selectedSite._id,
        supervisor: "",
        supervisorId: "",
        manager: "",
        managerId: "",
        employeeId: "",
        employeeName: "",
        department: "",
        designation: "",
        assignedTask: "",
        assignedTaskId: ""
      }));
      setSelectedEmployees([]);
      setSelectedSupervisors([]);
      setSelectedManagers([]);
    }
  };

  const handleTaskSelect = (value: string) => {
    console.log("Task selected with value:", value);
    if (value === "no-tasks") return;
    const selectedTask = tasks.find(task => task._id === value);
    if (selectedTask) {
      console.log("Found task:", selectedTask);
      setNewRosterEntry(prev => ({ 
        ...prev, 
        assignedTask: selectedTask.taskTitle,
        assignedTaskId: selectedTask._id
      }));
    }
  };

  const handleEditTaskSelect = (value: string) => {
    console.log("Task selected with value:", value);
    if (value === "no-tasks") return;
    const selectedTask = tasks.find(task => task._id === value);
    if (selectedTask) {
      console.log("Found task:", selectedTask);
      setEditFormData(prev => ({ 
        ...prev, 
        assignedTask: selectedTask.taskTitle,
        assignedTaskId: selectedTask._id
      }));
    }
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
    const employee = employees.find(e => e._id === employeeId);
    if (employee && selectedEmployees.length === 0) {
      setNewRosterEntry(prev => ({
        ...prev,
        employeeId: employee._id,
        employeeName: employee.name,
        department: employee.department || employee.position || "",
        designation: employee.designation || employee.position || ""
      }));
    } else if (selectedEmployees.length === 1) {
      setNewRosterEntry(prev => ({
        ...prev,
        employeeId: "",
        employeeName: "",
        department: "",
        designation: ""
      }));
    }
  };

  const filteredEmployeesBySearch = filteredEmployees.filter(emp => 
    emp.name.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
    (emp.position && emp.position.toLowerCase().includes(employeeSearchQuery.toLowerCase()))
  );

  const filteredSupervisorsBySearch = filteredSupervisors.filter(sup => 
    sup.name.toLowerCase().includes(supervisorSearchQuery.toLowerCase()) ||
    (sup.department && sup.department.toLowerCase().includes(supervisorSearchQuery.toLowerCase()))
  );

  const filteredManagersBySearch = filteredManagers.filter(mgr => 
    mgr.name.toLowerCase().includes(managerSearchQuery.toLowerCase()) ||
    (mgr.department && mgr.department.toLowerCase().includes(managerSearchQuery.toLowerCase()))
  );

  const filteredEditSupervisorsBySearch = filteredSupervisors.filter(sup => 
    sup.name.toLowerCase().includes(editSupervisorSearchQuery.toLowerCase()) ||
    (sup.department && sup.department.toLowerCase().includes(editSupervisorSearchQuery.toLowerCase()))
  );

  const filteredEditManagersBySearch = filteredManagers.filter(mgr => 
    mgr.name.toLowerCase().includes(editManagerSearchQuery.toLowerCase()) ||
    (mgr.department && mgr.department.toLowerCase().includes(editManagerSearchQuery.toLowerCase()))
  );

  // Filter roster entries based on selected roster type and date range
  const filteredRoster = roster.filter(entry => {
    const entryDateStr = entry.date;
    const startDateStr = format(dateRange.start, "yyyy-MM-dd");
    const endDateStr = format(dateRange.end, "yyyy-MM-dd");
    const isInRange = entryDateStr >= startDateStr && entryDateStr <= endDateStr;
    return isInRange;
  }).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.employeeName.localeCompare(b.employeeName);
  });

  const groupedRoster = filteredRoster.reduce((acc, entry) => {
    const date = entry.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, RosterEntry[]>);

  const handleExportReport = () => {
    toast.success(`Exporting ${selectedRoster} roster report for ${dateRange.label}...`);
  };

  const navigateDate = (direction: "prev" | "next") => {
    switch (selectedRoster) {
      case "daily":
        setSelectedDate(prev => addDays(prev, direction === "next" ? 1 : -1));
        break;
      case "weekly": {
        const daysToAdd = direction === "next" ? 7 : -7;
        setWeeklyStartDate(prev => addDays(prev, daysToAdd));
        setWeeklyEndDate(prev => addDays(prev, daysToAdd));
        break;
      }
      case "fortnightly": {
        const daysToAdd = direction === "next" ? 14 : -14;
        setFortnightlyStartDate(prev => addDays(prev, daysToAdd));
        setFortnightlyEndDate(prev => addDays(prev, daysToAdd));
        break;
      }
      case "monthly":
        if (direction === "next") {
          setMonthlyStartDate(prev => startOfMonth(addMonths(prev, 1)));
          setMonthlyEndDate(prev => endOfMonth(addMonths(prev, 1)));
        } else {
          setMonthlyStartDate(prev => startOfMonth(subMonths(prev, 1)));
          setMonthlyEndDate(prev => endOfMonth(subMonths(prev, 1)));
        }
        break;
    }
  };

  const DailyRosterTable = ({ roster, onDelete, onUpdate, onViewDetails }: { 
    roster: RosterEntry[], 
    onDelete: (id: string) => void,
    onUpdate: (entry: RosterEntry) => void,
    onViewDetails: (entry: RosterEntry) => void
  }) => {
    return (
      <div>
        <div className="mb-4">
          <div className="text-sm text-muted-foreground">
            Showing entries for: <span className="font-medium">{dateRange.label}</span>
            {roster.length > 0 && (
              <span className="ml-4">
                Total: <span className="font-medium">{roster.length}</span> entries
              </span>
            )}
          </div>
        </div>
        
        {isMobileView ? (
          <div className="space-y-3">
            {loadingData.roster ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Loading roster entries...</p>
              </div>
            ) : roster.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No {selectedRoster} roster entries found for {dateRange.label}</p>
                <p className="text-sm text-muted-foreground mt-2">Click "Add Entry" to create a new {selectedRoster} roster entry</p>
              </div>
            ) : (
              roster.map((entry, index) => (
                <MobileRosterCard
                  key={entry.id || entry._id}
                  entry={entry}
                  onEdit={onUpdate}
                  onDelete={onDelete}
                  onViewDetails={onViewDetails}
                  tasks={tasks}
                  sites={sites}
                  supervisors={supervisors}
                  managers={managers}
                  index={index}
                />
              ))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Sr. No.</TableHead>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Employee Name</TableHead>
                  <TableHead className="whitespace-nowrap">Employee ID</TableHead>
                  <TableHead className="whitespace-nowrap">Department</TableHead>
                  <TableHead className="whitespace-nowrap">Designation</TableHead>
                  <TableHead className="whitespace-nowrap">Shift</TableHead>
                  <TableHead className="whitespace-nowrap">Shift Timing</TableHead>
                  <TableHead className="whitespace-nowrap">Assigned Task</TableHead>
                  <TableHead className="whitespace-nowrap">Hours</TableHead>
                  <TableHead className="whitespace-nowrap">Site/Client</TableHead>
                  <TableHead className="whitespace-nowrap">Supervisors</TableHead>
                  <TableHead className="whitespace-nowrap">Managers</TableHead>
                  <TableHead className="whitespace-nowrap">Remarks</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingData.roster ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading roster entries...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : roster.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="h-8 w-8" />
                        <div>No {selectedRoster} roster entries found for {dateRange.label}</div>
                        <div className="text-sm">Click "Add Entry" to create a new {selectedRoster} roster entry</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  roster.map((entry, index) => (
                    <TableRow key={entry.id || entry._id}>
                      <TableCell className="font-medium whitespace-nowrap">{index + 1}</TableCell>
                      <TableCell className="whitespace-nowrap">{entry.date}</TableCell>
                      <TableCell className="whitespace-nowrap">{entry.employeeName}</TableCell>
                      <TableCell className="whitespace-nowrap">{entry.employeeId}</TableCell>
                      <TableCell className="whitespace-nowrap">{entry.department}</TableCell>
                      <TableCell className="whitespace-nowrap">{entry.designation}</TableCell>
                      <TableCell className="whitespace-nowrap">{entry.shift}</TableCell>
                      <TableCell className="whitespace-nowrap">{entry.shiftTiming}</TableCell>
                      <TableCell className="whitespace-nowrap">{entry.assignedTask}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono whitespace-nowrap">
                          {entry.hours}h
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{entry.siteClient}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {entry.supervisors && entry.supervisors.length > 0 ? (
                            entry.supervisors.map((sup, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {sup.name}
                              </Badge>
                            ))
                          ) : entry.supervisor ? (
                            <Badge variant="outline" className="text-xs">{entry.supervisor}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {entry.managers && entry.managers.length > 0 ? (
                            entry.managers.map((mgr, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {mgr.name}
                              </Badge>
                            ))
                          ) : entry.manager ? (
                            <Badge variant="outline" className="text-xs">{entry.manager}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={entry.remark}>
                        {entry.remark}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onViewDetails(entry)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onUpdate(entry)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => onDelete(entry.id || entry._id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  const MonthlyCalendarView = () => {
    const daysInRange = getDaysInRange();
    const totalHoursByDate = filteredRoster.reduce((acc, entry) => {
      const date = entry.date;
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += entry.hours;
      return acc;
    }, {} as Record<string, number>);

    const handleDayClick = (day: Date) => {
      setSelectedDate(day);
      setSelectedRoster("daily");
    };

    const weeks: Date[][] = [];
    for (let i = 0; i < daysInRange.length; i += 7) {
      weeks.push(daysInRange.slice(i, i + 7));
    }

    return (
      <div className="space-y-4">
        {isMobileView ? (
          <div className="grid grid-cols-7 gap-1">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
              <div key={i} className="text-center text-xs font-medium py-1 bg-muted rounded">
                {day}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
              <div key={day} className="py-2 bg-muted rounded-t">{day}</div>
            ))}
          </div>
        )}
        
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className={`grid grid-cols-7 gap-1 ${isMobileView ? 'text-xs' : ''}`}>
            {week.map((day, dayIndex) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayEntries = groupedRoster[dateStr] || [];
              const totalHours = totalHoursByDate[dateStr] || 0;
              const isCurrentMonth = selectedRoster === "monthly" ? isSameMonth(day, monthlyStartDate) : true;
              const isToday = isSameDay(day, new Date());
              
              return isMobileView ? (
                <MobileCalendarDay
                  key={dayIndex}
                  day={day}
                  dateStr={dateStr}
                  entries={dayEntries}
                  totalHours={totalHours}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday}
                  onDayClick={handleDayClick}
                  onViewDetails={handleViewDetails}
                />
              ) : (
                <div
                  key={dayIndex}
                  className={cn(
                    "min-h-32 border rounded p-2 text-sm transition-colors",
                    isCurrentMonth ? "bg-background" : "bg-muted/50",
                    isToday && "border-primary border-2"
                  )}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span 
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "font-semibold cursor-pointer hover:text-primary transition-colors",
                        !isCurrentMonth && "text-muted-foreground",
                        isToday && "text-primary"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {totalHours > 0 && (
                      <Badge variant="secondary" className="h-5">
                        {totalHours}h
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {dayEntries.slice(0, 3).map(entry => (
                      <div 
                        key={entry.id || entry._id} 
                        className="text-xs p-1 bg-secondary rounded truncate flex items-center justify-between group cursor-pointer hover:bg-secondary/80"
                        onClick={() => handleViewDetails(entry)}
                      >
                        <span>{entry.employeeName.split(' ')[0]}: {entry.shift}</span>
                        <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                      </div>
                    ))}
                    {dayEntries.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayEntries.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const rosterTypes = ["daily", "weekly", "fortnightly", "monthly"];

  // Add Entry Form Component
  const AddEntryForm = () => (
    <form onSubmit={handleAddRosterEntry} className="space-y-4">
      <div className="border rounded-lg p-4 bg-muted/30">
        <label className="text-sm font-medium mb-3 block">Roster Type for Entry</label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "daily", label: "Daily", icon: CalendarIcon },
            { value: "weekly", label: "Weekly", icon: CalendarDays },
            { value: "fortnightly", label: "15 Days", icon: CalendarRange },
            { value: "monthly", label: "Monthly", icon: CalendarCheck }
          ].map((type) => {
            const IconComponent = type.icon;
            return (
              <Button
                key={type.value}
                type="button"
                variant={addEntryFormType === type.value ? "default" : "outline"}
                onClick={() => handleAddEntryFormTypeChange(type.value as any)}
                className="flex items-center gap-2"
              >
                <IconComponent className="h-4 w-4" />
                <span>{type.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <label className="text-sm font-medium mb-3 block">
          {addEntryFormType === "daily" && "Select Date"}
          {addEntryFormType === "weekly" && "Select Week"}
          {addEntryFormType === "fortnightly" && "Select 15-Day Range"}
          {addEntryFormType === "monthly" && "Select Month"}
        </label>
        
        {addEntryFormType === "daily" && (
          <Input
            type="date"
            value={dailyEntryDate}
            onChange={(e) => handleDailyEntryDateChange(e.target.value)}
            className="h-10"
            required
          />
        )}

        {addEntryFormType === "weekly" && (
          <WeekPicker
            selectedWeek={weeklyEntryWeek}
            onWeekChange={(week) => handleWeeklyEntryWeekChange(week, weeklyEntryYear)}
            year={weeklyEntryYear}
            onYearChange={(year) => handleWeeklyEntryWeekChange(weeklyEntryWeek, year)}
          />
        )}

        {addEntryFormType === "fortnightly" && (
          <FortnightlyPicker
            startDate={fortnightlyEntryStartDate}
            endDate={fortnightlyEntryEndDate}
            onStartDateChange={(date) => handleFortnightlyEntryDateRangeChange(date, fortnightlyEntryEndDate)}
            onEndDateChange={(date) => handleFortnightlyEntryDateRangeChange(fortnightlyEntryStartDate, date)}
          />
        )}

        {addEntryFormType === "monthly" && (
          <MonthYearPicker
            selectedMonth={monthlyEntryMonth}
            selectedYear={monthlyEntryYear}
            onMonthChange={(month) => handleMonthlyEntryMonthChange(month, monthlyEntryYear)}
            onYearChange={(year) => handleMonthlyEntryMonthChange(monthlyEntryMonth, year)}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Site / Client *</label>
          {loadingData.sites ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading sites...</span>
            </div>
          ) : (
            <Select 
              value={getCurrentSelectValue('site')}
              onValueChange={handleSiteSelect}
              required
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select site/client" />
              </SelectTrigger>
              <SelectContent>
                {sites.length > 0 ? (
                  sites.map(site => (
                    <SelectItem 
                      key={createUniqueValue('site', site)}
                      value={createUniqueValue('site', site)}
                    >
                      <div className="flex flex-col py-1">
                        <span>{site.name}</span>
                        <span className="text-xs text-muted-foreground">{site.clientName}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-sites" disabled>
                    No sites assigned to you
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Supervisors *</label>
          {loadingData.supervisors ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading supervisors...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Search supervisors..."
                value={supervisorSearchQuery}
                onChange={(e) => setSupervisorSearchQuery(e.target.value)}
                className="h-10"
                disabled={!newRosterEntry.siteClient || filteredSupervisors.length === 0}
              />
              <div className="border rounded-lg max-h-40 overflow-y-auto p-2">
                {filteredSupervisors.length > 0 ? (
                  filteredSupervisorsBySearch.map(sup => (
                    <MobileSupervisorCard
                      key={sup._id}
                      supervisor={sup}
                      selected={selectedSupervisors.includes(sup._id)}
                      onToggle={handleSupervisorToggle}
                    />
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    {!newRosterEntry.siteClient 
                      ? "Select a site first" 
                      : "No supervisors available for this site"}
                  </div>
                )}
              </div>
              {selectedSupervisors.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedSupervisors.map(id => {
                    const sup = filteredSupervisors.find(s => s._id === id);
                    return sup ? (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1 text-xs">
                        {sup.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSupervisorToggle(id);
                          }}
                        />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Managers *</label>
          {loadingData.managers ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading managers...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Search managers..."
                value={managerSearchQuery}
                onChange={(e) => setManagerSearchQuery(e.target.value)}
                className="h-10"
                disabled={!newRosterEntry.siteClient || filteredManagers.length === 0}
              />
              <div className="border rounded-lg max-h-40 overflow-y-auto p-2">
                {filteredManagers.length > 0 ? (
                  filteredManagersBySearch.map(mgr => (
                    <MobileManagerCard
                      key={mgr._id}
                      manager={mgr}
                      selected={selectedManagers.includes(mgr._id)}
                      onToggle={handleManagerToggle}
                    />
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    {!newRosterEntry.siteClient 
                      ? "Select a site first" 
                      : "No managers available for this site"}
                  </div>
                )}
              </div>
              {selectedManagers.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedManagers.map(id => {
                    const mgr = filteredManagers.find(m => m._id === id);
                    return mgr ? (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1 text-xs">
                        {mgr.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManagerToggle(id);
                          }}
                        />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Employee *</label>
          {loadingData.employees ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading employees...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Search employees..."
                value={employeeSearchQuery}
                onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                className="h-10"
                disabled={!newRosterEntry.siteClient || filteredEmployees.length === 0}
              />
              <div className="border rounded-lg max-h-40 overflow-y-auto p-2">
                {filteredEmployees.length > 0 ? (
                  filteredEmployeesBySearch
                    .filter(emp => emp.status === "active")
                    .map(emp => (
                      <MobileEmployeeCard
                        key={emp._id}
                        employee={emp}
                        selected={selectedEmployees.includes(emp._id)}
                        onToggle={handleEmployeeToggle}
                      />
                    ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    {!newRosterEntry.siteClient 
                      ? "Select a site first" 
                      : "No employees available for this site"}
                  </div>
                )}
              </div>
              {selectedEmployees.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedEmployees.map(id => {
                    const emp = employees.find(e => e._id === id);
                    return emp ? (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1 text-xs">
                        {emp.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmployeeToggle(id);
                          }}
                        />
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Department *</label>
          <Input 
            value={newRosterEntry.department}
            onChange={(e) => setNewRosterEntry(prev => ({ ...prev, department: e.target.value }))}
            placeholder="Enter department"
            required 
            readOnly={selectedEmployees.length === 1}
            className={cn("h-10", selectedEmployees.length === 1 ? "bg-muted" : "")}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Designation *</label>
          <Input 
            value={newRosterEntry.designation}
            onChange={(e) => setNewRosterEntry(prev => ({ ...prev, designation: e.target.value }))}
            placeholder="Enter designation"
            required 
            readOnly={selectedEmployees.length === 1}
            className={cn("h-10", selectedEmployees.length === 1 ? "bg-muted" : "")}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Shift *</label>
          <Select 
            value={newRosterEntry.shift} 
            onValueChange={(value) => setNewRosterEntry(prev => ({ ...prev, shift: value }))}
            required
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Morning">Morning Shift</SelectItem>
              <SelectItem value="Evening">Evening Shift</SelectItem>
              <SelectItem value="Night">Night Shift</SelectItem>
              <SelectItem value="General">General Shift</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Shift Timing *</label>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="flex-1 w-full">
              <label className="text-xs text-muted-foreground">Start</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-10 w-full"
              />
            </div>
            <span className="text-lg hidden sm:block">-</span>
            <div className="flex-1 w-full">
              <label className="text-xs text-muted-foreground">End</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-10 w-full"
              />
            </div>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Assigned Task *</label>
          {loadingData.tasks ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading tasks...</span>
            </div>
          ) : (
            <Select 
              value={newRosterEntry.assignedTaskId || ""}
              onValueChange={handleTaskSelect}
              disabled={!newRosterEntry.siteClient || filteredTasks.length === 0}
              required
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder={
                  !newRosterEntry.siteClient 
                    ? "Select a site first" 
                    : filteredTasks.length === 0 
                      ? "No tasks available for this site" 
                      : "Select task"
                } />
              </SelectTrigger>
              <SelectContent>
                {filteredTasks.length > 0 ? (
                  filteredTasks.map(task => (
                    <SelectItem 
                      key={task._id} 
                      value={task._id}
                    >
                      {task.taskTitle}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-tasks" disabled>
                    No tasks available for this site
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Hours *</label>
          <Input 
            type="number" 
            value={newRosterEntry.hours}
            onChange={(e) => setNewRosterEntry(prev => ({ ...prev, hours: parseFloat(e.target.value) }))}
            placeholder="Enter hours" 
            min="0"
            max="24"
            step="0.5"
            required 
            className="h-10"
          />
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Remark</label>
        <Textarea 
          value={newRosterEntry.remark}
          onChange={(e) => setNewRosterEntry(prev => ({ ...prev, remark: e.target.value }))}
          placeholder="Enter any remarks or notes" 
          rows={3}
        />
      </div>
      
      <Button type="submit" className="w-full h-10" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding Entry...
          </>
        ) : (
          selectedEmployees.length > 1 ? `Add ${selectedEmployees.length} Entries` : "Add Entry"
        )}
      </Button>
    </form>
  );

  // Edit Entry Form Component
  const EditEntryForm = () => (
    <form onSubmit={handleEditRosterEntry} className="space-y-4">
      <div className="border rounded-lg p-4 bg-muted/30">
        <label className="text-sm font-medium mb-3 block">Edit Roster Entry</label>
        <div className="text-sm text-muted-foreground">
          Editing entry for: <span className="font-medium">{editingEntry?.employeeName}</span> on <span className="font-medium">{editingEntry?.date}</span>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <label className="text-sm font-medium mb-3 block">Date</label>
        <Input
          type="date"
          value={editFormData.date}
          onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
          className="h-10"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Site / Client *</label>
          <Select 
            value={getEditCurrentSelectValue('site')}
            onValueChange={(value) => {
              const selectedSite = findItemByUniqueValue('site', value);
              if (selectedSite) {
                setEditFormData(prev => ({ 
                  ...prev, 
                  siteClient: selectedSite.name,
                  siteId: selectedSite._id
                }));
                setEditSelectedSupervisors([]);
                setEditSelectedManagers([]);
              }
            }}
            required
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select site/client" />
            </SelectTrigger>
            <SelectContent>
              {sites.map(site => (
                <SelectItem 
                  key={createUniqueValue('site', site)}
                  value={createUniqueValue('site', site)}
                >
                  <div className="flex flex-col py-1">
                    <span>{site.name}</span>
                    <span className="text-xs text-muted-foreground">{site.clientName}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Supervisors *</label>
          <div className="space-y-2">
            <Input
              placeholder="Search supervisors..."
              value={editSupervisorSearchQuery}
              onChange={(e) => setEditSupervisorSearchQuery(e.target.value)}
              className="h-10"
              disabled={!editFormData.siteClient || filteredSupervisors.length === 0}
            />
            <div className="border rounded-lg max-h-40 overflow-y-auto p-2">
              {filteredSupervisors.length > 0 ? (
                filteredEditSupervisorsBySearch.map(sup => (
                  <MobileSupervisorCard
                    key={sup._id}
                    supervisor={sup}
                    selected={editSelectedSupervisors.includes(sup._id)}
                    onToggle={handleEditSupervisorToggle}
                  />
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  {!editFormData.siteClient 
                    ? "Select a site first" 
                    : "No supervisors available for this site"}
                </div>
              )}
            </div>
            {editSelectedSupervisors.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {editSelectedSupervisors.map(id => {
                  const sup = filteredSupervisors.find(s => s._id === id);
                  return sup ? (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1 text-xs">
                      {sup.name}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSupervisorToggle(id);
                        }}
                      />
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Managers *</label>
          <div className="space-y-2">
            <Input
              placeholder="Search managers..."
              value={editManagerSearchQuery}
              onChange={(e) => setEditManagerSearchQuery(e.target.value)}
              className="h-10"
              disabled={!editFormData.siteClient || filteredManagers.length === 0}
            />
            <div className="border rounded-lg max-h-40 overflow-y-auto p-2">
              {filteredManagers.length > 0 ? (
                filteredEditManagersBySearch.map(mgr => (
                  <MobileManagerCard
                    key={mgr._id}
                    manager={mgr}
                    selected={editSelectedManagers.includes(mgr._id)}
                    onToggle={handleEditManagerToggle}
                  />
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  {!editFormData.siteClient 
                    ? "Select a site first" 
                    : "No managers available for this site"}
                </div>
              )}
            </div>
            {editSelectedManagers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {editSelectedManagers.map(id => {
                  const mgr = filteredManagers.find(m => m._id === id);
                  return mgr ? (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1 text-xs">
                      {mgr.name}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditManagerToggle(id);
                        }}
                      />
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Department *</label>
          <Input 
            value={editFormData.department}
            onChange={(e) => setEditFormData(prev => ({ ...prev, department: e.target.value }))}
            placeholder="Enter department"
            required 
            className="h-10"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Designation *</label>
          <Input 
            value={editFormData.designation}
            onChange={(e) => setEditFormData(prev => ({ ...prev, designation: e.target.value }))}
            placeholder="Enter designation"
            required 
            className="h-10"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Shift *</label>
          <Select 
            value={editFormData.shift} 
            onValueChange={(value) => setEditFormData(prev => ({ ...prev, shift: value }))}
            required
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Morning">Morning Shift</SelectItem>
              <SelectItem value="Evening">Evening Shift</SelectItem>
              <SelectItem value="Night">Night Shift</SelectItem>
              <SelectItem value="General">General Shift</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Shift Timing *</label>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="flex-1 w-full">
              <label className="text-xs text-muted-foreground">Start</label>
              <Input
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="h-10 w-full"
              />
            </div>
            <span className="text-lg hidden sm:block">-</span>
            <div className="flex-1 w-full">
              <label className="text-xs text-muted-foreground">End</label>
              <Input
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className="h-10 w-full"
              />
            </div>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Assigned Task *</label>
          <Select 
            value={editFormData.assignedTaskId || ""}
            onValueChange={handleEditTaskSelect}
            disabled={!editFormData.siteClient}
            required
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select task" />
            </SelectTrigger>
            <SelectContent>
              {filteredTasks.map(task => (
                <SelectItem 
                  key={task._id} 
                  value={task._id}
                >
                  {task.taskTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Hours *</label>
          <Input 
            type="number" 
            value={editFormData.hours}
            onChange={(e) => setEditFormData(prev => ({ ...prev, hours: parseFloat(e.target.value) }))}
            placeholder="Enter hours" 
            min="0"
            max="24"
            step="0.5"
            required 
            className="h-10"
          />
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Remark</label>
        <Textarea 
          value={editFormData.remark}
          onChange={(e) => setEditFormData(prev => ({ ...prev, remark: e.target.value }))}
          placeholder="Enter any remarks or notes" 
          rows={3}
        />
      </div>
      
      <div className="flex gap-2">
        <Button type="submit" className="flex-1 h-10" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Entry"
          )}
        </Button>
        <Button type="button" variant="outline" className="flex-1 h-10" onClick={() => {
          setEditEntryDialogOpen(false);
          resetEditForm();
        }}>
          Cancel
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Hamburger Menu */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card border-b border-border px-4 md:px-6 py-4 sticky top-0 z-40"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu for Mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Supervisor Roster Management</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Manage daily, weekly, 15-day, and monthly rosters for your assigned sites
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {isMobileView && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowMobileStats(!showMobileStats)}
                className="md:hidden"
              >
                <Filter className="h-4 w-4 mr-2" />
                Stats
                {showMobileStats ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            )}
            <Button 
              variant="outline" 
              size={isMobileView ? "sm" : "default"}
              onClick={() => {
                fetchAllData();
                fetchRosterEntries();
              }} 
              disabled={loadingData.sites || loadingData.supervisors || loadingData.managers || loadingData.employees || loadingData.roster || loadingData.tasks}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${(loadingData.sites || loadingData.supervisors || loadingData.managers || loadingData.employees || loadingData.roster || loadingData.tasks) ? 'animate-spin' : ''}`} />
              {!isMobileView && "Refresh Data"}
            </Button>
            <Button 
              variant="outline" 
              size={isMobileView ? "sm" : "default"}
              onClick={handleExportReport} 
              disabled={loadingData.roster}
            >
              <Download className="mr-2 h-4 w-4" />
              {!isMobileView && "Export Report"}
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="p-4 md:p-6 space-y-6">
        <Card>
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 md:h-6 md:w-6" />
                <CardTitle className="text-lg md:text-xl">Roster Management</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-wrap gap-2 mb-6">
              {isMobileView ? (
                <Select value={selectedRoster} onValueChange={(value: any) => setSelectedRoster(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select roster type" />
                  </SelectTrigger>
                  <SelectContent>
                    {rosterTypes.map((type) => (
                      <SelectItem key={type} value={type} className="capitalize">
                        {type === "fortnightly" ? "15 Days" : `${type} Roster`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                rosterTypes.map((type) => (
                  <Button
                    key={type}
                    variant={selectedRoster === type ? "default" : "outline"}
                    onClick={() => setSelectedRoster(type as any)}
                    className="capitalize"
                    disabled={loadingData.roster}
                  >
                    {type === "fortnightly" ? "15 Days" : `${type} Roster`}
                  </Button>
                ))
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateDate("prev")}
                  disabled={loadingData.roster}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {selectedRoster === "daily" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[180px] sm:w-[240px] justify-start text-left font-normal"
                        disabled={loadingData.roster}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{dateRange.label}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <div className="p-3">
                        <div className="flex justify-between items-center mb-4">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="font-semibold">
                            {format(selectedDate, "MMMM yyyy")}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                            <div key={i} className="text-center text-xs font-medium">
                              {day}
                            </div>
                          ))}
                          {eachDayOfInterval({
                            start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 }),
                            end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 })
                          }).map((day, i) => {
                            const isCurrentMonth = isSameMonth(day, selectedDate);
                            const isSelected = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                            return (
                              <Button
                                key={i}
                                variant={isSelected ? "default" : "ghost"}
                                size="sm"
                                className={cn(
                                  "h-8 w-8 p-0",
                                  !isCurrentMonth && "text-muted-foreground opacity-50"
                                )}
                                onClick={() => setSelectedDate(day)}
                              >
                                {format(day, "d")}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {selectedRoster === "weekly" && (
                  <DateRangePicker
                    startDate={weeklyStartDate}
                    endDate={weeklyEndDate}
                    onStartDateChange={setWeeklyStartDate}
                    onEndDateChange={setWeeklyEndDate}
                    label="Select Weekly Range"
                  />
                )}

                {selectedRoster === "fortnightly" && (
                  <DateRangePicker
                    startDate={fortnightlyStartDate}
                    endDate={fortnightlyEndDate}
                    onStartDateChange={setFortnightlyStartDate}
                    onEndDateChange={setFortnightlyEndDate}
                    label="Select 15 Days Range"
                  />
                )}

                {selectedRoster === "monthly" && (
                  <DateRangePicker
                    startDate={monthlyStartDate}
                    endDate={monthlyEndDate}
                    onStartDateChange={setMonthlyStartDate}
                    onEndDateChange={setMonthlyEndDate}
                    label="Select Monthly Range"
                  />
                )}
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateDate("next")}
                  disabled={loadingData.roster}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
                {selectedRoster === "daily" && "Daily View - Single Day"}
                {selectedRoster === "weekly" && `Weekly View - ${differenceInDays(weeklyEndDate, weeklyStartDate) + 1} Days`}
                {selectedRoster === "fortnightly" && `15 Days View - ${differenceInDays(fortnightlyEndDate, fortnightlyStartDate) + 1} Days`}
                {selectedRoster === "monthly" && `Monthly View - ${differenceInDays(monthlyEndDate, monthlyStartDate) + 1} Days`}
              </div>
            </div>

            {isMobileView && showMobileStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <MobileStatCard
                  title="Total Entries"
                  value={filteredRoster.length.toString()}
                  icon={Calendar}
                  color="primary"
                />
                <MobileStatCard
                  title="Total Hours"
                  value={`${filteredRoster.reduce((sum, entry) => sum + entry.hours, 0)}h`}
                  icon={Clock}
                  color="success"
                />
                <MobileStatCard
                  title="Unique Employees"
                  value={new Set(filteredRoster.map(entry => entry.employeeId)).size.toString()}
                  icon={User}
                  color="warning"
                />
              </div>
            ) : !isMobileView ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{filteredRoster.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Across {Object.keys(groupedRoster).length} days
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {filteredRoster.reduce((sum, entry) => sum + entry.hours, 0)}h
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average: {(filteredRoster.reduce((sum, entry) => sum + entry.hours, 0) / (filteredRoster.length || 1)).toFixed(1)}h per entry
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Unique Employees</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {new Set(filteredRoster.map(entry => entry.employeeId)).size}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Out of {employees.length} total employees
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-4 mb-6">
              <Dialog open={addEntryDialogOpen} onOpenChange={setAddEntryDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    disabled={loadingData.sites || loadingData.supervisors || loadingData.managers || loadingData.employees || loadingData.tasks || sites.length === 0}
                    className="w-full sm:w-auto"
                    size={isMobileView ? "default" : "default"}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      Add Roster Entry - {addEntryFormType === "fortnightly" ? "15 DAYS" : addEntryFormType.toUpperCase()} ROSTER
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      Fill in the details below to create a new roster entry
                    </p>
                  </DialogHeader>
                  <AddEntryForm />
                </DialogContent>
              </Dialog>

              <Dialog open={editEntryDialogOpen} onOpenChange={setEditEntryDialogOpen}>
                <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      Edit Roster Entry
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      Update the details below to modify the roster entry
                    </p>
                  </DialogHeader>
                  <EditEntryForm />
                </DialogContent>
              </Dialog>
            </div>

            {selectedRoster === "monthly" ? (
              <MonthlyCalendarView />
            ) : (
              <DailyRosterTable 
                roster={filteredRoster} 
                onDelete={handleDeleteRoster}
                onUpdate={openEditDialog}
                onViewDetails={handleViewDetails}
              />
            )}
          </CardContent>
        </Card>

        {/* View Details Dialog */}
        <RosterDetailDialog 
          entry={selectedEntryForDetails}
          open={viewDetailsDialogOpen}
          onClose={() => {
            setViewDetailsDialogOpen(false);
            setSelectedEntryForDetails(null);
          }}
        />
      </div>
    </div>
  );
};

export default SupervisorRosterSection;
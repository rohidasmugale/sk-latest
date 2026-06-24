import { useState, useEffect, useMemo, useRef } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Download, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Loader2, 
  Users,
  Building,
  CheckCircle,
  AlertCircle,
  Clock,
  Paperclip,
  User,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Briefcase,
  DollarSign,
  FilePieChart,
  CheckSquare,
  Download as DownloadIcon,
  Receipt,
  Filter,
  Search,
  Clock4,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  FileSpreadsheet,
  FileDown,
  File,
  ChevronRight,
  Sparkles,
  Zap,
  TrendingDown,
  Award,
  Target,
  Percent,
  LineChart as LineChartIcon,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Menu,
  X
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import taskService, { type Task } from "@/services/TaskService";
import * as XLSX from 'xlsx';

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

// Interfaces (same as before)
interface LeaveData {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  contactNumber?: string;
  reason?: string;
  appliedBy?: string;
  appliedFor?: string;
}

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hoursWorked: number;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'leave' | 'weekend' | 'holiday';
  overtime: number;
  notes?: string;
  site?: string;
  shift?: string;
  lateByMinutes?: number;
  earlyDeparture?: boolean;
  createdBy?: string;
}

interface AttendanceReportSummary {
  id: number;
  employee: string;
  employeeId: string;
  department: string;
  present: number;
  absent: number;
  leaves: number;
  totalDays: number;
  percentage: string;
  lateArrivals: number;
  earlyDepartures: number;
  averageHours: string;
  overtimeHours: number;
}

interface TaskReportData {
  id: string;
  title: string;
  description: string;
  assignedToName: string;
  siteName: string;
  clientName: string;
  priority: string;
  status: string;
  deadline: string;
  dueDateTime: string;
  taskType: string;
  hourlyUpdatesCount: number;
  attachmentsCount: number;
  createdAt: string;
}

interface ExpenseData {
  _id: string;
  expenseId: string;
  category: string;
  description: string;
  amount: number;
  baseAmount: number;
  gst: number;
  date: string;
  status: "pending" | "approved" | "rejected";
  vendor: string;
  paymentMethod: string;
  site: string;
  siteId?: string;
  expenseType: "operational" | "office" | "other";
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface FinancialData {
  category: string;
  value: number;
}

interface TaskCompletionData {
  name: string;
  value: number;
  color: string;
}

interface EmployeeData {
  employeeId: string;
  name: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  status: string;
}

// Mobile responsive filter card
const MobileFilterCard = ({
  children,
  title,
  icon: Icon,
  onClear,
  showClear = false
}: {
  children: React.ReactNode;
  title: string;
  icon: React.ElementType;
  onClear?: () => void;
  showClear?: boolean;
}) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader 
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {showClear && onClear && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="p-4 pt-0 border-t">
          {children}
        </CardContent>
      )}
    </Card>
  );
};

// Mobile responsive stat card
const MobileStatCard = ({
  title,
  value,
  icon: Icon,
  color = "blue",
  prefix = "",
  suffix = "",
  trend = null
}: {
  title: string;
  value: number;
  icon: any;
  color?: string;
  prefix?: string;
  suffix?: string;
  trend?: number | null;
}) => {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    cyan: "bg-cyan-100 text-cyan-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
    red: "bg-red-100 text-red-600"
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold mt-1">
              {prefix}{value.toLocaleString()}{suffix}
            </p>
            {trend !== null && (
              <div className="flex items-center gap-1 mt-1">
                {trend > 0 ? (
                  <>
                    <ArrowUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">{trend}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-600">{Math.abs(trend)}%</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Mobile responsive employee attendance card
const MobileEmployeeAttendanceCard = ({ record }: { record: AttendanceReportSummary }) => {
  const [expanded, setExpanded] = useState(false);
  const percentage = parseFloat(record.percentage);

  return (
    <Card className="mb-3 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold">{record.employee}</h3>
            <p className="text-xs text-muted-foreground">ID: {record.employeeId}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-xs text-green-600">Present</p>
            <p className="text-sm font-bold text-green-700">{record.present}</p>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <p className="text-xs text-red-600">Absent</p>
            <p className="text-sm font-bold text-red-700">{record.absent}</p>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded">
            <p className="text-xs text-purple-600">Leave</p>
            <p className="text-sm font-bold text-purple-700">{record.leaves}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="bg-blue-50">
            {record.department}
          </Badge>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs">{record.averageHours}</span>
          </div>
          <div className={`text-sm font-bold ${
            percentage >= 90 ? "text-green-600" :
            percentage >= 75 ? "text-yellow-600" : "text-red-600"
          }`}>
            {record.percentage}
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Late Arrivals</p>
                <p className="text-sm font-medium">{record.lateArrivals}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overtime Hours</p>
                <p className="text-sm font-medium">{record.overtimeHours}h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Days</p>
                <p className="text-sm font-medium">{record.totalDays}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Early Departures</p>
                <p className="text-sm font-medium">{record.earlyDepartures}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Mobile responsive task card
const MobileTaskReportCard = ({ task }: { task: TaskReportData }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="mb-3 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-base">{task.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Badge variant={
            task.priority === 'high' ? 'destructive' :
            task.priority === 'medium' ? 'default' : 'secondary'
          } className="text-xs">
            {task.priority}
          </Badge>
          <Badge variant="outline" className={
            task.status === 'completed' ? 'bg-green-100 text-green-800' :
            task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
            task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }>
            {task.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="truncate">{task.assignedToName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Building className="h-3 w-3 text-muted-foreground" />
            <span className="truncate">{task.siteName}</span>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Client</p>
                <p className="text-sm">{task.clientName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="text-sm">{task.deadline}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm capitalize">{task.taskType}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm">{new Date(task.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50">
                <Clock className="h-3 w-3 mr-1" />
                Updates: {task.hourlyUpdatesCount}
              </Badge>
              <Badge variant="outline" className="bg-purple-50">
                <Paperclip className="h-3 w-3 mr-1" />
                Attachments: {task.attachmentsCount}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Mobile responsive expense card
const MobileExpenseCard = ({ expense }: { expense: ExpenseData }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="mb-3 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{expense.expenseId}</h3>
              <Badge variant="outline" className={
                expense.status === 'approved' ? 'bg-green-100 text-green-800' :
                expense.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }>
                {expense.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{expense.description}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="bg-blue-50">
            {expense.category}
          </Badge>
          <span className="font-bold text-green-600">{formatCurrency(expense.amount)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Building className="h-3 w-3 text-muted-foreground" />
            <span className="truncate">{expense.site}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{new Date(expense.date).toLocaleDateString()}</span>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Vendor</p>
              <p className="text-sm">{expense.vendor}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Base Amount</p>
                <p className="text-sm">{formatCurrency(expense.baseAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">GST</p>
                <p className="text-sm">{formatCurrency(expense.gst)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment Method</p>
                <p className="text-sm">{expense.paymentMethod}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm capitalize">{expense.expenseType}</p>
              </div>
            </div>
            {expense.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm">{expense.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

const cardVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

const chartVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.2,
      duration: 0.5
    }
  }
};

// Color themes
const themeColors = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#8b5cf6",
  dark: "#1f2937"
};

// Gradient backgrounds
const gradientBg = {
  blue: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  green: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  purple: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
  orange: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  red: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  dark: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
  cyan: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
};

// Attendance Status Colors
const getAttendanceStatusColor = (status: string) => {
  switch (status) {
    case 'present': return 'bg-green-100 text-green-800 border-green-200';
    case 'absent': return 'bg-red-100 text-red-800 border-red-200';
    case 'late': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'half-day': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'leave': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'weekend': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'holiday': return 'bg-pink-100 text-pink-800 border-pink-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Expense categories
const expenseCategories = [
  "Cleaning Supplies",
  "Security Equipment",
  "Office Supplies",
  "Utilities",
  "Maintenance",
  "Transportation",
  "Staff Welfare",
  "Training",
  "Marketing",
  "Legal Fees",
  "Insurance",
  "Software",
  "Hardware",
  "Travel",
  "Food & Beverages",
  "Miscellaneous"
];

const getExpenseStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getExpenseTypeColor = (type: string) => {
  switch (type) {
    case "operational":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "office":
      return "bg-green-100 text-green-800 border-green-200";
    case "other":
      return "bg-purple-100 text-purple-800 border-purple-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Helper function to calculate working days between dates
const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

// Animated Counter Component
const AnimatedCounter = ({ value, prefix = "", suffix = "", duration = 2000 }: { value: number; prefix?: string; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    const incrementTime = duration / end;
    
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, incrementTime);
    
    return () => clearInterval(timer);
  }, [value, duration]);
  
  return (
    <motion.span
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      {prefix}{count}{suffix}
    </motion.span>
  );
};

// Animated Stat Card Component
const AnimatedStatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue",
  prefix = "",
  suffix = "",
  trend = null,
  delay = 0 
}: { 
  title: string; 
  value: number; 
  icon: any;
  color?: string;
  prefix?: string;
  suffix?: string;
  trend?: number | null;
  delay?: number;
}) => (
  <motion.div
    variants={cardVariants}
    initial="hidden"
    animate="visible"
    transition={{ delay }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    className="relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-lg dark:bg-gray-900"
  >
    <div 
      className="absolute top-0 right-0 h-20 w-20 opacity-10"
      style={{ background: gradientBg[color as keyof typeof gradientBg] }}
    />
    <CardContent className="pt-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold mt-2 text-${color}-600 dark:text-${color}-400`}>
            {prefix}
            <AnimatedCounter value={value} />
            {suffix}
          </p>
          {trend !== null && (
            <div className="flex items-center gap-1 mt-2">
              {trend > 0 ? (
                <>
                  <ArrowUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">{trend}%</span>
                </>
              ) : (
                <>
                  <ArrowDown className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-600">{Math.abs(trend)}%</span>
                </>
              )}
              <span className="text-xs text-muted-foreground">from last month</span>
            </div>
          )}
        </div>
        <div 
          className="p-3 rounded-lg"
          style={{ background: gradientBg[color as keyof typeof gradientBg] }}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </CardContent>
  </motion.div>
);

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="space-y-4"
  >
    {[1, 2, 3].map(i => (
      <div key={i} className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    ))}
  </motion.div>
);

// Enhanced Badge Component
const EnhancedBadge = ({ 
  children, 
  variant = "default",
  className = "",
  withAnimation = false 
}: { 
  children: React.ReactNode; 
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
  withAnimation?: boolean;
}) => {
  const variantClasses = {
    default: "bg-gray-100 text-gray-800 border-gray-200",
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    danger: "bg-red-100 text-red-800 border-red-200",
    info: "bg-blue-100 text-blue-800 border-blue-200"
  };

  return (
    <motion.span
      initial={withAnimation ? { scale: 0 } : {}}
      animate={withAnimation ? { scale: 1 } : {}}
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variantClasses[variant]} ${className}`}
    >
      {children}
    </motion.span>
  );
};

const Reports = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  
  // Mobile responsive state
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // State for attendance reports
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [leaveData, setLeaveData] = useState<LeaveData[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceReport, setAttendanceReport] = useState<AttendanceReportSummary[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeData[]>([]);
  
  // State for task reports
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskFilterStatus, setTaskFilterStatus] = useState("all");
  const [taskFilterPriority, setTaskFilterPriority] = useState("all");
  const [taskFilterSite, setTaskFilterSite] = useState("all");
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  
  // State for expense reports
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseData[]>([]);
  const [expenseFilterStatus, setExpenseFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [expenseFilterType, setExpenseFilterType] = useState<"all" | "operational" | "office" | "other">("all");
  const [expenseSearchTerm, setExpenseSearchTerm] = useState("");
  const [expenseDateFrom, setExpenseDateFrom] = useState("");
  const [expenseDateTo, setExpenseDateTo] = useState("");
  const [expenseLoading, setExpenseLoading] = useState(false);
  
  // Common state
  const [departments, setDepartments] = useState<string[]>(["All Departments"]);
  const [sites, setSites] = useState<string[]>(["All Sites"]);
  const [activeTab, setActiveTab] = useState("attendance");

  // Check for mobile view on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Add tab change animation
  const tabContentVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20
      }
    },
    exit: { opacity: 0, x: 20 }
  };

  // Fetch all employees from database
 const fetchAllEmployees = async () => {
  try {
    const response = await fetch(`${API_URL}/leaves/test/employees`);
    if (!response.ok) {
      throw new Error('Failed to fetch employees');
    }
    const data = await response.json();
    console.log('Employees data response:', data); // Debug log
    
    let employeesArray: EmployeeData[] = [];
    
    if (data.success && Array.isArray(data.sampleEmployees)) {
      employeesArray = data.sampleEmployees;
    } else if (Array.isArray(data)) {
      employeesArray = data;
    } else if (data && data.employees && Array.isArray(data.employees)) {
      employeesArray = data.employees;
    } else {
      employeesArray = [];
    }
    
    setAllEmployees(employeesArray);
    const uniqueDepts = Array.from(new Set(employeesArray.map((emp: EmployeeData) => emp.department)));
    setDepartments(["All Departments", ...uniqueDepts]);
  } catch (error) {
    console.error("Error fetching employees:", error);
    toast.error("Failed to load employees data");
    setAllEmployees([]);
  }
};

  // Fetch attendance records from API
  const fetchAttendanceRecords = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      if (dateFrom) params.append('startDate', dateFrom);
      if (dateTo) params.append('endDate', dateTo);
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      
      const response = await fetch(`${API_URL}/attendance?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAttendanceRecords(data.data || []);
        await fetchLeaveData();
      } else {
        throw new Error(data.message || 'Failed to fetch attendance data');
      }
    } catch (error: any) {
      console.error("Error fetching attendance data:", error);
      toast.error(error.message || "Failed to load attendance data");
      setAttendanceRecords([]);
      setAttendanceRecords(generateMockAttendanceData());
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock attendance data for demonstration
  const generateMockAttendanceData = (): AttendanceRecord[] => {
    const mockData: AttendanceRecord[] = [];
    const employees = [
      { id: "EMP001", name: "John Doe", department: "HR" },
      { id: "EMP002", name: "Jane Smith", department: "IT" },
      { id: "EMP003", name: "Mike Johnson", department: "Operations" },
      { id: "EMP004", name: "Sarah Williams", department: "Sales" },
      { id: "EMP005", name: "Robert Brown", department: "Marketing" },
    ];
    
    const startDate = new Date(dateFrom || '2024-01-01');
    const endDate = new Date(dateTo || '2024-01-31');
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        employees.forEach(emp => {
          const statusOptions: Array<AttendanceRecord['status']> = ['present', 'present', 'present', 'late', 'half-day', 'absent'];
          const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
          
          let checkIn = "09:00";
          let checkOut = "18:00";
          let hoursWorked = 8;
          let overtime = 0;
          let lateByMinutes = 0;
          
          if (status === 'late') {
            checkIn = "09:30";
            lateByMinutes = 30;
            hoursWorked = 7.5;
          } else if (status === 'half-day') {
            checkOut = "13:00";
            hoursWorked = 4;
          } else if (status === 'absent') {
            checkIn = "";
            checkOut = "";
            hoursWorked = 0;
          } else {
            if (Math.random() > 0.7) {
              overtime = Math.floor(Math.random() * 3);
              checkOut = "19:00";
              hoursWorked = 9;
            }
          }
          
          mockData.push({
            _id: `${emp.id}-${dateStr}`,
            employeeId: emp.id,
            employeeName: emp.name,
            department: emp.department,
            date: dateStr,
            checkIn,
            checkOut,
            hoursWorked,
            status,
            overtime,
            lateByMinutes: status === 'late' ? lateByMinutes : undefined,
            site: "Main Office"
          });
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return mockData;
  };

  // Fetch leave data for attendance calculation
const fetchLeaveData = async () => {
  try {
    const response = await fetch(`${API_URL}/leaves?status=approved`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch leave data');
    }
    
    const data = await response.json();
    console.log('Leave data response:', data); // Debug log
    
    // Fix: Ensure leaveData is always an array
    if (data && data.success && Array.isArray(data.data)) {
      setLeaveData(data.data);
    } else if (Array.isArray(data)) {
      setLeaveData(data);
    } else if (data && data.leaves && Array.isArray(data.leaves)) {
      setLeaveData(data.leaves);
    } else {
      // If no valid array found, set empty array
      console.warn('Unexpected leave data format:', data);
      setLeaveData([]);
    }
  } catch (error) {
    console.error("Error fetching leave data:", error);
    setLeaveData([]); // Set empty array on error
  }
};

  // Fetch all tasks
const fetchAllTasks = async () => {
  try {
    setIsLoading(true);
    const tasksData = await taskService.getAllTasks();
    const tasksArray = Array.isArray(tasksData) ? tasksData : [];
    setTasks(tasksArray);
    
    const uniqueSites = Array.from(new Set(tasksArray
      .filter(task => task.siteName && task.siteName !== "Unspecified Site")
      .map(task => task.siteName)
    ));
    setSites(["All Sites", ...uniqueSites]);
    
  } catch (error: any) {
    console.error("Error fetching tasks:", error);
    toast.error(error.message || "Failed to load tasks");
    setTasks([]);
  } finally {
    setIsLoading(false);
  }
};

  // Fetch all expenses from backend
 const fetchAllExpenses = async () => {
  try {
    setExpenseLoading(true);
    const response = await fetch(`${API_URL}/expenses?limit=1000`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch expenses');
    }
    
    const data = await response.json();
    console.log('Expenses data response:', data); // Debug log
    
    let expensesArray: ExpenseData[] = [];
    
    if (data.success && Array.isArray(data.data)) {
      expensesArray = data.data;
    } else if (Array.isArray(data)) {
      expensesArray = data;
    } else if (data && data.expenses && Array.isArray(data.expenses)) {
      expensesArray = data.expenses;
    } else {
      expensesArray = [];
    }
    
    setExpenses(expensesArray);
    setFilteredExpenses(expensesArray);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    toast.error("Failed to load expenses data");
    setExpenses([]);
    setFilteredExpenses([]);
  } finally {
    setExpenseLoading(false);
  }
};

  // Generate attendance report summary (same as before)
 const generateAttendanceReport = useMemo(() => {
  // Ensure attendanceRecords is an array
  const records = Array.isArray(attendanceRecords) ? attendanceRecords : [];
  const employeesList = Array.isArray(allEmployees) ? allEmployees : [];
  const leavesList = Array.isArray(leaveData) ? leaveData : [];
  
  if (records.length === 0 && employeesList.length === 0) {
    return [];
  }

  const report: AttendanceReportSummary[] = [];
  
  const startDate = dateFrom ? new Date(dateFrom) : new Date();
  const endDate = dateTo ? new Date(dateTo) : new Date();
  const totalWorkingDays = calculateWorkingDays(startDate, endDate);
  
  const employeeAttendance = new Map<string, {
    employeeId: string;
    employeeName: string;
    department: string;
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    leave: number;
    totalHours: number;
    overtimeHours: number;
    records: AttendanceRecord[];
  }>();
  
  records.forEach(record => {
    const key = record.employeeId;
    if (!employeeAttendance.has(key)) {
      employeeAttendance.set(key, {
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        department: record.department,
        present: 0,
        absent: 0,
        late: 0,
        halfDay: 0,
        leave: 0,
        totalHours: 0,
        overtimeHours: 0,
        records: []
      });
    }
    
    const stats = employeeAttendance.get(key)!;
    stats.records.push(record);
    
    switch (record.status) {
      case 'present':
        stats.present++;
        break;
      case 'absent':
        stats.absent++;
        break;
      case 'late':
        stats.late++;
        stats.present++;
        break;
      case 'half-day':
        stats.halfDay++;
        stats.present++;
        break;
      case 'leave':
        stats.leave++;
        break;
    }
    
    stats.totalHours += record.hoursWorked;
    stats.overtimeHours += record.overtime || 0;
  });
  
  const employeeLeaves = new Map<string, number>();
  leavesList.forEach(leave => {
    if (leave.status === 'approved') {
      const key = leave.employeeId;
      employeeLeaves.set(key, (employeeLeaves.get(key) || 0) + leave.totalDays);
    }
  });
  
  let id = 1;
  employeeAttendance.forEach((stats, employeeId) => {
    const leaveDays = employeeLeaves.get(employeeId) || 0;
    const totalPresent = stats.present + stats.halfDay;
    const totalAbsent = totalWorkingDays - totalPresent - leaveDays;
    const attendancePercentage = totalWorkingDays > 0 
      ? ((totalPresent / totalWorkingDays) * 100).toFixed(1) + '%'
      : '0%';
    const averageHours = stats.present > 0 
      ? (stats.totalHours / stats.present).toFixed(1) + ' hrs'
      : '0 hrs';
    
    report.push({
      id: id++,
      employee: stats.employeeName,
      employeeId: stats.employeeId,
      department: stats.department,
      present: totalPresent,
      absent: Math.max(0, totalAbsent),
      leaves: leaveDays,
      totalDays: totalWorkingDays,
      percentage: attendancePercentage,
      lateArrivals: stats.late,
      earlyDepartures: 0,
      averageHours,
      overtimeHours: stats.overtimeHours
    });
  });
  
  employeesList.forEach(emp => {
    if (!employeeAttendance.has(emp.employeeId)) {
      const leaveDays = employeeLeaves.get(emp.employeeId) || 0;
      const totalAbsent = totalWorkingDays - leaveDays;
      
      report.push({
        id: id++,
        employee: emp.name,
        employeeId: emp.employeeId,
        department: emp.department,
        present: 0,
        absent: Math.max(0, totalAbsent),
        leaves: leaveDays,
        totalDays: totalWorkingDays,
        percentage: '0%',
        lateArrivals: 0,
        earlyDepartures: 0,
        averageHours: '0 hrs',
        overtimeHours: 0
      });
    }
  });
  
  return report;
}, [attendanceRecords, leaveData, allEmployees, dateFrom, dateTo]);

  // Filter attendance report by department
const getFilteredAttendanceReport = useMemo(() => {
  const reportArray = Array.isArray(generateAttendanceReport) ? generateAttendanceReport : [];
  if (selectedDepartment === "all") {
    return reportArray;
  }
  return reportArray.filter(record => record.department === selectedDepartment);
}, [generateAttendanceReport, selectedDepartment]);

  // Prepare attendance data for charts
const getAttendanceChartData = useMemo(() => {
  const reportArray = Array.isArray(generateAttendanceReport) ? generateAttendanceReport : [];
  const departmentStats = new Map();
  
  reportArray.forEach(record => {
    if (!departmentStats.has(record.department)) {
      departmentStats.set(record.department, {
        department: record.department,
        totalEmployees: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalLeaves: 0,
        totalLate: 0
      });
    }
    
    const stats = departmentStats.get(record.department);
    stats.totalEmployees++;
    stats.totalPresent += record.present;
    stats.totalAbsent += record.absent;
    stats.totalLeaves += record.leaves;
    stats.totalLate += record.lateArrivals;
  });
  
  return Array.from(departmentStats.values()).map(stats => ({
    department: stats.department,
    present: Math.round(stats.totalPresent / stats.totalEmployees),
    absent: Math.round(stats.totalAbsent / stats.totalEmployees),
    leaves: Math.round(stats.totalLeaves / stats.totalEmployees),
    late: Math.round(stats.totalLate / stats.totalEmployees)
  }));
}, [generateAttendanceReport]);

  // Prepare daily attendance trend data
const getDailyAttendanceData = useMemo(() => {
  const recordsArray = Array.isArray(attendanceRecords) ? attendanceRecords : [];
  const dailyStats = new Map<string, { date: string; present: number; absent: number; late: number }>();
  
  recordsArray.forEach(record => {
    const date = record.date.split('T')[0];
    if (!dailyStats.has(date)) {
      dailyStats.set(date, { date, present: 0, absent: 0, late: 0 });
    }
    
    const stats = dailyStats.get(date)!;
    if (record.status === 'present' || record.status === 'late' || record.status === 'half-day') {
      stats.present++;
      if (record.status === 'late') {
        stats.late++;
      }
    } else if (record.status === 'absent') {
      stats.absent++;
    }
  });
  
  return Array.from(dailyStats.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-15);
}, [attendanceRecords]);

  // Filter expenses based on filters
  useEffect(() => {
    let result = [...expenses];
    
    if (expenseFilterStatus !== "all") {
      result = result.filter(expense => expense.status === expenseFilterStatus);
    }
    
    if (expenseFilterType !== "all") {
      result = result.filter(expense => expense.expenseType === expenseFilterType);
    }
    
    if (expenseDateFrom) {
      result = result.filter(expense => new Date(expense.date) >= new Date(expenseDateFrom));
    }
    
    if (expenseDateTo) {
      const toDate = new Date(expenseDateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(expense => new Date(expense.date) <= toDate);
    }
    
    if (expenseSearchTerm) {
      const searchLower = expenseSearchTerm.toLowerCase();
      result = result.filter(expense => 
        expense.expenseId.toLowerCase().includes(searchLower) ||
        expense.description.toLowerCase().includes(searchLower) ||
        expense.vendor.toLowerCase().includes(searchLower) ||
        expense.category.toLowerCase().includes(searchLower) ||
        expense.site.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredExpenses(result);
  }, [expenses, expenseFilterStatus, expenseFilterType, expenseDateFrom, expenseDateTo, expenseSearchTerm]);

  // Filter tasks for report
  const getFilteredTasks = useMemo(() => {
    let filtered = tasks;

    if (taskSearchQuery.trim()) {
      const searchLower = taskSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower) ||
        task.assignedToName.toLowerCase().includes(searchLower) ||
        task.siteName.toLowerCase().includes(searchLower) ||
        task.clientName.toLowerCase().includes(searchLower)
      );
    }

    if (taskFilterStatus !== "all") {
      filtered = filtered.filter(task => task.status === taskFilterStatus);
    }

    if (taskFilterPriority !== "all") {
      filtered = filtered.filter(task => task.priority === taskFilterPriority);
    }

    if (taskFilterSite !== "all") {
      filtered = filtered.filter(task => task.siteName === taskFilterSite);
    }

    return filtered;
  }, [tasks, taskSearchQuery, taskFilterStatus, taskFilterPriority, taskFilterSite]);

  // Prepare task report data
 const taskReportData: TaskReportData[] = useMemo(() => {
  const filteredTasks = Array.isArray(getFilteredTasks) ? getFilteredTasks : [];
  return filteredTasks.map(task => ({
    id: task._id,
    title: task.title,
    description: task.description,
    assignedToName: task.assignedToName,
    siteName: task.siteName,
    clientName: task.clientName,
    priority: task.priority,
    status: task.status,
    deadline: new Date(task.deadline).toLocaleDateString(),
    dueDateTime: task.dueDateTime ? new Date(task.dueDateTime).toLocaleString() : "N/A",
    taskType: task.taskType || "routine",
    hourlyUpdatesCount: task.hourlyUpdates?.length || 0,
    attachmentsCount: task.attachments?.length || 0,
    createdAt: new Date(task.createdAt).toLocaleString()
  }));
}, [getFilteredTasks]);


  // Task statistics for charts
 const taskStats = useMemo(() => {
  const tasksArray = Array.isArray(tasks) ? tasks : [];
  const stats = {
    total: tasksArray.length,
    completed: tasksArray.filter(t => t.status === 'completed').length,
    inProgress: tasksArray.filter(t => t.status === 'in-progress').length,
    pending: tasksArray.filter(t => t.status === 'pending').length,
    cancelled: tasksArray.filter(t => t.status === 'cancelled').length,
    highPriority: tasksArray.filter(t => t.priority === 'high').length,
    mediumPriority: tasksArray.filter(t => t.priority === 'medium').length,
    lowPriority: tasksArray.filter(t => t.priority === 'low').length
  };
  
  return stats;
}, [tasks]);

  // Expense statistics
const expenseStats = useMemo(() => {
  const expensesArray = Array.isArray(filteredExpenses) ? filteredExpenses : [];
  const totalExpenses = expensesArray.reduce((sum, expense) => sum + expense.amount, 0);
  const approvedExpenses = expensesArray.filter(e => e.status === 'approved');
  const pendingExpenses = expensesArray.filter(e => e.status === 'pending');
  const rejectedExpenses = expensesArray.filter(e => e.status === 'rejected');
  
  const operationalExpenses = expensesArray.filter(e => e.expenseType === 'operational')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const officeExpenses = expensesArray.filter(e => e.expenseType === 'office')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const otherExpenses = expensesArray.filter(e => e.expenseType === 'other')
    .reduce((sum, expense) => sum + expense.amount, 0);
  
  const categoryStats = expensesArray.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);
  
  const monthlyStats = expensesArray.reduce((acc, expense) => {
    const date = new Date(expense.date);
    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    acc[monthYear] = (acc[monthYear] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);
  
  const monthlyData = Object.entries(monthlyStats)
    .map(([month, amount]) => ({
      month: month,
      amount: amount
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
  
  const topCategories = Object.entries(categoryStats)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
  
  return {
    totalExpenses,
    approvedExpenses: approvedExpenses.length,
    pendingExpenses: pendingExpenses.length,
    rejectedExpenses: rejectedExpenses.length,
    operationalExpenses,
    officeExpenses,
    otherExpenses,
    categoryData: topCategories,
    monthlyData,
    totalTransactions: expensesArray.length
  };
}, [filteredExpenses]);

  // Task completion data for pie chart
  const taskCompletionData: TaskCompletionData[] = useMemo(() => [
    { name: "Completed", value: taskStats.completed, color: "#10b981" },
    { name: "In Progress", value: taskStats.inProgress, color: "#3b82f6" },
    { name: "Pending", value: taskStats.pending, color: "#f59e0b" },
    { name: "Cancelled", value: taskStats.cancelled, color: "#ef4444" }
  ], [taskStats]);

  // Task priority data for bar chart
  const taskPriorityData = useMemo(() => [
    { priority: "High", count: taskStats.highPriority, color: "#ef4444" },
    { priority: "Medium", count: taskStats.mediumPriority, color: "#f59e0b" },
    { priority: "Low", count: taskStats.lowPriority, color: "#10b981" }
  ], [taskStats]);

  // Financial data from expenses
  const financialData: FinancialData[] = useMemo(() => [
    { category: "Operational", value: expenseStats.operationalExpenses },
    { category: "Office", value: expenseStats.officeExpenses },
    { category: "Other", value: expenseStats.otherExpenses }
  ], [expenseStats]);

  // Category data for pie chart
  const expenseCategoryData = useMemo(() => {
    return expenseStats.categoryData.map((item, index) => ({
      name: item.category,
      value: item.amount,
      color: `hsl(${index * 30}, 70%, 50%)`
    }));
  }, [expenseStats]);

  // Helper function to export data as CSV (same as before)
  const exportToCSV = (data: any[], filename: string) => {
    try {
      setIsExporting(true);
      
      if (data.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      const headers = Object.keys(data[0] || {});
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ];
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Report exported as CSV: ${filename}`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper function to export data as Excel (same as before)
  const exportToExcel = (data: any[], filename: string, sheetName = 'Sheet1') => {
    try {
      setIsExporting(true);
      
      if (data.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      XLSX.writeFile(workbook, filename);
      
      toast.success(`Report exported as Excel: ${filename}`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  // Export functions (same as before)
  const exportAttendanceReport = (format: 'csv' | 'excel') => {
    if (getFilteredAttendanceReport.length === 0) {
      toast.error('No attendance data to export');
      return;
    }

    const data = getFilteredAttendanceReport.map(record => ({
      'Employee ID': record.employeeId,
      'Employee Name': record.employee,
      'Department': record.department,
      'Present Days': record.present,
      'Absent Days': record.absent,
      'Leave Days': record.leaves,
      'Total Days': record.totalDays,
      'Attendance %': record.percentage,
      'Late Arrivals': record.lateArrivals,
      'Early Departures': record.earlyDepartures,
      'Average Hours': record.averageHours,
      'Overtime Hours': record.overtimeHours
    }));

    const filename = `attendance-report-${selectedDepartment === "all" ? "all" : selectedDepartment}-${dateFrom}-to-${dateTo}`;
    
    if (format === 'csv') {
      exportToCSV(data, `${filename}.csv`);
    } else {
      exportToExcel(data, `${filename}.xlsx`, 'Attendance Report');
    }
  };

  const exportTaskReport = (format: 'csv' | 'excel') => {
    if (taskReportData.length === 0) {
      toast.error('No task data to export');
      return;
    }

    const data = taskReportData.map(task => ({
      'Task ID': task.id,
      'Title': task.title,
      'Description': task.description,
      'Assignee': task.assignedToName,
      'Site': task.siteName,
      'Client': task.clientName,
      'Priority': task.priority,
      'Status': task.status,
      'Deadline': task.deadline,
      'Due Date': task.dueDateTime,
      'Task Type': task.taskType,
      'Hourly Updates': task.hourlyUpdatesCount,
      'Attachments': task.attachmentsCount,
      'Created At': task.createdAt
    }));

    const filename = `task-report-${taskFilterStatus}-${taskFilterPriority}-${taskFilterSite}-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      exportToCSV(data, `${filename}.csv`);
    } else {
      exportToExcel(data, `${filename}.xlsx`, 'Task Report');
    }
  };

  const exportExpenseReport = (format: 'csv' | 'excel') => {
    if (filteredExpenses.length === 0) {
      toast.error('No expense data to export');
      return;
    }

    const data = filteredExpenses.map(expense => ({
      'Expense ID': expense.expenseId,
      'Category': expense.category,
      'Description': expense.description,
      'Vendor': expense.vendor,
      'Site': expense.site,
      'Amount': formatCurrency(expense.amount),
      'Base Amount': formatCurrency(expense.baseAmount),
      'GST': formatCurrency(expense.gst),
      'Date': new Date(expense.date).toLocaleDateString(),
      'Status': expense.status,
      'Type': expense.expenseType,
      'Payment Method': expense.paymentMethod,
      'Created By': expense.createdBy,
      'Notes': expense.notes || ''
    }));

    const filename = `expense-report-${expenseFilterStatus}-${expenseFilterType}-${expenseDateFrom || 'all'}-to-${expenseDateTo || 'all'}`;
    
    if (format === 'csv') {
      exportToCSV(data, `${filename}.csv`);
    } else {
      exportToExcel(data, `${filename}.xlsx`, 'Expense Report');
    }
  };

  const exportAttendanceRecords = (format: 'csv' | 'excel') => {
    if (attendanceRecords.length === 0) {
      toast.error('No attendance records to export');
      return;
    }

    const data = attendanceRecords.map(record => ({
      'Employee ID': record.employeeId,
      'Employee Name': record.employeeName,
      'Department': record.department,
      'Date': record.date,
      'Check In': record.checkIn,
      'Check Out': record.checkOut,
      'Hours Worked': record.hoursWorked,
      'Status': record.status,
      'Overtime': record.overtime,
      'Site': record.site || '',
      'Shift': record.shift || '',
      'Late By Minutes': record.lateByMinutes || 0,
      'Notes': record.notes || ''
    }));

    const filename = `attendance-records-${dateFrom}-to-${dateTo}`;
    
    if (format === 'csv') {
      exportToCSV(data, `${filename}.csv`);
    } else {
      exportToExcel(data, `${filename}.xlsx`, 'Attendance Records');
    }
  };

  const exportExpenseSummary = (format: 'csv' | 'excel') => {
    const summaryData = [
      {
        'Metric': 'Total Expenses',
        'Value': formatCurrency(expenseStats.totalExpenses)
      },
      {
        'Metric': 'Total Transactions',
        'Value': expenseStats.totalTransactions
      },
      {
        'Metric': 'Approved Expenses',
        'Value': expenseStats.approvedExpenses
      },
      {
        'Metric': 'Pending Expenses',
        'Value': expenseStats.pendingExpenses
      },
      {
        'Metric': 'Rejected Expenses',
        'Value': expenseStats.rejectedExpenses
      },
      {
        'Metric': 'Operational Expenses',
        'Value': formatCurrency(expenseStats.operationalExpenses)
      },
      {
        'Metric': 'Office Expenses',
        'Value': formatCurrency(expenseStats.officeExpenses)
      },
      {
        'Metric': 'Other Expenses',
        'Value': formatCurrency(expenseStats.otherExpenses)
      }
    ];

    expenseStats.categoryData.forEach(category => {
      summaryData.push({
        'Metric': category.category,
        'Value': formatCurrency(category.amount)
      });
    });

    const filename = `expense-summary-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      exportToCSV(summaryData, `${filename}.csv`);
    } else {
      exportToExcel(summaryData, `${filename}.xlsx`, 'Expense Summary');
    }
  };

  const exportTaskSummary = (format: 'csv' | 'excel') => {
    const summaryData = [
      {
        'Metric': 'Total Tasks',
        'Value': taskStats.total
      },
      {
        'Metric': 'Completed Tasks',
        'Value': taskStats.completed
      },
      {
        'Metric': 'In Progress Tasks',
        'Value': taskStats.inProgress
      },
      {
        'Metric': 'Pending Tasks',
        'Value': taskStats.pending
      },
      {
        'Metric': 'Cancelled Tasks',
        'Value': taskStats.cancelled
      },
      {
        'Metric': 'Completion Rate',
        'Value': taskStats.total > 0 ? `${((taskStats.completed / taskStats.total) * 100).toFixed(1)}%` : '0%'
      },
      {
        'Metric': 'High Priority Tasks',
        'Value': taskStats.highPriority
      },
      {
        'Metric': 'Medium Priority Tasks',
        'Value': taskStats.mediumPriority
      },
      {
        'Metric': 'Low Priority Tasks',
        'Value': taskStats.lowPriority
      }
    ];

    const filename = `task-summary-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      exportToCSV(summaryData, `${filename}.csv`);
    } else {
      exportToExcel(summaryData, `${filename}.xlsx`, 'Task Summary');
    }
  };

  // Handle apply filters and refresh data
  const handleApplyFilters = async () => {
    try {
      setIsLoading(true);
      await fetchAttendanceRecords();
      toast.success("Filters applied and attendance data refreshed");
    } catch (error) {
      console.error("Error applying filters:", error);
      toast.error("Failed to apply filters");
    } finally {
      setIsLoading(false);
    }
  };

  // Clear expense filters
  const clearExpenseFilters = () => {
    setExpenseFilterStatus("all");
    setExpenseFilterType("all");
    setExpenseDateFrom("");
    setExpenseDateTo("");
    setExpenseSearchTerm("");
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchAllEmployees(),
        fetchAttendanceRecords(),
        fetchAllTasks(),
        fetchAllExpenses()
      ]);
    };
    
    fetchData();
  }, []);

  // Mobile tabs configuration
  const mobileTabs = [
    { value: "attendance", label: "Attendance", icon: Users },
    { value: "tasks", label: "Tasks", icon: CheckSquare },
    { value: "financial", label: "Financial", icon: Receipt }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <DashboardHeader 
        title="Reports & Analytics" 
        onMenuClick={onMenuClick}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-4 md:p-6 space-y-4 md:space-y-6"
      >
        {/* Mobile Tab Selector */}
        {isMobileView && (
          <div className="flex items-center bg-muted rounded-lg p-1 mb-4">
            {mobileTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.value}
                  variant={activeTab === tab.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab.value)}
                  className="flex-1"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* Report Filters with Enhanced UI */}
        {!isMobileView && (
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="border-2 border-blue-100 shadow-lg hover:shadow-xl transition-shadow duration-300 dark:border-blue-900">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Filter className="h-5 w-5 text-[#3b82f6]" />
                  <span className="bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] bg-clip-text text-transparent">
                    Advanced Report Filters
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-lg border shadow-sm">
                    <Calendar className="h-5 w-5 text-[#3b82f6]" />
                    <div className="flex gap-2">
                      <Input 
                        type="date" 
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-40 border-blue-200 focus:border-[#3b82f6] focus:ring-[#3b82f6]"
                        placeholder="From Date"
                      />
                      <span className="text-muted-foreground self-center">to</span>
                      <Input 
                        type="date" 
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-40 border-blue-200 focus:border-[#3b82f6] focus:ring-[#3b82f6]"
                        placeholder="To Date"
                      />
                    </div>
                  </div>
                  
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-48 border-blue-200 focus:border-[#3b82f6] focus:ring-[#3b82f6]">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept === "All Departments" ? "all" : dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    onClick={handleApplyFilters} 
                    disabled={isLoading}
                    className="bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] hover:from-[#2563eb] hover:to-[#0891b2] shadow-md hover:shadow-lg transition-all"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="mr-2 h-4 w-4" />
                    )}
                    Apply Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Mobile Filters Toggle */}
        {isMobileView && (
          <Button
            variant="outline"
            className="w-full mb-4"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
            {showMobileFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>
        )}

        {/* Mobile Filters */}
        {isMobileView && showMobileFilters && (
          <MobileFilterCard
            title="Date Range & Department"
            icon={Calendar}
            onClear={() => {
              const date = new Date();
              date.setDate(1);
              setDateFrom(date.toISOString().split('T')[0]);
              setDateTo(new Date().toISOString().split('T')[0]);
              setSelectedDepartment("all");
            }}
            showClear={true}
          >
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">From Date</label>
                <Input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">To Date</label>
                <Input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Department</label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept === "All Departments" ? "all" : dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleApplyFilters} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Apply Filters
              </Button>
            </div>
          </MobileFilterCard>
        )}

        {/* Tabs for different reports - Desktop */}
        {!isMobileView && (
          <Tabs defaultValue="attendance" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 p-1 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 rounded-xl">
              <TabsTrigger 
                value="attendance" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3b82f6] data-[state=active]:to-[#06b6d4] data-[state=active]:text-white rounded-lg transition-all"
              >
                <Users className="h-4 w-4" />
                Attendance
              </TabsTrigger>
              <TabsTrigger 
                value="tasks" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3b82f6] data-[state=active]:to-[#06b6d4] data-[state=active]:text-white rounded-lg transition-all"
              >
                <CheckSquare className="h-4 w-4" />
                Tasks
              </TabsTrigger>
              <TabsTrigger 
                value="financial" 
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3b82f6] data-[state=active]:to-[#06b6d4] data-[state=active]:text-white rounded-lg transition-all"
              >
                <Receipt className="h-4 w-4" />
                Financial
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <AnimatePresence mode="wait">
          {/* Attendance Report Tab */}
          {activeTab === "attendance" && (
            <motion.div
              key="attendance"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="mt-6">
                <Card className="border-2 shadow-xl">
                  <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
                    <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                      <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                        <Users className="h-5 w-5 md:h-6 md:w-6 text-[#3b82f6]" />
                        <span className="bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] bg-clip-text text-transparent">
                          Attendance Analytics Dashboard
                        </span>
                      </CardTitle>
                      {!isMobileView && (
                        <div className="flex gap-2">
                          <div className="relative group">
                            <Button 
                              variant="outline"
                              disabled={isExporting || getFilteredAttendanceReport.length === 0}
                              className="border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white"
                            >
                              <DownloadIcon className="mr-2 h-4 w-4" />
                              Export
                            </Button>
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                              <div className="py-1">
                                <button
                                  onClick={() => exportAttendanceReport('csv')}
                                  disabled={isExporting || getFilteredAttendanceReport.length === 0}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <FileDown className="mr-2 h-4 w-4" />
                                  Export Summary as CSV
                                </button>
                                <button
                                  onClick={() => exportAttendanceReport('excel')}
                                  disabled={isExporting || getFilteredAttendanceReport.length === 0}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                                  Export Summary as Excel
                                </button>
                                <button
                                  onClick={() => exportAttendanceRecords('csv')}
                                  disabled={isExporting || attendanceRecords.length === 0}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <FileDown className="mr-2 h-4 w-4" />
                                  Export Detailed Records
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 md:space-y-8 pt-4 md:pt-6">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8 md:py-12">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 md:h-12 md:w-12 animate-spin text-[#3b82f6] mx-auto" />
                          <p className="mt-4 text-base md:text-lg font-medium text-gray-600">Loading attendance data...</p>
                          <p className="text-sm text-gray-500">Please wait while we fetch your reports</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Attendance Statistics Cards */}
                        <motion.div
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
                        >
                          {isMobileView ? (
                            <>
                              <MobileStatCard
                                title="Total Employees"
                                value={getFilteredAttendanceReport.length}
                                icon={Users}
                                color="blue"
                              />
                              <MobileStatCard
                                title="Avg Attendance"
                                value={getFilteredAttendanceReport.length > 0 ? Math.round(getFilteredAttendanceReport.reduce((sum, record) => {
                                  const perc = parseFloat(record.percentage);
                                  return sum + (isNaN(perc) ? 0 : perc);
                                }, 0) / getFilteredAttendanceReport.length) : 0}
                                icon={Percent}
                                color="cyan"
                                suffix="%"
                              />
                              <MobileStatCard
                                title="Late Arrivals"
                                value={getFilteredAttendanceReport.reduce((sum, record) => sum + record.lateArrivals, 0)}
                                icon={Clock4}
                                color="orange"
                              />
                              <MobileStatCard
                                title="Overtime Hours"
                                value={getFilteredAttendanceReport.reduce((sum, record) => sum + record.overtimeHours, 0)}
                                icon={Clock}
                                color="purple"
                                suffix="h"
                              />
                            </>
                          ) : (
                            <>
                              <AnimatedStatCard
                                title="Total Employees"
                                value={getFilteredAttendanceReport.length}
                                icon={Users}
                                color="blue"
                                delay={0.1}
                              />
                              <AnimatedStatCard
                                title="Average Attendance"
                                value={getFilteredAttendanceReport.length > 0 ? Math.round(getFilteredAttendanceReport.reduce((sum, record) => {
                                  const perc = parseFloat(record.percentage);
                                  return sum + (isNaN(perc) ? 0 : perc);
                                }, 0) / getFilteredAttendanceReport.length) : 0}
                                icon={Percent}
                                color="cyan"
                                suffix="%"
                                delay={0.2}
                              />
                              <AnimatedStatCard
                                title="Late Arrivals"
                                value={getFilteredAttendanceReport.reduce((sum, record) => sum + record.lateArrivals, 0)}
                                icon={Clock4}
                                color="orange"
                                delay={0.3}
                              />
                              <AnimatedStatCard
                                title="Overtime Hours"
                                value={getFilteredAttendanceReport.reduce((sum, record) => sum + record.overtimeHours, 0)}
                                icon={Clock}
                                color="purple"
                                suffix="h"
                                delay={0.4}
                              />
                            </>
                          )}
                        </motion.div>

                        {/* Charts Section - Hide on mobile for better performance */}
                        {!isMobileView && (
                          <motion.div
                            variants={chartVariants}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                          >
                            {/* Department Overview Chart */}
                            <Card className="border-2 border-blue-100 shadow-lg">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <BarChartIcon className="h-5 w-5 text-[#3b82f6]" />
                                  Department Attendance Overview
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="h-80">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={getAttendanceChartData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                      <XAxis 
                                        dataKey="department" 
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                      />
                                      <YAxis />
                                      <Tooltip 
                                        contentStyle={{ 
                                          backgroundColor: 'white',
                                          border: '1px solid #e5e7eb',
                                          borderRadius: '8px',
                                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                      />
                                      <Bar 
                                        dataKey="present" 
                                        fill="#3b82f6" 
                                        name="Present Days"
                                        radius={[4, 4, 0, 0]}
                                      />
                                      <Bar 
                                        dataKey="late" 
                                        fill="#f59e0b" 
                                        name="Late Days"
                                        radius={[4, 4, 0, 0]}
                                      />
                                      <Bar 
                                        dataKey="absent" 
                                        fill="#ef4444" 
                                        name="Absent Days"
                                        radius={[4, 4, 0, 0]}
                                      />
                                      <Bar 
                                        dataKey="leaves" 
                                        fill="#8b5cf6" 
                                        name="Leave Days"
                                        radius={[4, 4, 0, 0]}
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Daily Trend Chart */}
                            <Card className="border-2 border-cyan-100 shadow-lg">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <LineChartIcon className="h-5 w-5 text-[#06b6d4]" />
                                  Daily Attendance Trend
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="h-80">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={getDailyAttendanceData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                      <XAxis dataKey="date" />
                                      <YAxis />
                                      <Tooltip 
                                        contentStyle={{ 
                                          backgroundColor: 'white',
                                          border: '1px solid #e5e7eb',
                                          borderRadius: '8px',
                                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                      />
                                      <Area 
                                        type="monotone" 
                                        dataKey="present" 
                                        stroke="#3b82f6" 
                                        fill="#3b82f6" 
                                        fillOpacity={0.2}
                                        name="Present"
                                      />
                                      <Area 
                                        type="monotone" 
                                        dataKey="late" 
                                        stroke="#f59e0b" 
                                        fill="#f59e0b" 
                                        fillOpacity={0.2}
                                        name="Late"
                                      />
                                      <Area 
                                        type="monotone" 
                                        dataKey="absent" 
                                        stroke="#ef4444" 
                                        fill="#ef4444" 
                                        fillOpacity={0.2}
                                        name="Absent"
                                      />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}

                        {/* Employee Details Table/Cards */}
                        <motion.div
                          variants={itemVariants}
                          className="mt-4 md:mt-8"
                        >
                          <Card className="border-2 shadow-lg">
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <User className="h-5 w-5 text-[#3b82f6]" />
                                  <span className="text-base md:text-lg">Employee Attendance Details</span>
                                </div>
                                <Badge variant="outline" className="bg-[#3b82f6] text-white text-xs md:text-sm">
                                  {getFilteredAttendanceReport.length} Employees
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {getFilteredAttendanceReport.length === 0 ? (
                                <div className="text-center py-8 md:py-12">
                                  <div className="mx-auto h-12 w-12 md:h-16 md:w-16 text-gray-300 mb-4">
                                    <Users className="h-12 w-12 md:h-16 md:w-16" />
                                  </div>
                                  <h3 className="text-base md:text-lg font-medium text-gray-900">No records found</h3>
                                  <p className="text-sm text-gray-500">Try adjusting your filters to see attendance data</p>
                                </div>
                              ) : isMobileView ? (
                                <div className="space-y-3">
                                  {getFilteredAttendanceReport.slice(0, 10).map((record) => (
                                    <MobileEmployeeAttendanceCard key={record.id} record={record} />
                                  ))}
                                </div>
                              ) : (
                                <>
                                  <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                      <TableHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                                        <TableRow>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Employee ID</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Employee Name</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Department</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] text-center whitespace-nowrap">Present</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] text-center whitespace-nowrap">Absent</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] text-center whitespace-nowrap">Leave</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] text-center whitespace-nowrap">Late</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Avg Hours</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] text-center whitespace-nowrap">Overtime</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] text-center whitespace-nowrap">Attendance %</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {getFilteredAttendanceReport.slice(0, 10).map((record, index) => (
                                          <motion.tr
                                            key={record.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ backgroundColor: '#f8fafc' }}
                                            className="border-b hover:bg-blue-50/50 transition-colors"
                                          >
                                            <TableCell className="font-semibold whitespace-nowrap">
                                              <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-[#3b82f6]"></div>
                                                {record.employeeId}
                                              </div>
                                            </TableCell>
                                            <TableCell className="font-medium whitespace-nowrap">{record.employee}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                              <EnhancedBadge variant="info">
                                                {record.department}
                                              </EnhancedBadge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                              <EnhancedBadge variant="success" withAnimation>
                                                {record.present}
                                              </EnhancedBadge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                              <EnhancedBadge variant="danger" withAnimation>
                                                {record.absent}
                                              </EnhancedBadge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                              <EnhancedBadge variant="info" withAnimation>
                                                {record.leaves}
                                              </EnhancedBadge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                              <EnhancedBadge variant="warning" withAnimation>
                                                {record.lateArrivals}
                                              </EnhancedBadge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{record.averageHours}</TableCell>
                                            <TableCell className="text-center">
                                              <Badge variant="outline" className={record.overtimeHours > 0 ? "text-green-600 border-green-200" : ""}>
                                                {record.overtimeHours}h
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                              <div className="flex items-center gap-2">
                                                <span className={`font-bold ${
                                                  parseFloat(record.percentage) >= 90 ? "text-green-600" :
                                                  parseFloat(record.percentage) >= 75 ? "text-yellow-600" :
                                                  "text-red-600"
                                                }`}>
                                                  {record.percentage}
                                                </span>
                                                {parseFloat(record.percentage) >= 90 ? (
                                                  <ArrowUp className="h-4 w-4 text-green-600 animate-pulse" />
                                                ) : parseFloat(record.percentage) < 75 ? (
                                                  <ArrowDown className="h-4 w-4 text-red-600 animate-pulse" />
                                                ) : null}
                                              </div>
                                            </TableCell>
                                          </motion.tr>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                  {getFilteredAttendanceReport.length > 10 && (
                                    <motion.div 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="text-center py-4 text-sm text-muted-foreground"
                                    >
                                      Showing 10 of {getFilteredAttendanceReport.length} records. Export full list for complete data.
                                    </motion.div>
                                  )}
                                </>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Task Report Tab */}
          {activeTab === "tasks" && (
            <motion.div
              key="tasks"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="mt-6">
                <Card className="border-2 shadow-xl">
                  <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
                    <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                      <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                        <CheckSquare className="h-5 w-5 md:h-6 md:w-6 text-[#3b82f6]" />
                        <span className="bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] bg-clip-text text-transparent">
                          Task Management Analytics
                        </span>
                      </CardTitle>
                      {!isMobileView && (
                        <div className="flex gap-2">
                          <div className="relative group">
                            <Button 
                              disabled={isExporting || taskReportData.length === 0}
                              className="bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] hover:from-[#2563eb] hover:to-[#0891b2] shadow-md"
                            >
                              {isExporting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="mr-2 h-4 w-4" />
                              )}
                              Export
                            </Button>
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                              <div className="py-1">
                                <button
                                  onClick={() => exportTaskReport('csv')}
                                  disabled={isExporting || taskReportData.length === 0}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <FileDown className="mr-2 h-4 w-4" />
                                  Export Task Details
                                </button>
                                <button
                                  onClick={() => exportTaskReport('excel')}
                                  disabled={isExporting || taskReportData.length === 0}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                                  Export as Excel
                                </button>
                                <button
                                  onClick={() => exportTaskSummary('csv')}
                                  disabled={isExporting || tasks.length === 0}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <FileDown className="mr-2 h-4 w-4" />
                                  Export Summary
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 md:space-y-8 pt-4 md:pt-6">
                    {/* Task Filters */}
                    {isMobileView ? (
                      <MobileFilterCard
                        title="Task Filters"
                        icon={Filter}
                        onClear={() => {
                          setTaskSearchQuery("");
                          setTaskFilterStatus("all");
                          setTaskFilterPriority("all");
                          setTaskFilterSite("all");
                        }}
                        showClear={true}
                      >
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Search</label>
                            <Input
                              placeholder="Search tasks..."
                              value={taskSearchQuery}
                              onChange={(e) => setTaskSearchQuery(e.target.value)}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Status</label>
                            <Select value={taskFilterStatus} onValueChange={setTaskFilterStatus}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Priority</label>
                            <Select value={taskFilterPriority} onValueChange={setTaskFilterPriority}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Priority" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Priority</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Site</label>
                            <Select value={taskFilterSite} onValueChange={setTaskFilterSite}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Sites" />
                              </SelectTrigger>
                              <SelectContent>
                                {sites.map((site) => (
                                  <SelectItem key={site} value={site === "All Sites" ? "all" : site}>
                                    {site}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </MobileFilterCard>
                    ) : (
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                      >
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <Search className="h-4 w-4 text-[#3b82f6]" />
                            Search Tasks
                          </label>
                          <Input
                            placeholder="Search by title, assignee, site..."
                            value={taskSearchQuery}
                            onChange={(e) => setTaskSearchQuery(e.target.value)}
                            className="border-blue-200 focus:border-[#3b82f6] focus:ring-[#3b82f6]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Status</label>
                          <Select value={taskFilterStatus} onValueChange={setTaskFilterStatus}>
                            <SelectTrigger className="border-blue-200 focus:border-[#3b82f6] focus:ring-[#3b82f6]">
                              <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Priority</label>
                          <Select value={taskFilterPriority} onValueChange={setTaskFilterPriority}>
                            <SelectTrigger className="border-blue-200 focus:border-[#3b82f6] focus:ring-[#3b82f6]">
                              <SelectValue placeholder="All Priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Priority</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Site</label>
                          <Select value={taskFilterSite} onValueChange={setTaskFilterSite}>
                            <SelectTrigger className="border-blue-200 focus:border-[#3b82f6] focus:ring-[#3b82f6]">
                              <SelectValue placeholder="All Sites" />
                            </SelectTrigger>
                            <SelectContent>
                              {sites.map((site) => (
                                <SelectItem key={site} value={site === "All Sites" ? "all" : site}>
                                  {site}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </motion.div>
                    )}

                    {isLoading ? (
                      <div className="flex items-center justify-center py-8 md:py-12">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 md:h-12 md:w-12 animate-spin text-[#3b82f6] mx-auto" />
                          <p className="mt-4 text-base md:text-lg font-medium text-gray-600">Loading task data...</p>
                          <p className="text-sm text-gray-500">Analyzing task performance metrics</p>
                        </div>
                      </div>
                    ) : taskReportData.length === 0 ? (
                      <div className="text-center py-8 md:py-12">
                        <div className="mx-auto h-12 w-12 md:h-16 md:w-16 text-gray-300 mb-4">
                          <CheckSquare className="h-12 w-12 md:h-16 md:w-16" />
                        </div>
                        <h3 className="text-base md:text-lg font-medium text-gray-900">No tasks found</h3>
                        <p className="text-sm text-gray-500">Try adjusting your filters to see task data</p>
                      </div>
                    ) : (
                      <>
                        {/* Task Statistics Cards */}
                        <motion.div
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
                        >
                          {isMobileView ? (
                            <>
                              <MobileStatCard
                                title="Total Tasks"
                                value={taskStats.total}
                                icon={CheckSquare}
                                color="blue"
                              />
                              <MobileStatCard
                                title="Completed"
                                value={taskStats.completed}
                                icon={CheckCircle}
                                color="cyan"
                                trend={taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}
                              />
                              <MobileStatCard
                                title="In Progress"
                                value={taskStats.inProgress}
                                icon={Clock}
                                color="blue"
                              />
                              <MobileStatCard
                                title="High Priority"
                                value={taskStats.highPriority}
                                icon={AlertCircle}
                                color="red"
                              />
                            </>
                          ) : (
                            <>
                              <AnimatedStatCard
                                title="Total Tasks"
                                value={taskStats.total}
                                icon={CheckSquare}
                                color="blue"
                                delay={0.1}
                              />
                              <AnimatedStatCard
                                title="Completed"
                                value={taskStats.completed}
                                icon={CheckCircle}
                                color="cyan"
                                delay={0.2}
                                trend={taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}
                              />
                              <AnimatedStatCard
                                title="In Progress"
                                value={taskStats.inProgress}
                                icon={Clock}
                                color="blue"
                                delay={0.3}
                              />
                              <AnimatedStatCard
                                title="High Priority"
                                value={taskStats.highPriority}
                                icon={AlertCircle}
                                color="red"
                                delay={0.4}
                              />
                            </>
                          )}
                        </motion.div>

                        {/* Charts Section - Hide on mobile */}
                        {!isMobileView && (
                          <motion.div
                            variants={chartVariants}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                          >
                            {/* Task Status Distribution */}
                            <Card className="border-2 border-blue-100 shadow-lg">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <PieChartIcon className="h-5 w-5 text-[#3b82f6]" />
                                  Task Status Distribution
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="h-80">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={taskCompletionData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                      >
                                        {taskCompletionData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                      </Pie>
                                      <Tooltip />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Task Priority Distribution */}
                            <Card className="border-2 border-cyan-100 shadow-lg">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <BarChartIcon className="h-5 w-5 text-[#06b6d4]" />
                                  Task Priority Distribution
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="h-80">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={taskPriorityData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                      <XAxis dataKey="priority" />
                                      <YAxis />
                                      <Tooltip />
                                      <Bar 
                                        dataKey="count" 
                                        fill="#06b6d4"
                                        radius={[4, 4, 0, 0]}
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}

                        {/* Task Details Table/Cards */}
                        <motion.div
                          variants={itemVariants}
                          className="mt-4 md:mt-8"
                        >
                          <Card className="border-2 shadow-lg">
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Target className="h-5 w-5 text-[#3b82f6]" />
                                  <span className="text-base md:text-lg">Task Details</span>
                                </div>
                                <Badge variant="outline" className="bg-[#3b82f6] text-white text-xs md:text-sm">
                                  {taskReportData.length} Tasks
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {isMobileView ? (
                                <div className="space-y-3">
                                  {taskReportData.slice(0, 10).map((task) => (
                                    <MobileTaskReportCard key={task.id} task={task} />
                                  ))}
                                </div>
                              ) : (
                                <>
                                  <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                      <TableHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                                        <TableRow>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Task Title</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Assignee</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Site</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Priority</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Status</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Deadline</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Type</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] text-center whitespace-nowrap">Updates</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] text-center whitespace-nowrap">Attachments</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {taskReportData.slice(0, 10).map((task, index) => (
                                          <motion.tr
                                            key={task.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ backgroundColor: '#f0f9ff' }}
                                            className="border-b hover:bg-blue-50/50 transition-colors"
                                          >
                                            <TableCell className="font-medium">
                                              <div className="max-w-xs truncate" title={task.title}>
                                                {task.title}
                                              </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                              <div className="flex items-center gap-2">
                                                <User className="h-3 w-3 text-[#3b82f6]" />
                                                {task.assignedToName}
                                              </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                              <div className="flex items-center gap-2">
                                                <Building className="h-3 w-3 text-[#06b6d4]" />
                                                {task.siteName}
                                              </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                              <EnhancedBadge variant={
                                                task.priority === 'high' ? 'danger' :
                                                task.priority === 'medium' ? 'warning' : 'success'
                                              } withAnimation>
                                                {task.priority}
                                              </EnhancedBadge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                              <EnhancedBadge variant={
                                                task.status === 'completed' ? 'success' :
                                                task.status === 'in-progress' ? 'info' :
                                                task.status === 'pending' ? 'warning' : 'danger'
                                              } withAnimation>
                                                {task.status}
                                              </EnhancedBadge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{task.deadline}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                              <Badge variant="outline" className="text-xs border-[#3b82f6] text-[#3b82f6]">
                                                {task.taskType}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                              <div className="flex items-center justify-center gap-1">
                                                <Clock className="h-3 w-3 text-[#3b82f6]" />
                                                {task.hourlyUpdatesCount}
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                              <div className="flex items-center justify-center gap-1">
                                                <Paperclip className="h-3 w-3 text-gray-500" />
                                                {task.attachmentsCount}
                                              </div>
                                            </TableCell>
                                          </motion.tr>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                  {taskReportData.length > 10 && (
                                    <motion.div 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="text-center py-4 text-sm text-muted-foreground"
                                    >
                                      Showing 10 of {taskReportData.length} tasks. Export for complete list.
                                    </motion.div>
                                  )}
                                </>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Financial Report Tab */}
          {activeTab === "financial" && (
            <motion.div
              key="financial"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="mt-6">
                <Card className="border-2 shadow-xl">
                  <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
                    <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                      <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                        <Receipt className="h-5 w-5 md:h-6 md:w-6 text-[#3b82f6]" />
                        <span className="bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] bg-clip-text text-transparent">
                          Financial Analytics Dashboard
                        </span>
                      </CardTitle>
                      {!isMobileView && (
                        <div className="flex gap-2">
                          <div className="relative group">
                            <Button 
                              disabled={isExporting || filteredExpenses.length === 0}
                              className="bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] hover:from-[#2563eb] hover:to-[#0891b2] shadow-md"
                            >
                              {isExporting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="mr-2 h-4 w-4" />
                              )}
                              Export
                            </Button>
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                              <div className="py-1">
                                <button
                                  onClick={() => exportExpenseReport('csv')}
                                  disabled={isExporting || filteredExpenses.length === 0}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <FileDown className="mr-2 h-4 w-4" />
                                  Export Expense Details
                                </button>
                                <button
                                  onClick={() => exportExpenseReport('excel')}
                                  disabled={isExporting || filteredExpenses.length === 0}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                                  Export as Excel
                                </button>
                                <button
                                  onClick={() => exportExpenseSummary('csv')}
                                  disabled={isExporting || filteredExpenses.length === 0}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <FileDown className="mr-2 h-4 w-4" />
                                  Export Summary
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 md:space-y-8 pt-4 md:pt-6">
                    {/* Expense Filters */}
                    {isMobileView ? (
                      <MobileFilterCard
                        title="Expense Filters"
                        icon={Filter}
                        onClear={clearExpenseFilters}
                        showClear={true}
                      >
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Search</label>
                            <Input
                              placeholder="Search expenses..."
                              value={expenseSearchTerm}
                              onChange={(e) => setExpenseSearchTerm(e.target.value)}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Status</label>
                            <Select value={expenseFilterStatus} onValueChange={(value: any) => setExpenseFilterStatus(value)}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Expense Type</label>
                            <Select value={expenseFilterType} onValueChange={(value: any) => setExpenseFilterType(value)}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Types" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="operational">Operational</SelectItem>
                                <SelectItem value="office">Office</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Date Range</label>
                            <div className="grid grid-cols-2 gap-2">
                              <Input 
                                type="date" 
                                value={expenseDateFrom}
                                onChange={(e) => setExpenseDateFrom(e.target.value)}
                                className="w-full"
                                placeholder="From"
                              />
                              <Input 
                                type="date" 
                                value={expenseDateTo}
                                onChange={(e) => setExpenseDateTo(e.target.value)}
                                className="w-full"
                                placeholder="To"
                              />
                            </div>
                          </div>
                        </div>
                      </MobileFilterCard>
                    ) : (
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        <Card className="border-2 border-blue-100 shadow-lg">
                          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold flex items-center gap-2">
                                <Filter className="h-5 w-5 text-[#3b82f6]" />
                                Expense Filters
                              </h3>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={clearExpenseFilters}
                                disabled={!expenseFilterStatus && !expenseFilterType && !expenseDateFrom && !expenseDateTo && !expenseSearchTerm}
                                className="text-[#3b82f6] hover:text-[#2563eb] hover:bg-blue-50"
                              >
                                Clear Filters
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Search Expenses</label>
                                <div className="relative">
                                  <Search className="absolute left-3 top-3 h-4 w-4 text-[#3b82f6]" />
                                  <Input
                                    placeholder="Search expenses..."
                                    className="pl-9 border-blue-200 focus:border-[#3b82f6] focus:ring-[#3b82f6]"
                                    value={expenseSearchTerm}
                                    onChange={(e) => setExpenseSearchTerm(e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select value={expenseFilterStatus} onValueChange={(value: any) => setExpenseFilterStatus(value)}>
                                  <SelectTrigger className="border-blue-200 focus:border-[#3b82f6] focus:ring-[#3b82f6]">
                                    <SelectValue placeholder="All Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Expense Type</label>
                                <Select value={expenseFilterType} onValueChange={(value: any) => setExpenseFilterType(value)}>
                                  <SelectTrigger className="border-blue-200 focus:border-[#3b82f6] focus:ring-[#3b82f6]">
                                    <SelectValue placeholder="All Types" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="operational">Operational</SelectItem>
                                    <SelectItem value="office">Office</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Date Range</label>
                                <div className="flex gap-2">
                                  <Input 
                                    type="date" 
                                    value={expenseDateFrom}
                                    onChange={(e) => setExpenseDateFrom(e.target.value)}
                                    className="border-blue-200 focus:border-[#3b82f6] focus:ring-[#3b82f6]"
                                    placeholder="From"
                                  />
                                  <Input 
                                    type="date" 
                                    value={expenseDateTo}
                                    onChange={(e) => setExpenseDateTo(e.target.value)}
                                    className="border-blue-200 focus:border-[#3b82f6] focus:ring-[#3b82f6]"
                                    placeholder="To"
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {expenseLoading ? (
                      <div className="flex items-center justify-center py-8 md:py-12">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 md:h-12 md:w-12 animate-spin text-[#3b82f6] mx-auto" />
                          <p className="mt-4 text-base md:text-lg font-medium text-gray-600">Loading expense data...</p>
                          <p className="text-sm text-gray-500">Processing financial records</p>
                        </div>
                      </div>
                    ) : filteredExpenses.length === 0 ? (
                      <div className="text-center py-8 md:py-12">
                        <div className="mx-auto h-12 w-12 md:h-16 md:w-16 text-gray-300 mb-4">
                          <Receipt className="h-12 w-12 md:h-16 md:w-16" />
                        </div>
                        <h3 className="text-base md:text-lg font-medium text-gray-900">No expenses found</h3>
                        <p className="text-sm text-gray-500">Try adjusting your filters to see expense data</p>
                      </div>
                    ) : (
                      <>
                        {/* Expense Statistics Cards */}
                        <motion.div
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                          className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4"
                        >
                          {isMobileView ? (
                            <>
                              <MobileStatCard
                                title="Total Expenses"
                                value={expenseStats.totalExpenses}
                                icon={DollarSign}
                                color="blue"
                                prefix="₹"
                              />
                              <MobileStatCard
                                title="Operational"
                                value={expenseStats.operationalExpenses}
                                icon={Building}
                                color="cyan"
                                prefix="₹"
                              />
                              <MobileStatCard
                                title="Office"
                                value={expenseStats.officeExpenses}
                                icon={Briefcase}
                                color="blue"
                                prefix="₹"
                              />
                            </>
                          ) : (
                            <>
                              <AnimatedStatCard
                                title="Total Expenses"
                                value={expenseStats.totalExpenses}
                                icon={DollarSign}
                                color="blue"
                                prefix="₹"
                                delay={0.1}
                              />
                              <AnimatedStatCard
                                title="Operational Expenses"
                                value={expenseStats.operationalExpenses}
                                icon={Building}
                                color="cyan"
                                prefix="₹"
                                delay={0.2}
                              />
                              <AnimatedStatCard
                                title="Office Expenses"
                                value={expenseStats.officeExpenses}
                                icon={Briefcase}
                                color="blue"
                                prefix="₹"
                                delay={0.3}
                              />
                            </>
                          )}
                        </motion.div>

                        {/* Charts Section - Hide on mobile */}
                        {!isMobileView && (
                          <motion.div
                            variants={chartVariants}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                          >
                            {/* Expense Categories Distribution */}
                            <Card className="border-2 border-blue-100 shadow-lg">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <PieChartIcon className="h-5 w-5 text-[#3b82f6]" />
                                  Expense Categories Distribution
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="h-80">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={expenseCategoryData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                      >
                                        {expenseCategoryData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                      </Pie>
                                      <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Expense by Type */}
                            <Card className="border-2 border-cyan-100 shadow-lg">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <BarChartIcon className="h-5 w-5 text-[#06b6d4]" />
                                  Expense by Type
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="h-80">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={financialData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                      <XAxis dataKey="category" />
                                      <YAxis />
                                      <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
                                      <Bar 
                                        dataKey="value" 
                                        fill="#06b6d4"
                                        radius={[4, 4, 0, 0]}
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}

                        {/* Monthly Trend Chart - Hide on mobile */}
                        {expenseStats.monthlyData.length > 0 && !isMobileView && (
                          <motion.div
                            variants={chartVariants}
                          >
                            <Card className="border-2 border-blue-100 shadow-lg">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <TrendingUp className="h-5 w-5 text-[#3b82f6]" />
                                  Monthly Expense Trend
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="h-80">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={expenseStats.monthlyData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                      <XAxis dataKey="month" />
                                      <YAxis />
                                      <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
                                      <Legend />
                                      <Line 
                                        type="monotone" 
                                        dataKey="amount" 
                                        stroke="#3b82f6" 
                                        strokeWidth={2}
                                        activeDot={{ r: 8 }} 
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}

                        {/* Expense Details Table/Cards */}
                        <motion.div
                          variants={itemVariants}
                          className="mt-4 md:mt-8"
                        >
                          <Card className="border-2 shadow-lg">
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Award className="h-5 w-5 text-[#3b82f6]" />
                                  <span className="text-base md:text-lg">Expense Details</span>
                                </div>
                                <Badge variant="outline" className="bg-[#3b82f6] text-white text-xs md:text-sm">
                                  {filteredExpenses.length} Transactions
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {isMobileView ? (
                                <div className="space-y-3">
                                  {filteredExpenses.slice(0, 10).map((expense) => (
                                    <MobileExpenseCard key={expense._id} expense={expense} />
                                  ))}
                                </div>
                              ) : (
                                <>
                                  <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                      <TableHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                                        <TableRow>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Expense ID</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Category</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Description</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Vendor</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Site</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] text-right whitespace-nowrap">Amount</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Date</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Status</TableHead>
                                          <TableHead className="font-bold text-[#3b82f6] whitespace-nowrap">Type</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {filteredExpenses.slice(0, 10).map((expense, index) => (
                                          <motion.tr
                                            key={expense._id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ backgroundColor: '#f0f9ff' }}
                                            className="border-b hover:bg-blue-50/50 transition-colors"
                                          >
                                            <TableCell className="font-medium whitespace-nowrap">
                                              <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-[#3b82f6]"></div>
                                                {expense.expenseId}
                                              </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{expense.category}</TableCell>
                                            <TableCell className="max-w-xs truncate" title={expense.description}>
                                              {expense.description}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{expense.vendor}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                              <Badge variant="outline" className="text-xs border-[#3b82f6] text-[#3b82f6]">
                                                {expense.site}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="font-bold text-green-600 text-right whitespace-nowrap">
                                              {formatCurrency(expense.amount)}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{new Date(expense.date).toLocaleDateString()}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                              <EnhancedBadge variant={
                                                expense.status === 'approved' ? 'success' :
                                                expense.status === 'pending' ? 'warning' : 'danger'
                                              } withAnimation>
                                                {expense.status}
                                              </EnhancedBadge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                              <EnhancedBadge variant={
                                                expense.expenseType === 'operational' ? 'info' :
                                                expense.expenseType === 'office' ? 'success' : 'default'
                                              } withAnimation>
                                                {expense.expenseType}
                                              </EnhancedBadge>
                                            </TableCell>
                                          </motion.tr>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                  {filteredExpenses.length > 10 && (
                                    <motion.div 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="text-center py-4 text-sm text-muted-foreground"
                                    >
                                      Showing 10 of {filteredExpenses.length} expenses. Export for complete list.
                                    </motion.div>
                                  )}
                                </>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Reports;
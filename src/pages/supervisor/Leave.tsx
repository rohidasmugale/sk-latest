import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Loader2, 
  RefreshCw, 
  Users, 
  AlertCircle, 
  Database, 
  Search, 
  Building, 
  MapPin, 
  User, 
  Bug, 
  Info, 
  Briefcase, 
  MoreVertical, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  UserCheck, 
  UserX, 
  Target, 
  X, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Crown,
  Shield,
  Mail,
  Phone,
  CalendarDays,
  Download,
  FileSpreadsheet,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Crown as CrownIcon,
  Save,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useRole } from "@/context/RoleContext";
import { useOutletContext } from "react-router-dom";
import { taskService } from "@/services/TaskService";
import { createNotificationForSuperadmin } from '@/lib/notificationHelper';
import axios from "axios";

interface LeaveRequest {
  _id: string;
  id?: string;
  employeeId: string;
  employeeName: string;
  department: string;
  site: string;
  siteId?: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedBy: string;
  appliedFor: string;
  createdAt: string;
  updatedAt: string;
  // Supervisor fields - like attendance system
  isSupervisorLeave?: boolean;
  supervisorId?: string;  // This references users collection
  // Manager/Supervisor fields
  remarks?: string;
  approvedBy?: string;
  rejectedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancellationReason?: string;
  managerRemarks?: string;
  // Employee fields
  position?: string;
  email?: string;
  contactNumber?: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  department: string;
  site?: string;
  siteId?: string;
  siteName?: string;
  contactNumber: string;
  position: string;
  email: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  isSupervisor?: boolean;
  role?: "employee" | "staff" | "manager" | "supervisor";
  status?: "active" | "inactive" | "left";
  phone?: string;
}

interface Site {
  _id: string;
  name: string;
  clientName: string;
  location: string;
  status: string;
  managerCount?: number;
  supervisorCount?: number;
  employeeCount?: number;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  deadline: string;
  dueDateTime?: string;
  siteId: string;
  siteName: string;
  clientName?: string;
  assignedUsers?: Array<{
    userId: string;
    name: string;
    role: string;
    assignedAt: string;
    status: string;
  }>;
  assignedTo?: string;
  assignedToName?: string;
}

// Action Dialog State Interface
interface ActionDialogState {
  open: boolean;
  type: 'approve' | 'reject' | null;
  leaveId: string | null;
  leaveDetails: LeaveRequest | null;
  remarks: string;
}

// View Leave Details Dialog Component
const ViewLeaveDialog = ({ 
  leave, 
  open, 
  onOpenChange,
  onApprove,
  onReject,
  formatDate,
  getStatusBadgeVariant,
  getStatusIcon,
  user
}: { 
  leave: LeaveRequest | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onApprove?: (leaveId: string, remarks: string) => Promise<void>;
  onReject?: (leaveId: string, remarks: string) => Promise<void>;
  formatDate: (date: string) => string;
  getStatusBadgeVariant: (status: string) => "default" | "destructive" | "secondary" | "outline";
  getStatusIcon: (status: string) => JSX.Element;
  user: any;
}) => {
  const [actionDialog, setActionDialog] = useState<ActionDialogState>({
    open: false,
    type: null,
    leaveId: null,
    leaveDetails: null,
    remarks: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  if (!leave) return null;
  
  const isOwnLeave = leave.isSupervisorLeave && leave.supervisorId === user?._id;
  const canApproveReject = leave.status === 'pending' && !isOwnLeave;
  const leaveId = leave._id || leave.id;

  const handleAction = async () => {
    setIsProcessing(true);
    try {
      if (actionDialog.type === 'approve' && onApprove) {
        await onApprove(actionDialog.leaveId!, actionDialog.remarks);
      } else if (actionDialog.type === 'reject' && onReject) {
        await onReject(actionDialog.leaveId!, actionDialog.remarks);
      }
      setActionDialog({ open: false, type: null, leaveId: null, leaveDetails: null, remarks: '' });
      onOpenChange(false);
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error('Failed to perform action');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Calendar className="h-5 w-5 text-primary" />
              Leave Request Details
            </DialogTitle>
            <DialogDescription>
              Detailed information for {leave.employeeName}'s leave request
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Status Banner */}
            <div className={`p-4 rounded-lg ${
              isOwnLeave ? 'bg-purple-50 border border-purple-200' : 
              leave.isSupervisorLeave ? 'bg-blue-50 border border-blue-200' : 
              'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isOwnLeave ? (
                    <Crown className="h-6 w-6 text-purple-600" />
                  ) : leave.isSupervisorLeave ? (
                    <Shield className="h-6 w-6 text-blue-600" />
                  ) : (
                    <User className="h-6 w-6 text-gray-600" />
                  )}
                  <div>
                    <p className="font-semibold text-lg">{leave.employeeName}</p>
                    <p className="text-sm text-muted-foreground">ID: {leave.employeeId}</p>
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(leave.status)} className="flex items-center gap-1 px-3 py-1">
                  {getStatusIcon(leave.status)}
                  <span className="text-sm">{leave.status.toUpperCase()}</span>
                </Badge>
              </div>
            </div>

            {/* Employee Information */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Employee Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="text-sm font-medium">{leave.employeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Employee ID:</span>
                    <span className="text-sm font-medium">{leave.employeeId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Department:</span>
                    <span className="text-sm font-medium">{leave.department}</span>
                  </div>
                  {leave.position && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Position:</span>
                      <span className="text-sm font-medium">{leave.position}</span>
                    </div>
                  )}
                  {leave.email && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <span className="text-sm font-medium">{leave.email}</span>
                    </div>
                  )}
                  {leave.contactNumber && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Contact:</span>
                      <span className="text-sm font-medium">{leave.contactNumber}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Site Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Site:</span>
                    <span className="text-sm font-medium">{leave.site}</span>
                  </div>
                  {leave.siteId && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Site ID:</span>
                      <span className="text-sm font-medium">{leave.siteId}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Leave Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Leave Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Leave Type</p>
                    <p className="text-base font-semibold capitalize">{leave.leaveType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Days</p>
                    <p className="text-base font-semibold">{leave.totalDays} day(s)</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">From Date</p>
                    <p className="text-base font-medium">{formatDate(leave.fromDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">To Date</p>
                    <p className="text-base font-medium">{formatDate(leave.toDate)}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Reason</p>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm whitespace-pre-wrap">{leave.reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Applied By:</span>
                  <span className="text-sm font-medium">{leave.appliedBy} {leave.appliedBy === user?.name && '(You)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Applied For:</span>
                  <span className="text-sm font-medium">{leave.appliedFor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Applied On:</span>
                  <span className="text-sm font-medium">{formatDate(leave.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated:</span>
                  <span className="text-sm font-medium">{formatDate(leave.updatedAt)}</span>
                </div>
                {leave.supervisorId && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Supervisor ID:</span>
                    <span className="text-sm font-medium">{leave.supervisorId}</span>
                  </div>
                )}
                {leave.approvedBy && (
                  <div className="flex justify-between text-green-600">
                    <span className="text-sm">Approved By:</span>
                    <span className="text-sm font-medium">{leave.approvedBy}</span>
                  </div>
                )}
                {leave.rejectedBy && (
                  <div className="flex justify-between text-red-600">
                    <span className="text-sm">Rejected By:</span>
                    <span className="text-sm font-medium">{leave.rejectedBy}</span>
                  </div>
                )}
                {/* Manager Remarks - Always show if present */}
                {leave.remarks && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-1">Manager Remarks:</p>
                    <p className="text-sm p-2 bg-blue-50 rounded border border-blue-200">{leave.remarks}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons - Only Approve/Reject for pending leaves that are not own */}
            {canApproveReject && (
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setActionDialog({
                    open: true,
                    type: 'reject',
                    leaveId: leaveId,
                    leaveDetails: leave,
                    remarks: ''
                  })}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setActionDialog({
                    open: true,
                    type: 'approve',
                    leaveId: leaveId,
                    leaveDetails: leave,
                    remarks: ''
                  })}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </div>
            )}

            {/* Close button for all other cases */}
            {!canApproveReject && (
              <div className="flex justify-end pt-4">
                <Button onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Remarks Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.type === 'approve' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {actionDialog.type === 'reject' && <XCircle className="h-5 w-5 text-red-600" />}
              {actionDialog.type === 'approve' && 'Approve Leave Request'}
              {actionDialog.type === 'reject' && 'Reject Leave Request'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' && 'Add remarks for approving this leave request'}
              {actionDialog.type === 'reject' && 'Please provide a reason for rejecting this leave request'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={actionDialog.remarks}
                onChange={(e) => setActionDialog(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder={actionDialog.type === 'reject' ? "Required: Reason for rejection" : "Optional remarks"}
                rows={4}
                required={actionDialog.type === 'reject'}
              />
              {actionDialog.type === 'reject' && !actionDialog.remarks && (
                <p className="text-xs text-red-500">Reason is required for rejection</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setActionDialog(prev => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isProcessing || (actionDialog.type === 'reject' && !actionDialog.remarks)}
              className={
                actionDialog.type === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                'bg-red-600 hover:bg-red-700'
              }
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionDialog.type === 'approve' && 'Approve'}
              {actionDialog.type === 'reject' && 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Mobile responsive leave request card with edit/delete options
const MobileLeaveCard = ({
  leave,
  formatDate,
  getStatusBadgeVariant,
  getStatusIcon,
  user,
  onEdit,
  onDelete,
  onView,
  isOwnLeave,
  onApprove,
  onReject
}: {
  leave: LeaveRequest;
  formatDate: (date: string) => string;
  getStatusBadgeVariant: (status: string) => "default" | "destructive" | "secondary" | "outline";
  getStatusIcon: (status: string) => JSX.Element;
  user: any;
  onEdit?: (leave: LeaveRequest) => void;
  onDelete?: (id: string) => void;
  onView?: (leave: LeaveRequest) => void;
  isOwnLeave: boolean;
  onApprove?: (leaveId: string, remarks: string) => Promise<void>;
  onReject?: (leaveId: string, remarks: string) => Promise<void>;
}) => {
  const canEdit = leave.status === 'pending' && (isOwnLeave || leave.appliedBy === user?.name);
  const leaveId = leave._id || leave.id;
  
  return (
    <Card className={`mb-3 overflow-hidden ${
      isOwnLeave ? 'border-purple-200 bg-purple-50/70' : 
      leave.isSupervisorLeave ? 'border-blue-200 bg-blue-50/50' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{leave.employeeName}</h3>
              <Badge variant={getStatusBadgeVariant(leave.status)} className="flex items-center gap-1">
                {getStatusIcon(leave.status)}
                {leave.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">ID: {leave.employeeId}</p>
          </div>
          <div className="flex items-center gap-1">
            {isOwnLeave && (
              <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-300 text-xs">
                <Crown className="mr-1 h-3 w-3" />
                Your Leave
              </Badge>
            )}
            {leave.isSupervisorLeave && !isOwnLeave && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                <Shield className="mr-1 h-3 w-3" />
                Supervisor
              </Badge>
            )}
            {canEdit ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView?.(leave)}>
                    <Eye className="h-4 w-4 mr-2" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit?.(leave)}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(leaveId)} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onView?.(leave)}
                className="h-8 w-8 text-blue-600"
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Department</p>
            <p className="text-sm font-medium">{leave.department}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Site</p>
            <p className="text-sm font-medium truncate">{leave.site}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Leave Type</p>
            <p className="text-sm font-medium capitalize">{leave.leaveType}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Days</p>
            <p className="text-sm font-bold">{leave.totalDays}</p>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs text-muted-foreground">Dates</p>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3 w-3" />
            {formatDate(leave.fromDate)} - {formatDate(leave.toDate)}
          </div>
        </div>

        <div className="mb-3 p-2 bg-gray-50 rounded">
          <p className="text-xs text-muted-foreground">Reason</p>
          <p className="text-sm">{leave.reason}</p>
        </div>

        {/* Manager Remarks - Always show if present */}
        {leave.remarks && (
          <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-muted-foreground">Manager Remarks</p>
            <p className="text-sm">{leave.remarks}</p>
          </div>
        )}

        <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
          <span>Applied by: {leave.appliedBy} {leave.appliedBy === user?.name && '(You)'}</span>
          <span>{formatDate(leave.createdAt)}</span>
        </div>

        {/* Action buttons for pending leaves that are not own */}
        {leave.status === 'pending' && !isOwnLeave && onApprove && onReject && (
          <div className="flex gap-2 mt-3 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
              onClick={() => {
                if (leaveId) {
                  onApprove(leaveId, "Approved");
                } else {
                  toast.error("Invalid leave ID");
                }
              }}
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                if (leaveId) {
                  onReject(leaveId, "Rejected");
                } else {
                  toast.error("Invalid leave ID");
                }
              }}
            >
              <XCircle className="mr-1 h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Mobile responsive employee selection card
const MobileEmployeeCard = ({
  employee,
  selected,
  onSelect
}: {
  employee: Employee;
  selected: boolean;
  onSelect: (id: string) => void;
}) => {
  return (
    <div
      onClick={() => onSelect(employee._id)}
      className={`p-3 border rounded-lg mb-2 cursor-pointer transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/20'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">{employee.name}</h4>
          <p className="text-xs text-muted-foreground">{employee.employeeId}</p>
        </div>
        <Badge variant={employee.status === 'active' ? 'default' : 'secondary'} className="text-xs">
          {employee.status || 'active'}
        </Badge>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center">
          <Briefcase className="mr-1 h-3 w-3" />
          {employee.department}
        </span>
        <span className="flex items-center">
          <Building className="mr-1 h-3 w-3" />
          {employee.siteName || employee.site || 'N/A'}
        </span>
      </div>
      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
        <span className="flex items-center">
          <User className="mr-1 h-3 w-3" />
          {employee.position}
        </span>
      </div>
    </div>
  );
};

// Helper to normalize site names for comparison
const normalizeSiteName = (siteName: string | null | undefined): string => {
  if (!siteName) return '';
  return siteName.toString().toLowerCase().trim();
};

// Helper to normalize site IDs
const normalizeSiteId = (site: any): string | null => {
  if (!site) return null;
  
  if (typeof site === "string") {
    const cleanId = site.replace(/['"\\]/g, '').trim();
    const match = cleanId.match(/"([^"]+)"/) || cleanId.match(/'([^']+)'/);
    return match ? match[1] : cleanId;
  }
  
  if (typeof site === "object") {
    return site._id || site.id || site.siteId || site.site || null;
  }
  
  return null;
};

// Helper to compare site IDs
const compareSiteIds = (id1: string | null, id2: string | null): boolean => {
  if (!id1 || !id2) return false;
  return id1.toString().toLowerCase().trim() === id2.toString().toLowerCase().trim();
};

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
// Employee Leave Form Component - Moved outside to prevent recreation
const EmployeeLeaveForm = ({ 
  formData, 
  formErrors, 
  handleInputChange, 
  selectedSite, 
  selectedEmployee, 
  setSelectedEmployee, 
  setSelectedSite, 
  handleSiteSelect, 
  handleEmployeeSubmit, 
  isSubmitting,
  supervisorSites,
  employees,
  getEmployeesForSite,
  supervisorDepartment,
  isLoadingSites,
  isLoadingEmployees,
  fetchSupervisorSitesFromTasks,
  fetchEmployees,
  user
}: {
  formData: any;
  formErrors: any;
  handleInputChange: (field: string, value: string) => void;
  selectedSite: string;
  selectedEmployee: string;
  setSelectedEmployee: (id: string) => void;
  setSelectedSite: (id: string) => void;
  handleSiteSelect: (siteId: string) => void;
  handleEmployeeSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
  supervisorSites: Site[];
  employees: Employee[];
  getEmployeesForSite: (siteId: string) => Employee[];
  supervisorDepartment: string;
  isLoadingSites: boolean;
  isLoadingEmployees: boolean;
  fetchSupervisorSitesFromTasks: () => Promise<any>;
  fetchEmployees: () => Promise<void>;
  user: any;
}) => {
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const siteEmployees = selectedSite ? getEmployeesForSite(selectedSite) : [];
  
  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange("reason", e.target.value);
  };
  
  return (
    <form onSubmit={handleEmployeeSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="appliedBy" className="text-sm">
          Applied By (Supervisor Name) *
        </Label>
        <Input 
          id="appliedBy"
          value={formData.appliedBy}
          onChange={(e) => handleInputChange("appliedBy", e.target.value)}
          onBlur={() => {}}
          placeholder="Enter supervisor name"
          className={`h-9 ${formErrors.appliedBy ? 'border-red-500' : ''}`}
        />
        {formErrors.appliedBy && (
          <p className="text-xs text-red-500 mt-1">{formErrors.appliedBy}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="site" className="text-sm">Select Site *</Label>
        {isLoadingSites ? (
          <div className="flex items-center justify-center p-4 border rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Loading sites...</span>
          </div>
        ) : supervisorSites.length === 0 ? (
          <div className="p-3 border border-dashed rounded-lg text-center">
            <Building className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No sites available from your tasks
            </p>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={fetchSupervisorSitesFromTasks}
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Reload Sites
            </Button>
          </div>
        ) : (
          <Select
            value={selectedSite}
            onValueChange={handleSiteSelect}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {supervisorSites.map((site) => {
                const siteEmployees = getEmployeesForSite(site._id);
                return (
                  <SelectItem key={site._id} value={site._id}>
                    <div className="flex flex-col py-1">
                      <div className="flex items-center justify-between">
                        <span>{site.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {siteEmployees.length}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {site.clientName}
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
        {selectedSite && (
          <p className="text-xs text-muted-foreground mt-1">
            {siteEmployees.length} employees available at this site in {supervisorDepartment} department
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="employee" className="text-sm">
            Select Employee *
          </Label>
          <div className="flex items-center text-xs text-muted-foreground">
            <Users className="mr-1 h-3 w-3" />
            {selectedSite ? siteEmployees.length : employees.length} employees
          </div>
        </div>
        
        {isLoadingEmployees ? (
          <div className="flex items-center justify-center p-4 border rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Loading employees...</span>
          </div>
        ) : !selectedSite ? (
          <div className="p-3 border border-dashed rounded-lg text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Please select a site first
            </p>
          </div>
        ) : siteEmployees.length === 0 ? (
          <div className="p-3 border border-dashed rounded-lg text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No employees found at this site in {supervisorDepartment} department
            </p>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={fetchEmployees}
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Reload Employees
            </Button>
          </div>
        ) : isMobileView ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => setShowEmployeeList(!showEmployeeList)}
            >
              <span className="truncate">
                {selectedEmployee ? employees.find(e => e._id === selectedEmployee)?.name || "Select employee" : "Select employee"}
              </span>
              {showEmployeeList ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {showEmployeeList && (
              <div className="mt-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                {siteEmployees.map((employee) => (
                  <MobileEmployeeCard
                    key={employee._id}
                    employee={employee}
                    selected={selectedEmployee === employee._id}
                    onSelect={(id) => {
                      setSelectedEmployee(id);
                      setShowEmployeeList(false);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <Select
            value={selectedEmployee}
            onValueChange={setSelectedEmployee}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {siteEmployees.map((employee) => (
                <SelectItem key={employee._id} value={employee._id}>
                  <div className="flex flex-col py-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{employee.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {employee.employeeId}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{employee.position}</span>
                      <span>•</span>
                      <span>{employee.department}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedEmployee && selectedSite && (
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Employee Name</Label>
              <Input 
                value={employees.find(e => e._id === selectedEmployee)?.name || ""}
                readOnly 
                className="bg-background h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Employee ID</Label>
              <Input 
                value={employees.find(e => e._id === selectedEmployee)?.employeeId || ""}
                readOnly 
                className="bg-background h-9 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Department</Label>
              <Input 
                value={employees.find(e => e._id === selectedEmployee)?.department || ""}
                readOnly 
                className="bg-background h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Site</Label>
              <Input 
                value={supervisorSites.find(s => s._id === selectedSite)?.name || ""}
                readOnly 
                className="bg-background h-9 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Position</Label>
              <Input 
                value={employees.find(e => e._id === selectedEmployee)?.position || ""}
                readOnly 
                className="bg-background h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact</Label>
              <Input 
                value={employees.find(e => e._id === selectedEmployee)?.contactNumber || employees.find(e => e._id === selectedEmployee)?.phone || ""}
                readOnly 
                className="bg-background h-9 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="type" className="text-sm">Leave Type *</Label>
        <Select 
          value={formData.leaveType}
          onValueChange={(value) => handleInputChange("leaveType", value)}
        >
          <SelectTrigger className={`h-9 ${formErrors.leaveType ? 'border-red-500' : ''}`}>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="annual">Annual Leave</SelectItem>
            <SelectItem value="sick">Sick Leave</SelectItem>
            <SelectItem value="casual">Casual Leave</SelectItem>
            <SelectItem value="emergency">Emergency Leave</SelectItem>
            <SelectItem value="other">Other Leave</SelectItem>
          </SelectContent>
        </Select>
        {formErrors.leaveType && (
          <p className="text-xs text-red-500 mt-1">{formErrors.leaveType}</p>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="from" className="text-sm">From Date *</Label>
          <Input 
            id="from" 
            type="date" 
            value={formData.fromDate}
            onChange={(e) => handleInputChange("fromDate", e.target.value)}
            onBlur={() => {}}
            className={`h-9 ${formErrors.fromDate ? 'border-red-500' : ''}`}
          />
          {formErrors.fromDate && (
            <p className="text-xs text-red-500 mt-1">{formErrors.fromDate}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="to" className="text-sm">To Date *</Label>
          <Input 
            id="to" 
            type="date" 
            value={formData.toDate}
            onChange={(e) => handleInputChange("toDate", e.target.value)}
            onBlur={() => {}}
            min={formData.fromDate}
            className={`h-9 ${formErrors.toDate ? 'border-red-500' : ''}`}
          />
          {formErrors.toDate && (
            <p className="text-xs text-red-500 mt-1">{formErrors.toDate}</p>
          )}
        </div>
      </div>
      
      {formData.fromDate && formData.toDate && (
        <div className="text-sm text-muted-foreground">
          Total Days: {(() => {
            if (!formData.fromDate || !formData.toDate) return 0;
            const fromDate = new Date(formData.fromDate);
            const toDate = new Date(formData.toDate);
            const timeDiff = toDate.getTime() - fromDate.getTime();
            return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
          })()} days
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="reason" className="text-sm">Reason *</Label>
        <Textarea 
          id="reason" 
          name="reason"
          value={formData.reason}
          onChange={handleReasonChange}
          onBlur={() => {}}
          placeholder="Enter reason for leave" 
          className={`min-h-[80px] resize-none ${formErrors.reason ? 'border-red-500' : ''}`}
        />
        {formErrors.reason && (
          <p className="text-xs text-red-500 mt-1">{formErrors.reason}</p>
        )}
      </div>
      
      <div className="p-3 bg-yellow-50 rounded-lg">
        <p className="text-xs text-yellow-700 font-medium">
          This leave request will be sent to: Site Manager
        </p>
        <p className="text-xs text-yellow-700 mt-1">
          Employee: {employees.find(e => e._id === selectedEmployee)?.name || "Not selected"}
        </p>
        <p className="text-xs text-yellow-700 mt-1">
          Site: {supervisorSites.find(s => s._id === selectedSite)?.name || "Not selected"}
        </p>
        <p className="text-xs text-yellow-700 mt-1">
          Department: {supervisorDepartment}
        </p>
      </div>
      
      <div className="flex gap-2 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          className="flex-1"
          onClick={() => {
            // Reset form logic will be handled by parent
          }}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="flex-1"
          disabled={isSubmitting || !selectedEmployee || !selectedSite}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Leave'
          )}
        </Button>
      </div>
    </form>
  );
};

// Self Leave Form Component - Moved outside to prevent recreation
const SelfLeaveForm = ({ 
  formData, 
  formErrors, 
  handleInputChange, 
  handleSelfSubmit, 
  isSubmitting,
  supervisorSites,
  supervisorDepartment,
  user,
  calculateTotalDays
}: {
  formData: any;
  formErrors: any;
  handleInputChange: (field: string, value: string) => void;
  handleSelfSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
  supervisorSites: Site[];
  supervisorDepartment: string;
  user: any;
  calculateTotalDays: (from: string, to: string) => number;
}) => {
  const supervisorSite = supervisorSites.length > 0 ? supervisorSites[0] : null;
  
  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange("reason", e.target.value);
  };
  
 return (
  <form onSubmit={handleSelfSubmit} className="space-y-5">
    {/* Supervisor Information */}
    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
      <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
        <Shield className="h-4 w-4" /> Supervisor Information
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div className="flex justify-between border-b border-blue-100 pb-1">
          <span className="text-muted-foreground">Name</span>
          <span className="font-medium">{user?.name || "Supervisor"}</span>
        </div>
        <div className="flex justify-between border-b border-blue-100 pb-1">
          <span className="text-muted-foreground">Supervisor ID</span>
          <span className="font-medium font-mono text-xs">{user?._id || "Not available"}</span>
        </div>
        <div className="flex justify-between border-b border-blue-100 pb-1">
          <span className="text-muted-foreground">Department</span>
          <span className="font-medium">{user?.department || supervisorDepartment || "Not assigned"}</span>
        </div>
        <div className="flex justify-between border-b border-blue-100 pb-1">
          <span className="text-muted-foreground">Site</span>
          <span className="font-medium">{supervisorSite?.name || user?.site || "Not assigned"}</span>
        </div>
      </div>
    </div>

    {/* Applied By */}
    <div className="space-y-1">
      <Label htmlFor="self-appliedBy" className="text-sm">Applied By (Your Name) *</Label>
      <Input
        id="self-appliedBy"
        value={formData.appliedBy}
        onChange={(e) => handleInputChange("appliedBy", e.target.value)}
        placeholder="Enter your name"
        className={`h-9 ${formErrors.appliedBy ? 'border-red-500' : ''}`}
      />
      {formErrors.appliedBy && <p className="text-xs text-red-500">{formErrors.appliedBy}</p>}
    </div>

    {/* Leave Type */}
    <div className="space-y-1">
      <Label htmlFor="self-leaveType" className="text-sm">Leave Type *</Label>
      <Select
        value={formData.leaveType}
        onValueChange={(value) => handleInputChange("leaveType", value)}
      >
        <SelectTrigger className={`h-9 ${formErrors.leaveType ? 'border-red-500' : ''}`}>
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="annual">Annual Leave</SelectItem>
          <SelectItem value="sick">Sick Leave</SelectItem>
          <SelectItem value="casual">Casual Leave</SelectItem>
          <SelectItem value="emergency">Emergency Leave</SelectItem>
          <SelectItem value="other">Other Leave</SelectItem>
        </SelectContent>
      </Select>
      {formErrors.leaveType && <p className="text-xs text-red-500">{formErrors.leaveType}</p>}
    </div>

    {/* Date Range */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1">
        <Label htmlFor="self-from" className="text-sm">From Date *</Label>
        <Input
          id="self-from"
          type="date"
          value={formData.fromDate}
          onChange={(e) => handleInputChange("fromDate", e.target.value)}
          className={`h-9 ${formErrors.fromDate ? 'border-red-500' : ''}`}
        />
        {formErrors.fromDate && <p className="text-xs text-red-500">{formErrors.fromDate}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="self-to" className="text-sm">To Date *</Label>
        <Input
          id="self-to"
          type="date"
          value={formData.toDate}
          onChange={(e) => handleInputChange("toDate", e.target.value)}
          min={formData.fromDate}
          className={`h-9 ${formErrors.toDate ? 'border-red-500' : ''}`}
        />
        {formErrors.toDate && <p className="text-xs text-red-500">{formErrors.toDate}</p>}
      </div>
    </div>

    {formData.fromDate && formData.toDate && (
      <div className="text-sm text-muted-foreground">
        Total Days: <span className="font-medium">{calculateTotalDays(formData.fromDate, formData.toDate)}</span> days
      </div>
    )}

    {/* Reason */}
    <div className="space-y-1">
      <Label htmlFor="self-reason" className="text-sm">Reason *</Label>
      <Textarea
        id="self-reason"
        value={formData.reason}
        onChange={(e) => handleInputChange("reason", e.target.value)}
        placeholder="Enter reason for leave"
        className={`min-h-[80px] resize-none ${formErrors.reason ? 'border-red-500' : ''}`}
      />
      {formErrors.reason && <p className="text-xs text-red-500">{formErrors.reason}</p>}
    </div>

    {/* Info box */}
    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-xs text-purple-700 space-y-1">
      <p className="font-medium flex items-center gap-1"><Crown className="h-3 w-3" /> Your Supervisor Leave Request</p>
      <p>Site: {supervisorSite?.name || user?.site || "Not assigned"}</p>
      <p>Department: {user?.department || supervisorDepartment || "Not assigned"}</p>
      <p className="text-[10px] opacity-75">User ID: {user?._id || "Not available"} (stored as supervisorId)</p>
    </div>

    {/* Buttons */}
    <div className="flex gap-2 pt-2">
      <Button type="button" variant="outline" className="flex-1" onClick={() => { /* reset logic */ }}>
        Cancel
      </Button>
      <Button type="submit" className="flex-1" disabled={isSubmitting}>
        {isSubmitting ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
        ) : (
          'Submit Leave'
        )}
      </Button>
    </div>
  </form>
);
};

const Leave = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const { user, loading: authLoading } = useRole();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [selectedLeaveForView, setSelectedLeaveForView] = useState<LeaveRequest | null>(null);
  const [leaveToDelete, setLeaveToDelete] = useState<string | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [supervisorSites, setSupervisorSites] = useState<Site[]>([]);
  const [supervisorSiteNames, setSupervisorSiteNames] = useState<string[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [supervisorDepartment, setSupervisorDepartment] = useState<string>("");
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [applyMode, setApplyMode] = useState<'employee' | 'self'>('employee');
  const [activeTab, setActiveTab] = useState<"all" | "employee" | "supervisor">("all");
  
  // Mobile responsive state
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Tasks from tasks where supervisor is assigned
  const [supervisorTasks, setSupervisorTasks] = useState<Task[]>([]);

  // Form state for new leave
  const [formData, setFormData] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
    appliedBy: "",
  });

  // Form state for editing leave
  const [editFormData, setEditFormData] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
    appliedBy: "",
  });

  // Edit form validation errors
  const [editFormErrors, setEditFormErrors] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });

  // Debug state
  const [debugInfo, setDebugInfo] = useState<any>({
    sitesLoaded: false,
    employeesLoaded: false,
    userHasSite: false,
    userSiteValue: "",
    filteredEmployeesCount: 0,
    employeesBySite: {} as Record<string, number>,
    tasksWithSupervisor: 0,
    supervisorTasksCount: 0,
    supervisorSitesFromTasks: [] as string[],
    allEmployeesCount: 0,
    matchedEmployees: [] as any[],
    leaveRequestsCount: 0,
    leaveRequestsList: [] as any[],
    supervisorLeavesCount: 0,
    ownLeaveCount: 0
  });

  // Check for mobile view on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check API connection on component mount
  useEffect(() => {
    checkApiConnection();
    
    if (user) {
      setFormData(prev => ({
        ...prev,
        appliedBy: user.name || "Supervisor"
      }));
      
      if (user.department) {
        setSupervisorDepartment(user.department);
      }
    }
  }, [user]);

  // Fetch sites from tasks
  useEffect(() => {
    if (user && user.role === "supervisor") {
      console.log("Initializing supervisor data for Leave...");
      fetchSupervisorSitesFromTasks();
    }
  }, [user]);

  // Fetch employees when department or sites change
  useEffect(() => {
    if (supervisorDepartment && supervisorSites.length > 0 && apiStatus === 'connected') {
      console.log("Fetching employees for department:", supervisorDepartment);
      fetchEmployees();
    }
  }, [supervisorDepartment, supervisorSites, apiStatus]);

  // Fetch all leave requests when department is selected
  useEffect(() => {
    if (supervisorDepartment && apiStatus === 'connected') {
      console.log("Fetching all leave requests...");
      fetchAllLeaveRequests();
    }
  }, [supervisorDepartment, apiStatus]);

  // Fetch tasks where this specific supervisor is assigned
  const fetchSupervisorSitesFromTasks = async () => {
    if (!user) return [];
    
    try {
      setIsLoadingTasks(true);
      console.log("🔍 Fetching tasks for supervisor from Leave component...");
      
      const supervisorId = user._id || user.id;
      const supervisorName = user.name;
      
      console.log("Supervisor info:", {
        id: supervisorId,
        name: supervisorName,
        email: user.email
      });
      
      // Fetch all tasks from your tasks API
      const response = await axios.get(`${API_URL}/tasks`, {
        params: {
          limit: 1000
        }
      });
      
      let supervisorSiteNamesSet = new Set<string>();
      let supervisorSiteIdsSet = new Set<string>();
      let tasksWithSupervisor: Task[] = [];
      
      // Handle response format
      let allTasks: Task[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          allTasks = response.data;
        } else if (response.data.success && Array.isArray(response.data.data)) {
          allTasks = response.data.data;
        } else if (response.data.tasks && Array.isArray(response.data.tasks)) {
          allTasks = response.data.tasks;
        }
      }
      
      console.log(`📊 Total tasks fetched: ${allTasks.length}`);
      
      // Filter tasks where this supervisor is assigned
      allTasks.forEach((task: Task) => {
        let isAssignedToThisSupervisor = false;
        
        if (task.assignedUsers && Array.isArray(task.assignedUsers)) {
          isAssignedToThisSupervisor = task.assignedUsers.some(user => {
            const userIdMatch = user.userId === supervisorId;
            const nameMatch = user.name?.toLowerCase() === supervisorName?.toLowerCase();
            return userIdMatch || nameMatch;
          });
        }
        
        if (!isAssignedToThisSupervisor && task.assignedTo) {
          isAssignedToThisSupervisor = 
            task.assignedTo === supervisorId || 
            task.assignedToName?.toLowerCase() === supervisorName?.toLowerCase();
        }
        
        if (isAssignedToThisSupervisor && task.siteId && task.siteName) {
          supervisorSiteIdsSet.add(task.siteId);
          supervisorSiteNamesSet.add(task.siteName);
          tasksWithSupervisor.push(task);
        }
      });
      
      const taskSiteNames = Array.from(supervisorSiteNamesSet);
      const taskSiteIds = Array.from(supervisorSiteIdsSet);
      
      console.log(`✅ Found ${tasksWithSupervisor.length} tasks for this supervisor`);
      console.log("📍 Supervisor's sites from tasks:", taskSiteNames);
      
      setSupervisorTasks(tasksWithSupervisor);
      
      setDebugInfo((prev: any) => ({
        ...prev,
        supervisorTasksCount: tasksWithSupervisor.length,
        supervisorSitesFromTasks: taskSiteNames
      }));
      
      await fetchAllSites(taskSiteNames, taskSiteIds);
      
      return { siteNames: taskSiteNames, siteIds: taskSiteIds };
      
    } catch (error: any) {
      console.error('❌ Error fetching tasks:', error);
      
      setDebugInfo((prev: any) => ({
        ...prev,
        taskFetchError: error.message
      }));
      
      await fetchAllSites([], []);
      return { siteNames: [], siteIds: [] };
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Fetch all sites and filter by supervisor's task-assigned sites
  const fetchAllSites = async (taskSiteNames: string[], taskSiteIds: string[]) => {
    try {
      setIsLoadingSites(true);
      
      console.log("🌐 Fetching all sites from API...");
      
      const response = await axios.get(`${API_URL}/sites`);
      
      let allSites: Site[] = [];
      
      if (response.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          allSites = response.data.data;
        } else if (Array.isArray(response.data)) {
          allSites = response.data;
        } else if (response.data.sites && Array.isArray(response.data.sites)) {
          allSites = response.data.sites;
        }
      }
      
      console.log(`📊 Fetched ${allSites.length} sites from API`);
      
      const transformedSites = allSites.map((site: any) => ({
        _id: site._id || site.id,
        name: site.name,
        clientName: site.clientName || site.client,
        location: site.location || "",
        status: site.status || "active",
        managerCount: site.managerCount || 0,
        supervisorCount: site.supervisorCount || 0,
        employeeCount: site.employeeCount || 0
      }));
      
      setSites(transformedSites);
      
      let supervisorSiteList: Site[] = [];
      
      if (taskSiteNames.length > 0) {
        supervisorSiteList = transformedSites.filter(site => {
          const exactNameMatch = taskSiteNames.some(taskSiteName => 
            site.name === taskSiteName
          );
          
          const exactNormalizedMatch = taskSiteNames.some(taskSiteName => 
            normalizeSiteName(site.name) === normalizeSiteName(taskSiteName)
          );
          
          const idMatch = taskSiteIds.includes(site._id);
          
          return exactNameMatch || exactNormalizedMatch || idMatch;
        });
        
        console.log(`✅ Matched ${supervisorSiteList.length} sites from task assignments`);
      } else {
        console.log("⚠️ No sites found from tasks - supervisor has no assigned tasks");
      }
      
      setSupervisorSites(supervisorSiteList);
      setSupervisorSiteNames(supervisorSiteList.map(site => site.name));
      
      setDebugInfo((prev: any) => ({
        ...prev,
        sitesLoaded: true,
        userHasSite: supervisorSiteList.length > 0,
        userSiteValue: supervisorSiteList.map(s => s.name).join(', '),
        allSitesCount: transformedSites.length,
        matchedSitesCount: supervisorSiteList.length,
        matchedSites: supervisorSiteList.map(s => s.name),
        taskSiteNames
      }));
      
      if (supervisorSiteList.length === 0) {
        toast.warning("You don't have any tasks assigned to any sites.");
      } else {
        fetchDepartments();
      }
      
      return supervisorSiteList;
      
    } catch (error: any) {
      console.error('❌ Error fetching sites:', error);
      toast.error(`Failed to load sites: ${error.message}`);
      return [];
    } finally {
      setIsLoadingSites(false);
    }
  };

  const checkApiConnection = async () => {
    try {
      setApiStatus('checking');
      const response = await fetch(`${API_URL}/test`);
      
      if (response.ok) {
        setApiStatus('connected');
        console.log("✅ API connection successful");
        toast.success("API connected successfully");
      } else {
        setApiStatus('error');
        console.error("❌ API connection failed");
        toast.error("API connection failed");
      }
    } catch (error) {
      setApiStatus('error');
      console.error("❌ API connection error:", error);
      toast.error("Cannot connect to server. Please make sure backend is running.");
    }
  };

  const fetchDepartments = async () => {
    if (supervisorSites.length === 0) {
      console.error("No sites available");
      return;
    }

    try {
      console.log("Fetching departments from employees...");
      
      const siteIds = supervisorSites.map(site => site._id);
      
      const response = await axios.get(`${API_URL}/employees`, {
        params: {
          siteIds: siteIds.join(','),
          limit: 1000
        }
      });
      
      let allEmployees: Employee[] = [];
      
      if (response.data && response.data.success) {
        allEmployees = response.data.data || response.data.employees || [];
      } else if (Array.isArray(response.data)) {
        allEmployees = response.data;
      } else if (response.data.employees && Array.isArray(response.data.employees)) {
        allEmployees = response.data.employees;
      }
      
      console.log(`Fetched ${allEmployees.length} employees for departments`);
      
      const siteEmployees = allEmployees.filter((emp: Employee) => {
        const employeeSiteId = normalizeSiteId(emp.siteId || emp.site || emp.siteName);
        return supervisorSites.some(site => compareSiteIds(site._id, employeeSiteId));
      });
      
      const departments = Array.from(new Set(
        siteEmployees
          .map((emp: Employee) => emp.department)
          .filter(Boolean)
      ));
      
      console.log("Found departments from employees:", departments);
      
      if (departments.length > 0) {
        setAvailableDepartments(departments);
        
        if (user?.department && departments.includes(user.department)) {
          setSupervisorDepartment(user.department);
          console.log("Set supervisor department to user's department:", user.department);
        } else if (departments.length > 0) {
          setSupervisorDepartment(departments[0]);
          console.log("Set supervisor department to first available:", departments[0]);
        }
        
        toast.success(`Loaded ${departments.length} departments`);
      } else {
        useDefaultDepartments();
      }
    } catch (error: any) {
      console.error("Error fetching departments:", error);
      useDefaultDepartments();
    }
  };

  const useDefaultDepartments = () => {
    const defaultDepartments = ["Operations", "Housekeeping", "Security", "Maintenance", "Administration"];
    setAvailableDepartments(defaultDepartments);
    
    if (!supervisorDepartment && defaultDepartments.length > 0) {
      if (user?.department && defaultDepartments.includes(user.department)) {
        setSupervisorDepartment(user.department);
      } else {
        setSupervisorDepartment(defaultDepartments[0]);
      }
    }
    console.log("Using default departments:", defaultDepartments);
    toast.warning("No departments found. Using default departments.");
  };

  // Fetch employees
  const fetchEmployees = async () => {
    if (!user) {
      console.log("No current user");
      return;
    }
    
    try {
      setIsLoadingEmployees(true);
      
      let supervisorSiteList = supervisorSites;
      let supervisorSiteNameList = supervisorSiteNames;
      
      if (supervisorSiteList.length === 0) {
        supervisorSiteList = await fetchSupervisorSitesFromTasks() as any || [];
        supervisorSiteNameList = supervisorSiteList.map((site: Site) => site.name);
      }
      
      if (supervisorSiteNameList.length === 0) {
        console.log("❌ No sites from tasks - setting empty employees array");
        setEmployees([]);
        setIsLoadingEmployees(false);
        
        toast.warning("You have no tasks assigned to any sites.");
        return;
      }
      
      console.log("📡 Fetching all employees from API:", `${API_URL}/employees`);
      console.log("📍 Supervisor's task-assigned sites:", supervisorSiteNameList);
      
      const response = await axios.get(`${API_URL}/employees`, {
        params: {
          limit: 1000
        }
      });
      
      let fetchedEmployees: Employee[] = [];
      let allEmployees: Employee[] = [];
      
      if (response.data && response.data.success) {
        allEmployees = response.data.data || response.data.employees || [];
      } else if (Array.isArray(response.data)) {
        allEmployees = response.data;
      } else if (response.data.employees && Array.isArray(response.data.employees)) {
        allEmployees = response.data.employees;
      }
      
      console.log(`📊 Total employees from API: ${allEmployees.length}`);
      
      fetchedEmployees = allEmployees.filter((emp: Employee) => {
        const employeeSite = emp.siteName || emp.site || '';
        
        const exactMatch = supervisorSiteNameList.some(siteName => 
          siteName === employeeSite
        );
        
        const normalizedExactMatch = supervisorSiteNameList.some(siteName => 
          normalizeSiteName(siteName) === normalizeSiteName(employeeSite)
        );
        
        const siteIdMatch = emp.siteId && supervisorSites.some(site => 
          compareSiteIds(site._id, emp.siteId)
        );
        
        const matches = exactMatch || normalizedExactMatch || siteIdMatch;
        
        if (matches) {
          console.log(`✅ Employee ${emp.name} (${emp.employeeId}) matches site: "${employeeSite}"`);
        }
        
        return matches;
      });
      
      console.log(`✅ Filtered ${fetchedEmployees.length} employees for supervisor's task-assigned sites`);
      
      const siteCount: Record<string, number> = {};
      fetchedEmployees.forEach(emp => {
        const site = emp.siteName || emp.site || 'Unknown';
        siteCount[site] = (siteCount[site] || 0) + 1;
      });
      console.log("📊 Employee distribution by site:", siteCount);
      
      setEmployees(fetchedEmployees);
      
      const siteDistribution: Record<string, number> = {};
      allEmployees.forEach((emp: Employee) => {
        const site = emp.siteName || emp.site || 'Unassigned';
        siteDistribution[site] = (siteDistribution[site] || 0) + 1;
      });
      
      setDebugInfo((prev: any) => ({
        ...prev,
        employeesLoaded: fetchedEmployees.length > 0,
        filteredEmployeesCount: fetchedEmployees.length,
        employeesBySite: siteCount,
        allEmployeesCount: allEmployees.length,
        supervisorSitesFromTasks: supervisorSiteNameList,
        employeeSiteDistribution: siteDistribution,
        matchedEmployees: fetchedEmployees.map(e => ({
          name: e.name,
          site: e.siteName || e.site
        }))
      }));
      
      if (fetchedEmployees.length > 0) {
        toast.success(`Loaded ${fetchedEmployees.length} employees for your task-assigned sites`);
        
        if (fetchedEmployees.length > 0 && !selectedEmployee) {
          setSelectedEmployee(fetchedEmployees[0]._id);
        }
      } else {
        toast.warning(`No employees found for your task-assigned sites: ${supervisorSiteNameList.join(', ')}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error fetching employees:', error);
      
      if (error.code === 'ERR_NETWORK') {
        toast.error("Network error: Cannot connect to server. Please check if backend is running.");
      } else if (error.response?.status === 404) {
        toast.error("API endpoint not found. Please check backend configuration.");
      } else {
        toast.error(`Failed to load employees: ${error.message}`);
      }
      
      setEmployees([]);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // Fetch ALL leave requests from the leaves collection
  const fetchAllLeaveRequests = async () => {
    if (apiStatus !== 'connected') {
      toast.error("Please check API connection first");
      return;
    }

    try {
      setIsLoading(true);
      
      console.log("========== FETCHING ALL LEAVE REQUESTS ==========");
      console.log("📋 Fetching all leave requests from API...");
      console.log("API URL:", `${API_URL}/leaves`);
      
      const response = await axios.get(`${API_URL}/leaves`, {
        params: {
          limit: 1000
        }
      });
      
      console.log("Response Status:", response.status);
      
      let leavesList: LeaveRequest[] = [];
      
      if (response.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          leavesList = response.data.data;
          console.log("✅ Response has data array of", leavesList.length, "leaves");
        } else if (Array.isArray(response.data)) {
          leavesList = response.data;
          console.log("✅ Response is an array of", leavesList.length, "leaves");
        } else if (response.data.leaves && Array.isArray(response.data.leaves)) {
          leavesList = response.data.leaves;
          console.log("✅ Response has leaves array of", leavesList.length, "leaves");
        } else {
          console.log("⚠️ Unexpected response format:", response.data);
        }
      }
      
      console.log(`📊 Total leaves from API: ${leavesList.length}`);
      
      // Log all leaves for debugging
      if (leavesList.length > 0) {
        console.log("All leaves:", leavesList.map(l => ({
          id: l._id,
          employee: l.employeeName,
          isSupervisorLeave: l.isSupervisorLeave,
          supervisorId: l.supervisorId,
          appliedBy: l.appliedBy
        })));
      }
      
      // Count supervisor leaves and own leaves - like attendance system
      const supervisorLeaves = leavesList.filter(l => l.isSupervisorLeave === true);
      const ownLeaves = leavesList.filter(l => 
        l.isSupervisorLeave === true && l.supervisorId === user?._id
      );
      
      console.log(`👤 Supervisor leaves total: ${supervisorLeaves.length}`);
      console.log(`👤 Your own leaves: ${ownLeaves.length}`);
      
      leavesList.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setLeaveRequests(leavesList);
      
      setDebugInfo((prev: any) => ({
        ...prev,
        leaveRequestsCount: leavesList.length,
        supervisorLeavesCount: supervisorLeaves.length,
        ownLeaveCount: ownLeaves.length,
        leaveRequestsList: leavesList.slice(0, 5).map(l => ({
          employee: l.employeeName,
          department: l.department,
          site: l.site,
          status: l.status,
          isSupervisor: l.isSupervisorLeave,
          supervisorId: l.supervisorId,
          isOwn: l.supervisorId === user?._id
        }))
      }));
      
      if (leavesList.length > 0) {
        toast.success(`Loaded ${leavesList.length} leave requests (${ownLeaves.length} from you)`);
        console.log("Sample leaves:", leavesList.slice(0, 3));
      } else {
        console.log("No leaves found in the collection");
        toast.info("No leave requests found in the database");
      }
      
    } catch (error: any) {
      console.error("❌ Error fetching leave requests:", error);
      
      if (error.response) {
        console.error("Error response status:", error.response.status);
        console.error("Error response data:", error.response.data);
        
        if (error.response.status === 404) {
          toast.error("Leaves API endpoint not found. Please check backend.");
        } else {
          toast.error(error.response.data?.message || "Failed to load leave requests");
        }
      } else if (error.request) {
        console.error("No response received:", error.request);
        toast.error("No response from server. Please check if backend is running.");
      } else {
        console.error("Error message:", error.message);
        toast.error(`Request error: ${error.message}`);
      }
      
      setLeaveRequests([]);
    } finally {
      setIsLoading(false);
      console.log("========== FETCH COMPLETE ==========");
    }
  };

  const calculateTotalDays = (from: string, to: string) => {
    if (!from || !to) return 0;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const timeDiff = toDate.getTime() - fromDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  // Get employees for the selected site
  const getEmployeesForSite = (siteId: string): Employee[] => {
    const site = supervisorSites.find(s => s._id === siteId);
    if (!site) return [];
    
    return employees.filter(emp => {
      const employeeSite = emp.siteName || emp.site || '';
      return employeeSite === site.name || normalizeSiteName(employeeSite) === normalizeSiteName(site.name);
    });
  };

  // Handle site selection in the form
  const handleSiteSelect = (siteId: string) => {
    setSelectedSite(siteId);
    const selectedSiteObj = supervisorSites.find(s => s._id === siteId);
    if (selectedSiteObj) {
      console.log(`Selected site: ${selectedSiteObj.name}, employees: ${getEmployeesForSite(siteId).length}`);
    }
    setSelectedEmployee("");
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: "" }));
  };

  // Handle edit form input changes
  const handleEditInputChange = (field: string, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    setEditFormErrors(prev => ({ ...prev, [field]: "" }));
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const errors = {
      leaveType: "",
      fromDate: "",
      toDate: "",
      reason: "",
      appliedBy: "",
    };
    
    let isValid = true;
    
    if (!formData.leaveType) {
      errors.leaveType = "Please select leave type";
      isValid = false;
    }
    
    if (!formData.fromDate) {
      errors.fromDate = "Please select from date";
      isValid = false;
    }
    
    if (!formData.toDate) {
      errors.toDate = "Please select to date";
      isValid = false;
    }
    
    if (!formData.reason.trim()) {
      errors.reason = "Please enter reason for leave";
      isValid = false;
    }
    
    if (!formData.appliedBy.trim()) {
      errors.appliedBy = "Please enter supervisor name";
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  };

  // Validate edit form before submission
  const validateEditForm = (): boolean => {
    const errors = {
      leaveType: "",
      fromDate: "",
      toDate: "",
      reason: "",
    };
    
    let isValid = true;
    
    if (!editFormData.leaveType) {
      errors.leaveType = "Please select leave type";
      isValid = false;
    }
    
    if (!editFormData.fromDate) {
      errors.fromDate = "Please select from date";
      isValid = false;
    }
    
    if (!editFormData.toDate) {
      errors.toDate = "Please select to date";
      isValid = false;
    }
    
    if (!editFormData.reason.trim()) {
      errors.reason = "Please enter reason for leave";
      isValid = false;
    }
    
    setEditFormErrors(errors);
    return isValid;
  };

  // Handle approve leave
const handleApproveLeave = async (leaveId: string, remarks: string) => {
  if (!leaveId) {
    console.error("Approve attempted with no leave ID");
    toast.error("Cannot approve: No leave ID provided");
    return;
  }

  try {
    console.log("Approving leave with ID:", leaveId);
    
    const response = await axios.put(`${API_URL}/leaves/${leaveId}/status`, {
      status: 'approved',
      managerName: user?.name || 'Supervisor',
      remarks,
      approvedBy: user?.name
    });

    console.log("Approve response:", response.data);

    if (response.data.success) {
      toast.success('Leave approved successfully');
      
      // ✅ Dispatch leave-update event
      const leave = leaveRequests.find(l => l._id === leaveId);
      if (leave) {
        window.dispatchEvent(new CustomEvent('leave-update', {
          detail: {
            leaveId: leave._id,
            title: '✅ Leave Approved',
            message: `${leave.employeeName}'s ${leave.leaveType} leave has been approved by ${user?.name || 'Supervisor'}`,
            notificationType: 'leave_approved',
            employeeName: leave.employeeName,
            leaveType: leave.leaveType,
            approvedBy: user?.name
          }
        }));
      }
      
      await fetchAllLeaveRequests();
      setViewDialogOpen(false);
    } else {
      toast.error(response.data.message || 'Failed to approve leave');
    }
  } catch (error: any) {
      console.error('Error approving leave:', error);
      if (error.response) {
        console.error("Error response:", error.response.data);
        toast.error(error.response.data?.message || 'Failed to approve leave');
      } else {
        toast.error('Failed to approve leave: Network error');
      }
    }
  };

  // Handle reject leave
  const handleRejectLeave = async (leaveId: string, remarks: string) => {
  if (!leaveId) {
    console.error("Reject attempted with no leave ID");
    toast.error("Cannot reject: No leave ID provided");
    return;
  }

  try {
    console.log("Rejecting leave with ID:", leaveId);
    
    const response = await axios.put(`${API_URL}/leaves/${leaveId}/status`, {
      status: 'rejected',
      managerName: user?.name || 'Supervisor',
      remarks,
      rejectedBy: user?.name
    });

    console.log("Reject response:", response.data);

    if (response.data.success) {
      toast.success('Leave rejected successfully');
      
      // ✅ Dispatch leave-update event
      const leave = leaveRequests.find(l => l._id === leaveId);
      if (leave) {
        window.dispatchEvent(new CustomEvent('leave-update', {
          detail: {
            leaveId: leave._id,
            title: '❌ Leave Rejected',
            message: `${leave.employeeName}'s ${leave.leaveType} leave has been rejected by ${user?.name || 'Supervisor'}`,
            notificationType: 'leave_rejected',
            employeeName: leave.employeeName,
            leaveType: leave.leaveType,
            rejectedBy: user?.name
          }
        }));
      }
      
      await fetchAllLeaveRequests();
      setViewDialogOpen(false);
    } else {
      toast.error(response.data.message || 'Failed to reject leave');
    }
  }catch (error: any) {
      console.error('Error rejecting leave:', error);
      if (error.response) {
        console.error("Error response:", error.response.data);
        toast.error(error.response.data?.message || 'Failed to reject leave');
      } else {
        toast.error('Failed to reject leave: Network error');
      }
    }
  };

  // Handle edit leave
  const handleEditLeave = (leave: LeaveRequest) => {
    console.log("Editing leave:", leave);
    setSelectedLeave(leave);
    setEditFormData({
      leaveType: leave.leaveType,
      fromDate: leave.fromDate.split('T')[0],
      toDate: leave.toDate.split('T')[0],
      reason: leave.reason,
    });
    setEditDialogOpen(true);
  };

  // Handle update leave
  const handleUpdateLeave = async () => {
    if (!selectedLeave) return;
    
    if (!validateEditForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const totalDays = calculateTotalDays(editFormData.fromDate, editFormData.toDate);
    
    if (totalDays < 1) {
      toast.error("End date must be after start date");
      return;
    }

    const fromDateObj = new Date(editFormData.fromDate);
    const toDateObj = new Date(editFormData.toDate);
    
    const fromDateStr = fromDateObj.toISOString().split('T')[0];
    const toDateStr = toDateObj.toISOString().split('T')[0];

    // IMPORTANT: Use the correct ID field
    const leaveId = selectedLeave._id || selectedLeave.id;
    
    console.log("Updating leave with ID:", leaveId, "Type:", typeof leaveId);
    console.log("Selected leave object:", selectedLeave);

    const updateData = {
      leaveType: editFormData.leaveType,
      fromDate: fromDateStr,
      toDate: toDateStr,
      totalDays: totalDays,
      reason: editFormData.reason.trim(),
    };

    console.log("Update data:", updateData);

    try {
      setIsSubmitting(true);
      
      const response = await axios.put(`${API_URL}/leaves/${leaveId}`, updateData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sk_token')}`
        }
      });
      
      console.log("Response:", response.data);
      
      if (response.data.success) {
        toast.success("Leave request updated successfully!");
        
        setEditDialogOpen(false);
        await fetchAllLeaveRequests();
      } else {
        toast.error(response.data.message || "Failed to update leave");
      }
      
    } catch (error: any) {
      console.error("Error updating leave:", error);
      
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        
        const errorMessage = error.response.data?.message || 
                            error.response.data?.error || 
                            JSON.stringify(error.response.data) ||
                            "Server error";
        toast.error(`Failed to update: ${errorMessage}`);
      } else if (error.request) {
        console.error("No response received:", error.request);
        toast.error("No response from server. Please check if backend is running.");
      } else {
        console.error("Error message:", error.message);
        toast.error(`Request error: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete leave - FIXED VERSION
  const handleDeleteLeave = async () => {
    // Check if leaveToDelete is set
    if (!leaveToDelete) {
      console.error("Delete attempted with no leaveToDelete");
      toast.error("Cannot delete: No leave request selected");
      return;
    }

    console.log("Deleting leave with ID:", leaveToDelete);

    try {
      setIsSubmitting(true);
      
      const response = await axios.delete(`${API_URL}/leaves/${leaveToDelete}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sk_token')}`
        }
      });
      
      console.log("Delete response:", response.data);
      
      if (response.data.success) {
        toast.success("Leave request deleted successfully!");
        
        // Update local state immediately for better UX
        setLeaveRequests(prev => prev.filter(leave => leave._id !== leaveToDelete && leave.id !== leaveToDelete));
        
        setDeleteDialogOpen(false);
        setLeaveToDelete(null);
        
        // Refresh from server to ensure consistency
        await fetchAllLeaveRequests();
      } else {
        toast.error(response.data.message || "Failed to delete leave request");
      }
      
    } catch (error: any) {
      console.error("Error deleting leave:", error);
      
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        
        const errorMessage = error.response.data?.message || 
                            error.response.data?.error || 
                            JSON.stringify(error.response.data) ||
                            "Server error";
        toast.error(`Failed to delete: ${errorMessage}`);
      } else if (error.request) {
        console.error("No response received:", error.request);
        toast.error("No response from server. Please check if backend is running.");
      } else {
        console.error("Error message:", error.message);
        toast.error(`Request error: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Submitting employee leave form...", {
      formData,
      selectedEmployee,
      selectedSite,
      applyMode,
      supervisorDepartment
    });
    
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }
    
    if (!selectedSite) {
      toast.error("Please select a site");
      return;
    }

    const selectedEmp = employees.find(emp => emp._id === selectedEmployee);
    if (!selectedEmp) {
      toast.error("Selected employee not found");
      return;
    }

    const selectedSiteObj = supervisorSites.find(s => s._id === selectedSite);
    if (!selectedSiteObj) {
      toast.error("Selected site not found");
      return;
    }

    const totalDays = calculateTotalDays(formData.fromDate, formData.toDate);
    
    if (totalDays < 1) {
      toast.error("End date must be after start date");
      return;
    }

    const fromDateObj = new Date(formData.fromDate);
    const toDateObj = new Date(formData.toDate);
    
    const fromDateStr = fromDateObj.toISOString().split('T')[0];
    const toDateStr = toDateObj.toISOString().split('T')[0];

    const leaveData = {
      employeeId: selectedEmp.employeeId,
      employeeName: selectedEmp.name,
      department: selectedEmp.department,
      site: selectedSiteObj.name,
      siteId: selectedSiteObj._id,
      contactNumber: selectedEmp.contactNumber || selectedEmp.phone || "",
      leaveType: formData.leaveType,
      fromDate: fromDateStr,
      toDate: toDateStr,
      totalDays: totalDays,
      reason: formData.reason.trim(),
      appliedBy: formData.appliedBy.trim(),
      appliedFor: selectedEmp.employeeId,
      supervisorId: user?._id,
      status: 'pending',
      isSupervisorLeave: false,
      reportingManagerId: user?._id,
      reportingManagerName: user?.name,
      position: selectedEmp.position,
      email: selectedEmp.email
    };

    console.log("Submitting employee leave data:", leaveData);

    try {
      setIsSubmitting(true);
      
      const response = await axios.post(`${API_URL}/leaves/apply`, leaveData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sk_token')}`
        }
      });
      
      console.log("Response:", response.data);
      
      if (response.data.success) {

        toast.success(response.data.message || "Leave request submitted successfully for employee!");
        // 🔔 Notify superadmin about new leave request (for employee)
const selectedEmp = employees.find(emp => emp._id === selectedEmployee);
createNotificationForSuperadmin(
  '📋 New Leave Request',
  `${selectedEmp?.name} applied for ${formData.leaveType} leave (${totalDays} days) – applied by ${user?.name}`,
  'info',
  'medium',
  {
    leaveId: response.data.data?._id,
    employeeName: selectedEmp?.name,
    appliedBy: user?.name,
    leaveType: formData.leaveType,
    fromDate: formData.fromDate,
    toDate: formData.toDate,
    totalDays: totalDays
  },
  'leave_request'
);
        setFormData({
          leaveType: "",
          fromDate: "",
          toDate: "",
          reason: "",
          appliedBy: user?.name || "Supervisor",
        });
        
        setFormErrors({
          leaveType: "",
          fromDate: "",
          toDate: "",
          reason: "",
          appliedBy: "",
        });
        
        setDialogOpen(false);
        setSelectedEmployee("");
        setSelectedSite("");
        
        await fetchAllLeaveRequests();
      } else {
        toast.error(response.data.message || "Failed to submit leave");
      }
      
    } catch (error: any) {
      console.error("Error submitting employee leave request:", error);
      
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        
        const errorMessage = error.response.data?.message || 
                            error.response.data?.error || 
                            JSON.stringify(error.response.data) ||
                            "Server error";
        toast.error(`Failed to submit: ${errorMessage}`);
      } else if (error.request) {
        console.error("Error request:", error.request);
        toast.error("No response from server. Please check if backend is running.");
      } else {
        console.error("Error message:", error.message);
        toast.error(`Request error: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle self leave submission - EXACTLY LIKE ATTENDANCE CHECKIN
  const handleSelfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Submitting self leave form...", {
      formData,
      applyMode,
      supervisorDepartment,
      user: {
        id: user?._id,
        name: user?.name,
        email: user?.email,
        employeeId: user?.employeeId
      }
    });
    
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!supervisorSites.length) {
      toast.error("No sites assigned. Cannot apply for leave.");
      return;
    }

    if (!supervisorDepartment) {
      toast.error("Department not assigned. Cannot apply for leave.");
      return;
    }

    const supervisorSite = supervisorSites[0];
    if (!supervisorSite) {
      toast.error("No sites available for supervisor");
      return;
    }

    const totalDays = calculateTotalDays(formData.fromDate, formData.toDate);
    
    if (totalDays < 1) {
      toast.error("End date must be after start date");
      return;
    }

    const fromDateObj = new Date(formData.fromDate);
    const toDateObj = new Date(formData.toDate);
    
    const fromDateStr = fromDateObj.toISOString().split('T')[0];
    const toDateStr = toDateObj.toISOString().split('T')[0];

    // EXACTLY LIKE ATTENDANCE CHECKIN - Use user._id as supervisorId from users collection
    const leaveData = {
      // Required fields
      employeeId: user?.employeeId || `SUP_${user?._id || Date.now()}`,
      employeeName: user?.name || "Supervisor",
      department: user?.department || supervisorDepartment,
      contactNumber: user?.phone || "",
      leaveType: formData.leaveType,
      fromDate: fromDateStr,
      toDate: toDateStr,
      totalDays: totalDays,
      reason: formData.reason.trim(),
      appliedBy: formData.appliedBy.trim(),
      appliedFor: user?.employeeId || `SUP_${user?._id || Date.now()}`,
      
      // Site information
      site: supervisorSite.name,
      siteId: supervisorSite._id,
      
      // CRITICAL: Mark as supervisor leave to skip employee validation
      isSupervisorLeave: true,  // This tells the backend to skip employee validation
      
      // EXACTLY LIKE ATTENDANCE - supervisorId references users collection
      supervisorId: user?._id, // This references the users collection
      
      // Additional info
      position: user?.position || "Supervisor",
      email: user?.email || "",
      status: 'pending'
    };

    console.log("Submitting self leave data with isSupervisorLeave=true and supervisorId from users collection:", leaveData);

    try {
      setIsSubmitting(true);
      
      const response = await axios.post(`${API_URL}/leaves/apply`, leaveData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sk_token')}`
        }
      });
      
      console.log("Response:", response.data);
      
      if (response.data.success) {

        // 🔔 Notify superadmin about new leave request (self)

        toast.success("Leave request submitted successfully for yourself!");
        createNotificationForSuperadmin(
  '📋 New Leave Request',
  `${user?.name} applied for ${formData.leaveType} leave (${totalDays} days)`,
  'info',
  'medium',
  {
    leaveId: response.data.data?._id,
    employeeName: user?.name,
    leaveType: formData.leaveType,
    fromDate: formData.fromDate,
    toDate: formData.toDate,
    totalDays: totalDays
  },
  'leave_request'
);
        setFormData({
          leaveType: "",
          fromDate: "",
          toDate: "",
          reason: "",
          appliedBy: user?.name || "Supervisor",
        });
        
        setFormErrors({
          leaveType: "",
          fromDate: "",
          toDate: "",
          reason: "",
          appliedBy: "",
        });
        
        setDialogOpen(false);
        
        await fetchAllLeaveRequests();
      } else {
        toast.error(response.data.message || "Failed to submit leave");
      }
      
    } catch (error: any) {
      console.error("Error submitting self leave request:", error);
      
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        
        const errorMessage = error.response.data?.message || 
                            error.response.data?.error || 
                            JSON.stringify(error.response.data) ||
                            "Server error";
        toast.error(`Failed to submit: ${errorMessage}`);
      } else if (error.request) {
        console.error("No response received:", error.request);
        toast.error("No response from server. Please check if backend is running.");
      } else {
        console.error("Error message:", error.message);
        toast.error(`Request error: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Test function to verify leave application endpoint
  const testLeaveApplication = async () => {
    try {
      console.log("Testing leave application endpoint...");
      toast.info("Testing leave API...");
      
      const testData = {
        employeeId: "TEST001",
        employeeName: "Test Employee",
        department: "Operations",
        site: "Test Site",
        siteId: "test123",
        contactNumber: "1234567890",
        leaveType: "casual",
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        totalDays: 1,
        reason: "Test leave",
        appliedBy: "Test Supervisor",
        appliedFor: "TEST001",
        status: 'pending',
        isSupervisorLeave: false
      };
      
      const response = await axios.post(`${API_URL}/leaves/apply`, testData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Test response:", response.data);
      if (response.data.success) {
        toast.success("Test successful! Check console for response");
      } else {
        toast.error("Test failed: " + response.data.message);
      }
    } catch (error: any) {
      console.error("Test failed:", error);
      if (error.response) {
        console.error("Error response:", error.response.data);
        toast.error(`Test failed: ${error.response.data?.message || error.message}`);
      } else {
        toast.error(`Test failed: ${error.message}`);
      }
    }
  };

  const handleTestDatabase = async () => {
    try {
      setIsLoading(true);
      toast.info("Testing database connection...");
      
      const response = await axios.get(`${API_URL}/leaves/test/employees`);
      
      console.log("Database test response:", response.data);
      
      if (response.data && response.data.success) {
        toast.success(
          `Database connected! Found ${response.data.totalCount || 0} employees, ${response.data.activeCount || 0} active. Departments: ${response.data.departments?.join(', ') || 'None'}`
        );
        
        if (response.data.departments && response.data.departments.length > 0) {
          setAvailableDepartments(response.data.departments);
          if (!response.data.departments.includes(supervisorDepartment) && response.data.departments.length > 0) {
            setSupervisorDepartment(response.data.departments[0]);
          }
        }
        
        setApiStatus('connected');
      } else {
        toast.error(response.data?.message || "Database test failed");
      }
    } catch (error: any) {
      console.error("Database test error:", error);
      toast.error(error.response?.data?.message || "Failed to connect to database");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDebugApi = () => {
    console.log("=== API Debug Information ===");
    console.log("API_URL:", API_URL);
    console.log("Current user:", user);
    console.log("User site:", user?.site);
    console.log("User department:", user?.department);
    console.log("Current selected department:", supervisorDepartment);
    console.log("Available departments:", availableDepartments);
    console.log("Supervisor sites count:", supervisorSites.length);
    console.log("Supervisor sites:", supervisorSites.map(s => ({ id: s._id, name: s.name })));
    console.log("Selected site:", selectedSite);
    console.log("Employees count:", employees.length);
    console.log("Employees list:", employees.map(e => ({ name: e.name, site: e.siteName, dept: e.department })));
    console.log("Employees by site:", debugInfo.employeesBySite);
    console.log("Selected employee:", selectedEmployee);
    console.log("Apply mode:", applyMode);
    console.log("Tasks with supervisor:", debugInfo.supervisorTasksCount);
    console.log("Sites from tasks:", debugInfo.supervisorSitesFromTasks);
    console.log("Leave requests:", leaveRequests.length);
    console.log("Supervisor leaves:", leaveRequests.filter(l => l.isSupervisorLeave).length);
    console.log("Your leaves:", leaveRequests.filter(l => l.isSupervisorLeave && l.supervisorId === user?._id).length);
    console.log("Leave requests list:", leaveRequests.slice(0, 5).map(l => ({ 
      employee: l.employeeName, 
      site: l.site, 
      status: l.status,
      isSupervisor: l.isSupervisorLeave,
      supervisorId: l.supervisorId,
      isOwn: l.supervisorId === user?._id
    })));
    console.log("Debug info:", debugInfo);
    
    toast.info("API debug complete. Check console for details.");
  };

  const handleRefreshAll = async () => {
    checkApiConnection();
    await fetchSupervisorSitesFromTasks();
    await fetchAllLeaveRequests();
  };

  const debugLeaveSystem = () => {
    console.log("=== LEAVE SYSTEM DEBUG ===");
    console.log("1. User Info:", {
      name: user?.name,
      email: user?.email,
      site: user?.site,
      department: user?.department,
      role: user?.role,
      id: user?._id,
      employeeId: user?.employeeId,
      phone: user?.phone,
      position: user?.position
    });
    
    console.log("2. System Status:", {
      apiStatus,
      supervisorDepartment,
      availableDepartments,
      sitesCount: supervisorSites.length,
      sites: supervisorSites.map(s => s.name),
      selectedSite,
      employeesCount: employees.length,
      employeesBySite: debugInfo.employeesBySite,
      employeesList: employees.map(e => ({ name: e.name, site: e.siteName, dept: e.department })),
      selectedEmployee,
      leaveRequestsCount: leaveRequests.length,
      supervisorLeaveCount: leaveRequests.filter(l => l.isSupervisorLeave).length,
      ownLeaveCount: leaveRequests.filter(l => l.isSupervisorLeave && l.supervisorId === user?._id).length,
      applyMode,
      tasksWithSupervisor: debugInfo.supervisorTasksCount,
      sitesFromTasks: debugInfo.supervisorSitesFromTasks,
      debugInfo
    });
    
    console.log("3. Form Data:", formData);
    console.log("4. Selected Employee Data:", employees.find(e => e._id === selectedEmployee));
    
    toast.info("Debug info logged to console. Check F12 → Console");
    setShowDebugInfo(!showDebugInfo);
  };

  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-3 w-3" />;
      case 'rejected': return <XCircle className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'cancelled': return <X className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Filter leave requests based on active tab and search/status filters
  const getFilteredLeaveRequests = () => {
    let filtered = leaveRequests;
    
    // Filter by tab
    if (activeTab === "employee") {
      filtered = filtered.filter(l => !l.isSupervisorLeave);
    } else if (activeTab === "supervisor") {
      filtered = filtered.filter(l => l.isSupervisorLeave);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(leave => 
        leave.employeeName.toLowerCase().includes(query) ||
        leave.employeeId.toLowerCase().includes(query) ||
        leave.department.toLowerCase().includes(query) ||
        leave.site.toLowerCase().includes(query) ||
        leave.leaveType.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(leave => leave.status === statusFilter);
    }
    
    return filtered;
  };

  const filteredLeaveRequests = getFilteredLeaveRequests();

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading supervisor information...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h3 className="font-medium text-lg mb-2">Authentication Required</h3>
          <p className="text-muted-foreground mb-4">
            Please login to access the leave management system
          </p>
          <Button onClick={() => window.location.href = '/login'}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== 'supervisor') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h3 className="font-medium text-lg mb-2">Access Denied</h3>
          <p className="text-muted-foreground mb-4">
            Only supervisors can access the leave management system
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Your role: {user.role}
          </p>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Leave Management" 
        subtitle="Apply for leave for yourself or team members" 
        onMenuClick={onMenuClick}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 md:p-6 space-y-4 md:space-y-6"
      >
       
        

        {/* Mobile Filters */}
        {showMobileFilters && isMobileView && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Department</Label>
                  <Select
                    value={supervisorDepartment}
                    onValueChange={setSupervisorDepartment}
                    disabled={apiStatus !== 'connected' || availableDepartments.length === 0}
                  >
                    <SelectTrigger className="h-9 mt-1">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDepartments.length > 0 ? (
                        availableDepartments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="loading" disabled>
                          Loading...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm">Sites from Tasks</Label>
                  <div className="flex items-center px-3 py-2 border rounded-md text-sm bg-primary/5 border-primary/20 mt-1">
                    <Building className="mr-2 h-4 w-4" />
                    {supervisorSites.length} site(s) from your tasks
                  </div>
                  {supervisorSites.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Sites: {supervisorSites.map(s => s.name).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Info Panel */}
        {showDebugInfo && (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">System Status</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  {debugInfo.sitesLoaded ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-red-600">✗</span>
                  )}
                  <span>Sites: {supervisorSites.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  {debugInfo.employeesLoaded ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-red-600">✗</span>
                  )}
                  <span>Employees: {employees.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>API Status:</span>
                  <span className={`ml-1 ${apiStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                    {apiStatus}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Tasks:</span>
                  <span className="ml-1">{debugInfo.supervisorTasksCount}</span>
                </div>
              </div>
              <div className="mt-2 text-xs">
                <span className="text-gray-600">Total Leaves:</span>
                <span className="ml-1 font-bold">{debugInfo.leaveRequestsCount || 0}</span>
              </div>
              <div className="mt-2 text-xs">
                <span className="text-gray-600">Supervisor Leaves:</span>
                <span className="ml-1 font-bold text-blue-600">{debugInfo.supervisorLeavesCount || 0}</span>
              </div>
              <div className="mt-2 text-xs">
                <span className="text-gray-600">Your Leaves:</span>
                <span className="ml-1 font-bold text-purple-600">{debugInfo.ownLeaveCount || 0}</span>
              </div>
              {debugInfo.leaveRequestsList?.length > 0 && (
                <div className="mt-2 text-xs">
                  <span className="text-gray-600">Sample Leaves:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {debugInfo.leaveRequestsList.map((leave: any, i: number) => (
                      <Badge 
                        key={i} 
                        variant="outline" 
                        className={`text-xs ${
                          leave.isOwn ? 'bg-purple-100 text-purple-800 border-purple-300' : 
                          leave.isSupervisor ? 'bg-blue-100 text-blue-800 border-blue-300' : ''
                        }`}
                      >
                        {leave.employee}: {leave.status}
                        {leave.isOwn && ' (You)'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(debugInfo.employeesBySite || {}).length > 0 && (
                <div className="mt-2 text-xs">
                  <span className="text-gray-600">Employees by Site: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(debugInfo.employeesBySite).map(([site, count]) => (
                      <Badge key={site} variant="outline" className="text-xs">
                        {site}: {count as number}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {debugInfo.supervisorSitesFromTasks?.length > 0 && (
                <div className="mt-2 text-xs">
                  <span className="text-gray-600">Sites from Tasks: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {debugInfo.supervisorSitesFromTasks.map((site: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {site}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
                   
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                type="button"
                variant={applyMode === 'employee' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setApplyMode('employee')}
                className="flex-1 text-xs sm:text-sm"
              >
                <Users className="mr-2 h-4 w-4" />
                For Employee
              </Button>
              <Button
                type="button"
                variant={applyMode === 'self' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setApplyMode('self')}
                className="flex-1 text-xs sm:text-sm"
              >
                <User className="mr-2 h-4 w-4" />
                For Myself
              </Button>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Apply for {applyMode === 'employee' ? 'Employee' : 'Leave'}
                  {applyMode === 'employee' && employees.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {employees.length}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-[95vw] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {applyMode === 'employee' ? 'Apply Leave for Employee' : 'Apply Leave for Yourself'}
                  </DialogTitle>
                </DialogHeader>
                
                {applyMode === 'employee' ? (
                  <EmployeeLeaveForm 
                    formData={formData}
                    formErrors={formErrors}
                    handleInputChange={handleInputChange}
                    selectedSite={selectedSite}
                    selectedEmployee={selectedEmployee}
                    setSelectedEmployee={setSelectedEmployee}
                    setSelectedSite={setSelectedSite}
                    handleSiteSelect={handleSiteSelect}
                    handleEmployeeSubmit={handleEmployeeSubmit}
                    isSubmitting={isSubmitting}
                    supervisorSites={supervisorSites}
                    employees={employees}
                    getEmployeesForSite={getEmployeesForSite}
                    supervisorDepartment={supervisorDepartment}
                    isLoadingSites={isLoadingSites}
                    isLoadingEmployees={isLoadingEmployees}
                    fetchSupervisorSitesFromTasks={fetchSupervisorSitesFromTasks}
                    fetchEmployees={fetchEmployees}
                    user={user}
                  />
                ) : (
                  <SelfLeaveForm 
                    formData={formData}
                    formErrors={formErrors}
                    handleInputChange={handleInputChange}
                    handleSelfSubmit={handleSelfSubmit}
                    isSubmitting={isSubmitting}
                    supervisorSites={supervisorSites}
                    supervisorDepartment={supervisorDepartment}
                    user={user}
                    calculateTotalDays={calculateTotalDays}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs and Filters Section */}
        <Card>
          <CardHeader className="pb-0">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
             <TabsList className="flex flex-wrap w-full h-auto p-1 gap-1 sm:gap-2">
  <TabsTrigger 
    value="all" 
    className="flex-1 min-w-[80px] sm:min-w-[120px] text-xs sm:text-sm whitespace-nowrap"
  >
    All Leaves <span className="ml-1 hidden sm:inline">({leaveRequests.length})</span>
    <span className="ml-1 sm:hidden">({leaveRequests.length})</span>
  </TabsTrigger>
  <TabsTrigger 
    value="employee" 
    className="flex-1 min-w-[80px] sm:min-w-[120px] text-xs sm:text-sm whitespace-nowrap"
  >
    Employee <span className="hidden sm:inline">Leaves</span>
    <span className="ml-1 hidden sm:inline">({leaveRequests.filter(l => !l.isSupervisorLeave).length})</span>
    <span className="ml-1 sm:hidden">({leaveRequests.filter(l => !l.isSupervisorLeave).length})</span>
  </TabsTrigger>
  <TabsTrigger 
    value="supervisor" 
    className="flex-1 min-w-[80px] sm:min-w-[120px] text-xs sm:text-sm whitespace-nowrap"
  >
    Supervisor <span className="hidden sm:inline">Leaves</span>
    <span className="ml-1 hidden sm:inline">({leaveRequests.filter(l => l.isSupervisorLeave).length})</span>
    <span className="ml-1 sm:hidden">({leaveRequests.filter(l => l.isSupervisorLeave).length})</span>
  </TabsTrigger>
</TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leaves..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 w-full"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="h-9"
                >
                  Clear
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchAllLeaveRequests}
                disabled={isLoading || apiStatus !== 'connected'}
                className="h-9"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>

            {apiStatus !== 'connected' ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">API Connection Required</h3>
                <p className="text-muted-foreground mb-4">
                  Please check your backend server is running and click "Test DB"
                </p>
                <Button onClick={handleTestDatabase}>
                  <Database className="mr-2 h-4 w-4" />
                  Test Database Connection
                </Button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLeaveRequests.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex flex-col items-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-2">No Leave Requests</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== "all" 
                      ? "No leave requests match your filters"
                      : activeTab === "all" 
                        ? "No leave requests found in the database"
                        : activeTab === "employee"
                          ? "No employee leave requests found"
                          : "No supervisor leave requests found"}
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Leave Request
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                {!isMobileView && (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Site</TableHead>
                          <TableHead>Leave Type</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Applied By</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Actions</TableHead>
                          <TableHead>Applied On</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeaveRequests.map((leave) => {
                          const isOwnLeave = leave.isSupervisorLeave && leave.supervisorId === user?._id;
                          const canEdit = leave.status === 'pending' && (isOwnLeave || leave.appliedBy === user?.name);
                          const leaveId = leave._id || leave.id;
                          
                          return (
                            <TableRow 
                              key={leave._id} 
                              className={`${
                                isOwnLeave ? 'bg-purple-50/70 hover:bg-purple-100/70' : 
                                leave.isSupervisorLeave ? 'bg-blue-50/50 hover:bg-blue-100/50' : ''
                              }`}
                            >
                              <TableCell>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {leave.employeeName}
                                    {isOwnLeave && (
                                      <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-300 text-xs">
                                        <Crown className="h-3 w-3 mr-1" />
                                        You
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{leave.employeeId}</div>
                                </div>
                              </TableCell>
                              <TableCell>{leave.department}</TableCell>
                              <TableCell>{leave.site}</TableCell>
                              <TableCell className="capitalize">{leave.leaveType}</TableCell>
                              <TableCell>
                                <div className="text-xs">
                                  <div>{formatDate(leave.fromDate)}</div>
                                  <div>to {formatDate(leave.toDate)}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-bold">{leave.totalDays}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(leave.status)} className="flex items-center gap-1 w-fit">
                                  {getStatusIcon(leave.status)}
                                  {leave.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{leave.appliedBy}</TableCell>
                              <TableCell>
                                {leave.isSupervisorLeave ? (
                                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                                    <Shield className="mr-1 h-3 w-3" />
                                    Supervisor
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                                    <User className="mr-1 h-3 w-3" />
                                    Employee
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedLeaveForView(leave);
                                      setViewDialogOpen(true);
                                    }}
                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    title="View Details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  
                                  {canEdit && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditLeave(leave)}
                                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                        title="Edit"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          console.log("Setting leave to delete:", leaveId);
                                          setLeaveToDelete(leaveId);
                                          setDeleteDialogOpen(true);
                                        }}
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  
                                  {leave.status === 'pending' && !isOwnLeave && leaveId && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          console.log("Approve button clicked for leave:", leaveId);
                                          handleApproveLeave(leaveId, "Approved");
                                        }}
                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        title="Approve"
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          console.log("Reject button clicked for leave:", leaveId);
                                          handleRejectLeave(leaveId, "Rejected");
                                        }}
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        title="Reject"
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">{formatDate(leave.createdAt)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Mobile Card View */}
                {isMobileView && (
                  <div className="space-y-4">
                    {filteredLeaveRequests.map((leave) => {
                      const isOwnLeave = leave.isSupervisorLeave && leave.supervisorId === user?._id;
                      return (
                        <MobileLeaveCard
                          key={leave._id}
                          leave={leave}
                          formatDate={formatDate}
                          getStatusBadgeVariant={getStatusBadgeVariant}
                          getStatusIcon={getStatusIcon}
                          user={user}
                          onEdit={handleEditLeave}
                          onDelete={(id) => {
                            console.log("Mobile delete with ID:", id);
                            setLeaveToDelete(id);
                            setDeleteDialogOpen(true);
                          }}
                          onView={(leave) => {
                            setSelectedLeaveForView(leave);
                            setViewDialogOpen(true);
                          }}
                          onApprove={handleApproveLeave}
                          onReject={handleRejectLeave}
                          isOwnLeave={isOwnLeave}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit Leave Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md w-[95vw] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Leave Request
              </DialogTitle>
              <DialogDescription>
                Update the details of your leave request for {selectedLeave?.employeeName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-leaveType">Leave Type *</Label>
                <Select 
                  value={editFormData.leaveType}
                  onValueChange={(value) => handleEditInputChange("leaveType", value)}
                >
                  <SelectTrigger className={`h-9 ${editFormErrors.leaveType ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="emergency">Emergency Leave</SelectItem>
                    <SelectItem value="other">Other Leave</SelectItem>
                  </SelectContent>
                </Select>
                {editFormErrors.leaveType && (
                  <p className="text-xs text-red-500 mt-1">{editFormErrors.leaveType}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-from">From Date *</Label>
                  <Input 
                    id="edit-from" 
                    type="date" 
                    value={editFormData.fromDate}
                    onChange={(e) => handleEditInputChange("fromDate", e.target.value)}
                    className={`h-9 ${editFormErrors.fromDate ? 'border-red-500' : ''}`}
                  />
                  {editFormErrors.fromDate && (
                    <p className="text-xs text-red-500 mt-1">{editFormErrors.fromDate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-to">To Date *</Label>
                  <Input 
                    id="edit-to" 
                    type="date" 
                    value={editFormData.toDate}
                    onChange={(e) => handleEditInputChange("toDate", e.target.value)}
                    min={editFormData.fromDate}
                    className={`h-9 ${editFormErrors.toDate ? 'border-red-500' : ''}`}
                  />
                  {editFormErrors.toDate && (
                    <p className="text-xs text-red-500 mt-1">{editFormErrors.toDate}</p>
                  )}
                </div>
              </div>
              
              {editFormData.fromDate && editFormData.toDate && (
                <div className="text-sm text-muted-foreground">
                  Total Days: {calculateTotalDays(editFormData.fromDate, editFormData.toDate)} days
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="edit-reason">Reason *</Label>
                <Textarea 
                  id="edit-reason" 
                  value={editFormData.reason}
                  onChange={(e) => handleEditInputChange("reason", e.target.value)}
                  placeholder="Enter reason for leave" 
                  className={`min-h-[80px] resize-none ${editFormErrors.reason ? 'border-red-500' : ''}`}
                />
                {editFormErrors.reason && (
                  <p className="text-xs text-red-500 mt-1">{editFormErrors.reason}</p>
                )}
              </div>
            </div>
            
            <DialogFooter className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditFormErrors({
                    leaveType: "",
                    fromDate: "",
                    toDate: "",
                    reason: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                className="flex-1"
                onClick={handleUpdateLeave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Leave
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-[90vw] sm:max-w-[425px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Leave Request
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this leave request? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteLeave} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Leave Request'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* View Leave Details Dialog */}
        <ViewLeaveDialog
          leave={selectedLeaveForView}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          onApprove={handleApproveLeave}
          onReject={handleRejectLeave}
          formatDate={formatDate}
          getStatusBadgeVariant={getStatusBadgeVariant}
          getStatusIcon={getStatusIcon}
          user={user}
        />
      </motion.div>
    </div>
  );
};

export default Leave;
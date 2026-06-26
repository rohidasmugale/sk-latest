// TasksSection.tsx - Complete unified version with combined add/assign flow

// [Previous imports remain exactly the same until line 500 - the imports section]
import { useState, useCallback, useMemo, memo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createNotificationForSuperadmin } from '@/lib/notificationHelper';
import { 
  Plus, 
  Search, 
  Clock, 
  AlertCircle, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Paperclip, 
  Download,
  Eye,
  Upload,
  MessageSquare,
  Calendar,
  User,
  Globe,
  Building,
  Briefcase,
  Users,
  Loader2,
  Target,
  Check,
  ChevronsUpDown,
  X,
  FileText,
  Ban,
  Layers,
  MapPin,
  AlertTriangle,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  RefreshCw,
  Copy,
  Save,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { FormField, SearchBar } from "./shared";
import taskService, { 
  type Task, 
  type Site, 
  type ExtendedSite,
  type Assignee, 
  type CreateMultipleTasksRequest,
  type UpdateTaskStatusRequest,
  type AddHourlyUpdateRequest,
  type Attachment,
  type HourlyUpdate,
  type AssignedUser,
  type UpdateTaskRequest,
  type StaffMember
} from "@/services/TaskService";

// Components
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Extended Task type for grouped tasks
interface GroupedTask extends Task {
  _isGrouped: true;
  _groupCount: number;
  _groupItems: Task[];
  _groupedAssignees: string[];
  _groupedAssigneeNames: string[];
  _groupedSites: string[];
  _groupedSiteNames: string[];
  _groupedClientNames: string[];
  _overallStatus: Task["status"];
  _totalAttachments: number;
  _totalHourlyUpdates: number;
  _allAttachments: Attachment[];
  _allHourlyUpdates: HourlyUpdate[];
  _allAssignedUsers: AssignedUser[];
  _managerCount: number;
  _supervisorCount: number;
}

// Type guard to check if a task is grouped
const isGroupedTask = (task: Task | GroupedTask): task is GroupedTask => {
  return (task as GroupedTask)._isGrouped === true;
};

// Helper function for safe string access
const safeString = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value);
};

// Interface for site staffing requirements
interface SiteStaffingRequirements {
  siteId: string;
  siteName: string;
  requiredManagers: number;
  requiredSupervisors: number;
  assignedManagers: number;
  assignedSupervisors: number;
  assignedManagerIds: Set<string>;
  assignedSupervisorIds: Set<string>;
  hasManager: boolean;
  hasSupervisor: boolean;
  missingRoles: ('manager' | 'supervisor')[];
  isManagerRequirementMet: boolean;
  isSupervisorRequirementMet: boolean;
  hasAnyAssignee: boolean;
}

// Interface for task staffing status
interface TaskStaffingStatus {
  currentManagers: number;
  currentSupervisors: number;
  requiredManagers: number;
  requiredSupervisors: number;
  missingManagers: number;
  missingSupervisors: number;
  isManagerRequirementMet: boolean;
  isSupervisorRequirementMet: boolean;
  isFullyStaffed: boolean;
}

// Memoized components
const SiteCheckboxItem = memo(({ 
  site, 
  isSelected, 
  onToggle 
}: { 
  site: Site;
  isSelected: boolean;
  onToggle: (siteId: string) => void;
}) => (
  <div key={site._id} className="flex items-center space-x-3">
    <input 
      type="checkbox"
      id={`site-${site._id}`}
      checked={isSelected}
      onChange={() => onToggle(site._id)}
      className="h-4 w-4 rounded border-gray-300"
    />
    <label
      htmlFor={`site-${site._id}`}
      className="flex-1 cursor-pointer"
    >
      <div className="flex flex-col">
        <span className="font-medium">{site.name}</span>
        <span className="text-sm text-muted-foreground">
          {site.clientName} • {site.location}
        </span>
      </div>
    </label>
    <Badge variant={site.status === "active" ? "default" : "secondary"}>
      {site.status}
    </Badge>
  </div>
));

SiteCheckboxItem.displayName = "SiteCheckboxItem";

// Staffing Requirements Indicator Component
const StaffingRequirementsIndicator = ({ 
  requirements 
}: { 
  requirements: SiteStaffingRequirements | TaskStaffingStatus 
}) => {
  if (!requirements) return null;
  
  const requiredManagers = 'requiredManagers' in requirements ? requirements.requiredManagers : 0;
  const requiredSupervisors = 'requiredSupervisors' in requirements ? requirements.requiredSupervisors : 0;
  const assignedManagers = 'assignedManagers' in requirements ? requirements.assignedManagers : requirements.currentManagers || 0;
  const assignedSupervisors = 'assignedSupervisors' in requirements ? requirements.assignedSupervisors : requirements.currentSupervisors || 0;
  const isManagerRequirementMet = 'isManagerRequirementMet' in requirements ? requirements.isManagerRequirementMet : (assignedManagers >= requiredManagers);
  const isSupervisorRequirementMet = 'isSupervisorRequirementMet' in requirements ? requirements.isSupervisorRequirementMet : (assignedSupervisors >= requiredSupervisors);
  
  // If no requirements, don't show anything
  if (requiredManagers === 0 && requiredSupervisors === 0) return null;
  
  // Check if all requirements are met
  const allRequirementsMet = isManagerRequirementMet && isSupervisorRequirementMet;
  
  if (allRequirementsMet) {
    return (
      <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
        <UserCheck className="h-4 w-4 text-green-600" />
        <div className="text-xs text-green-700">
          <span className="font-medium">✓ Staffing complete:</span> {assignedManagers}/{requiredManagers} Managers, {assignedSupervisors}/{requiredSupervisors} Supervisors
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <div className="text-xs text-amber-700">
        <span className="font-medium">Missing required staff:</span>
        <div className="flex gap-2 mt-1">
          {!isManagerRequirementMet && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              Manager ({assignedManagers}/{requiredManagers})
            </Badge>
          )}
          {!isSupervisorRequirementMet && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              Supervisor ({assignedSupervisors}/{requiredSupervisors})
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

// Multi-select Combobox for Assignees with site-based limits and supervisor restriction - UPDATED with proper validation
const AssigneeMultiSelect = ({ 
  assignees, 
  selectedAssignees, 
  onSelectAssignees,
  assigneeType,
  onAssigneeTypeChange,
  isLoading,
  selectedSites,
  sites,
  assignedSupervisorsMap = new Map(),
  siteStaffingRequirements
}: { 
  assignees: Assignee[];
  selectedAssignees: string[];
  onSelectAssignees: (assigneeIds: string[]) => void;
  assigneeType: "all" | "manager" | "supervisor";
  onAssigneeTypeChange: (type: "all" | "manager" | "supervisor") => void;
  isLoading: boolean;
  selectedSites: string[];
  sites: ExtendedSite[];
  assignedSupervisorsMap?: Map<string, Set<string>>;
  siteStaffingRequirements?: Map<string, SiteStaffingRequirements>;
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Calculate available slots per site based on staffing requirements
  const siteSlots = useMemo(() => {
    const slots: {[siteId: string]: {manager: number, supervisor: number}} = {};
    
    selectedSites.forEach(siteId => {
      const site = sites.find(s => s._id === siteId);
      const requirements = siteStaffingRequirements?.get(siteId);
      
      if (site) {
        slots[siteId] = {
          manager: site.managerCount || 0,
          supervisor: site.supervisorCount || 0
        };
      }
    });
    
    return slots;
  }, [selectedSites, sites, siteStaffingRequirements]);

  // Calculate current usage per site based on existing assignments
  const currentUsage = useMemo(() => {
    const usage: {[siteId: string]: {manager: number, supervisor: number}} = {};
    
    // Initialize usage for all selected sites
    selectedSites.forEach(siteId => {
      const requirements = siteStaffingRequirements?.get(siteId);
      usage[siteId] = { 
        manager: requirements?.assignedManagers || 0, 
        supervisor: requirements?.assignedSupervisors || 0 
      };
    });
    
    return usage;
  }, [selectedSites, siteStaffingRequirements]);

  // Ensure assignedSupervisorsMap is a Map
  const supervisorsMap = useMemo(() => {
    if (!assignedSupervisorsMap) return new Map();
    if (assignedSupervisorsMap instanceof Map) return assignedSupervisorsMap;
    // If it's not a Map, convert it to a Map
    try {
      return new Map(Object.entries(assignedSupervisorsMap));
    } catch {
      return new Map();
    }
  }, [assignedSupervisorsMap]);

  // Check if assignee can be selected based on site limits AND supervisor assignment restrictions
  const canSelectAssignee = (assignee: Assignee): {canSelect: boolean, reason?: string} => {
    if (!assignee) return {canSelect: false, reason: "Assignee not found"};
    
    // If no sites selected, can't assign
    if (selectedSites.length === 0) {
      return {
        canSelect: false,
        reason: "Please select sites first"
      };
    }
    
    // For supervisors, check if they're already assigned to ANY site
    if (assignee.role === 'supervisor') {
      // Check if this supervisor is already assigned to ANY site (across all tasks)
      let isSupervisorAssignedElsewhere = false;
      let assignedSiteNames: string[] = [];
      
      // Check all sites in the supervisorsMap - safely using forEach
      supervisorsMap.forEach((supervisorIds, siteId) => {
        if (supervisorIds && supervisorIds.has && supervisorIds.has(assignee._id)) {
          isSupervisorAssignedElsewhere = true;
          const site = sites.find(s => s._id === siteId);
          if (site) {
            assignedSiteNames.push(site.name);
          }
        }
      });
      
      if (isSupervisorAssignedElsewhere) {
        return {
          canSelect: false,
          reason: `This supervisor is already assigned to: ${assignedSiteNames.join(', ')}. Supervisors can only be assigned to one site.`
        };
      }
    }
    
    // Check site capacity limits
    let canAssign = false;
    let reason = "No site can accommodate this assignee";
    
    // Check each selected site to see if it has capacity
    for (const siteId of selectedSites) {
      const siteSlot = siteSlots[siteId];
      const siteUsage = currentUsage[siteId];
      const requirements = siteStaffingRequirements?.get(siteId);
      
      if (!siteSlot || !siteUsage) continue;
      
      if (assignee.role === 'manager') {
        // Check if we've already selected this manager for this site in current session
        const isCurrentlySelected = selectedAssignees.includes(assignee._id);
        
        // Total managers after adding this one
        const totalAfterAdd = siteUsage.manager + (isCurrentlySelected ? 0 : 1);
        
        if (totalAfterAdd <= siteSlot.manager) {
          canAssign = true;
          reason = `Can be assigned to ${sites.find(s => s._id === siteId)?.name || 'site'}`;
          break;
        }
      } else if (assignee.role === 'supervisor') {
        // Check if we've already selected this supervisor for this site in current session
        const isCurrentlySelected = selectedAssignees.includes(assignee._id);
        
        // Total supervisors after adding this one
        const totalAfterAdd = siteUsage.supervisor + (isCurrentlySelected ? 0 : 1);
        
        if (totalAfterAdd <= siteSlot.supervisor) {
          canAssign = true;
          reason = `Can be assigned to ${sites.find(s => s._id === siteId)?.name || 'site'}`;
          break;
        }
      }
    }
    
    if (!canAssign) {
      const roleText = assignee.role === 'manager' ? 'Manager' : 'Supervisor';
      return {
        canSelect: false,
        reason: `${roleText} limit reached for all selected sites`
      };
    }
    
    return {canSelect: true, reason};
  };

  const filteredAssignees = useMemo(() => {
    let result = assignees.filter(assignee => {
      if (!assignee) return false;
      if (assigneeType === "all") return assignee.role === 'manager' || assignee.role === 'supervisor';
      if (assigneeType === "manager") return assignee.role === 'manager';
      if (assigneeType === "supervisor") return assignee.role === 'supervisor';
      return true;
    });

    if (searchValue) {
      const searchLower = searchValue.toLowerCase().trim();
      
      result = result.filter(assignee => {
        if (!assignee) return false;
        
        // Create searchable strings
        const name = safeString(assignee.name).toLowerCase();
        const email = safeString(assignee.email).toLowerCase();
        const role = safeString(assignee.role).toLowerCase();
        const department = assignee.department ? safeString(assignee.department).toLowerCase() : '';
        const phone = safeString(assignee.phone).toLowerCase();
        
        // Check if ANY field contains the search term (OR logic)
        return name.includes(searchLower) ||
               email.includes(searchLower) ||
               role.includes(searchLower) ||
               department.includes(searchLower) ||
               phone.includes(searchLower);
      });
    }

    return result;
  }, [assignees, assigneeType, searchValue]);

  const handleAssigneeToggle = (assigneeId: string) => {
    const assignee = assignees.find(a => a._id === assigneeId);
    if (!assignee) return;
    
    const { canSelect, reason } = canSelectAssignee(assignee);
    
    if (!canSelect && !selectedAssignees.includes(assigneeId)) {
      toast.error(reason || "Cannot select this assignee");
      return;
    }
    
    if (selectedAssignees.includes(assigneeId)) {
      onSelectAssignees(selectedAssignees.filter(id => id !== assigneeId));
    } else {
      onSelectAssignees([...selectedAssignees, assigneeId]);
    }
  };

  const selectedAssigneeObjects = useMemo(() => {
    return assignees.filter(assignee => assignee && selectedAssignees.includes(assignee._id));
  }, [assignees, selectedAssignees]);

  const managerCount = selectedAssigneeObjects.filter(a => a.role === 'manager').length;
  const supervisorCount = selectedAssigneeObjects.filter(a => a.role === 'supervisor').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="font-medium">Select Assignees</span>
          <Badge variant="outline" className="ml-2">
            {selectedAssignees.length} selected
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={assigneeType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onAssigneeTypeChange("all")}
            className="flex items-center gap-1"
          >
            All
          </Button>
          <Button
            type="button"
            variant={assigneeType === "manager" ? "default" : "outline"}
            size="sm"
            onClick={() => onAssigneeTypeChange("manager")}
            className="flex items-center gap-1"
          >
            Managers
          </Button>
          <Button
            type="button"
            variant={assigneeType === "supervisor" ? "default" : "outline"}
            size="sm"
            onClick={() => onAssigneeTypeChange("supervisor")}
            className="flex items-center gap-1"
          >
            Supervisors
          </Button>
        </div>
      </div>

      {/* Site limits display */}
      {selectedSites.length > 0 && (
        <div className="bg-primary/5 p-3 rounded-lg">
          <div className="text-sm font-medium mb-2">Site Assignment Limits:</div>
          <div className="space-y-2">
            {selectedSites.map(siteId => {
              const site = sites.find(s => s._id === siteId);
              const requirements = siteStaffingRequirements?.get(siteId);
              if (!site) return null;
              
              const siteName = site.name || "Unknown Site";
              const managerLimit = site.managerCount || 0;
              const supervisorLimit = site.supervisorCount || 0;
              const currentManager = requirements?.assignedManagers || 0;
              const currentSupervisor = requirements?.assignedSupervisors || 0;
              
              // Get already assigned supervisors for this site - safely using get
              const alreadyAssignedSupervisors = supervisorsMap.get(siteId) || new Set();
              const alreadyAssignedCount = alreadyAssignedSupervisors.size;
              
              const managerRemaining = Math.max(0, managerLimit - currentManager);
              const supervisorRemaining = Math.max(0, supervisorLimit - currentSupervisor);
              
              const isManagerMet = requirements?.isManagerRequirementMet || false;
              const isSupervisorMet = requirements?.isSupervisorRequirementMet || false;
              
              return (
                <div key={siteId} className="space-y-2 p-2 border rounded">
                  <div className="flex justify-between items-center">
                    <div className="font-medium truncate text-sm">{siteName}:</div>
                    <div className="flex gap-2">
                      <Badge variant={isManagerMet ? "default" : "destructive"} className="text-xs">
                        {currentManager}/{managerLimit} Managers
                      </Badge>
                      <Badge variant={isSupervisorMet ? "default" : "destructive"} className="text-xs">
                        {currentSupervisor}/{supervisorLimit} Supervisors
                      </Badge>
                    </div>
                  </div>
                  {alreadyAssignedCount > 0 && (
                    <div className="text-xs text-amber-600">
                      {alreadyAssignedCount} supervisor(s) already assigned to this site
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Remaining: {managerRemaining} Manager{managerRemaining !== 1 ? 's' : ''}, {supervisorRemaining} Supervisor{supervisorRemaining !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
          {selectedSites.length > 1 && (
            <div className="mt-2 text-xs text-amber-600">
              Note: Assignees will be assigned to ALL selected sites.
            </div>
          )}
        </div>
      )}

      {/* Supervisor Restriction Notice */}
      {assigneeType === "supervisor" && supervisorsMap.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-amber-800">Supervisor Assignment Restriction</div>
              <div className="text-xs text-amber-700 mt-1">
                Supervisors can only be assigned to ONE site. Supervisors already assigned elsewhere will be disabled.
              </div>
            </div>
          </div>
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={isLoading || selectedSites.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading assignees...
              </>
            ) : selectedSites.length === 0 ? (
              "Select sites first"
            ) : selectedAssignees.length > 0 ? (
              <div className="flex items-center gap-2 truncate">
                <Users className="h-4 w-4" />
                <span>{selectedAssignees.length} assignee(s) selected</span>
              </div>
            ) : (
              "Select assignees..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" style={{ minWidth: '400px' }}>
          <Command>
            <CommandInput 
              placeholder="Search assignees by name, role, department..." 
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>
                {searchValue ? `No ${assigneeType === 'all' ? 'assignees' : assigneeType}s found for "${searchValue}".` : "No assignees available."}
              </CommandEmpty>
              <CommandGroup>
                {filteredAssignees.map((assignee) => {
                  const { canSelect, reason } = canSelectAssignee(assignee);
                  const isSelected = selectedAssignees.includes(assignee._id);
                  
                  // Check if this supervisor is already assigned elsewhere
                  let isSupervisorAssignedElsewhere = false;
                  let assignedSiteNames: string[] = [];
                  
                  if (assignee.role === 'supervisor') {
                    supervisorsMap.forEach((supervisorIds, siteId) => {
                      if (supervisorIds && supervisorIds.has && supervisorIds.has(assignee._id)) {
                        isSupervisorAssignedElsewhere = true;
                        const site = sites.find(s => s._id === siteId);
                        if (site) {
                          assignedSiteNames.push(site.name);
                        }
                      }
                    });
                  }
                  
                  return (
                    <CommandItem
                      key={assignee._id}
                      value={assignee._id}
                      onSelect={() => {
                        if (canSelect || isSelected) {
                          handleAssigneeToggle(assignee._id);
                          setSearchValue("");
                        } else {
                          toast.error(reason || "Cannot select this assignee");
                        }
                      }}
                      className={`flex items-center space-x-3 ${!canSelect && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!canSelect && !isSelected}
                    >
                      <div className={`flex items-center justify-center h-4 w-4 rounded border ${
                        isSelected 
                          ? "bg-primary border-primary" 
                          : "border-gray-300"
                      }`}>
                        {isSelected && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{safeString(assignee.name)}</div>
                        <div className="text-xs text-muted-foreground">
                          {safeString(assignee.role).charAt(0).toUpperCase() + safeString(assignee.role).slice(1)}
                          {assignee.department && ` • ${safeString(assignee.department)}`}
                          {(assignee as any).siteName && ` • Site: ${(assignee as any).siteName}`}
                        </div>
                        {isSupervisorAssignedElsewhere && !isSelected && (
                          <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Already assigned to: {assignedSiteNames.join(', ')}
                          </div>
                        )}
                        {!canSelect && !isSelected && reason && !isSupervisorAssignedElsewhere && (
                          <div className="text-xs text-red-600 mt-1">{reason}</div>
                        )}
                        {isSelected && (
                          <div className="text-xs text-green-600 mt-1">Selected</div>
                        )}
                      </div>
                      {!canSelect && !isSelected && (
                        <Ban className="h-4 w-4 text-red-500" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedAssignees.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Selected Assignees:</div>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="text-xs">
                {managerCount} Manager{managerCount !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {supervisorCount} Supervisor{supervisorCount !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedAssigneeObjects.map(assignee => (
              <Badge 
                key={assignee._id} 
                variant="secondary" 
                className="flex items-center gap-1"
              >
                <User className="h-3 w-3" />
                {safeString(assignee.name)}
                <Badge variant="outline" className="ml-1 text-xs">
                  {safeString(assignee.role).charAt(0).toUpperCase() + safeString(assignee.role).slice(1)}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                  onClick={() => handleAssigneeToggle(assignee._id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Multi-select Combobox for Sites - MODIFIED to filter out sites that already have any assignees
const SiteMultiSelect = ({ 
  sites, 
  selectedSites, 
  onSelectSites,
  isLoading,
  alreadyAssignedSiteIds = [],
  siteStaffingRequirements,
  assigneeType
}: { 
  sites: ExtendedSite[];
  selectedSites: string[];
  onSelectSites: (siteIds: string[]) => void;
  isLoading: boolean;
  alreadyAssignedSiteIds?: string[];
  siteStaffingRequirements?: Map<string, SiteStaffingRequirements>;
  assigneeType?: "all" | "manager" | "supervisor";
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Filter sites based on already assigned sites and whether they have any assignees
  const availableSites = useMemo(() => {
    return sites.filter(site => {
      // Skip if already assigned in context
      if (alreadyAssignedSiteIds.includes(site._id)) return false;
      
      const requirements = siteStaffingRequirements?.get(site._id);
      
      // If site has any assignees (managers or supervisors), don't show it
      if (requirements && requirements.hasAnyAssignee) {
        return false;
      }
      
      // If no requirements, site is available
      if (!requirements) return true;
      
      // Filter based on assignee type
      if (assigneeType === "manager") {
        // For managers: only show sites that still need managers AND have no assignees
        return !requirements.isManagerRequirementMet && !requirements.hasAnyAssignee;
      } else if (assigneeType === "supervisor") {
        // For supervisors: only show sites that still need supervisors AND have no assignees
        return !requirements.isSupervisorRequirementMet && !requirements.hasAnyAssignee;
      }
      
      // For "all": show sites that need either managers OR supervisors AND have no assignees
      return (!requirements.isManagerRequirementMet || !requirements.isSupervisorRequirementMet) && !requirements.hasAnyAssignee;
    });
  }, [sites, alreadyAssignedSiteIds, siteStaffingRequirements, assigneeType]);

  // Calculate total available sites count for display
  const totalAvailableCount = availableSites.length;
  
  // Calculate counts for sites with assignees and fully staffed
  const sitesWithAssignees = sites.filter(site => {
    const requirements = siteStaffingRequirements?.get(site._id);
    return requirements && requirements.hasAnyAssignee;
  }).length;
  
  const fullyStaffedCount = sites.length - availableSites.length - sitesWithAssignees;

  const filteredSites = useMemo(() => {
    if (!searchValue) return availableSites;
    
    const searchLower = searchValue.toLowerCase().trim();
    
    return availableSites.filter(site => {
      if (!site) return false;
      
      // Create searchable strings
      const name = safeString(site.name).toLowerCase();
      const client = safeString(site.clientName).toLowerCase();
      const location = safeString(site.location).toLowerCase();
      const status = safeString(site.status).toLowerCase();
      
      // Check if ANY field contains the search term (OR logic)
      return name.includes(searchLower) ||
             client.includes(searchLower) ||
             location.includes(searchLower) ||
             status.includes(searchLower);
    });
  }, [availableSites, searchValue]);

  const handleSiteToggle = (siteId: string) => {
    if (selectedSites.includes(siteId)) {
      onSelectSites(selectedSites.filter(id => id !== siteId));
    } else {
      onSelectSites([...selectedSites, siteId]);
    }
  };

  const selectedSiteObjects = useMemo(() => {
    return sites.filter(site => site && selectedSites.includes(site._id));
  }, [sites, selectedSites]);

  // Get a description of what sites are shown based on assignee type
  const getAvailableSitesDescription = () => {
    if (assigneeType === "manager") {
      return "Sites that need managers (no assignees yet)";
    } else if (assigneeType === "supervisor") {
      return "Sites that need supervisors (no assignees yet)";
    } else {
      return "Sites that need staffing (no assignees yet)";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4" />
          <span className="font-medium">Select Sites</span>
          <Badge variant="outline" className="ml-2">
            {selectedSites.length} selected
          </Badge>
          <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
            {totalAvailableCount} available
          </Badge>
          {sitesWithAssignees > 0 && (
            <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-700 border-purple-200">
              {sitesWithAssignees} have assignees
            </Badge>
          )}
          {fullyStaffedCount > 0 && (
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
              {fullyStaffedCount} fully staffed
            </Badge>
          )}
        </div>
        <Button 
          type="button"
          variant="outline" 
          size="sm"
          onClick={() => {
            if (selectedSites.length === availableSites.length) {
              onSelectSites([]);
            } else {
              onSelectSites(availableSites.map(site => site._id));
            }
          }}
          disabled={isLoading || availableSites.length === 0}
        >
          {selectedSites.length === availableSites.length ? "Deselect All" : "Select All Available"}
        </Button>
      </div>

      {/* Info banner about site filtering */}
      <div className="bg-blue-50 border border-blue-200 p-2 rounded-lg text-xs text-blue-700">
        <div className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          <span>
            {getAvailableSitesDescription()}. {sitesWithAssignees} site(s) already have assignees and are hidden. {fullyStaffedCount} site(s) are fully staffed and hidden.
          </span>
        </div>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={isLoading || availableSites.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading sites...
              </>
            ) : availableSites.length === 0 ? (
              assigneeType === "manager" ? "No sites need managers (all have assignees or are staffed)" :
              assigneeType === "supervisor" ? "No sites need supervisors (all have assignees or are staffed)" :
              "No sites need staffing (all have assignees or are staffed)"
            ) : selectedSites.length > 0 ? (
              <div className="flex items-center gap-2 truncate">
                <Building className="h-4 w-4" />
                <span>{selectedSites.length} site(s) selected</span>
              </div>
            ) : (
              `Select sites that need ${assigneeType === "manager" ? "managers" : 
                assigneeType === "supervisor" ? "supervisors" : "staffing"} (no assignees yet)...`
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" style={{ minWidth: '400px' }}>
          <Command>
            <CommandInput 
              placeholder="Search sites by name, client, location..." 
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>
                {searchValue ? `No sites found for "${searchValue}".` : "No available sites."}
              </CommandEmpty>
              <CommandGroup>
                {filteredSites.map((site) => {
                  const requirements = siteStaffingRequirements?.get(site._id);
                  const isManagerMet = requirements?.isManagerRequirementMet || false;
                  const isSupervisorMet = requirements?.isSupervisorRequirementMet || false;
                  const isFullyStaffed = isManagerMet && isSupervisorMet;
                  const hasAssignee = requirements?.hasAnyAssignee || false;
                  
                  // Determine which roles are still needed
                  const needsManagers = !isManagerMet;
                  const needsSupervisors = !isSupervisorMet;
                  
                  return (
                    <CommandItem
                      key={site._id}
                      value={site._id}
                      onSelect={() => {
                        handleSiteToggle(site._id);
                        setSearchValue("");
                      }}
                      className="flex items-center space-x-3"
                    >
                      <div className={`flex items-center justify-center h-4 w-4 rounded border ${
                        selectedSites.includes(site._id) 
                          ? "bg-primary border-primary" 
                          : "border-gray-300"
                      }`}>
                        {selectedSites.includes(site._id) && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{safeString(site.name)}</span>
                          {isFullyStaffed && (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                              Fully Staffed
                            </Badge>
                          )}
                          {hasAssignee && !isFullyStaffed && (
                            <Badge variant="default" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                              Has Assignees
                            </Badge>
                          )}
                          {!isFullyStaffed && !hasAssignee && (
                            <div className="flex gap-1">
                              {needsManagers && (
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                  Need Manager
                                </Badge>
                              )}
                              {needsSupervisors && (
                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                  Need Supervisor
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {safeString(site.clientName)} • {safeString(site.location)}
                        </span>
                        <div className="flex gap-2 mt-1">
                          <Badge variant={isManagerMet ? "default" : "destructive"} className="text-xs">
                            {requirements?.assignedManagers || 0}/{site.managerCount || 0} Managers
                          </Badge>
                          <Badge variant={isSupervisorMet ? "default" : "destructive"} className="text-xs">
                            {requirements?.assignedSupervisors || 0}/{site.supervisorCount || 0} Supervisors
                          </Badge>
                        </div>
                        {hasAssignee && (
                          <div className="text-xs text-purple-600 mt-1">
                            This site already has {requirements?.assignedManagers || 0} manager(s) and {requirements?.assignedSupervisors || 0} supervisor(s) assigned
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedSites.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Selected Sites:</div>
          <div className="flex flex-wrap gap-2">
            {selectedSiteObjects.map(site => {
              const requirements = siteStaffingRequirements?.get(site._id);
              const isManagerMet = requirements?.isManagerRequirementMet || false;
              const isSupervisorMet = requirements?.isSupervisorRequirementMet || false;
              
              return (
                <Badge 
                  key={site._id} 
                  variant={isManagerMet && isSupervisorMet ? "default" : "secondary"}
                  className={`flex items-center gap-1 ${
                    isManagerMet && isSupervisorMet ? 'bg-green-100 text-green-800 border-green-200' : ''
                  }`}
                >
                  {safeString(site.name)}
                  {(!isManagerMet || !isSupervisorMet) && (
                    <AlertTriangle className="h-3 w-3 ml-1 text-amber-600" />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                    onClick={() => handleSiteToggle(site._id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Edit Task Dialog Component - ENHANCED with all requirements
const EditTaskDialog = ({ 
  task, 
  open, 
  onOpenChange,
  onTaskUpdated,
  sites,
  assignees,
  assignedSupervisorsMap,
  siteStaffingRequirements
}: { 
  task: Task; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => Promise<void>;
  sites: ExtendedSite[];
  assignees: Assignee[];
  assignedSupervisorsMap: Map<string, Set<string>>;
  siteStaffingRequirements: Map<string, SiteStaffingRequirements>;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "assignees">("details");
  
  // Task details state - Initialize with current task values
  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [taskType, setTaskType] = useState(task.taskType || "routine");
  const [deadline, setDeadline] = useState(task.deadline?.split('T')[0] || "");
  const [dueDateTime, setDueDateTime] = useState(task.dueDateTime?.slice(0, 16) || "");
  const [siteId, setSiteId] = useState(task.siteId);
  const [siteName, setSiteName] = useState(task.siteName);
  const [clientName, setClientName] = useState(task.clientName);

  // Assignee management state
  const [assigneeMode, setAssigneeMode] = useState<"add" | "remove" | "replace">("add");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assigneeType, setAssigneeType] = useState<"all" | "manager" | "supervisor">("all");
  const [oldUserId, setOldUserId] = useState<string>("");
  const [newUserId, setNewUserId] = useState<string>("");

  // Ensure assignedSupervisorsMap is a Map
  const supervisorsMap = useMemo(() => {
    if (!assignedSupervisorsMap) return new Map();
    if (assignedSupervisorsMap instanceof Map) return assignedSupervisorsMap;
    try {
      return new Map(Object.entries(assignedSupervisorsMap));
    } catch {
      return new Map();
    }
  }, [assignedSupervisorsMap]);

  // Update form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setPriority(task.priority);
      setTaskType(task.taskType || "routine");
      setDeadline(task.deadline?.split('T')[0] || "");
      setDueDateTime(task.dueDateTime?.slice(0, 16) || "");
      setSiteId(task.siteId);
      setSiteName(task.siteName);
      setClientName(task.clientName);
    }
  }, [task]);

  // Get current assignees in this task
  const currentAssignees = useMemo(() => {
    return task.assignedUsers.map(u => ({
      _id: u.userId,
      name: u.name,
      role: u.role
    }));
  }, [task]);

  // Calculate staffing status for this task
  const staffingStatus = useMemo((): TaskStaffingStatus => {
    const siteReq = siteStaffingRequirements.get(task.siteId);
    
    const currentManagers = task.assignedUsers.filter(u => u.role === 'manager').length;
    const currentSupervisors = task.assignedUsers.filter(u => u.role === 'supervisor').length;
    
    const requiredManagers = siteReq?.requiredManagers || 0;
    const requiredSupervisors = siteReq?.requiredSupervisors || 0;
    
    return {
      currentManagers,
      currentSupervisors,
      requiredManagers,
      requiredSupervisors,
      missingManagers: Math.max(0, requiredManagers - currentManagers),
      missingSupervisors: Math.max(0, requiredSupervisors - currentSupervisors),
      isManagerRequirementMet: currentManagers >= requiredManagers,
      isSupervisorRequirementMet: currentSupervisors >= requiredSupervisors,
      isFullyStaffed: currentManagers >= requiredManagers && currentSupervisors >= requiredSupervisors
    };
  }, [task, siteStaffingRequirements]);

  // Filter available assignees based on mode and role
  const availableAssignees = useMemo(() => {
    let filtered = assignees;
    
    // Filter by role
    if (assigneeType === "manager") {
      filtered = filtered.filter(a => a.role === 'manager');
    } else if (assigneeType === "supervisor") {
      filtered = filtered.filter(a => a.role === 'supervisor');
    }
    
    if (assigneeMode === "add") {
      // For add mode, exclude current assignees
      const currentIds = new Set(currentAssignees.map(a => a._id));
      filtered = filtered.filter(a => !currentIds.has(a._id));
      
      // Also filter by missing roles to suggest only needed roles
      if (assigneeType === "manager" && staffingStatus.isManagerRequirementMet) {
        filtered = []; // No managers needed if requirement is met
      } else if (assigneeType === "supervisor" && staffingStatus.isSupervisorRequirementMet) {
        filtered = []; // No supervisors needed if requirement is met
      }
      
    } else if (assigneeMode === "remove") {
      // For remove mode, only include current assignees
      const currentIds = new Set(currentAssignees.map(a => a._id));
      filtered = filtered.filter(a => currentIds.has(a._id));
    }
    
    return filtered;
  }, [assignees, currentAssignees, assigneeType, assigneeMode, staffingStatus]);

  // Get available sites for changing site - MODIFIED to filter out sites that already have assignees
  const availableSites = useMemo(() => {
    return sites.filter(s => {
      if (s._id === task.siteId) return true; // Always show current site
      
      const requirements = siteStaffingRequirements.get(s._id);
      if (!requirements) return true;
      
      // Only show sites that don't have any assignees yet AND need staffing
      return !requirements.hasAnyAssignee && (!requirements.isManagerRequirementMet || !requirements.isSupervisorRequirementMet);
    });
  }, [sites, task.siteId, siteStaffingRequirements]);

  // Handle task details update
  const handleUpdateDetails = async () => {
    try {
      setIsLoading(true);
      
      const updateData: UpdateTaskRequest = {
        title,
        description,
        priority,
        taskType,
        deadline,
        dueDateTime,
        siteId,
        siteName: sites.find(s => s._id === siteId)?.name || siteName,
        clientName: sites.find(s => s._id === siteId)?.clientName || clientName
      };
      
      await taskService.updateTask(task._id, updateData);
      toast.success("Task details updated successfully!");
      await onTaskUpdated(); // Wait for tasks to refresh
      onOpenChange(false); // Close the dialog
      
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error(error.message || "Failed to update task");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle add missing assignees
  const handleAddAssignees = async () => {
    if (selectedAssignees.length === 0) {
      toast.error("Please select at least one assignee to add");
      return;
    }

    try {
      setIsLoading(true);
      
      // Check if adding would exceed limits
      const managersToAdd = assignees
        .filter(a => selectedAssignees.includes(a._id) && a.role === 'manager').length;
      const supervisorsToAdd = assignees
        .filter(a => selectedAssignees.includes(a._id) && a.role === 'supervisor').length;
      
      if (staffingStatus.currentManagers + managersToAdd > staffingStatus.requiredManagers) {
        toast.error(`Cannot add ${managersToAdd} manager(s). Site only needs ${staffingStatus.requiredManagers} managers total.`);
        return;
      }
      
      if (staffingStatus.currentSupervisors + supervisorsToAdd > staffingStatus.requiredSupervisors) {
        toast.error(`Cannot add ${supervisorsToAdd} supervisor(s). Site only needs ${staffingStatus.requiredSupervisors} supervisors total.`);
        return;
      }
      
      // Check supervisor assignment restrictions
      if (supervisorsToAdd > 0) {
        const supervisorsToAddList = assignees
          .filter(a => selectedAssignees.includes(a._id) && a.role === 'supervisor');
        
        for (const supervisor of supervisorsToAddList) {
          // Check if this supervisor is already assigned elsewhere
          let isAssignedElsewhere = false;
          let assignedSiteNames: string[] = [];
          
          supervisorsMap.forEach((supervisorIds, siteId) => {
            if (supervisorIds && supervisorIds.has && supervisorIds.has(supervisor._id) && siteId !== task.siteId) {
              isAssignedElsewhere = true;
              const site = sites.find(s => s._id === siteId);
              if (site) {
                assignedSiteNames.push(site.name);
              }
            }
          });
          
          if (isAssignedElsewhere) {
            toast.error(`Cannot add supervisor ${supervisor.name}. They are already assigned to: ${assignedSiteNames.join(', ')}`);
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Get full assignee objects
      const assigneesToAdd = assignees
        .filter(a => selectedAssignees.includes(a._id))
        .map(a => ({
          userId: a._id,
          name: a.name,
          role: a.role,
          assignedAt: new Date().toISOString(),
          status: 'pending' as const
        }));
      
      await taskService.addAssigneesToTask(task._id, assigneesToAdd);
      
      toast.success(`Added ${assigneesToAdd.length} assignee(s) successfully!`);
      await onTaskUpdated(); // Wait for tasks to refresh
      onOpenChange(false); // Close the dialog
      
    } catch (error: any) {
      console.error("Error adding assignees:", error);
      toast.error(error.message || "Failed to add assignees");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle remove assignees
  const handleRemoveAssignees = async () => {
    if (selectedAssignees.length === 0) {
      toast.error("Please select at least one assignee to remove");
      return;
    }

    // Check if removing would leave no assignees
    if (currentAssignees.length <= selectedAssignees.length) {
      toast.error("Cannot remove all assignees. At least one assignee is required.");
      return;
    }

    // Check if removing would cause under-staffing
    const managersToRemove = assignees
      .filter(a => selectedAssignees.includes(a._id) && a.role === 'manager').length;
    const supervisorsToRemove = assignees
      .filter(a => selectedAssignees.includes(a._id) && a.role === 'supervisor').length;
    
    if (staffingStatus.currentManagers - managersToRemove < staffingStatus.requiredManagers) {
      toast.warning(`Removing ${managersToRemove} manager(s) will leave site under-staffed. Continue anyway?`);
      // Still proceed but warn
    }
    
    if (staffingStatus.currentSupervisors - supervisorsToRemove < staffingStatus.requiredSupervisors) {
      toast.warning(`Removing ${supervisorsToRemove} supervisor(s) will leave site under-staffed. Continue anyway?`);
      // Still proceed but warn
    }

    try {
      setIsLoading(true);
      
      await taskService.removeAssigneesFromTask(task._id, selectedAssignees);
      
      toast.success(`Removed ${selectedAssignees.length} assignee(s) successfully!`);
      await onTaskUpdated(); // Wait for tasks to refresh
      onOpenChange(false); // Close the dialog
      
    } catch (error: any) {
      console.error("Error removing assignees:", error);
      toast.error(error.message || "Failed to remove assignees");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle replace assignee
  const handleReplaceAssignee = async () => {
    if (!oldUserId || !newUserId) {
      toast.error("Please select both old and new assignees");
      return;
    }

    try {
      setIsLoading(true);
      
      const oldAssignee = currentAssignees.find(a => a._id === oldUserId);
      const newAssignee = assignees.find(a => a._id === newUserId);
      
      if (!oldAssignee || !newAssignee) {
        toast.error("Selected assignees not found");
        return;
      }
      
      // Check if roles match
      if (oldAssignee.role !== newAssignee.role) {
        toast.error(`Cannot replace ${oldAssignee.role} with ${newAssignee.role}. Roles must match.`);
        return;
      }
      
      // If replacing a supervisor, check if the new supervisor is already assigned elsewhere
      if (newAssignee.role === 'supervisor') {
        let isAssignedElsewhere = false;
        let assignedSiteNames: string[] = [];
        
        supervisorsMap.forEach((supervisorIds, siteId) => {
          if (supervisorIds && supervisorIds.has && supervisorIds.has(newAssignee._id) && siteId !== task.siteId) {
            isAssignedElsewhere = true;
            const site = sites.find(s => s._id === siteId);
            if (site) {
              assignedSiteNames.push(site.name);
            }
          }
        });
        
        if (isAssignedElsewhere) {
          toast.error(`Cannot replace with supervisor ${newAssignee.name}. They are already assigned to: ${assignedSiteNames.join(', ')}`);
          setIsLoading(false);
          return;
        }
      }
      
      await taskService.replaceAssigneeInTask(task._id, oldUserId, {
        userId: newAssignee._id,
        name: newAssignee.name,
        role: newAssignee.role,
        assignedAt: new Date().toISOString(),
        status: 'pending' as const
      });
      
      toast.success(`Replaced ${oldAssignee.name} with ${newAssignee.name} successfully!`);
      await onTaskUpdated(); // Wait for tasks to refresh
      onOpenChange(false); // Close the dialog
      
    } catch (error: any) {
      console.error("Error replacing assignee:", error);
      toast.error(error.message || "Failed to replace assignee");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission based on active tab
  const handleSubmit = () => {
    if (activeTab === "details") {
      handleUpdateDetails();
    } else {
      if (assigneeMode === "add") {
        handleAddAssignees();
      } else if (assigneeMode === "remove") {
        handleRemoveAssignees();
      } else if (assigneeMode === "replace") {
        handleReplaceAssignee();
      }
    }
  };

  // Get available supervisors for replacement (not assigned to any site and not already in this task)
  const availableSupervisorsForReplacement = useMemo(() => {
    if (assigneeMode !== "replace" || assigneeType !== "supervisor") return [];
    
    return assignees.filter(a => {
      if (a.role !== 'supervisor') return false;
      
      // Check if this supervisor is already assigned to this task
      if (currentAssignees.some(c => c._id === a._id)) return false;
      
      // Check if this supervisor is assigned to any other site - safely using supervisorsMap
      let isAssignedElsewhere = false;
      supervisorsMap.forEach((supervisorIds, siteId) => {
        if (supervisorIds && supervisorIds.has && supervisorIds.has(a._id) && siteId !== task.siteId) {
          isAssignedElsewhere = true;
        }
      });
      
      // Only include supervisors that are NOT assigned anywhere else
      return !isAssignedElsewhere;
    });
  }, [assignees, currentAssignees, supervisorsMap, task.siteId, assigneeMode, assigneeType]);

  // Get available managers for replacement (not assigned to any site and not already in this task)
  const availableManagersForReplacement = useMemo(() => {
    if (assigneeMode !== "replace" || assigneeType !== "manager") return [];
    
    return assignees.filter(a => {
      if (a.role !== 'manager') return false;
      
      // Check if this manager is already assigned to this task
      if (currentAssignees.some(c => c._id === a._id)) return false;
      
      // Managers don't have site restrictions, so just exclude current ones
      return true;
    });
  }, [assignees, currentAssignees, assigneeMode, assigneeType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Task: {task.title}
          </DialogTitle>
        </DialogHeader>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b pb-2 mb-4">
          <Button
            type="button"
            variant={activeTab === "details" ? "default" : "outline"}
            onClick={() => setActiveTab("details")}
            size="sm"
          >
            <FileText className="mr-2 h-4 w-4" />
            Task Details
          </Button>
          <Button
            type="button"
            variant={activeTab === "assignees" ? "default" : "outline"}
            onClick={() => setActiveTab("assignees")}
            size="sm"
            className="relative"
          >
            <Users className="mr-2 h-4 w-4" />
            Manage Assignees
            {!staffingStatus.isFullyStaffed && (
              <Badge variant="destructive" className="ml-2 text-xs absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                !
              </Badge>
            )}
          </Button>
        </div>

        {/* Staffing Status Banner - Always Visible */}
        {!staffingStatus.isFullyStaffed && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Site requires: {staffingStatus.requiredManagers} Managers, {staffingStatus.requiredSupervisors} Supervisors
              </span>
            </div>
            <div className="flex gap-4 mt-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={staffingStatus.isManagerRequirementMet ? "default" : "destructive"} className="text-xs">
                  Managers: {staffingStatus.currentManagers}/{staffingStatus.requiredManagers}
                </Badge>
                {staffingStatus.missingManagers > 0 && (
                  <span className="text-xs text-amber-700">Need {staffingStatus.missingManagers} more</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={staffingStatus.isSupervisorRequirementMet ? "default" : "destructive"} className="text-xs">
                  Supervisors: {staffingStatus.currentSupervisors}/{staffingStatus.requiredSupervisors}
                </Badge>
                {staffingStatus.missingSupervisors > 0 && (
                  <span className="text-xs text-amber-700">Need {staffingStatus.missingSupervisors} more</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Task Details Tab */}
        {activeTab === "details" && (
          <div className="space-y-4">
            <FormField label="Task Title" id="edit-title" required>
              <Input 
                id="edit-title" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title" 
                required 
              />
            </FormField>

            <FormField label="Description" id="edit-description" required>
              <Textarea 
                id="edit-description" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description" 
                rows={3}
                required 
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Priority" id="edit-priority" required>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Task Type" id="edit-task-type">
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="safety">Safety Check</SelectItem>
                    <SelectItem value="equipment">Equipment Check</SelectItem>
                    <SelectItem value="routine">Routine</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Deadline Date" id="edit-deadline" required>
                <Input 
                  id="edit-deadline" 
                  type="date" 
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required 
                />
              </FormField>

              <FormField label="Due Date & Time" id="edit-due-datetime" required>
                <Input 
                  id="edit-due-datetime" 
                  type="datetime-local" 
                  value={dueDateTime}
                  onChange={(e) => setDueDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  required 
                />
              </FormField>
            </div>

            <FormField label="Site" id="edit-site" required>
              <Select 
                value={siteId} 
                onValueChange={(value) => {
                  setSiteId(value);
                  const selectedSite = sites.find(s => s._id === value);
                  if (selectedSite) {
                    setSiteName(selectedSite.name);
                    setClientName(selectedSite.clientName);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={task.siteId}>{task.siteName} (Current)</SelectItem>
                  {availableSites.map(site => {
                    const requirements = siteStaffingRequirements.get(site._id);
                    const needsManagers = requirements ? !requirements.isManagerRequirementMet : true;
                    const needsSupervisors = requirements ? !requirements.isSupervisorRequirementMet : true;
                    const hasAssignee = requirements?.hasAnyAssignee || false;
                    
                    return (
                      <SelectItem key={site._id} value={site._id}>
                        {site.name} - {site.clientName} 
                        {hasAssignee ? " (Has Assignees)" : 
                         !needsManagers && !needsSupervisors ? " (Fully Staffed)" : 
                         ` (Needs: ${!needsManagers ? '' : 'M'}${!needsManagers && !needsSupervisors ? '' : ''}${!needsSupervisors ? '' : 'S'})`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </FormField>

            {/* Current Assignees Display */}
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" />
                <span className="font-medium">Current Assignees ({currentAssignees.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentAssignees.map(assignee => (
                  <Badge 
                    key={assignee._id} 
                    variant={assignee.role === 'manager' ? 'default' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    <User className="h-3 w-3" />
                    {assignee.name}
                    <span className="ml-1 text-[10px] opacity-70">
                      {assignee.role}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Assignee Management Tab */}
        {activeTab === "assignees" && (
          <div className="space-y-6">
            {/* Mode Selection */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={assigneeMode === "add" ? "default" : "outline"}
                onClick={() => {
                  setAssigneeMode("add");
                  setSelectedAssignees([]);
                  setOldUserId("");
                  setNewUserId("");
                }}
                className="flex-1"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Missing Staff
                {(staffingStatus.missingManagers > 0 || staffingStatus.missingSupervisors > 0) && (
                  <Badge variant="destructive" className="ml-2">
                    {staffingStatus.missingManagers + staffingStatus.missingSupervisors}
                  </Badge>
                )}
              </Button>
              <Button
                type="button"
                variant={assigneeMode === "remove" ? "default" : "outline"}
                onClick={() => {
                  setAssigneeMode("remove");
                  setSelectedAssignees([]);
                  setOldUserId("");
                  setNewUserId("");
                }}
                className="flex-1"
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Remove Staff
              </Button>
              <Button
                type="button"
                variant={assigneeMode === "replace" ? "default" : "outline"}
                onClick={() => {
                  setAssigneeMode("replace");
                  setSelectedAssignees([]);
                  setOldUserId("");
                  setNewUserId("");
                }}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Replace Staff
              </Button>
            </div>

            {/* Missing Staff Suggestions */}
            {assigneeMode === "add" && (staffingStatus.missingManagers > 0 || staffingStatus.missingSupervisors > 0) && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Suggested Additions to Meet Requirements:</span>
                </div>
                <div className="flex gap-4">
                  {staffingStatus.missingManagers > 0 && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      Add {staffingStatus.missingManagers} Manager(s)
                    </Badge>
                  )}
                  {staffingStatus.missingSupervisors > 0 && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      Add {staffingStatus.missingSupervisors} Supervisor(s)
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Current Assignees Display */}
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Current Assignees</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    Managers: {staffingStatus.currentManagers}/{staffingStatus.requiredManagers}
                  </Badge>
                  <Badge variant="outline">
                    Supervisors: {staffingStatus.currentSupervisors}/{staffingStatus.requiredSupervisors}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentAssignees.map(assignee => (
                  <Badge 
                    key={assignee._id} 
                    variant={assignee.role === 'manager' ? 'default' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    <User className="h-3 w-3" />
                    {assignee.name}
                    <span className="ml-1 text-[10px] opacity-70">
                      {assignee.role}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Role Filter */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={assigneeType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setAssigneeType("all")}
              >
                All
              </Button>
              <Button
                type="button"
                variant={assigneeType === "manager" ? "default" : "outline"}
                size="sm"
                onClick={() => setAssigneeType("manager")}
                className="relative"
              >
                Managers
                {staffingStatus.missingManagers > 0 && assigneeMode === "add" && assigneeType === "manager" && (
                  <Badge variant="destructive" className="ml-1 text-xs h-4 w-4 p-0 flex items-center justify-center">
                    {staffingStatus.missingManagers}
                  </Badge>
                )}
              </Button>
              <Button
                type="button"
                variant={assigneeType === "supervisor" ? "default" : "outline"}
                size="sm"
                onClick={() => setAssigneeType("supervisor")}
                className="relative"
              >
                Supervisors
                {staffingStatus.missingSupervisors > 0 && assigneeMode === "add" && assigneeType === "supervisor" && (
                  <Badge variant="destructive" className="ml-1 text-xs h-4 w-4 p-0 flex items-center justify-center">
                    {staffingStatus.missingSupervisors}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Mode-specific UI */}
            {assigneeMode === "replace" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Assignee to Replace</label>
                  <Select value={oldUserId} onValueChange={setOldUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee to replace" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentAssignees
                        .filter(a => assigneeType === "all" || a.role === assigneeType)
                        .map(assignee => (
                          <SelectItem key={assignee._id} value={assignee._id}>
                            {assignee.name} ({assignee.role})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Select New Assignee</label>
                  <Select value={newUserId} onValueChange={setNewUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {assigneeType === "manager" ? (
                        // For managers - exclude current assignees
                        availableManagersForReplacement.length > 0 ? (
                          availableManagersForReplacement.map(assignee => (
                            <SelectItem key={assignee._id} value={assignee._id}>
                              {assignee.name} ({assignee.role})
                              {assignee.department && ` - ${assignee.department}`}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-managers-available" disabled>
                            No available managers to replace
                          </SelectItem>
                        )
                      ) : assigneeType === "supervisor" ? (
                        // For supervisors - exclude current assignees and those assigned elsewhere
                        availableSupervisorsForReplacement.length > 0 ? (
                          availableSupervisorsForReplacement.map(assignee => (
                            <SelectItem key={assignee._id} value={assignee._id}>
                              {assignee.name} ({assignee.role})
                              {assignee.department && ` - ${assignee.department}`}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-supervisors-available" disabled>
                            No available supervisors to replace
                          </SelectItem>
                        )
                      ) : (
                        // For "all" - show both managers and supervisors with proper filtering
                        <>
                          {/* Managers - exclude current ones */}
                          {availableManagersForReplacement.length > 0 && (
                            <>
                              {availableManagersForReplacement.map(assignee => (
                                <SelectItem key={assignee._id} value={assignee._id}>
                                  {assignee.name} (Manager)
                                  {assignee.department && ` - ${assignee.department}`}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {/* Supervisors - exclude current ones and those assigned elsewhere */}
                          {availableSupervisorsForReplacement.length > 0 && (
                            <>
                              {availableSupervisorsForReplacement.map(assignee => (
                                <SelectItem key={assignee._id} value={assignee._id}>
                                  {assignee.name} (Supervisor)
                                  {assignee.department && ` - ${assignee.department}`}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {availableManagersForReplacement.length === 0 && availableSupervisorsForReplacement.length === 0 && (
                            <SelectItem value="no-assignees-available" disabled>
                              No available assignees to replace
                            </SelectItem>
                          )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {assigneeMode === "add" ? "Select Assignees to Add" : "Select Assignees to Remove"}
                  </span>
                  <Badge variant="outline">
                    {selectedAssignees.length} selected
                  </Badge>
                </div>
                
                <div className="max-h-60 overflow-y-auto border rounded-lg p-2">
                  {availableAssignees.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      {assigneeMode === "add" 
                        ? (assigneeType === "manager" && staffingStatus.isManagerRequirementMet
                            ? "Manager requirement already met"
                            : assigneeType === "supervisor" && staffingStatus.isSupervisorRequirementMet
                              ? "Supervisor requirement already met"
                              : "No assignees available to add")
                        : "No assignees to remove"}
                    </div>
                  ) : (
                    availableAssignees.map(assignee => {
                      // Check if this supervisor is already assigned elsewhere - safely using supervisorsMap
                      let isSupervisorAssignedElsewhere = false;
                      let assignedSiteNames: string[] = [];
                      
                      if (assignee.role === 'supervisor' && assigneeMode === "add") {
                        supervisorsMap.forEach((supervisorIds, siteId) => {
                          if (supervisorIds && supervisorIds.has && supervisorIds.has(assignee._id) && siteId !== task.siteId) {
                            isSupervisorAssignedElsewhere = true;
                            const site = sites.find(s => s._id === siteId);
                            if (site) {
                              assignedSiteNames.push(site.name);
                            }
                          }
                        });
                      }
                      
                      const isDisabled = (assigneeMode === "remove" && currentAssignees.length <= 1) ||
                                        (assigneeMode === "add" && isSupervisorAssignedElsewhere);
                      
                      return (
                        <div
                          key={assignee._id}
                          className={`flex items-center space-x-3 p-2 hover:bg-primary/5 rounded-lg cursor-pointer ${
                            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                          } ${selectedAssignees.includes(assignee._id) ? 'bg-primary/10' : ''}`}
                          onClick={() => {
                            if (isDisabled) {
                              if (assigneeMode === "remove") {
                                toast.error("Cannot remove all assignees. At least one is required.");
                              } else if (assigneeMode === "add" && isSupervisorAssignedElsewhere) {
                                toast.error(`This supervisor is already assigned to: ${assignedSiteNames.join(', ')}`);
                              }
                              return;
                            }
                            
                            if (selectedAssignees.includes(assignee._id)) {
                              setSelectedAssignees(prev => prev.filter(id => id !== assignee._id));
                            } else {
                              setSelectedAssignees(prev => [...prev, assignee._id]);
                            }
                          }}
                        >
                          <div className={`flex items-center justify-center h-4 w-4 rounded border ${
                            selectedAssignees.includes(assignee._id) 
                              ? 'bg-primary border-primary' 
                              : 'border-gray-300'
                          }`}>
                            {selectedAssignees.includes(assignee._id) && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{assignee.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {assignee.role.charAt(0).toUpperCase() + assignee.role.slice(1)}
                              {assignee.department && ` • ${assignee.department}`}
                            </div>
                            {isSupervisorAssignedElsewhere && assigneeMode === "add" && (
                              <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Already assigned to: {assignedSiteNames.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick Add Suggestions */}
                {assigneeMode === "add" && (
                  <div className="flex gap-2">
                    {staffingStatus.missingManagers > 0 && assigneeType !== "supervisor" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Find all unassigned managers
                          const unassignedManagers = assignees
                            .filter(a => 
                              a.role === 'manager' && 
                              !currentAssignees.some(c => c._id === a._id)
                            )
                            .map(a => a._id);
                          
                          setSelectedAssignees(unassignedManagers);
                        }}
                      >
                        Select All Available Managers
                      </Button>
                    )}
                    {staffingStatus.missingSupervisors > 0 && assigneeType !== "manager" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Find all unassigned supervisors not assigned elsewhere
                          const unassignedSupervisors = assignees
                            .filter(a => {
                              if (a.role !== 'supervisor') return false;
                              if (currentAssignees.some(c => c._id === a._id)) return false;
                              
                              // Check if supervisor is assigned elsewhere - safely using supervisorsMap
                              let isAssignedElsewhere = false;
                              supervisorsMap.forEach((supervisorIds, siteId) => {
                                if (supervisorIds && supervisorIds.has && supervisorIds.has(a._id) && siteId !== task.siteId) {
                                  isAssignedElsewhere = true;
                                }
                              });
                              
                              return !isAssignedElsewhere;
                            })
                            .map(a => a._id);
                          
                          setSelectedAssignees(unassignedSupervisors);
                        }}
                      >
                        Select All Available Supervisors
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Warning for role mismatch in replace mode */}
            {assigneeMode === "replace" && oldUserId && newUserId && (
              (() => {
                const oldRole = currentAssignees.find(a => a._id === oldUserId)?.role;
                const newRole = assignees.find(a => a._id === newUserId)?.role;
                
                if (oldRole && newRole && oldRole !== newRole) {
                  return (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-700">
                          Cannot replace {oldRole} with {newRole}. Roles must match.
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            className="flex-1" 
            onClick={handleSubmit}
            disabled={
              isLoading ||
              (activeTab === "assignees" && (
                (assigneeMode === "add" && selectedAssignees.length === 0) ||
                (assigneeMode === "remove" && selectedAssignees.length === 0) ||
                (assigneeMode === "replace" && (!oldUserId || !newUserId))
              ))
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {activeTab === "details" ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Update Details
                  </>
                ) : (
                  <>
                    {assigneeMode === "add" && <UserPlus className="mr-2 h-4 w-4" />}
                    {assigneeMode === "remove" && <UserMinus className="mr-2 h-4 w-4" />}
                    {assigneeMode === "replace" && <RefreshCw className="mr-2 h-4 w-4" />}
                    {assigneeMode === "add" && `Add ${selectedAssignees.length} Missing Staff`}
                    {assigneeMode === "remove" && `Remove ${selectedAssignees.length} Staff`}
                    {assigneeMode === "replace" && "Replace Staff"}
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// View Task Dialog Component
const ViewTaskDialog = ({ 
  task, 
  open, 
  onOpenChange,
  getAssigneeType,
  getSiteName,
  getClientName,
  formatDateTime,
  getAllAssigneeNames,
  getAllAssigneeIds,
  siteStaffingRequirements
}: { 
  task: Task | GroupedTask; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  getAssigneeType: (assigneeId: string) => string;
  getSiteName: (siteId: string) => string;
  getClientName: (siteId: string) => string;
  formatDateTime: (dateTimeString: string) => string;
  getAllAssigneeNames: (task: Task | GroupedTask) => string[];
  getAllAssigneeIds: (task: Task | GroupedTask) => string[];
  siteStaffingRequirements?: SiteStaffingRequirements;
}) => {
  if (!task) return null;

  const getPriorityColor = (priority: string) => {
    const colors = { high: 'destructive', medium: 'default', low: 'secondary' };
    return colors[priority as keyof typeof colors] || 'outline';
  };

  const getStatusColor = (status: string) => {
    const colors = { 
      completed: 'default', 
      'in-progress': 'default', 
      pending: 'secondary',
      cancelled: 'destructive'
    };
    return colors[status as keyof typeof colors] || 'outline';
  };

  const isGrouped = isGroupedTask(task);
  const assigneeNames = getAllAssigneeNames(task);
  const assigneeIds = getAllAssigneeIds(task);

  // Calculate staffing status for this task
  const staffingStatus = useMemo((): TaskStaffingStatus | undefined => {
    if (!siteStaffingRequirements) return undefined;
    
    const currentManagers = task.assignedUsers?.filter(u => u.role === 'manager').length || 0;
    const currentSupervisors = task.assignedUsers?.filter(u => u.role === 'supervisor').length || 0;
    
    return {
      currentManagers,
      currentSupervisors,
      requiredManagers: siteStaffingRequirements.requiredManagers,
      requiredSupervisors: siteStaffingRequirements.requiredSupervisors,
      missingManagers: Math.max(0, siteStaffingRequirements.requiredManagers - currentManagers),
      missingSupervisors: Math.max(0, siteStaffingRequirements.requiredSupervisors - currentSupervisors),
      isManagerRequirementMet: currentManagers >= siteStaffingRequirements.requiredManagers,
      isSupervisorRequirementMet: currentSupervisors >= siteStaffingRequirements.requiredSupervisors,
      isFullyStaffed: currentManagers >= siteStaffingRequirements.requiredManagers && 
                      currentSupervisors >= siteStaffingRequirements.requiredSupervisors
    };
  }, [task, siteStaffingRequirements]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Task Details: {task.title || "Untitled Task"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Staffing Status Banner */}
          {staffingStatus && !staffingStatus.isFullyStaffed && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  Staffing Alert: Missing {staffingStatus.missingManagers} Manager(s) and {staffingStatus.missingSupervisors} Supervisor(s)
                </span>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Task Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Title</div>
                  <div className="font-medium">{task.title || "No title"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Description</div>
                  <div className="font-medium whitespace-pre-wrap">{task.description || "No description"}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Priority</div>
                    <Badge variant={getPriorityColor(task.priority) as any} className="mt-1">
                      {task.priority === "high" && <AlertCircle className="mr-1 h-3 w-3" />}
                      {task.priority}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge variant={getStatusColor(isGrouped ? task._overallStatus : task.status) as any} className="mt-1">
                      {isGrouped ? task._overallStatus : task.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Task Type</div>
                  <div className="font-medium">{task.taskType || "Not specified"}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Assignment Details</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Assignees</div>
                  <div className="space-y-2 mt-2">
                    {isGrouped ? (
                      // Show all assignees for grouped tasks
                      <div className="grid grid-cols-1 gap-2">
                        {assigneeNames.map((name, index) => {
                          const assigneeId = assigneeIds[index];
                          return (
                            <div key={index} className="flex items-center gap-2 p-2 border rounded">
                              <User className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {getAssigneeType(assigneeId)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Multiple assignees in single task
                      <div className="space-y-2">
                        {task.assignedUsers && task.assignedUsers.length > 0 ? (
                          task.assignedUsers.map((user, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 border rounded">
                              <User className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </div>
                              </div>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {user.status}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          // Fallback for old tasks
                          <div className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {task.assignedToName}
                            <Badge variant="outline" className="text-xs">
                              {getAssigneeType(task.assignedTo)}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Site</div>
                  <div className="font-medium flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {getSiteName(task.siteId)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Client</div>
                  <div className="font-medium">{getClientName(task.siteId)}</div>
                </div>
                
                {/* Show staffing requirements for this site */}
                {siteStaffingRequirements && (
                  <div className="mt-4">
                    <StaffingRequirementsIndicator requirements={siteStaffingRequirements} />
                  </div>
                )}

                {/* Show role counts */}
                {!isGrouped && staffingStatus && (
                  <div className="mt-2 flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        Managers: {staffingStatus.currentManagers}/{staffingStatus.requiredManagers}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        Supervisors: {staffingStatus.currentSupervisors}/{staffingStatus.requiredSupervisors}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Deadline Date</div>
              <div className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDateTime(task.deadline)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Due Date & Time</div>
              <div className="font-medium">
                {task.dueDateTime ? formatDateTime(task.dueDateTime) : "No due time"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Created At</div>
              <div className="font-medium">
                {task.createdAt ? formatDateTime(task.createdAt) : "Unknown"}
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4" />
                <div className="text-sm font-medium">Hourly Updates</div>
              </div>
              <div className="text-2xl font-bold">
                {isGrouped ? task._totalHourlyUpdates : (task.hourlyUpdates || []).length}
              </div>
            </div>
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="h-4 w-4" />
                <div className="text-sm font-medium">Attachments</div>
              </div>
              <div className="text-2xl font-bold">
                {isGrouped ? task._totalAttachments : (task.attachments || []).length}
              </div>
            </div>
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" />
                <div className="text-sm font-medium">Last Updated</div>
              </div>
              <div className="text-sm">
                {task.updatedAt ? formatDateTime(task.updatedAt) : "Never"}
              </div>
            </div>
          </div>

          {/* Attachments Preview */}
          {(isGrouped ? task._totalAttachments > 0 : (task.attachments || []).length > 0) && (
            <div>
              <h3 className="font-semibold mb-3">Attachments</h3>
              <div className="space-y-2">
                {(isGrouped ? task._allAttachments : task.attachments || []).slice(0, 3).map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{attachment.filename || "Unnamed file"}</div>
                        <div className="text-xs text-muted-foreground">
                          {attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : "Unknown size"} • {formatDateTime(attachment.uploadedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(isGrouped ? task._allAttachments : task.attachments || []).length > 3 && (
                  <div className="text-center text-sm text-muted-foreground">
                    + {(isGrouped ? task._allAttachments : task.attachments || []).length - 3} more attachment(s)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Updates */}
          {(isGrouped ? task._totalHourlyUpdates > 0 : (task.hourlyUpdates || []).length > 0) && (
            <div>
              <h3 className="font-semibold mb-3">Recent Updates</h3>
              <div className="space-y-3">
                {(isGrouped ? task._allHourlyUpdates : task.hourlyUpdates || []).slice(0, 3).map((update, index) => (
                  <div key={update.id || `update-${index}`} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">Update #{((isGrouped ? task._allHourlyUpdates : task.hourlyUpdates || []).length - index)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(update.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm">{update.content}</p>
                  </div>
                ))}
                {(isGrouped ? task._allHourlyUpdates : task.hourlyUpdates || []).length > 3 && (
                  <div className="text-center text-sm text-muted-foreground">
                    + {(isGrouped ? task._allHourlyUpdates : task.hourlyUpdates || []).length - 3} more update(s)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Combined Add/Assign Task Dialog Component - Single unified flow
const AddAssignTaskDialog = ({ 
  open, 
  onOpenChange,
  onSubmit,
  sites,
  assignees,
  selectedSites,
  setSelectedSites,
  selectedAssignees,
  setSelectedAssignees,
  assigneeType,
  setAssigneeType,
  isLoadingAssignees,
  isLoadingSites,
  assignedSupervisorsMap,
  siteStaffingRequirements
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  sites: ExtendedSite[];
  assignees: Assignee[];
  selectedSites: string[];
  setSelectedSites: (sites: string[]) => void;
  selectedAssignees: string[];
  setSelectedAssignees: (assignees: string[]) => void;
  assigneeType: "all" | "manager" | "supervisor";
  setAssigneeType: (type: "all" | "manager" | "supervisor") => void;
  isLoadingAssignees: boolean;
  isLoadingSites: boolean;
  assignedSupervisorsMap: Map<string, Set<string>>;
  siteStaffingRequirements: Map<string, SiteStaffingRequirements>;
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [taskType, setTaskType] = useState("routine");
  const [deadline, setDeadline] = useState("");
  const [dueDateTime, setDueDateTime] = useState("");

  // Ensure assignedSupervisorsMap is a Map
  const supervisorsMap = useMemo(() => {
    if (!assignedSupervisorsMap) return new Map();
    if (assignedSupervisorsMap instanceof Map) return assignedSupervisorsMap;
    try {
      return new Map(Object.entries(assignedSupervisorsMap));
    } catch {
      return new Map();
    }
  }, [assignedSupervisorsMap]);

  // Reset form
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setTaskType("routine");
    setDeadline("");
    setDueDateTime("");
    setSelectedSites([]);
    setSelectedAssignees([]);
    setAssigneeType("all");
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form
    if (!title || !description || !deadline || !dueDateTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate description word count
    const wordCount = description.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < 5) {
      toast.error(`Description must be at least 5 words. Current: ${wordCount} words`);
      return;
    }

    if (wordCount > 500) {
      toast.error(`Description cannot exceed 500 words. Current: ${wordCount} words`);
      return;
    }

    if (selectedSites.length === 0) {
      toast.error("Please select at least one site");
      return;
    }

    onSubmit(e);
    resetForm();
  };

  const selectedAssigneeObjects = assignees.filter(assignee => 
    selectedAssignees.includes(assignee._id)
  );
  const managerCount = selectedAssigneeObjects.filter(a => a.role === 'manager').length;
  const supervisorCount = selectedAssigneeObjects.filter(a => a.role === 'supervisor').length;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetForm();
      onOpenChange(newOpen);
    }}>
      <DialogTrigger asChild>
        <Button variant="default" className="ml-2">
          <Plus className="mr-2 h-4 w-4" />
           Assign Site
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Create and Assign Site
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Creation Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Task Details
            </h3>
            
            <FormField label="Task Title" id="task-title" required>
              <Input 
                id="task-title" 
                name="title" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title" 
                required 
              />
            </FormField>

            <FormField label="Description" id="description" required>
              <Textarea 
                id="description" 
                name="description" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description (minimum 5 words)" 
                rows={3}
                required 
              />
              <div className="mt-1 flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  Word count: {description.trim() ? description.trim().split(/\s+/).filter(word => word.length > 0).length : 0} / 5 minimum
                </div>
                {description.trim() && (
                  <div className="text-xs">
                    {description.trim().split(/\s+/).filter(word => word.length > 0).length < 5 ? (
                      <span className="text-amber-600">
                        Need {5 - description.trim().split(/\s+/).filter(word => word.length > 0).length} more word(s)
                      </span>
                    ) : (
                      <span className="text-green-600">
                        ✓ Minimum word count met
                      </span>
                    )}
                  </div>
                )}
              </div>
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Priority" id="priority" required>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Task Type" id="task-type">
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="safety">Safety Check</SelectItem>
                    <SelectItem value="equipment">Equipment Check</SelectItem>
                    <SelectItem value="routine">Routine</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Start Date" id="start-date">
                <Input 
                  id="start-date" 
                  name="start-date" 
                  type="date" 
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </FormField>

              <FormField label="Deadline Date" id="deadline" required>
                <Input 
                  id="deadline" 
                  name="deadline" 
                  type="date" 
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required 
                />
              </FormField>
            </div>

            <FormField label="Due Date & Time" id="due-datetime" required>
              <Input 
                id="due-datetime" 
                name="dueDateTime" 
                type="datetime-local" 
                value={dueDateTime}
                onChange={(e) => setDueDateTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                required 
              />
            </FormField>
          </div>

          {/* Assignment Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Assignment Details
            </h3>

            {/* Assignee Selection Section */}
            <AssigneeMultiSelect 
              assignees={assignees}
              selectedAssignees={selectedAssignees}
              onSelectAssignees={setSelectedAssignees}
              assigneeType={assigneeType}
              onAssigneeTypeChange={setAssigneeType}
              isLoading={isLoadingAssignees}
              selectedSites={selectedSites}
              sites={sites}
              assignedSupervisorsMap={supervisorsMap}
              siteStaffingRequirements={siteStaffingRequirements}
            />

            {/* Site Selection Section - Now filtered to show only sites with no assignees */}
            <SiteMultiSelect 
              sites={sites}
              selectedSites={selectedSites}
              onSelectSites={setSelectedSites}
              isLoading={isLoadingSites}
              alreadyAssignedSiteIds={[]}
              siteStaffingRequirements={siteStaffingRequirements}
              assigneeType={assigneeType}
            />

            {/* Assignment Summary */}
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-primary" />
                <span className="font-medium">Assignment Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Task Template</div>
                  <div className="font-medium flex items-center gap-2">
                    <Briefcase className="h-3 w-3" />
                    <span className="truncate">{title || "New Task"}</span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Assignees Selected</div>
                  <div className="font-medium flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    {selectedAssignees.length > 0 ? (
                      <>
                        {selectedAssignees.length} assignee(s)
                        <div className="flex gap-1 ml-2">
                          {managerCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {managerCount} Manager{managerCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          {supervisorCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {supervisorCount} Supervisor{supervisorCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-amber-600">No assignees selected</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Sites Selected</div>
                  <div className="font-medium flex items-center gap-2">
                    <Building className="h-3 w-3" />
                    {selectedSites.length} site(s) selected
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Tasks to Create</div>
                  <div className="font-medium">
                    {selectedSites.length} task(s) (1 per site)
                  </div>
                </div>
              </div>

              {/* Detailed Preview */}
              {selectedSites.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Task Distribution Preview:</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• {selectedSites.length} site(s) will receive this task</div>
                    <div>• {selectedAssignees.length > 0 ? `Each site's task will have ${selectedAssignees.length} assignee(s)` : "Tasks will be created without assignees"}</div>
                    <div>• Total: {selectedSites.length} new task(s) will be created</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hidden inputs for form data */}
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="description" value={description} />
          <input type="hidden" name="priority" value={priority} />
          <input type="hidden" name="taskType" value={taskType} />
          <input type="hidden" name="deadline" value={deadline} />
          <input type="hidden" name="dueDateTime" value={dueDateTime} />
          <input type="hidden" name="selectedSites" value={JSON.stringify(selectedSites)} />
          <input type="hidden" name="selectedAssignees" value={JSON.stringify(selectedAssignees)} />

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={selectedSites.length === 0}
            >
              <Save className="mr-2 h-4 w-4" />
              {selectedSites.length === 0 ? "Select at least one site" : `Create & Assign ${selectedSites.length} Task(s)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const TasksSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [addAssignTaskDialogOpen, setAddAssignTaskDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sites, setSites] = useState<ExtendedSite[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | GroupedTask | null>(null);
  const [showUpdatesDialog, setShowUpdatesDialog] = useState(false);
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [hourlyUpdateText, setHourlyUpdateText] = useState("");
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assigneeType, setAssigneeType] = useState<"all" | "manager" | "supervisor">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(false);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [assignedSupervisorsMap, setAssignedSupervisorsMap] = useState<Map<string, Set<string>>>(new Map());
  const [siteStaffingRequirements, setSiteStaffingRequirements] = useState<Map<string, SiteStaffingRequirements>>(new Map());

  // Fetch data on component mount
  useEffect(() => {
    fetchTasks();
    fetchSites();
    fetchAssignees();
  }, []);

  // Fetch assigned supervisors data
  useEffect(() => {
    const fetchAssignedSupervisors = async () => {
      try {
        const map = await taskService.getSupervisorsBySiteOld();
        setAssignedSupervisorsMap(map);
      } catch (error) {
        console.error("Error fetching assigned supervisors:", error);
      }
    };
    
    fetchAssignedSupervisors();
  }, [tasks]); // Refresh when tasks change

  // Calculate site staffing requirements - FIXED: Now counts UNIQUE managers and supervisors across ALL tasks
  useEffect(() => {
    const calculateStaffingRequirements = () => {
      const requirementsMap = new Map<string, SiteStaffingRequirements>();
      
      sites.forEach(site => {
        if (!site) return;
        
        // Get all tasks for this site
        const siteTasks = tasks.filter(task => 
          task && task.siteId === site._id
        );
        
        // Count UNIQUE managers and supervisors across ALL tasks at this site
        const assignedManagerIds = new Set<string>();
        const assignedSupervisorIds = new Set<string>();
        
        siteTasks.forEach(task => {
          // Check for new format (assignedUsers array)
          if (task.assignedUsers && task.assignedUsers.length > 0) {
            task.assignedUsers.forEach(user => {
              if (user.role === 'manager') {
                assignedManagerIds.add(user.userId);
              } else if (user.role === 'supervisor') {
                assignedSupervisorIds.add(user.userId);
              }
            });
          } 
          // Check for old format (single assignee)
          else if (task.assignedTo && task.assignedTo !== "unassigned") {
            // We need to determine the role from assignees list
            const assignee = assignees.find(a => a._id === task.assignedTo);
            if (assignee) {
              if (assignee.role === 'manager') {
                assignedManagerIds.add(task.assignedTo);
              } else if (assignee.role === 'supervisor') {
                assignedSupervisorIds.add(task.assignedTo);
              }
            }
          }
        });
        
        const requiredManagers = site.managerCount || 0;
        const requiredSupervisors = site.supervisorCount || 0;
        const assignedManagers = assignedManagerIds.size;
        const assignedSupervisors = assignedSupervisorIds.size;
        
        const missingRoles: ('manager' | 'supervisor')[] = [];
        if (assignedManagers < requiredManagers) missingRoles.push('manager');
        if (assignedSupervisors < requiredSupervisors) missingRoles.push('supervisor');
        
        requirementsMap.set(site._id, {
          siteId: site._id,
          siteName: site.name,
          requiredManagers,
          requiredSupervisors,
          assignedManagers,
          assignedSupervisors,
          assignedManagerIds,
          assignedSupervisorIds,
          hasManager: assignedManagers > 0,
          hasSupervisor: assignedSupervisors > 0,
          missingRoles,
          isManagerRequirementMet: assignedManagers >= requiredManagers,
          isSupervisorRequirementMet: assignedSupervisors >= requiredSupervisors,
          hasAnyAssignee: assignedManagers > 0 || assignedSupervisors > 0
        });
      });
      
      setSiteStaffingRequirements(requirementsMap);
    };
    
    calculateStaffingRequirements();
  }, [tasks, sites, assignees]);

  // Fetch tasks from backend using TaskService
  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const tasksData = await taskService.getAllTasks();
      setTasks(tasksData || []);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast.error(error.message || "Failed to load tasks");
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch sites from backend using TaskService
  const fetchSites = async () => {
    try {
      setIsLoadingSites(true);
      const sitesData = await taskService.getAllSites();
      
      // Calculate manager/supervisor counts for each site
      const sitesWithCounts = (sitesData || []).map(site => {
        // Get staff deployment array safely
        const staffDeployment = site.staffDeployment;
        
        // Ensure staffDeployment is an array, if not, use empty array
        const staffArray = Array.isArray(staffDeployment) ? staffDeployment : [];
        
        // Calculate manager count
        const managerCount = staffArray
          .filter((staff: any) => {
            if (!staff || !staff.role) return false;
            const role = staff.role.toLowerCase();
            return role.includes('manager') || role === 'manager';
          })
          .reduce((sum: number, staff: any) => sum + (Number(staff.count) || 0), 0);
        
        // Calculate supervisor count
        const supervisorCount = staffArray
          .filter((staff: any) => {
            if (!staff || !staff.role) return false;
            const role = staff.role.toLowerCase();
            return role.includes('supervisor') || role === 'supervisor';
          })
          .reduce((sum: number, staff: any) => sum + (Number(staff.count) || 0), 0);
        
        return {
          ...site,
          managerCount,
          supervisorCount
        };
      });
      
      setSites(sitesWithCounts || []);
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      toast.error("Failed to load sites");
      setSites([]);
    } finally {
      setIsLoadingSites(false);
    }
  };

  // Fetch assignees from backend using TaskService
  const fetchAssignees = async () => {
    try {
      setIsLoadingAssignees(true);
      const assigneesData = await taskService.getAllAssignees();
      setAssignees(assigneesData || []);
    } catch (error: any) {
      console.error("Error fetching assignees:", error);
      toast.error("Failed to load assignees");
      setAssignees([]);
    } finally {
      setIsLoadingAssignees(false);
    }
  };

  // Helper functions
  const getAssigneeType = useCallback((assigneeId: string) => {
    const assignee = (assignees || []).find(a => a && a._id === assigneeId);
    return assignee ? assignee.role.charAt(0).toUpperCase() + assignee.role.slice(1) : "Unknown";
  }, [assignees]);

  const getAssigneeName = useCallback((assigneeId: string) => {
    const assignee = (assignees || []).find(a => a && a._id === assigneeId);
    return assignee ? assignee.name : assigneeId;
  }, [assignees]);

  const getSiteName = useCallback((siteId: string) => {
    const site = (sites || []).find(s => s && s._id === siteId);
    return site ? site.name : "Unknown Site";
  }, [sites]);

  const getClientName = useCallback((siteId: string) => {
    const site = (sites || []).find(s => s && s._id === siteId);
    return site ? site.clientName : "Unknown Client";
  }, [sites]);

  const formatDateTime = useCallback((dateTimeString: string) => {
    return taskService.formatDate(dateTimeString);
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    return taskService.getPriorityColor(priority);
  }, []);

  const getStatusColor = useCallback((status: string) => {
    return taskService.getStatusColor(status);
  }, []);

  const getHourlyUpdatesCount = useCallback((task: Task) => {
    return (task.hourlyUpdates || []).length;
  }, []);

  const getAttachmentsCount = useCallback((task: Task) => {
    return (task.attachments || []).length;
  }, []);

  // Helper function to get all assignee names for a task (for grouped or single tasks)
  const getAllAssigneeNames = useCallback((task: Task | GroupedTask): string[] => {
    if (!task) return [];
    
    if (isGroupedTask(task)) {
      // For grouped tasks, get all unique assignee names from all assigned users
      return Array.from(new Set(task._allAssignedUsers?.map(u => u.name) || []));
    } else {
      // For single tasks, get names from assignedUsers (with fallback to old format)
      if (task.assignedUsers && task.assignedUsers.length > 0) {
        return task.assignedUsers.map(u => u.name);
      } else {
        // Fallback for old tasks
        return task.assignedToName ? [task.assignedToName] : [];
      }
    }
  }, []);

  // Helper function to get all assignee IDs for a task
  const getAllAssigneeIds = useCallback((task: Task | GroupedTask): string[] => {
    if (!task) return [];
    
    if (isGroupedTask(task)) {
      // For grouped tasks, get all unique assignee IDs from all assigned users
      return Array.from(new Set(task._allAssignedUsers?.map(u => u.userId) || []));
    } else {
      // For single tasks, get IDs from assignedUsers (with fallback to old format)
      if (task.assignedUsers && task.assignedUsers.length > 0) {
        return task.assignedUsers.map(u => u.userId);
      } else {
        // Fallback for old tasks
        return task.assignedTo ? [task.assignedTo] : [];
      }
    }
  }, []);

  // Get staffing requirements for a specific task
  const getTaskStaffingRequirements = useCallback((task: Task | GroupedTask): SiteStaffingRequirements | undefined => {
    if (!task) return undefined;
    
    if (isGroupedTask(task)) {
      // For grouped tasks, show requirements for the first site
      const firstSiteId = task.siteId;
      return siteStaffingRequirements.get(firstSiteId);
    } else {
      return siteStaffingRequirements.get(task.siteId);
    }
  }, [siteStaffingRequirements]);

  // Check if a task meets site staffing requirements
  const doesTaskMeetRequirements = useCallback((task: Task | GroupedTask): boolean => {
    const requirements = getTaskStaffingRequirements(task);
    if (!requirements) return true;
    
    if (isGroupedTask(task)) {
      return requirements.isManagerRequirementMet && requirements.isSupervisorRequirementMet;
    } else {
      // For single task, check if this task's assignees help meet requirements
      const hasManager = task.assignedUsers?.some(u => u.role === 'manager') || false;
      const hasSupervisor = task.assignedUsers?.some(u => u.role === 'supervisor') || false;
      
      // Task meets requirements if either:
      // 1. Requirements are already met by other tasks at this site, or
      // 2. This task provides the missing roles
      const managerMet = requirements.isManagerRequirementMet || hasManager;
      const supervisorMet = requirements.isSupervisorRequirementMet || hasSupervisor;
      
      return managerMet && supervisorMet;
    }
  }, [getTaskStaffingRequirements]);

  // Group tasks by title, description, deadline, priority, task type, AND site
  const groupTasks = useCallback((taskList: Task[]): (Task | GroupedTask)[] => {
    // Create a map to group tasks
    const groupMap = new Map<string, Task[]>();
    
    (taskList || []).forEach(task => {
      if (!task) return;
      
      // Create a unique key based on task definition AND site
      const groupKey = `${task.title}|${task.description}|${task.deadline}|${task.priority}|${task.taskType}|${task.siteId}`;
      
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(task);
    });
    
    const result: (Task | GroupedTask)[] = [];
    
    // Process each group
    groupMap.forEach((group, groupKey) => {
      // If only one task in the group, add it as a regular task
      if (group.length === 1) {
        result.push(group[0]);
        return;
      }
      
      // Multiple tasks - create a grouped task
      const mainTask = group[0];
      
      // Get all assigned users across all tasks in the group
      const allAssignedUsers = group.flatMap(t => t.assignedUsers || []);
      
      // Get unique values
      const uniqueUserIds = [...new Set(allAssignedUsers.map(u => u.userId))];
      const uniqueUserNames = [...new Set(allAssignedUsers.map(u => u.name))];
      const uniqueSites = [...new Set(group.map(t => t.siteId))];
      const uniqueSiteNames = [...new Set(group.map(t => t.siteName))];
      const uniqueClientNames = [...new Set(group.map(t => t.clientName))];
      
      // Count managers and supervisors
      const managerCount = allAssignedUsers.filter(u => u.role === 'manager').length;
      const supervisorCount = allAssignedUsers.filter(u => u.role === 'supervisor').length;
      
      // Calculate status
      const statuses = group.map(t => t.status);
      const isAllCompleted = statuses.every(s => s === "completed");
      const isSomeInProgress = statuses.some(s => s === "in-progress");
      
      let overallStatus: Task["status"] = "pending";
      if (isAllCompleted) {
        overallStatus = "completed";
      } else if (isSomeInProgress) {
        overallStatus = "in-progress";
      }
      
      // Aggregate attachments and updates
      const allAttachments = group.flatMap(t => t.attachments || []);
      const allHourlyUpdates = group.flatMap(t => t.hourlyUpdates || []);
      
      const groupedTask: GroupedTask = {
        ...mainTask,
        _id: `group-${mainTask._id}-${Date.now()}`,
        _isGrouped: true,
        _groupCount: group.length,
        _groupItems: group,
        _groupedAssignees: uniqueUserIds,
        _groupedAssigneeNames: uniqueUserNames,
        _groupedSites: uniqueSites,
        _groupedSiteNames: uniqueSiteNames,
        _groupedClientNames: uniqueClientNames,
        _overallStatus: overallStatus,
        _totalAttachments: allAttachments.length,
        _totalHourlyUpdates: allHourlyUpdates.length,
        _allAttachments: allAttachments,
        _allHourlyUpdates: allHourlyUpdates,
        _allAssignedUsers: allAssignedUsers,
        _managerCount: managerCount,
        _supervisorCount: supervisorCount
      };
      
      result.push(groupedTask);
    });
    
    return result;
  }, []);

  // Filter tasks with useMemo
  const filteredTasks = useMemo(() => {
    // First, filter out unassigned/template tasks - only show assigned tasks
    let filtered = (tasks || []).filter(task => {
      if (!task) return false;
      
      // Check if task has assigned users (new format) or single assignee (old format)
      const hasAssignedUsers = task.assignedUsers && task.assignedUsers.length > 0;
      const hasSingleAssignee = task.assignedTo && task.assignedTo !== "unassigned" && 
                                task.assignedToName && task.assignedToName !== "Unassigned";
      
      // Only show tasks that are actually assigned (not templates)
      const isAssigned = (hasAssignedUsers || hasSingleAssignee) && 
                         task.siteId !== "unspecified" &&
                         task.siteName !== "Unspecified Site";
      
      return isAssigned;
    });
    
    // Filter by site if selected
    if (selectedSite !== "all") {
      filtered = filtered.filter(task => task && task.siteId === selectedSite);
    }
    
    // Filter by search query if exists
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase().trim();
      
      filtered = filtered.filter(task => {
        if (!task) return false;
        
        // Search in all relevant fields with OR logic
        const titleMatch = safeString(task.title).toLowerCase().includes(searchLower);
        const descriptionMatch = safeString(task.description).toLowerCase().includes(searchLower);
        
        // Search in assignees (new format)
        let assigneeMatch = false;
        if (task.assignedUsers && task.assignedUsers.length > 0) {
          assigneeMatch = task.assignedUsers.some(u => 
            safeString(u.name).toLowerCase().includes(searchLower)
          );
        } else {
          // Fallback to old format
          assigneeMatch = safeString(task.assignedToName).toLowerCase().includes(searchLower);
        }
        
        const siteMatch = safeString(task.siteName).toLowerCase().includes(searchLower);
        const clientMatch = safeString(task.clientName).toLowerCase().includes(searchLower);
        const taskTypeMatch = safeString(task.taskType).toLowerCase().includes(searchLower);
        const priorityMatch = safeString(task.priority).toLowerCase().includes(searchLower);
        const statusMatch = safeString(task.status).toLowerCase().includes(searchLower);
        
        return titleMatch || descriptionMatch || assigneeMatch || 
               siteMatch || clientMatch || taskTypeMatch || 
               priorityMatch || statusMatch;
      });
    }
    
    // Remove duplicates based on task ID
    const uniqueTasks: Task[] = [];
    const taskIds = new Set<string>();
    
    filtered.forEach(task => {
      if (task && !taskIds.has(task._id)) {
        taskIds.add(task._id);
        uniqueTasks.push(task);
      }
    });
    
    // Group the tasks
    return groupTasks(uniqueTasks);
  }, [tasks, searchQuery, selectedSite, groupTasks]);

  // Create tasks for sites - COMPLETE FUNCTION with all validations
  const createTasksForSites = async (
    taskTitle: string, 
    taskDescription: string, 
    taskPriority: "high" | "medium" | "low",
    taskType: string,
    taskDeadline: string,
    taskDueDateTime: string,
    assigneeIds: string[],
    siteIds: string[]
  ) => {
    console.log("📋 createTasksForSites called with:", {
      taskTitle,
      taskDescription,
      taskPriority,
      taskType,
      taskDeadline,
      taskDueDateTime,
      assigneeIds,
      siteIds,
      assigneeCount: assigneeIds?.length || 0,
      siteCount: siteIds?.length || 0
    });

    // Validate inputs
    if (!siteIds || siteIds.length === 0) {
      toast.error("❌ No sites selected for task creation");
      return false;
    }

    // Trim and validate title
    const trimmedTitle = taskTitle?.trim() || "";
    if (!trimmedTitle) {
      toast.error("❌ Task title is empty after trimming");
      return false;
    }
    
    if (trimmedTitle.length < 5) {
      toast.error(`❌ Task title must be at least 5 characters. Current: ${trimmedTitle.length} characters`);
      return false;
    }

    // Trim and validate description
    const trimmedDescription = taskDescription?.trim() || "";
    if (!trimmedDescription) {
      toast.error("❌ Task description is empty after trimming");
      return false;
    }
    
    // Count words in description
    const words = trimmedDescription.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    
    console.log("📝 Description word count:", wordCount);

    if (wordCount < 5) {
      toast.error(`❌ Task description must be at least 5 words. Current: ${wordCount} words`);
      return false;
    }

    if (wordCount > 500) {
      toast.error(`❌ Task description cannot exceed 500 words. Current: ${wordCount} words`);
      return false;
    }

    // Validate dates
    if (!taskDeadline) {
      toast.error("❌ Deadline date is required");
      return false;
    }

    if (!taskDueDateTime) {
      toast.error("❌ Due date & time is required");
      return false;
    }

    // Check if deadline is in the past
    const today = new Date().toISOString().split('T')[0];
    if (taskDeadline < today) {
      toast.error("❌ Deadline cannot be in the past");
      return false;
    }

    // Get selected assignee objects (if any)
    const selectedAssigneeObjects = assignees.filter(assignee => 
      assigneeIds.includes(assignee._id)
    );
    console.log("👥 Selected assignee objects:", selectedAssigneeObjects.map(a => ({
      id: a._id,
      name: a.name,
      role: a.role
    })));

    // Get selected sites
    const selectedSiteObjects = sites.filter(site => 
      siteIds.includes(site._id)
    );
    console.log("🏢 Selected site objects:", selectedSiteObjects.map(s => ({
      id: s._id,
      name: s.name,
      managerCount: s.managerCount,
      supervisorCount: s.supervisorCount
    })));

    if (selectedSiteObjects.length === 0) {
      toast.error("❌ No valid sites found for the selected IDs");
      return false;
    }

    // Check for supervisor assignment conflicts (only if we're assigning new supervisors)
    if (selectedAssigneeObjects.length > 0) {
      const supervisorConflicts: string[] = [];
      const validAssignees: Assignee[] = [];
      
      selectedAssigneeObjects.forEach(assignee => {
        if (assignee.role === 'supervisor') {
          // Check if this supervisor is already assigned to any site
          let isAssignedElsewhere = false;
          let assignedSiteNames: string[] = [];
          
          assignedSupervisorsMap.forEach((supervisorIds, siteId) => {
            if (supervisorIds && supervisorIds.has && supervisorIds.has(assignee._id)) {
              isAssignedElsewhere = true;
              const site = sites.find(s => s._id === siteId);
              if (site) {
                assignedSiteNames.push(site.name);
              }
            }
          });
          
          if (isAssignedElsewhere) {
            supervisorConflicts.push(`${assignee.name} (already assigned to: ${assignedSiteNames.join(', ')})`);
          } else {
            validAssignees.push(assignee);
          }
        } else {
          // Managers are always valid
          validAssignees.push(assignee);
        }
      });

      if (supervisorConflicts.length > 0) {
        toast.error(
          <div>
            <p className="font-bold">❌ Supervisor assignment conflict:</p>
            <ul className="list-disc pl-4 mt-1">
              {supervisorConflicts.map((conflict, i) => (
                <li key={i}>{conflict}</li>
              ))}
            </ul>
            <p className="mt-2">Supervisors can only be assigned to ONE site.</p>
          </div>
        );
        return false;
      }
    }

    // Create tasks for EACH SITE
    const tasksToCreate: any[] = [];
    const skippedSites: string[] = [];
    const siteWarnings: string[] = [];
    
    for (const site of selectedSiteObjects) {
      console.log(`🔍 Processing site: ${site.name} (${site._id})`);
      
      // Check site staffing requirements
      const requirements = siteStaffingRequirements.get(site._id);
      
      if (requirements) {
        console.log(`📊 Site ${site.name} requirements:`, {
          requiredManagers: requirements.requiredManagers,
          requiredSupervisors: requirements.requiredSupervisors,
          assignedManagers: requirements.assignedManagers,
          assignedSupervisors: requirements.assignedSupervisors,
          hasAnyAssignee: requirements.hasAnyAssignee,
          isManagerRequirementMet: requirements.isManagerRequirementMet,
          isSupervisorRequirementMet: requirements.isSupervisorRequirementMet
        });
        
        // If site is fully staffed, skip it (don't create tasks for fully staffed sites)
        if (requirements.isManagerRequirementMet && requirements.isSupervisorRequirementMet) {
          skippedSites.push(`${site.name} (fully staffed)`);
          continue;
        }
        
        // If site already has assignees, skip it
        if (requirements.hasAnyAssignee) {
          skippedSites.push(`${site.name} (already has assignees)`);
          continue;
        }
        
        // If site needs assignees but none selected, skip this site
        if (selectedAssigneeObjects.length === 0) {
          skippedSites.push(`${site.name} (needs staffing)`);
          continue;
        }
        
        // Calculate if adding these assignees would exceed limits
        const managersToAdd = selectedAssigneeObjects.filter(a => a.role === 'manager').length;
        const supervisorsToAdd = selectedAssigneeObjects.filter(a => a.role === 'supervisor').length;
        
        const totalManagersAfterAdd = requirements.assignedManagers + managersToAdd;
        const totalSupervisorsAfterAdd = requirements.assignedSupervisors + supervisorsToAdd;
        
        if (totalManagersAfterAdd > requirements.requiredManagers) {
          const warning = `Site ${site.name}: Already has ${requirements.assignedManagers} managers. Adding ${managersToAdd} more would exceed limit of ${requirements.requiredManagers}.`;
          siteWarnings.push(warning);
          continue;
        }
        
        if (totalSupervisorsAfterAdd > requirements.requiredSupervisors) {
          const warning = `Site ${site.name}: Already has ${requirements.assignedSupervisors} supervisors. Adding ${supervisorsToAdd} more would exceed limit of ${requirements.requiredSupervisors}.`;
          siteWarnings.push(warning);
          continue;
        }
        
        // Create task with assignees
        const assignedUsers = selectedAssigneeObjects.map(assignee => ({
          userId: assignee._id,
          name: assignee.name,
          role: assignee.role,
          assignedAt: new Date().toISOString(),
          status: 'pending' as const
        }));
        
        const taskData = {
          title: trimmedTitle,
          description: trimmedDescription,
          assignedUsers: assignedUsers,
          priority: taskPriority,
          status: "pending" as const,
          deadline: taskDeadline,
          dueDateTime: taskDueDateTime,
          siteId: site._id,
          siteName: site.name,
          clientName: site.clientName || "Unknown Client",
          taskType: taskType || "routine",
          attachments: [],
          hourlyUpdates: [],
          createdBy: "current-user"
        };
        
        console.log(`✅ Adding task for site ${site.name}:`, taskData);
        tasksToCreate.push(taskData);
      } else {
        console.log(`ℹ️ No requirements found for site ${site.name}, creating without checks`);
        
        // If no requirements found, create task without assignee checks
        const assignedUsers = selectedAssigneeObjects.map(assignee => ({
          userId: assignee._id,
          name: assignee.name,
          role: assignee.role,
          assignedAt: new Date().toISOString(),
          status: 'pending' as const
        }));
        
        const taskData = {
          title: trimmedTitle,
          description: trimmedDescription,
          assignedUsers: assignedUsers,
          priority: taskPriority,
          status: "pending" as const,
          deadline: taskDeadline,
          dueDateTime: taskDueDateTime,
          siteId: site._id,
          siteName: site.name,
          clientName: site.clientName || "Unknown Client",
          taskType: taskType || "routine",
          attachments: [],
          hourlyUpdates: [],
          createdBy: "current-user"
        };
        
        console.log(`✅ Adding task for site ${site.name} (no requirements):`, taskData);
        tasksToCreate.push(taskData);
      }
    }

    console.log(`📊 Summary: ${tasksToCreate.length} tasks to create, ${skippedSites.length} sites skipped`);

    // Show warnings if any
    if (siteWarnings.length > 0) {
      siteWarnings.forEach(warning => toast.warning(`⚠️ ${warning}`));
    }

    if (tasksToCreate.length === 0) {
      if (skippedSites.length > 0) {
        toast.warning(`⚠️ No tasks created. Issues with: ${skippedSites.join(', ')}`);
      } else {
        toast.warning("⚠️ No sites available for assignment.");
      }
      return false;
    }

    try {
      console.log("📤 Sending to API:", JSON.stringify({ 
        tasks: tasksToCreate.map(t => ({
          ...t,
          description: t.description.substring(0, 50) + "..." // Log truncated description
        })), 
        createdBy: "current-user" 
      }, null, 2));
      
      const createMultipleTasksRequest = {
        tasks: tasksToCreate,
        createdBy: "current-user"
      };

      // Log the full request for debugging (but truncate long fields)
      console.log("📦 Full request data:", {
        taskCount: tasksToCreate.length,
        firstTask: {
          title: tasksToCreate[0]?.title,
          descriptionLength: tasksToCreate[0]?.description?.length,
          wordCount: tasksToCreate[0]?.description?.split(/\s+/).filter((w: string) => w.length > 0).length,
          siteId: tasksToCreate[0]?.siteId,
          assigneeCount: tasksToCreate[0]?.assignedUsers?.length
        }
      });

      const createdTasks = await taskService.createMultipleTasks(createMultipleTasksRequest);
      console.log("📥 API response:", createdTasks);
      
      // Check if tasks were actually created
      if (!createdTasks) {
        toast.error("❌ API returned no data - tasks may not have been created");
        return false;
      }
      
      if (!Array.isArray(createdTasks)) {
        toast.error(`❌ API returned unexpected data type: ${typeof createdTasks}`);
        console.error("Unexpected response type:", createdTasks);
        return false;
      }
      
      if (createdTasks.length === 0) {
        toast.error("❌ API returned empty array - tasks were not created");
        return false;
      }
      
      const managerCount = selectedAssigneeObjects.filter(a => a.role === 'manager').length;
      const supervisorCount = selectedAssigneeObjects.filter(a => a.role === 'supervisor').length;
      
      let successMessage = `✅ Successfully created ${createdTasks.length} task(s)`;
      
      if (selectedAssigneeObjects.length > 0) {
        successMessage += ` with ${selectedAssigneeObjects.length} assignee(s) (${managerCount}M, ${supervisorCount}S)`;
      } else {
        successMessage += ` (no assignees)`;
      }
      
      successMessage += ` across ${siteIds.length} site(s)!`;
      
      if (skippedSites.length > 0) {
        successMessage += ` ${skippedSites.length} site(s) were skipped: ${skippedSites.join(', ')}.`;
      }
      
      if (createdTasks && createdTasks.length > 0) {
  createdTasks.forEach((task: any) => {
    createNotificationForSuperadmin(
      `📋 New Task: ${task.title}`,
      `Task "${task.title}" assigned to ${task.siteName} – Priority: ${task.priority}`,
      'info',
      task.priority === 'high' ? 'high' : 'medium',
      {
        taskId: task._id,
        siteName: task.siteName,
        priority: task.priority,
        taskTitle: task.title
      },
      'task_creation'
    );
  });
}
      toast.success(successMessage);
      
      // Refresh tasks list
      await fetchTasks();
      
      return true;
      
    } catch (error: any) {
      console.error("❌ Error creating tasks:", error);
      
      // Show more detailed error message
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("❌ Error response data:", error.response.data);
        console.error("❌ Error response status:", error.response.status);
        
        let errorMessage = "Unknown server error";
        
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else {
            errorMessage = JSON.stringify(error.response.data);
          }
        }
        
        toast.error(`❌ Server error (${error.response.status}): ${errorMessage}`);
        
      } else if (error.request) {
        // The request was made but no response was received
        console.error("❌ No response received:", error.request);
        toast.error("❌ No response from server. Please check your network connection.");
        
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("❌ Error message:", error.message);
        toast.error(`❌ Request error: ${error.message}`);
      }
      
      return false;
    }
  };

  // Handle unified submit
  const handleUnifiedSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as "high" | "medium" | "low";
    const taskType = formData.get("taskType") as string || "routine";
    const deadline = formData.get("deadline") as string;
    const dueDateTime = formData.get("dueDateTime") as string;
    const selectedSitesStr = formData.get("selectedSites") as string;
    const selectedAssigneesStr = formData.get("selectedAssignees") as string;
    
    console.log("Form data received:", {
      title,
      description,
      priority,
      taskType,
      deadline,
      dueDateTime,
      selectedSitesStr,
      selectedAssigneesStr
    });

    // Validate required fields
    if (!title) {
      toast.error("❌ Task title is missing from form");
      return;
    }
    
    if (!title.trim()) {
      toast.error("❌ Task title cannot be empty or just spaces");
      return;
    }
    
    if (title.trim().length < 5) {
      toast.error("❌ Task title must be at least 5 characters long");
      return;
    }
    
    if (!description) {
      toast.error("❌ Task description is missing from form");
      return;
    }
    
    if (!description.trim()) {
      toast.error("❌ Task description cannot be empty or just spaces");
      return;
    }
    
    // Count words in description
    const wordCount = description.trim().split(/\s+/).filter(word => word.length > 0).length;
    console.log("Description word count:", wordCount);
    
    if (wordCount < 5) {
      toast.error(`❌ Task description must be at least 5 words. Current: ${wordCount} words`);
      return;
    }
    
    if (wordCount > 500) {
      toast.error(`❌ Task description cannot exceed 500 words. Current: ${wordCount} words`);
      return;
    }
    
    if (!deadline) {
      toast.error("❌ Deadline date is missing from form");
      return;
    }
    
    if (!dueDateTime) {
      toast.error("❌ Due date & time is missing from form");
      return;
    }
    
    // Parse JSON strings safely
    let siteIds: string[] = [];
    let assigneeIds: string[] = [];
    
    try {
      siteIds = JSON.parse(selectedSitesStr) as string[];
      console.log("Parsed site IDs:", siteIds);
    } catch (error) {
      console.error("Error parsing site IDs:", error);
      toast.error(`❌ Invalid site selection data: ${error.message}`);
      return;
    }
    
    try {
      if (selectedAssigneesStr && selectedAssigneesStr !== "[]") {
        assigneeIds = JSON.parse(selectedAssigneesStr) as string[];
        console.log("Parsed assignee IDs:", assigneeIds);
      } else {
        console.log("No assignees selected");
        assigneeIds = [];
      }
    } catch (error) {
      console.error("Error parsing assignee IDs:", error);
      toast.error(`❌ Invalid assignee selection data: ${error.message}`);
      return;
    }

    if (siteIds.length === 0) {
      toast.error("❌ Please select at least one site - site selection is empty");
      return;
    }

    // Log the final data being submitted
    console.log("Submitting task with data:", {
      title: title.trim(),
      description: description.trim(),
      wordCount,
      priority,
      taskType,
      deadline,
      dueDateTime,
      siteIds,
      assigneeIds,
      assigneeCount: assigneeIds.length
    });

    // Check each selected site's staffing requirements
    const sitesNeedingAssignees: string[] = [];
    const sitesFullyStaffed: string[] = [];
    const sitesWithAssignees: string[] = [];
    
    siteIds.forEach(siteId => {
      const requirements = siteStaffingRequirements.get(siteId);
      if (requirements) {
        const missingManagers = requirements.requiredManagers - requirements.assignedManagers;
        const missingSupervisors = requirements.requiredSupervisors - requirements.assignedSupervisors;
        
        if (requirements.hasAnyAssignee) {
          sitesWithAssignees.push(requirements.siteName);
        } else if (missingManagers > 0 || missingSupervisors > 0) {
          sitesNeedingAssignees.push(`${requirements.siteName} (needs ${missingManagers}M, ${missingSupervisors}S)`);
        } else {
          sitesFullyStaffed.push(requirements.siteName);
        }
      }
    });

    // If there are sites with assignees, show warning and filter them out
    if (sitesWithAssignees.length > 0) {
      toast.warning(
        <div>
          <p className="font-bold mb-2">⚠️ The following sites already have assignees and will be skipped:</p>
          <ul className="list-disc pl-4 mb-3">
            {sitesWithAssignees.map((site, i) => (
              <li key={i}>{site}</li>
            ))}
          </ul>
        </div>
      );
      
      // Filter out sites that already have assignees
      const filteredSiteIds = siteIds.filter(siteId => {
        const requirements = siteStaffingRequirements.get(siteId);
        return requirements && !requirements.hasAnyAssignee;
      });
      
      if (filteredSiteIds.length === 0) {
        toast.error("❌ No valid sites remaining after filtering out sites with assignees.");
        return;
      }
      
      siteIds = filteredSiteIds;
    }

    // If there are sites needing assignees but no assignees selected
    if (sitesNeedingAssignees.length > 0 && assigneeIds.length === 0) {
      toast.error(
        <div>
          <p className="font-bold mb-2">❌ The following sites need staffing:</p>
          <ul className="list-disc pl-4 mb-3">
            {sitesNeedingAssignees.map((site, i) => (
              <li key={i}>{site}</li>
            ))}
          </ul>
          <p>Please select at least one manager or supervisor to assign to these sites.</p>
        </div>
      );
      return;
    }

    // If all sites are fully staffed, show message and don't create tasks
    if (sitesFullyStaffed.length === siteIds.length) {
      toast.info("ℹ️ All selected sites are fully staffed. No tasks need to be created.");
      return;
    }

    // If there are sites needing assignees and we have assignees selected, create tasks for those sites
    const sitesToCreateTasks = siteIds.filter(siteId => {
      const requirements = siteStaffingRequirements.get(siteId);
      return requirements && !requirements.hasAnyAssignee && (!requirements.isManagerRequirementMet || !requirements.isSupervisorRequirementMet);
    });

    console.log("Sites to create tasks for:", sitesToCreateTasks);

    const success = await createTasksForSites(
      title.trim(), 
      description.trim(), 
      priority, 
      taskType, 
      deadline, 
      dueDateTime, 
      assigneeIds, 
      sitesToCreateTasks
    );
    
    if (success) {
      setAddAssignTaskDialogOpen(false);
      setSelectedSites([]);
      setSelectedAssignees([]);
      setAssigneeType("all");
      
      // Reset form inputs
      const form = e.currentTarget;
      form.reset();
      
      toast.success("✅ Tasks created successfully!");
    }
  };

  // Handle edit task
  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setShowEditDialog(true);
  };

  // Handle task updated
  const handleTaskUpdated = async () => {
    await fetchTasks();
    // Don't close dialog here - it's closed in the EditTaskDialog after successful update
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      await taskService.deleteTask(taskId);
      toast.success("Task deleted successfully!");
      await fetchTasks();
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast.error(error.message || "Failed to delete task");
    }
  };

  const handleUpdateStatus = async (taskId: string, status: Task["status"], userId?: string) => {
  try {
    const updateData: UpdateTaskStatusRequest = userId ? { status, userId } : { status };
    await taskService.updateTaskStatus(taskId, updateData);
    
    // 🎯 Dispatch events
    const task = tasks.find(t => t._id === taskId);
    if (status === 'completed') {
  if (task) {
    createNotificationForSuperadmin(
      `✅ Task Completed: ${task.title}`,
      `Task "${task.title}" at ${task.siteName} completed${userId ? ` by ${getAssigneeName(userId)}` : ''}`,
      'success',
      'medium',
      {
        taskId: task._id,
        siteName: task.siteName,
        taskTitle: task.title,
        completedBy: userId ? getAssigneeName(userId) : 'Current User'
      },
      'task_completed'
    );
  }
}
    if (task) {
      // Always dispatch a general update event
      window.dispatchEvent(new CustomEvent('task-updated', {
        detail: {
          taskId: task._id,
          taskTitle: task.title,
          siteName: task.siteName,
          newStatus: status,
          updatedBy: userId ? getAssigneeName(userId) : 'Current User',
          notificationType: 'task_status_update'
        }
      }));

      // If completed, also dispatch task-completed
      if (status === 'completed') {
        window.dispatchEvent(new CustomEvent('task-completed', {
          detail: {
            taskId: task._id,
            taskTitle: task.title,
            siteName: task.siteName,
            completedBy: userId ? getAssigneeName(userId) : 'Current User'
          }
        }));
      }
    }

    toast.success(userId ? "User status updated!" : "Task status updated!");
    await fetchTasks();
  } catch (error: any) {
    console.error("Error updating task status:", error);
    toast.error(error.message || "Failed to update task status");
  }
};

  // Handle update status for grouped tasks
 const handleUpdateGroupStatus = async (groupedTask: GroupedTask, status: Task["status"]) => {
  try {
    const updatePromises = groupedTask._groupItems.map((task: Task) => 
      taskService.updateTaskStatus(task._id, { status })
    );
    await Promise.all(updatePromises);
    
    // 🎯 Dispatch events for group
    if (status === 'completed') {
      window.dispatchEvent(new CustomEvent('task-completed', {
        detail: {
          taskId: groupedTask._id,
          taskTitle: groupedTask.title,
          siteName: groupedTask.siteName,
          completedBy: 'Current User',
          groupCount: groupedTask._groupCount
        }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('task-updated', {
        detail: {
          taskId: groupedTask._id,
          taskTitle: groupedTask.title,
          siteName: groupedTask.siteName,
          newStatus: status,
          updatedBy: 'Current User',
          notificationType: 'task_status_update'
        }
      }));
    }

    toast.success(`Updated status for ${groupedTask._groupCount} tasks!`);
    await fetchTasks();
  } catch (error: any) {
    console.error("Error updating group status:", error);
    toast.error(error.message || "Failed to update tasks");
  }
};

  // Handle delete for grouped tasks
  const handleDeleteGroup = async (groupedTask: GroupedTask) => {
    if (!confirm(`Are you sure you want to delete ${groupedTask._groupCount} tasks?`)) {
      return;
    }

    try {
      // Delete all tasks in the group
      const deletePromises = groupedTask._groupItems.map((task: Task) => 
        taskService.deleteTask(task._id)
      );
      
      await Promise.all(deletePromises);
      toast.success(`Deleted ${groupedTask._groupCount} tasks successfully!`);
      await fetchTasks();
    } catch (error: any) {
      console.error("Error deleting tasks:", error);
      toast.error(error.message || "Failed to delete tasks");
    }
  };

  const handleAddHourlyUpdate = async (taskId: string) => {
    if (!hourlyUpdateText.trim()) {
      toast.error("Please enter an update");
      return;
    }

    try {
      const updateData: AddHourlyUpdateRequest = {
        content: hourlyUpdateText,
        submittedBy: "current-user"
      };
      
      await taskService.addHourlyUpdate(taskId, updateData);
      setHourlyUpdateText("");
      toast.success("Hourly update added!");
      await fetchTasks();
      setShowUpdatesDialog(false);
    } catch (error: any) {
      console.error("Error adding hourly update:", error);
      toast.error(error.message || "Failed to add update");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, taskId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      if (files.length === 1) {
        await taskService.uploadAttachment(taskId, files[0]);
      } else {
        await taskService.uploadMultipleAttachments(taskId, Array.from(files));
      }
      
      toast.success(`${files.length} file(s) uploaded successfully!`);
      await fetchTasks();
    } catch (error: any) {
      console.error("Error uploading files:", error);
      toast.error(error.message || "Failed to upload files");
    }
  };

  const handleDeleteAttachment = async (taskId: string, attachmentId: string) => {
    try {
      await taskService.deleteAttachment(taskId, attachmentId);
      toast.success("Attachment deleted!");
      await fetchTasks();
    } catch (error: any) {
      console.error("Error deleting attachment:", error);
      toast.error(error.message || "Failed to delete attachment");
    }
  };

  const handleDownloadAttachment = async (attachment: Attachment) => {
    try {
      await taskService.downloadAttachment(attachment);
      toast.success("Attachment downloaded!");
    } catch (error: any) {
      console.error("Error downloading attachment:", error);
      toast.error(error.message || "Failed to download attachment");
    }
  };

  const handlePreviewAttachment = (attachment: Attachment) => {
    taskService.previewAttachment(attachment);
  };

  // Memoized HourlyUpdatesDialog
  const HourlyUpdatesDialog = useMemo(() => {
    return ({ task, open, onOpenChange }: { 
      task: Task; 
      open: boolean; 
      onOpenChange: (open: boolean) => void;
    }) => {
      const hourlyUpdates = task.hourlyUpdates || [];
      
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Hourly Updates for: {task.title || "Untitled Task"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Assignees: {task.assignedUsers?.map(u => u.name).join(', ') || task.assignedToName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Site: {task.siteName}</span>
                </div>
              </div>
              
              {/* Show staffing requirements if available */}
              {getTaskStaffingRequirements(task) && (
                <StaffingRequirementsIndicator requirements={getTaskStaffingRequirements(task)!} />
              )}
              
              <div className="space-y-3">
                {hourlyUpdates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hourly updates yet
                  </div>
                ) : (
                  hourlyUpdates.map((update, index) => (
                    <div key={update.id || `update-${index}`} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{getAssigneeName(update.submittedBy)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(update.timestamp)}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Update #{hourlyUpdates.length - index}
                        </Badge>
                      </div>
                      <p className="text-sm">{update.content}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-4">
                <Textarea
                  placeholder="Add a new hourly update..."
                  value={hourlyUpdateText}
                  onChange={(e) => setHourlyUpdateText(e.target.value)}
                  rows={3}
                  className="mb-3"
                />
                <Button 
                  onClick={() => handleAddHourlyUpdate(task._id)}
                  className="w-full"
                >
                  Add Hourly Update
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    };
  }, [hourlyUpdateText, handleAddHourlyUpdate, getAssigneeName, formatDateTime, getTaskStaffingRequirements]);

  // Memoized AttachmentsDialog
  const AttachmentsDialog = useMemo(() => {
    return ({ task, open, onOpenChange }: { 
      task: Task; 
      open: boolean; 
      onOpenChange: (open: boolean) => void;
    }) => {
      const attachments = task.attachments || [];
      
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments for: {task.title || "Untitled Task"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{task.assignedUsers?.map(u => u.name).join(', ') || task.assignedToName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span className="text-sm">{task.siteName}</span>
                </div>
              </div>
              
              {/* Show staffing requirements if available */}
              {getTaskStaffingRequirements(task) && (
                <StaffingRequirementsIndicator requirements={getTaskStaffingRequirements(task)!} />
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {attachments.length} file(s) attached
                </span>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Files
                      <Input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, task._id)}
                      />
                    </div>
                  </Button>
                </label>
              </div>
              
              <div className="space-y-3">
                {attachments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No attachments yet
                  </div>
                ) : (
                  attachments.map((attachment) => (
                    <div key={attachment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Paperclip className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{attachment.filename || "Unnamed file"}</div>
                            <div className="text-xs text-muted-foreground">
                              {attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : "Unknown size"} • {formatDateTime(attachment.uploadedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewAttachment(attachment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadAttachment(attachment)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttachment(task._id, attachment.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    };
  }, [handleFileUpload, handleDeleteAttachment, handleDownloadAttachment, handlePreviewAttachment, formatDateTime, getTaskStaffingRequirements]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>All Tasks</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredTasks.length} assigned task(s) •
              {filteredTasks.filter(task => !isGroupedTask(task)).length} individual task(s) •
              {filteredTasks.filter(task => isGroupedTask(task)).length} grouped task(s)
            </p>
          </div>
          <div className="flex gap-2">
            <AddAssignTaskDialog
              open={addAssignTaskDialogOpen}
              onOpenChange={setAddAssignTaskDialogOpen}
              onSubmit={handleUnifiedSubmit}
              sites={sites}
              assignees={assignees}
              selectedSites={selectedSites}
              setSelectedSites={setSelectedSites}
              selectedAssignees={selectedAssignees}
              setSelectedAssignees={setSelectedAssignees}
              assigneeType={assigneeType}
              setAssigneeType={setAssigneeType}
              isLoadingAssignees={isLoadingAssignees}
              isLoadingSites={isLoadingSites}
              assignedSupervisorsMap={assignedSupervisorsMap}
              siteStaffingRequirements={siteStaffingRequirements}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchBar 
                  value={searchQuery} 
                  onChange={setSearchQuery} 
                  placeholder="Search assigned tasks by title, description, assignee, site, client, type, priority, status..." 
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sites</SelectItem>
                    {(sites || []).map(site => (
                      <SelectItem key={site._id} value={site._id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Title</TableHead>
                  <TableHead>Site & Client</TableHead>
                  <TableHead>Assignee(s) & Role(s)</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date & Time</TableHead>
                  <TableHead>Updates</TableHead>
                  <TableHead>Attachments</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {searchQuery || selectedSite !== "all" 
                        ? "No assigned tasks match your search criteria" 
                        : "No tasks assigned yet. Create and assign a new task!"
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map((task) => {
                    const isGrouped = isGroupedTask(task);
                    const staffingRequirements = getTaskStaffingRequirements(task);
                    const meetsRequirements = doesTaskMeetRequirements(task);
                    
                    return (
                      <TableRow key={task._id} className={!meetsRequirements ? "bg-amber-50/50" : ""}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              {task.title || "Untitled Task"}
                              {!meetsRequirements && (
                                <AlertTriangle className="h-4 w-4 text-amber-600" title="Missing required roles" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-2">
                              {task.description || "No description"}
                            </div>
                            {isGrouped && (
                              <div className="flex items-center gap-1 mt-1">
                                <Layers className="h-3 w-3 text-primary" />
                                <Badge variant="outline" className="text-xs">
                                  {task._groupCount} task(s) at this site
                                </Badge>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              <span className="font-medium">{task.siteName}</span>
                              {isGrouped && task._groupedSites && task._groupedSites.length > 1 && (
                                <Badge variant="outline" className="text-xs ml-1">
                                  {task._groupedSites.length} sites
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {task.clientName}
                            </div>
                            {/* Show staffing requirements for this site */}
                            {staffingRequirements && staffingRequirements.missingRoles.length > 0 && (
                              <div className="mt-2">
                                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                                  Missing: {staffingRequirements.missingRoles.join(', ')}
                                </Badge>
                              </div>
                            )}
                            {/* Show if there are multiple clients in the group */}
                            {isGrouped && task._groupedClientNames && task._groupedClientNames.length > 1 && (
                              <div className="text-xs text-amber-600 mt-1">
                                Multiple clients
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <Users className="h-4 w-4 text-muted-foreground mt-1" />
                              <div className="flex-1">
                                {isGrouped ? (
                                  <>
                                    {/* Display multiple assignees for grouped tasks */}
                                    <div className="flex flex-wrap gap-1 mb-1">
                                      {getAllAssigneeNames(task).slice(0, 3).map((name, index) => {
                                        const assigneeId = getAllAssigneeIds(task)[index];
                                        const isManager = getAssigneeType(assigneeId) === 'Manager';
                                        return (
                                          <Badge 
                                            key={index} 
                                            variant={isManager ? "default" : "secondary"}
                                            className="text-xs flex items-center gap-1"
                                          >
                                            <User className="h-3 w-3" />
                                            {name}
                                            <span className="ml-1 text-[10px] opacity-70">
                                              {isManager ? 'Mgr' : 'Sup'}
                                            </span>
                                          </Badge>
                                        );
                                      })}
                                      {getAllAssigneeNames(task).length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{getAllAssigneeNames(task).length - 3} more
                                        </Badge>
                                      )}
                                    </div>
                                    {/* Show role distribution */}
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <span>👨‍💼</span>
                                        <span>
                                          {task._managerCount || 0} Managers
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span>👨‍🔧</span>
                                        <span>
                                          {task._supervisorCount || 0} Supervisors
                                        </span>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Display all assignees for single task - with null check */}
                                    <div className="flex flex-wrap gap-1">
                                      {task.assignedUsers && task.assignedUsers.length > 0 ? (
                                        task.assignedUsers.map((user, index) => (
                                          <Badge 
                                            key={index}
                                            variant={user.role === 'manager' ? "default" : "secondary"}
                                            className="text-xs flex items-center gap-1"
                                          >
                                            <User className="h-3 w-3" />
                                            {user.name || 'Unknown'}
                                            <span className="ml-1 text-[10px] opacity-70">
                                              {user.role === 'manager' ? 'Mgr' : user.role === 'supervisor' ? 'Sup' : 'Emp'}
                                            </span>
                                          </Badge>
                                        ))
                                      ) : (
                                        // Fallback for old tasks that still use assignedTo
                                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          {task.assignedToName || 'Unassigned'}
                                          <span className="ml-1 text-[10px] opacity-70">
                                            {getAssigneeType(task.assignedTo)}
                                          </span>
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {/* Show staffing status */}
                                    {staffingRequirements && (
                                      <div className="mt-2">
                                        {staffingRequirements.isManagerRequirementMet ? (
                                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 text-xs">
                                            ✓ Manager requirement met ({staffingRequirements.assignedManagers}/{staffingRequirements.requiredManagers})
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                                            Need {staffingRequirements.requiredManagers - staffingRequirements.assignedManagers} more manager(s)
                                          </Badge>
                                        )}
                                        {staffingRequirements.isSupervisorRequirementMet ? (
                                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 text-xs ml-1">
                                            ✓ Supervisor requirement met ({staffingRequirements.assignedSupervisors}/{staffingRequirements.requiredSupervisors})
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs ml-1">
                                            Need {staffingRequirements.requiredSupervisors - staffingRequirements.assignedSupervisors} more supervisor(s)
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(task.priority) as "default" | "destructive" | "outline" | "secondary"}>
                            {task.priority === "high" && <AlertCircle className="mr-1 h-3 w-3" />}
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(isGrouped ? task._overallStatus : task.status) as "default" | "destructive" | "outline" | "secondary"}>
                            {isGrouped ? task._overallStatus : task.status}
                            {isGrouped && (
                              <span className="ml-1 text-xs">
                                ({task._groupItems.filter((t: Task) => t.status === task._overallStatus).length}/{task._groupCount})
                              </span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDateTime(task.deadline)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {task.dueDateTime ? formatDateTime(task.dueDateTime) : "No due time"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => {
                              setSelectedTask(task);
                              setShowUpdatesDialog(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                            {isGrouped ? task._totalHourlyUpdates : getHourlyUpdatesCount(task)}
                            <span className="sr-only">View updates</span>
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => {
                              setSelectedTask(task);
                              setShowAttachmentsDialog(true);
                            }}
                          >
                            <Paperclip className="h-4 w-4" />
                            {isGrouped ? task._totalAttachments : getAttachmentsCount(task)}
                            <span className="sr-only">View attachments</span>
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {/* Edit Button */}
                            {!isGrouped && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEditTask(task)}
                                title="Edit task details"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {/* View Button */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setSelectedTask(task);
                                setShowViewDialog(true);
                              }}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {/* Complete Button - Only show if not already completed */}
                            {(isGrouped ? task._overallStatus !== "completed" : task.status !== "completed") && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => isGrouped ? handleUpdateGroupStatus(task, "completed") : handleUpdateStatus(task._id, "completed")}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Mark as completed"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {/* Delete Button */}
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => isGrouped ? handleDeleteGroup(task) : handleDeleteTask(task._id)}
                              title="Delete task"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedTask && (
        <>
          <ViewTaskDialog
            task={selectedTask}
            open={showViewDialog}
            onOpenChange={setShowViewDialog}
            getAssigneeType={getAssigneeType}
            getSiteName={getSiteName}
            getClientName={getClientName}
            formatDateTime={formatDateTime}
            getAllAssigneeNames={getAllAssigneeNames}
            getAllAssigneeIds={getAllAssigneeIds}
            siteStaffingRequirements={getTaskStaffingRequirements(selectedTask)}
          />
          
          {!isGroupedTask(selectedTask) && HourlyUpdatesDialog({
            task: selectedTask,
            open: showUpdatesDialog,
            onOpenChange: setShowUpdatesDialog
          })}
          
          {!isGroupedTask(selectedTask) && AttachmentsDialog({
            task: selectedTask,
            open: showAttachmentsDialog,
            onOpenChange: setShowAttachmentsDialog
          })}
        </>
      )}

      {/* Edit Task Dialog */}
      {taskToEdit && (
        <EditTaskDialog
          task={taskToEdit}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onTaskUpdated={handleTaskUpdated}
          sites={sites}
          assignees={assignees}
          assignedSupervisorsMap={assignedSupervisorsMap}
          siteStaffingRequirements={siteStaffingRequirements}
        />
      )}
    </div>
  );
};
 
export default TasksSection;
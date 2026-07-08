import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  File, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye,
  Edit,
  Trash2,
  Upload,
  CalendarDays,
  Clock4,
  User,
  Building,
  Target,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  CheckSquare,
  Square,
  X,
  RefreshCw,
  UserCheck,
  UserCog,
  Loader2,
  Link as LinkIcon,
  Download as DownloadIcon,
  ExternalLink,
  MoreVertical,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { format } from 'date-fns';
import { useRole } from "@/context/RoleContext";
import { trainingApi } from '../../../services/trainingApi';
import { briefingApi } from '../../../services/briefingApi';
import { siteService, Site } from '@/services/SiteService';
import assignTaskService, { AssignTask } from '@/services/assignTaskService';
import axios from "axios";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
// Types
interface TrainingSession {
  _id: string;
  id: string;
  title: string;
  description: string;
  type: 'safety' | 'technical' | 'soft_skills' | 'compliance' | 'other';
  date: string;
  time: string;
  duration: string;
  trainer: string;
  supervisor: string;
  site: string;
  department: string;
  attendees: string[];
  maxAttendees: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  attachments: Attachment[];
  feedback: Feedback[];
  location: string;
  objectives: string[];
  supervisors?: Array<{ id: string; name: string }>;
  managers?: Array<{ id: string; name: string }>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface StaffBriefing {
  _id: string;
  id: string;
  date: string;
  time: string;
  conductedBy: string;
  site: string;
  department: string;
  attendeesCount: number;
  topics: string[];
  keyPoints: string[];
  actionItems: ActionItem[];
  attachments: Attachment[];
  notes: string;
  shift: 'morning' | 'evening' | 'night';
  supervisors?: Array<{ id: string; name: string }>;
  managers?: Array<{ id: string; name: string }>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface Attachment {
  _id?: string;
  id?: string;
  name: string;
  type: 'image' | 'document' | 'video';
  url: string;
  size: string;
  uploadedAt: string;
  isNew?: boolean;
  file?: File;
}

interface Feedback {
  _id?: string;
  id?: string;
  employeeId: string;
  employeeName: string;
  rating: number;
  comment: string;
  submittedAt: string;
}

interface ActionItem {
  _id?: string;
  id?: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
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

interface ExistingAttachment {
  _id?: string;
  name: string;
  type: string;
  url: string;
  size: string;
  uploadedAt?: string;
  isNew?: boolean;
  file?: File;
}

const departments = ['All Departments', 'Housekeeping', 'Security', 'Maintenance', 'Operations', 'Front Desk', 'Administration', 'IT Support'];
const trainingTypes = [
  { value: 'safety', label: 'Safety Training', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  { value: 'technical', label: 'Technical Training', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'soft_skills', label: 'Soft Skills', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { value: 'compliance', label: 'Compliance', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' }
];
const shifts = ['morning', 'evening', 'night'];
const priorities = ['low', 'medium', 'high'];

// Attachment Viewer Component
const AttachmentViewer = memo(({ attachment, onClose }: { attachment: any; onClose: () => void }) => {
  const isImage = attachment.type === 'image' || attachment.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isVideo = attachment.type === 'video' || attachment.url?.match(/\.(mp4|mov|avi|webm)$/i);
  const isPDF = attachment.url?.match(/\.pdf$/i);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{attachment.name}</DialogTitle>
          <DialogDescription>File size: {attachment.size}</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {isImage && (
            <img src={attachment.url} alt={attachment.name} className="max-w-full h-auto rounded-lg" />
          )}
          {isVideo && (
            <video controls className="w-full rounded-lg">
              <source src={attachment.url} />
              Your browser does not support the video tag.
            </video>
          )}
          {isPDF && (
            <iframe src={attachment.url} className="w-full h-[70vh] rounded-lg" title={attachment.name} />
          )}
          {!isImage && !isVideo && !isPDF && (
            <div className="text-center py-12">
              <File className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Preview not available for this file type</p>
              <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                <DownloadIcon className="h-4 w-4" />
                Download File
              </a>
            </div>
          )}
        </div>
        <DialogFooter>
          <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <ExternalLink className="h-4 w-4" />
            Open in New Tab
          </a>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

AttachmentViewer.displayName = 'AttachmentViewer';

// Training Detail Dialog
const TrainingDetailDialog = memo(({ training, open, onClose, onEdit, onUpdateStatus, getStatusBadge, getTypeColor, formatDate, trainingTypes }: any) => {
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);

  if (!training) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Calendar className="h-5 w-5" />
              Training Session Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
              <div className="flex flex-col md:flex-row justify-between items-start gap-3">
                <div>
                  <h2 className="text-xl font-bold">{training.title}</h2>
                  <p className="text-gray-600 mt-1">{training.description}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={getTypeColor(training.type)}>
                    {trainingTypes.find((t: any) => t.value === training.type)?.label || training.type}
                  </Badge>
                  <Badge className={getStatusBadge(training.status)}>
                    {training.status.charAt(0).toUpperCase() + training.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Date & Time</label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(training.date)} at {training.time}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Duration</label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{training.duration}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Trainer</label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{training.trainer}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Location</label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Target className="h-4 w-4 text-gray-400" />
                  <span>{training.location}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Site</label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span>{training.site}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Department</label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>{training.department}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Max Attendees</label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>{training.maxAttendees}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Current Attendees</label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>{training.attendees?.length || 0}</span>
                </div>
              </div>
            </div>

            {(training.supervisors && training.supervisors.length > 0) && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Supervisors
                </h4>
                <div className="flex flex-wrap gap-2">
                  {training.supervisors.map((sup: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {sup.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(training.managers && training.managers.length > 0) && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  Managers
                </h4>
                <div className="flex flex-wrap gap-2">
                  {training.managers.map((mgr: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="flex items-center gap-1">
                      <UserCog className="h-3 w-3" />
                      {mgr.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {training.objectives && training.objectives.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Training Objectives</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {training.objectives.map((obj: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-600">{obj}</li>
                  ))}
                </ul>
              </div>
            )}

            {training.attachments && training.attachments.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Attachments</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {training.attachments.map((att: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => setSelectedAttachment(att)}>
                      <div className="flex items-center gap-2">
                        {att.type === 'image' ? <ImageIcon className="h-4 w-4 text-blue-500" /> :
                         att.type === 'video' ? <Video className="h-4 w-4 text-red-500" /> :
                         <File className="h-4 w-4 text-gray-500" />}
                        <span className="text-sm truncate max-w-[150px]">{att.name}</span>
                      </div>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {training.feedback && training.feedback.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Feedback</h4>
                <div className="space-y-2">
                  {training.feedback.map((fb: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{fb.employeeName}</p>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`h-3 w-3 ${i < fb.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{fb.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Created: {formatDate(training.createdAt)}</span>
                <span>Last Updated: {formatDate(training.updatedAt)}</span>
              </div>
              {training.createdBy && <div className="mt-1">Created By: {training.createdBy}</div>}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={() => { onClose(); onEdit(training); }} className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Edit Training
              </Button>
              <Select value={training.status} onValueChange={(value) => onUpdateStatus(training._id, value)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Update Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {selectedAttachment && <AttachmentViewer attachment={selectedAttachment} onClose={() => setSelectedAttachment(null)} />}
    </>
  );
});

TrainingDetailDialog.displayName = 'TrainingDetailDialog';

// Briefing Detail Dialog
const BriefingDetailDialog = memo(({ briefing, open, onClose, onEdit, onUpdateAction, getShiftBadge, getPriorityBadge, formatDate }: any) => {
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);

  if (!briefing) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
              <MessageSquare className="h-5 w-5" />
              Staff Briefing Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4">
              <div className="flex flex-col md:flex-row justify-between items-start gap-3">
                <div>
                  <h2 className="text-xl font-bold">{briefing.site}</h2>
                  <p className="text-gray-600 mt-1">Conducted by: {briefing.conductedBy}</p>
                </div>
                <Badge className={getShiftBadge(briefing.shift)}>
                  {briefing.shift.charAt(0).toUpperCase() + briefing.shift.slice(1)} Shift
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Date & Time</label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(briefing.date)} at {briefing.time}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Attendees</label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>{briefing.attendeesCount} staff members</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500">Department</label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span>{briefing.department}</span>
                </div>
              </div>
            </div>

            {(briefing.supervisors && briefing.supervisors.length > 0) && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Supervisors
                </h4>
                <div className="flex flex-wrap gap-2">
                  {briefing.supervisors.map((sup: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {sup.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(briefing.managers && briefing.managers.length > 0) && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  Managers
                </h4>
                <div className="flex flex-wrap gap-2">
                  {briefing.managers.map((mgr: any, idx: number) => (
                    <Badge key={idx} variant="outline" className="flex items-center gap-1">
                      <UserCog className="h-3 w-3" />
                      {mgr.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {briefing.topics && briefing.topics.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Topics Discussed</h4>
                <div className="flex flex-wrap gap-2">
                  {briefing.topics.map((topic: string, idx: number) => (
                    <Badge key={idx} variant="outline">{topic}</Badge>
                  ))}
                </div>
              </div>
            )}

            {briefing.keyPoints && briefing.keyPoints.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Key Points</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {briefing.keyPoints.map((point: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-600">{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {briefing.actionItems && briefing.actionItems.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Action Items</h4>
                <div className="space-y-2">
                  {briefing.actionItems.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 mt-1"
                        onClick={() => onUpdateAction(briefing._id, item._id || item.id || '', item.status === 'completed' ? 'pending' : 'completed')}
                      >
                        {item.status === 'completed' ? (
                          <CheckSquare className="h-4 w-4 text-green-500" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                          <span>Assigned to: {item.assignedTo}</span>
                          <span>Due: {formatDate(item.dueDate)}</span>
                        </div>
                      </div>
                      <Badge className={getPriorityBadge(item.priority)}>
                        {item.priority.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {briefing.notes && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Notes</h4>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">{briefing.notes}</p>
                </div>
              </div>
            )}

            {briefing.attachments && briefing.attachments.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Attachments</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {briefing.attachments.map((att: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => setSelectedAttachment(att)}>
                      <div className="flex items-center gap-2">
                        {att.type === 'image' ? <ImageIcon className="h-4 w-4 text-blue-500" /> :
                         att.type === 'video' ? <Video className="h-4 w-4 text-red-500" /> :
                         <File className="h-4 w-4 text-gray-500" />}
                        <span className="text-sm truncate max-w-[150px]">{att.name}</span>
                      </div>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Created: {formatDate(briefing.createdAt)}</span>
                <span>Last Updated: {formatDate(briefing.updatedAt)}</span>
              </div>
              {briefing.createdBy && <div className="mt-1">Created By: {briefing.createdBy}</div>}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={() => { onClose(); onEdit(briefing); }} className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Edit Briefing
              </Button>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {selectedAttachment && <AttachmentViewer attachment={selectedAttachment} onClose={() => setSelectedAttachment(null)} />}
    </>
  );
});

BriefingDetailDialog.displayName = 'BriefingDetailDialog';

// Mobile responsive supervisor selection card
const MobileSupervisorCard = memo(({ supervisor, selected, onToggle }: { supervisor: Supervisor; selected: boolean; onToggle: (id: string) => void }) => {
  return (
    <div onClick={() => onToggle(supervisor._id)} className={`p-3 border rounded-lg mb-2 cursor-pointer transition-colors ${selected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/20'}`}>
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center h-5 w-5 rounded border ${selected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
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
});

MobileSupervisorCard.displayName = 'MobileSupervisorCard';

// Mobile responsive manager selection card
const MobileManagerCard = memo(({ manager, selected, onToggle }: { manager: Manager; selected: boolean; onToggle: (id: string) => void }) => {
  return (
    <div onClick={() => onToggle(manager._id)} className={`p-3 border rounded-lg mb-2 cursor-pointer transition-colors ${selected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/20'}`}>
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center h-5 w-5 rounded border ${selected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
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
});

MobileManagerCard.displayName = 'MobileManagerCard';

// Mobile responsive employee selection card
const MobileEmployeeCard = memo(({ employee, selected, onToggle }: { employee: Employee; selected: boolean; onToggle: (id: string) => void }) => {
  return (
    <div onClick={() => onToggle(employee._id)} className={`p-3 border rounded-lg mb-2 cursor-pointer transition-colors ${selected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/20'}`}>
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center h-5 w-5 rounded border ${selected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
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
});

MobileEmployeeCard.displayName = 'MobileEmployeeCard';

// Mobile responsive training card
const MobileTrainingCard = memo(({ session, onView, onUpdateStatus, onDelete, getTypeColor, getStatusBadge, formatDate, trainingTypes, loading }: any) => {
  const [expanded, setExpanded] = useState(false);
  const canEdit = session.createdBy === session.currentManagerId;
  
  return (
    <Card className="mb-3 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-base">{session.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">Trainer: {session.trainer}</p>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(session)}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                {canEdit && (
                  <>
                    <DropdownMenuItem onClick={() => onUpdateStatus(session._id, 'scheduled')}><Calendar className="h-4 w-4 mr-2" /> Scheduled</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(session._id, 'ongoing')}><Clock className="h-4 w-4 mr-2" /> Ongoing</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(session._id, 'completed')}><CheckCircle className="h-4 w-4 mr-2" /> Completed</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(session._id, 'cancelled')}><XCircle className="h-4 w-4 mr-2" /> Cancelled</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(session._id)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                  </>
                )}
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
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge className={getTypeColor(session.type)}>{trainingTypes.find((t: any) => t.value === session.type)?.label || session.type}</Badge>
          <Badge className={getStatusBadge(session.status)}>{session.status.charAt(0).toUpperCase() + session.status.slice(1)}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
          <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-muted-foreground" /><span className="text-xs">{formatDate(session.date)}</span></div>
          <div className="flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" /><span className="text-xs">{session.time} ({session.duration})</span></div>
          <div className="flex items-center gap-1"><Building className="h-3 w-3 text-muted-foreground" /><span className="text-xs truncate">{session.site}</span></div>
          <div className="flex items-center gap-1"><Users className="h-3 w-3 text-muted-foreground" /><span className="text-xs">{session.attendees?.length || 0}/{session.maxAttendees}</span></div>
        </div>
        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm">{session.description}</p></div>
            <div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm">{session.location}</p></div>
            <div><p className="text-xs text-muted-foreground">Department</p><p className="text-sm">{session.department}</p></div>
            {session.objectives && session.objectives.length > 0 && (
              <div><p className="text-xs text-muted-foreground">Objectives</p><ul className="list-disc pl-4 text-sm">{session.objectives.slice(0, 3).map((obj: string, idx: number) => (<li key={idx} className="text-xs">{obj}</li>))}{session.objectives.length > 3 && (<li className="text-xs text-muted-foreground">+{session.objectives.length - 3} more</li>)}</ul></div>
            )}
            {session.attachments && session.attachments.length > 0 && (
              <div><p className="text-xs text-muted-foreground">Attachments</p><div className="flex flex-wrap gap-1 mt-1">{session.attachments.slice(0, 3).map((att: any, idx: number) => (<Badge key={idx} variant="outline" className="text-xs cursor-pointer" onClick={() => onView(session)}>{att.type === 'image' ? <ImageIcon className="h-3 w-3 mr-1" /> : att.type === 'video' ? <Video className="h-3 w-3 mr-1" /> : <File className="h-3 w-3 mr-1" />}<span className="truncate max-w-[80px]">{att.name}</span></Badge>))}{session.attachments.length > 3 && (<Badge variant="outline" className="text-xs">+{session.attachments.length - 3}</Badge>)}</div></div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

MobileTrainingCard.displayName = 'MobileTrainingCard';

// Mobile responsive briefing card
const MobileBriefingCard = memo(({ briefing, onView, onDelete, onUpdateAction, getShiftBadge, getPriorityBadge, formatDate, loading }: any) => {
  const [expanded, setExpanded] = useState(false);
  const canEdit = briefing.createdBy === briefing.currentManagerId;
  
  return (
    <Card className="mb-3 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1"><h3 className="font-semibold text-base">{briefing.site}</h3><p className="text-xs text-muted-foreground">Conducted by: {briefing.conductedBy}</p></div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(briefing)}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                {canEdit && (
                  <DropdownMenuItem onClick={() => onDelete(briefing._id)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                )}
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
        <div className="flex items-center gap-2 mb-2">
          <Badge className={getShiftBadge(briefing.shift)}>{briefing.shift.charAt(0).toUpperCase() + briefing.shift.slice(1)} Shift</Badge>
          <Badge variant="outline" className="bg-blue-50">{briefing.department}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
          <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-muted-foreground" /><span className="text-xs">{formatDate(briefing.date)}</span></div>
          <div className="flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" /><span className="text-xs">{briefing.time}</span></div>
          <div className="flex items-center gap-1"><Users className="h-3 w-3 text-muted-foreground" /><span className="text-xs">{briefing.attendeesCount} attendees</span></div>
        </div>
        {briefing.topics && briefing.topics.length > 0 && (<div className="flex flex-wrap gap-1 mb-2">{briefing.topics.slice(0, 2).map((topic: string, idx: number) => (<Badge key={idx} variant="outline" className="text-xs">{topic}</Badge>))}{briefing.topics.length > 2 && (<Badge variant="outline" className="text-xs">+{briefing.topics.length - 2}</Badge>)}</div>)}
        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {briefing.supervisors && briefing.supervisors.length > 0 && (
              <div><p className="text-xs text-muted-foreground">Supervisors</p><div className="flex flex-wrap gap-1 mt-1">{briefing.supervisors.map((sup: any, idx: number) => (<Badge key={idx} variant="outline" className="text-xs"><User className="h-3 w-3 mr-1" />{sup.name}</Badge>))}</div></div>
            )}
            {briefing.managers && briefing.managers.length > 0 && (
              <div><p className="text-xs text-muted-foreground">Managers</p><div className="flex flex-wrap gap-1 mt-1">{briefing.managers.map((mgr: any, idx: number) => (<Badge key={idx} variant="outline" className="text-xs"><UserCog className="h-3 w-3 mr-1" />{mgr.name}</Badge>))}</div></div>
            )}
            {briefing.keyPoints && briefing.keyPoints.length > 0 && (
              <div><p className="text-xs text-muted-foreground">Key Points</p><ul className="list-disc pl-4 text-sm">{briefing.keyPoints.map((point: string, idx: number) => (<li key={idx} className="text-xs">{point}</li>))}</ul></div>
            )}
            {briefing.actionItems && briefing.actionItems.length > 0 && (
              <div><p className="text-xs text-muted-foreground mb-2">Action Items</p><div className="space-y-2">{briefing.actionItems.slice(0, 3).map((item: any) => (<div key={item._id || item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateAction(briefing._id, item._id || item.id || '', item.status === 'completed' ? 'pending' : 'completed')}>{item.status === 'completed' ? <CheckSquare className="h-4 w-4 text-green-500" /> : <Square className="h-4 w-4 text-gray-400" />}</Button><div className="flex-1"><p className="text-xs font-medium">{item.description}</p><div className="flex items-center gap-2 text-xs text-muted-foreground"><span>{item.assignedTo}</span><span>•</span><span>Due: {formatDate(item.dueDate)}</span></div></div><Badge className={getPriorityBadge(item.priority)}>{item.priority}</Badge></div>))}{briefing.actionItems.length > 3 && (<p className="text-xs text-muted-foreground text-center">+{briefing.actionItems.length - 3} more items</p>)}</div></div>
            )}
            {briefing.notes && (<div><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm bg-gray-50 p-2 rounded">{briefing.notes}</p></div>)}
            {briefing.attachments && briefing.attachments.length > 0 && (<div><p className="text-xs text-muted-foreground">Attachments</p><div className="flex flex-wrap gap-1 mt-1">{briefing.attachments.map((att: any, idx: number) => (<Badge key={idx} variant="outline" className="text-xs cursor-pointer" onClick={() => onView(briefing)}>{att.type === 'image' ? <ImageIcon className="h-3 w-3 mr-1" /> : att.type === 'video' ? <Video className="h-3 w-3 mr-1" /> : <File className="h-3 w-3 mr-1" />}<span className="truncate max-w-[80px]">{att.name}</span></Badge>))}</div></div>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

MobileBriefingCard.displayName = 'MobileBriefingCard';

const MobileStatCard = memo(({ title, value, subValue, icon: Icon, color = "blue" }: any) => {
  const colorClasses: any = { blue: "bg-blue-100 text-blue-600", green: "bg-green-100 text-green-600", purple: "bg-purple-100 text-purple-600", red: "bg-red-100 text-red-600" };
  return (<Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{title}</p><p className="text-xl font-bold mt-1">{value}</p>{subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}</div><div className={`p-3 rounded-lg ${colorClasses[color]}`}><Icon className="h-5 w-5" /></div></div></CardContent></Card>);
});

MobileStatCard.displayName = 'MobileStatCard';

// ==================== FORM COMPONENTS (Moved outside main component) ====================

// Add Training Form Component
const AddTrainingFormComponent = memo(({ trainingForm, setTrainingForm, addObjective, removeObjective, updateObjective, sites }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 py-4">
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Training Title *</label>
        <Input
          placeholder="Enter training title"
          value={trainingForm.title}
          onChange={(e) => setTrainingForm((prev: any) => ({ ...prev, title: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Training Type</label>
        <Select
          value={trainingForm.type}
          onValueChange={(value: any) => setTrainingForm((prev: any) => ({ ...prev, type: value }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {trainingTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Date *</label>
        <Input
          type="date"
          value={trainingForm.date}
          onChange={(e) => setTrainingForm((prev: any) => ({ ...prev, date: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Time</label>
        <Input
          type="time"
          value={trainingForm.time}
          onChange={(e) => setTrainingForm((prev: any) => ({ ...prev, time: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Duration</label>
        <Input
          placeholder="e.g., 2 hours"
          value={trainingForm.duration}
          onChange={(e) => setTrainingForm((prev: any) => ({ ...prev, duration: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Trainer *</label>
        <Input
          placeholder="Enter trainer name"
          value={trainingForm.trainer}
          onChange={(e) => setTrainingForm((prev: any) => ({ ...prev, trainer: e.target.value }))}
          className="w-full"
        />
      </div>
    </div>
    
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Site *</label>
        <Select
          value={trainingForm.site}
          onValueChange={(value) => setTrainingForm((prev: any) => ({ ...prev, site: value }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select site" />
          </SelectTrigger>
          <SelectContent>
            {sites.map((site: Site) => (
              <SelectItem key={site._id} value={site.name}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Department</label>
        <Select
          value={trainingForm.department}
          onValueChange={(value) => setTrainingForm((prev: any) => ({ ...prev, department: value }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Max Attendees</label>
        <Input
          type="number"
          min="1"
          value={trainingForm.maxAttendees}
          onChange={(e) => setTrainingForm((prev: any) => ({ ...prev, maxAttendees: parseInt(e.target.value) || 1 }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Location</label>
        <Input
          placeholder="Enter location"
          value={trainingForm.location}
          onChange={(e) => setTrainingForm((prev: any) => ({ ...prev, location: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Training Objectives</label>
        <div className="space-y-2">
          {trainingForm.objectives.map((objective: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Objective ${index + 1}`}
                value={objective}
                onChange={(e) => updateObjective(index, e.target.value)}
                className="flex-1"
              />
              {trainingForm.objectives.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeObjective(index)}
                  className="flex-shrink-0"
                >
                  <XCircle className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addObjective}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Objective
          </Button>
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Description</label>
        <Textarea
          placeholder="Enter training description"
          value={trainingForm.description}
          onChange={(e) => setTrainingForm((prev: any) => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="w-full"
        />
      </div>
    </div>
  </div>
));

AddTrainingFormComponent.displayName = 'AddTrainingFormComponent';

// Add Briefing Form Component
const AddBriefingFormComponent = memo(({ briefingForm, setBriefingForm, addTopic, removeTopic, updateTopic, addKeyPoint, removeKeyPoint, updateKeyPoint, sites }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 py-4">
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Date *</label>
        <Input
          type="date"
          value={briefingForm.date}
          onChange={(e) => setBriefingForm((prev: any) => ({ ...prev, date: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Time</label>
        <Input
          type="time"
          value={briefingForm.time}
          onChange={(e) => setBriefingForm((prev: any) => ({ ...prev, time: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Shift</label>
        <Select
          value={briefingForm.shift}
          onValueChange={(value: any) => setBriefingForm((prev: any) => ({ ...prev, shift: value }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select shift" />
          </SelectTrigger>
          <SelectContent>
            {shifts.map(shift => (
              <SelectItem key={shift} value={shift}>
                {shift.charAt(0).toUpperCase() + shift.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Conducted By *</label>
        <Input
          placeholder="Enter conductor name"
          value={briefingForm.conductedBy}
          onChange={(e) => setBriefingForm((prev: any) => ({ ...prev, conductedBy: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Site *</label>
        <Select
          value={briefingForm.site}
          onValueChange={(value) => setBriefingForm((prev: any) => ({ ...prev, site: value }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select site" />
          </SelectTrigger>
          <SelectContent>
            {sites.map((site: Site) => (
              <SelectItem key={site._id} value={site.name}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Department</label>
        <Select
          value={briefingForm.department}
          onValueChange={(value) => setBriefingForm((prev: any) => ({ ...prev, department: value }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Number of Attendees</label>
        <Input
          type="number"
          min="0"
          value={briefingForm.attendeesCount}
          onChange={(e) => setBriefingForm((prev: any) => ({ ...prev, attendeesCount: parseInt(e.target.value) || 0 }))}
          className="w-full"
        />
      </div>
    </div>
    
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Topics Discussed</label>
        <div className="space-y-2">
          {briefingForm.topics.map((topic: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Topic ${index + 1}`}
                value={topic}
                onChange={(e) => updateTopic(index, e.target.value)}
                className="flex-1"
              />
              {briefingForm.topics.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTopic(index)}
                  className="flex-shrink-0"
                >
                  <XCircle className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTopic}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Topic
          </Button>
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Key Points</label>
        <div className="space-y-2">
          {briefingForm.keyPoints.map((point: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Key point ${index + 1}`}
                value={point}
                onChange={(e) => updateKeyPoint(index, e.target.value)}
                className="flex-1"
              />
              {briefingForm.keyPoints.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeKeyPoint(index)}
                  className="flex-shrink-0"
                >
                  <XCircle className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addKeyPoint}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Key Point
          </Button>
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Notes</label>
        <Textarea
          placeholder="Enter additional notes"
          value={briefingForm.notes}
          onChange={(e) => setBriefingForm((prev: any) => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="w-full"
        />
      </div>
    </div>
  </div>
));

AddBriefingFormComponent.displayName = 'AddBriefingFormComponent';

// Edit Training Form Component
const EditTrainingFormComponent = memo(({ editTrainingForm, setEditTrainingForm, addEditObjective, removeEditObjective, updateEditObjective, sites }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 py-4">
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Training Title *</label>
        <Input
          placeholder="Enter training title"
          value={editTrainingForm.title}
          onChange={(e) => setEditTrainingForm((prev: any) => ({ ...prev, title: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Training Type</label>
        <Select
          value={editTrainingForm.type}
          onValueChange={(value: any) => setEditTrainingForm((prev: any) => ({ ...prev, type: value }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {trainingTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Date *</label>
        <Input
          type="date"
          value={editTrainingForm.date}
          onChange={(e) => setEditTrainingForm((prev: any) => ({ ...prev, date: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Time</label>
        <Input
          type="time"
          value={editTrainingForm.time}
          onChange={(e) => setEditTrainingForm((prev: any) => ({ ...prev, time: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Duration</label>
        <Input
          placeholder="e.g., 2 hours"
          value={editTrainingForm.duration}
          onChange={(e) => setEditTrainingForm((prev: any) => ({ ...prev, duration: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Trainer *</label>
        <Input
          placeholder="Enter trainer name"
          value={editTrainingForm.trainer}
          onChange={(e) => setEditTrainingForm((prev: any) => ({ ...prev, trainer: e.target.value }))}
          className="w-full"
        />
      </div>
    </div>
    
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Site *</label>
        <Select
          value={editTrainingForm.site}
          onValueChange={(value) => setEditTrainingForm((prev: any) => ({ ...prev, site: value }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select site" />
          </SelectTrigger>
          <SelectContent>
            {sites.map((site: Site) => (
              <SelectItem key={site._id} value={site.name}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Department</label>
        <Select
          value={editTrainingForm.department}
          onValueChange={(value) => setEditTrainingForm((prev: any) => ({ ...prev, department: value }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Max Attendees</label>
        <Input
          type="number"
          min="1"
          value={editTrainingForm.maxAttendees}
          onChange={(e) => setEditTrainingForm((prev: any) => ({ ...prev, maxAttendees: parseInt(e.target.value) || 1 }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Location</label>
        <Input
          placeholder="Enter location"
          value={editTrainingForm.location}
          onChange={(e) => setEditTrainingForm((prev: any) => ({ ...prev, location: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Training Objectives</label>
        <div className="space-y-2">
          {editTrainingForm.objectives.map((objective: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Objective ${index + 1}`}
                value={objective}
                onChange={(e) => updateEditObjective(index, e.target.value)}
                className="flex-1"
              />
              {editTrainingForm.objectives.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEditObjective(index)}
                  className="flex-shrink-0"
                >
                  <XCircle className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEditObjective}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Objective
          </Button>
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Description</label>
        <Textarea
          placeholder="Enter training description"
          value={editTrainingForm.description}
          onChange={(e) => setEditTrainingForm((prev: any) => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="w-full"
        />
      </div>
    </div>
  </div>
));

EditTrainingFormComponent.displayName = 'EditTrainingFormComponent';

// Edit Briefing Form Component
const EditBriefingFormComponent = memo(({ editBriefingForm, setEditBriefingForm, addEditTopic, removeEditTopic, updateEditTopic, addEditKeyPoint, removeEditKeyPoint, updateEditKeyPoint, sites }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 py-4">
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Date *</label>
        <Input
          type="date"
          value={editBriefingForm.date}
          onChange={(e) => setEditBriefingForm((prev: any) => ({ ...prev, date: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Time</label>
        <Input
          type="time"
          value={editBriefingForm.time}
          onChange={(e) => setEditBriefingForm((prev: any) => ({ ...prev, time: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Shift</label>
        <Select
          value={editBriefingForm.shift}
          onValueChange={(value: any) => setEditBriefingForm((prev: any) => ({ ...prev, shift: value }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select shift" />
          </SelectTrigger>
          <SelectContent>
            {shifts.map(shift => (
              <SelectItem key={shift} value={shift}>
                {shift.charAt(0).toUpperCase() + shift.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Conducted By *</label>
        <Input
          placeholder="Enter conductor name"
          value={editBriefingForm.conductedBy}
          onChange={(e) => setEditBriefingForm((prev: any) => ({ ...prev, conductedBy: e.target.value }))}
          className="w-full"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Site *</label>
        <Select
          value={editBriefingForm.site}
          onValueChange={(value) => setEditBriefingForm((prev: any) => ({ ...prev, site: value }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select site" />
          </SelectTrigger>
          <SelectContent>
            {sites.map((site: Site) => (
              <SelectItem key={site._id} value={site.name}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Department</label>
        <Select
          value={editBriefingForm.department}
          onValueChange={(value) => setEditBriefingForm((prev: any) => ({ ...prev, department: value }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Number of Attendees</label>
        <Input
          type="number"
          min="0"
          value={editBriefingForm.attendeesCount}
          onChange={(e) => setEditBriefingForm((prev: any) => ({ ...prev, attendeesCount: parseInt(e.target.value) || 0 }))}
          className="w-full"
        />
      </div>
    </div>
    
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Topics Discussed</label>
        <div className="space-y-2">
          {editBriefingForm.topics.map((topic: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Topic ${index + 1}`}
                value={topic}
                onChange={(e) => updateEditTopic(index, e.target.value)}
                className="flex-1"
              />
              {editBriefingForm.topics.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEditTopic(index)}
                  className="flex-shrink-0"
                >
                  <XCircle className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEditTopic}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Topic
          </Button>
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Key Points</label>
        <div className="space-y-2">
          {editBriefingForm.keyPoints.map((point: string, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Key point ${index + 1}`}
                value={point}
                onChange={(e) => updateEditKeyPoint(index, e.target.value)}
                className="flex-1"
              />
              {editBriefingForm.keyPoints.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEditKeyPoint(index)}
                  className="flex-shrink-0"
                >
                  <XCircle className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEditKeyPoint}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Key Point
          </Button>
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Notes</label>
        <Textarea
          placeholder="Enter additional notes"
          value={editBriefingForm.notes}
          onChange={(e) => setEditBriefingForm((prev: any) => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="w-full"
        />
      </div>
    </div>
  </div>
));

EditBriefingFormComponent.displayName = 'EditBriefingFormComponent';

// Attachments Section Component
const AttachmentsSection = memo(({ attachments, onUpload, onRemove, fileInputRef, title = "Attachments" }: any) => (
  <div className="py-4 border-t dark:border-gray-700">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div>
        <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Upload photos, documents, or other files
        </p>
      </div>
      <div>
        <input
          type="file"
          ref={fileInputRef}
          multiple
          onChange={onUpload}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full sm:w-auto"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </Button>
      </div>
    </div>
    
    {attachments.length > 0 && (
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {attachments.map((file: any, index: number) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {file.type === 'image' || file.type?.startsWith('image/') ? (
                <ImageIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
              ) : file.type === 'video' || file.type?.startsWith('video/') ? (
                <Video className="h-5 w-5 text-red-500 flex-shrink-0" />
              ) : (
                <File className="h-5 w-5 text-gray-500 flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{file.size}</p>
              </div>
              {file.url && !file.isNew && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(file.url, '_blank')}
                  className="h-8 w-8 p-0"
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="flex-shrink-0"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>
    )}
  </div>
));

AttachmentsSection.displayName = 'AttachmentsSection';

// Supervisors Multi-Select Component
const SupervisorsMultiSelect = memo(({ selected, onToggle, searchQuery, setSearchQuery, disabled, filteredSupervisorsList }: any) => (
  <div className="py-4 border-t dark:border-gray-700">
    <div className="mb-4">
      <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
        <UserCheck className="h-5 w-5" />
        Supervisors *
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        Select supervisors assigned to this site
      </p>
    </div>
    <div className="space-y-2">
      <Input
        placeholder="Search supervisors..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-9"
        disabled={disabled}
      />
      <div className="border rounded-lg max-h-40 overflow-y-auto p-2">
        {filteredSupervisorsList.length > 0 ? (
          filteredSupervisorsList.map((sup: Supervisor) => (
            <div
              key={sup._id}
              onClick={() => onToggle(sup._id)}
              className={`p-3 border rounded-lg mb-2 cursor-pointer transition-colors ${
                selected.includes(sup._id) ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center h-5 w-5 rounded border ${
                  selected.includes(sup._id) ? 'bg-primary border-primary' : 'border-gray-300'
                }`}>
                  {selected.includes(sup._id) && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{sup.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{sup.department}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            {disabled ? "Select a site first" : "No supervisors available for this site"}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected.map((id: string) => {
            const sup = filteredSupervisorsList.find((s: Supervisor) => s._id === id);
            return sup ? (
              <Badge key={id} variant="secondary" className="flex items-center gap-1 text-xs">
                {sup.name}
                <X className="h-3 w-3 cursor-pointer" onClick={() => onToggle(id)} />
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  </div>
));

SupervisorsMultiSelect.displayName = 'SupervisorsMultiSelect';

// Managers Multi-Select Component
const ManagersMultiSelect = memo(({ selected, onToggle, searchQuery, setSearchQuery, disabled, filteredManagersList }: any) => (
  <div className="py-4 border-t dark:border-gray-700">
    <div className="mb-4">
      <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
        <UserCog className="h-5 w-5" />
        Managers *
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        Select managers assigned to this site
      </p>
    </div>
    <div className="space-y-2">
      <Input
        placeholder="Search managers..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-9"
        disabled={disabled}
      />
      <div className="border rounded-lg max-h-40 overflow-y-auto p-2">
        {filteredManagersList.length > 0 ? (
          filteredManagersList.map((mgr: Manager) => (
            <div
              key={mgr._id}
              onClick={() => onToggle(mgr._id)}
              className={`p-3 border rounded-lg mb-2 cursor-pointer transition-colors ${
                selected.includes(mgr._id) ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center h-5 w-5 rounded border ${
                  selected.includes(mgr._id) ? 'bg-primary border-primary' : 'border-gray-300'
                }`}>
                  {selected.includes(mgr._id) && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{mgr.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{mgr.department}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            {disabled ? "Select a site first" : "No managers available for this site"}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected.map((id: string) => {
            const mgr = filteredManagersList.find((m: Manager) => m._id === id);
            return mgr ? (
              <Badge key={id} variant="secondary" className="flex items-center gap-1 text-xs">
                {mgr.name}
                <X className="h-3 w-3 cursor-pointer" onClick={() => onToggle(id)} />
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  </div>
));

ManagersMultiSelect.displayName = 'ManagersMultiSelect';

// Employees Multi-Select Component
const EmployeesMultiSelect = memo(({ selected, onToggle, searchQuery, setSearchQuery, disabled, filteredEmployeesList }: any) => (
  <div className="py-4 border-t dark:border-gray-700">
    <div className="mb-4">
      <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" />
        Employees
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        Select employees to assign to this training
      </p>
    </div>
    <div className="space-y-2">
      <Input
        placeholder="Search employees..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-9"
        disabled={disabled}
      />
      <div className="border rounded-lg max-h-40 overflow-y-auto p-2">
        {filteredEmployeesList.length > 0 ? (
          filteredEmployeesList.filter((emp: Employee) => emp.status === "active").map((emp: Employee) => (
            <div
              key={emp._id}
              onClick={() => onToggle(emp._id)}
              className={`p-3 border rounded-lg mb-2 cursor-pointer transition-colors ${
                selected.includes(emp._id) ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center h-5 w-5 rounded border ${
                  selected.includes(emp._id) ? 'bg-primary border-primary' : 'border-gray-300'
                }`}>
                  {selected.includes(emp._id) && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{emp.name}</h4>
                    <Badge variant="outline" className="text-xs">{emp.employeeId}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{emp.position}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No employees available
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected.map((id: string) => {
            const emp = filteredEmployeesList.find((e: Employee) => e._id === id);
            return emp ? (
              <Badge key={id} variant="secondary" className="flex items-center gap-1 text-xs">
                {emp.name}
                <X className="h-3 w-3 cursor-pointer" onClick={() => onToggle(id)} />
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  </div>
));

EmployeesMultiSelect.displayName = 'EmployeesMultiSelect';

// Action Items Section Component
const ActionItemsSection = memo(({ actionItems, onAdd, onRemove, onUpdate }: any) => (
  <div className="py-4 border-t dark:border-gray-700">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div>
        <h3 className="text-base sm:text-lg font-semibold">Action Items</h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Add tasks assigned during the briefing
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onAdd}
        className="w-full sm:w-auto"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Action Item
      </Button>
    </div>
    
    {actionItems.map((item: any, index: number) => (
      <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium mb-1 block">Description</label>
          <Input
            placeholder="Task description"
            value={item.description}
            onChange={(e) => onUpdate(index, 'description', e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Assigned To</label>
          <Input
            placeholder="Person/Team"
            value={item.assignedTo}
            onChange={(e) => onUpdate(index, 'assignedTo', e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Due Date</label>
          <Input
            type="date"
            value={item.dueDate}
            onChange={(e) => onUpdate(index, 'dueDate', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-4">
          <div className="flex-1">
            <label className="text-xs font-medium mb-1 block">Priority</label>
            <Select
              value={item.priority}
              onValueChange={(value: any) => onUpdate(index, 'priority', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map(priority => (
                  <SelectItem key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="mb-0.5"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    ))}
  </div>
));

ActionItemsSection.displayName = 'ActionItemsSection';

// ==================== MAIN COMPONENT ====================

const TrainingBriefingSectionManager: React.FC = () => {
  const { user: authUser, isAuthenticated } = useRole();
  const [activeTab, setActiveTab] = useState<'training' | 'briefing'>('training');
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [staffBriefings, setStaffBriefings] = useState<StaffBriefing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [showAddBriefing, setShowAddBriefing] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<TrainingSession | null>(null);
  const [selectedBriefing, setSelectedBriefing] = useState<StaffBriefing | null>(null);
  const [editingTraining, setEditingTraining] = useState<TrainingSession | null>(null);
  const [editingBriefing, setEditingBriefing] = useState<StaffBriefing | null>(null);
  const [showEditTrainingDialog, setShowEditTrainingDialog] = useState(false);
  const [showEditBriefingDialog, setShowEditBriefingDialog] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState({
    sites: true,
    supervisors: true,
    managers: true,
    employees: true,
    trainings: true,
    briefings: true
  });
  
  // Edit mode attachments
  const [editTrainingAttachments, setEditTrainingAttachments] = useState<ExistingAttachment[]>([]);
  const [editBriefingAttachments, setEditBriefingAttachments] = useState<ExistingAttachment[]>([]);
  const [editTrainingNewFiles, setEditTrainingNewFiles] = useState<File[]>([]);
  const [editBriefingNewFiles, setEditBriefingNewFiles] = useState<File[]>([]);
  const editTrainingFileInputRef = useRef<HTMLInputElement>(null);
  const editBriefingFileInputRef = useRef<HTMLInputElement>(null);
  
  // Data states
  const [sites, setSites] = useState<Site[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Manager's assigned sites
  const managerId = authUser?._id || authUser?.id || "";
  const managerName = authUser?.name || "Manager";
  const [managerAssignedSites, setManagerAssignedSites] = useState<string[]>([]);
  const [managerAssignedSiteNames, setManagerAssignedSiteNames] = useState<string[]>([]);
  
  // Filtered states based on selected site
  const [filteredSupervisors, setFilteredSupervisors] = useState<Supervisor[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<Manager[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  
  // Multi-select states
 
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [supervisorSearchQuery, setSupervisorSearchQuery] = useState("");
  const [managerSearchQuery, setManagerSearchQuery] = useState("");
  
  // Edit mode multi-select states
  const [editSelectedSupervisors, setEditSelectedSupervisors] = useState<string[]>([]);
  
  const [editManagerSearchQuery, setEditManagerSearchQuery] = useState("");
  
  // Form states for training
  const [trainingForm, setTrainingForm] = useState({
    title: '',
    description: '',
    type: 'safety' as const,
    date: '',
    time: '',
    duration: '',
    trainer: '',
    site: '',
    department: 'All Departments',
    maxAttendees: 20,
    location: '',
    objectives: [] as string[]
  });
  
  // Edit training form state
  const [editTrainingForm, setEditTrainingForm] = useState({
    title: '',
    description: '',
    type: 'safety' as const,
    date: '',
    time: '',
    duration: '',
    trainer: '',
    site: '',
    department: 'All Departments',
    maxAttendees: 20,
    location: '',
    objectives: [] as string[]
  });
  
  // Form states for briefing
  const [briefingForm, setBriefingForm] = useState({
    date: '',
    time: '',
    conductedBy: '',
    site: '',
    department: '',
    attendeesCount: 0,
    topics: [] as string[],
    keyPoints: [] as string[],
    actionItems: [] as Omit<ActionItem, '_id' | 'id'>[],
    notes: '',
    shift: 'morning' as const
  });
  
  // Edit briefing form state
  const [editBriefingForm, setEditBriefingForm] = useState({
    date: '',
    time: '',
    conductedBy: '',
    site: '',
    department: '',
    attendeesCount: 0,
    topics: [] as string[],
    keyPoints: [] as string[],
    actionItems: [] as ActionItem[],
    notes: '',
    shift: 'morning' as const
  });
  
  // Mobile responsive state
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Get manager's assigned sites from tasks

  // Get ALL sites - no filtering (single manager sees everything)
const fetchManagerAssignedSites = useCallback(async () => {
  try {
    console.log('🔍 Fetching all sites for manager...');
    const allSites = await siteService.getAllSites();
    const siteIds = allSites.map(s => s._id);
    const siteNames = allSites.map(s => s.name);
    
    setManagerAssignedSites(siteIds);
    setManagerAssignedSiteNames(siteNames);
    
    console.log(`✅ Loaded ${siteIds.length} sites`);
    
    // ✅ If no sites found, still stop loading
    if (siteIds.length === 0) {
      setLoadingData({
        sites: false,
        supervisors: false,
        managers: false,
        employees: false,
        trainings: false,
        briefings: false
      });
    }
  } catch (error) {
    console.error("Error fetching sites:", error);
    toast.error("Failed to load sites");
    setLoadingData({
      sites: false,
      supervisors: false,
      managers: false,
      employees: false,
      trainings: false,
      briefings: false
    });
  }
}, []);
 // ✅ Load sites on mount (no dependency on managerId)
useEffect(() => {
  fetchManagerAssignedSites();
}, []);
  
  // Fetch data after manager assigned sites are loaded
  // Fetch data after manager assigned sites are loaded
useEffect(() => {
  if (managerAssignedSites.length > 0) {
    fetchAllData();
  } else {
    // ✅ If no sites assigned, we already set loadingData to false in fetchManagerAssignedSites
    // But if we get here with empty sites, make sure loading stops
    setLoadingData(prev => ({
      ...prev,
      sites: false,
      supervisors: false,
      managers: false,
      employees: false,
      trainings: false,
      briefings: false
    }));
  }
}, [managerAssignedSites]);
  
  // Fetch data when filters change
  useEffect(() => {
    if (managerAssignedSites.length > 0) {
      fetchTrainings();
      fetchBriefings();
    }
  }, [searchTerm, filterDepartment, filterStatus, managerAssignedSites]);
  
  // Filter data when site changes for forms
  useEffect(() => {
    if (trainingForm.site) {
      filterDataBySite(trainingForm.site);
    } else if (briefingForm.site) {
      filterDataBySite(briefingForm.site);
    }
  }, [trainingForm.site, briefingForm.site, supervisors, managers, employees]);
  
  // Filter data when site changes for edit forms
  useEffect(() => {
    if (editTrainingForm.site) {
      filterDataBySiteForEdit(editTrainingForm.site);
    } else if (editBriefingForm.site) {
      filterDataBySiteForEdit(editBriefingForm.site);
    }
  }, [editTrainingForm.site, editBriefingForm.site, supervisors, managers, employees]);
  
  const filterDataBySiteForEdit = (siteName: string) => {
    const selectedSite = sites.find(site => site.name === siteName);
    if (!selectedSite) {
      setFilteredSupervisors([]);
      setFilteredManagers([]);
      setFilteredEmployees([]);
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
  };
  
  const fetchAllData = async () => {
    try {
      setLoadingData({
        sites: true,
        supervisors: true,
        managers: true,
        employees: true,
        trainings: true,
        briefings: true
      });
      await Promise.all([
        fetchSites(),
        fetchSupervisorsAndManagers(),
        fetchEmployees(),
        fetchTrainings(),
        fetchBriefings()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoadingData({
        sites: false,
        supervisors: false,
        managers: false,
        employees: false,
        trainings: false,
        briefings: false
      });
    }
  };
  
 const fetchSites = async () => {
  try {
    const data = await siteService.getAllSites();
    setSites(data); // ✅ No filtering - show ALL sites
    console.log("📋 All sites loaded:", data.length);
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
        if (managerAssignedSites.includes(task.siteId)) {
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
      
      setSupervisors(Array.from(supervisorMap.values()));
      setManagers(Array.from(managerMap.values()));
      console.log("Fetched supervisors:", supervisorMap.size, "managers:", managerMap.size);
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
      // ✅ No site filtering - show ALL active employees
      const uniqueEmployees = Array.from(
        new Map(employeesData.map((emp: Employee) => [emp._id, emp])).values()
      ).filter(emp => emp.status === "active");
      setEmployees(uniqueEmployees);
      console.log("📋 All employees loaded:", uniqueEmployees.length);
    }
  } catch (error) {
    console.error("Error fetching employees:", error);
    toast.error("Failed to load employees");
  }
};
  
  const fetchTrainings = async () => {
    try {
      setLoadingData(prev => ({ ...prev, trainings: true }));
      const params: any = {
        search: searchTerm,
        department: filterDepartment === 'all' ? '' : filterDepartment,
        status: filterStatus === 'all' ? '' : filterStatus
      };
      const response = await trainingApi.getAllTrainings(params);
      if (response.success) {
        const filteredTrainings = response.trainings.filter((training: TrainingSession) => 
          managerAssignedSiteNames.includes(training.site)
        );
        setTrainingSessions(filteredTrainings);
        console.log("Filtered trainings for manager:", filteredTrainings.length);
      }
    } catch (error: any) {
      console.error("Error fetching trainings:", error);
      toast.error("Failed to load training sessions");
    } finally {
      setLoadingData(prev => ({ ...prev, trainings: false }));
    }
  };
  
  const fetchBriefings = async () => {
    try {
      setLoadingData(prev => ({ ...prev, briefings: true }));
      const params: any = {
        search: searchTerm,
        department: filterDepartment === 'all' ? '' : filterDepartment
      };
      const response = await briefingApi.getAllBriefings(params);
      if (response.success) {
        const filteredBriefings = response.briefings.filter((briefing: StaffBriefing) => 
          managerAssignedSiteNames.includes(briefing.site)
        );
        setStaffBriefings(filteredBriefings);
        console.log("Filtered briefings for manager:", filteredBriefings.length);
      }
    } catch (error: any) {
      console.error("Error fetching briefings:", error);
      toast.error("Failed to load staff briefings");
    } finally {
      setLoadingData(prev => ({ ...prev, briefings: false }));
    }
  };
  
  const filterDataBySite = (siteName: string) => {
    const selectedSite = sites.find(site => site.name === siteName);
    if (!selectedSite) {
      setFilteredSupervisors([]);
      setFilteredManagers([]);
      setFilteredEmployees([]);
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
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    toast.success(`${files.length} file(s) added`);
  };
  
  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    toast.info('File removed');
  };
  
  // Edit mode file handlers
  const handleEditTrainingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map(file => ({
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' as const : 
            file.type.startsWith('video/') ? 'video' as const : 'document' as const,
      url: URL.createObjectURL(file),
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      isNew: true,
      file: file
    }));
    setEditTrainingAttachments(prev => [...prev, ...newAttachments]);
    setEditTrainingNewFiles(prev => [...prev, ...files]);
    toast.success(`${files.length} file(s) added to training`);
  };
  
  const handleEditBriefingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map(file => ({
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' as const : 
            file.type.startsWith('video/') ? 'video' as const : 'document' as const,
      url: URL.createObjectURL(file),
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      isNew: true,
      file: file
    }));
    setEditBriefingAttachments(prev => [...prev, ...newAttachments]);
    setEditBriefingNewFiles(prev => [...prev, ...files]);
    toast.success(`${files.length} file(s) added to briefing`);
  };
  
  const removeEditTrainingAttachment = (index: number) => {
    const attachment = editTrainingAttachments[index];
    if (attachment.isNew && attachment.url) {
      URL.revokeObjectURL(attachment.url);
    }
    setEditTrainingAttachments(prev => prev.filter((_, i) => i !== index));
    if (attachment.isNew && attachment.file) {
      setEditTrainingNewFiles(prev => prev.filter(f => f !== attachment.file));
    }
    toast.info('File removed');
  };
  
  const removeEditBriefingAttachment = (index: number) => {
    const attachment = editBriefingAttachments[index];
    if (attachment.isNew && attachment.url) {
      URL.revokeObjectURL(attachment.url);
    }
    setEditBriefingAttachments(prev => prev.filter((_, i) => i !== index));
    if (attachment.isNew && attachment.file) {
      setEditBriefingNewFiles(prev => prev.filter(f => f !== attachment.file));
    }
    toast.info('File removed');
  };
  
  // Supervisor selection handlers
  const handleSupervisorToggle = (supervisorId: string) => {
    setSelectedSupervisors(prev => {
      if (prev.includes(supervisorId)) {
        return prev.filter(id => id !== supervisorId);
      } else {
        return [...prev, supervisorId];
      }
    });
  };
  
  // Manager selection handlers
  const handleManagerToggle = (managerId: string) => {
    setSelectedManagers(prev => {
      if (prev.includes(managerId)) {
        return prev.filter(id => id !== managerId);
      } else {
        return [...prev, managerId];
      }
    });
  };
  
  // Employee selection handlers
  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };
  
  // Edit mode supervisor selection handlers
  const handleEditSupervisorToggle = (supervisorId: string) => {
    setEditSelectedSupervisors(prev => {
      if (prev.includes(supervisorId)) {
        return prev.filter(id => id !== supervisorId);
      } else {
        return [...prev, supervisorId];
      }
    });
  };
  
  // Edit mode manager selection handlers
  const handleEditManagerToggle = (managerId: string) => {
    setEditSelectedManagers(prev => {
      if (prev.includes(managerId)) {
        return prev.filter(id => id !== managerId);
      } else {
        return [...prev, managerId];
      }
    });
  };
  
  // Add training session
  const handleAddTraining = async () => {
  if (!trainingForm.title || !trainingForm.date || !trainingForm.trainer) {
    toast.error('Please fill in all required fields');
    return;
  }
  
  // ✅ REMOVED: Supervisor and Manager validation
  // No longer require supervisors or managers
  
  try {
    setLoading(true);
    
    // ✅ supervisors and managers can be empty arrays
    const supervisorsList = [];
    const managersList = [];
    
    const trainingData = {
      title: trainingForm.title,
      description: trainingForm.description,
      type: trainingForm.type,
      date: trainingForm.date,
      time: trainingForm.time,
      duration: trainingForm.duration,
      trainer: trainingForm.trainer,
      site: trainingForm.site,
      department: trainingForm.department,
      maxAttendees: trainingForm.maxAttendees,
      location: trainingForm.location,
      objectives: trainingForm.objectives.filter(obj => obj.trim() !== ''),
      supervisors: supervisorsList,
      managers: managersList,
      attendees: selectedEmployees
    };
    
    const response = await trainingApi.createTraining(trainingData, attachments);
    
    if (response.success) {
      toast.success('Training session added successfully');
      await fetchTrainings();
      resetTrainingForm();
      setAttachments([]);
      setShowAddTraining(false);
    } else {
      throw new Error(response.message || 'Failed to create training');
    }
  } catch (error: any) {
    console.error('Error creating training:', error);
    toast.error(error.response?.data?.message || error.message || 'Error adding training session');
  } finally {
    setLoading(false);
  }
};
  
  // Add staff briefing
const handleAddBriefing = async () => {
  if (!briefingForm.date || !briefingForm.conductedBy || !briefingForm.site) {
    toast.error('Please fill in all required fields');
    return;
  }
  
  // ✅ REMOVED: Supervisor and Manager validation
  // No longer require supervisors or managers
  
  try {
    setLoading(true);
    
    // ✅ supervisors and managers can be empty arrays
    const supervisorsList = [];
    const managersList = [];
    
    const actionItems = briefingForm.actionItems.map(item => ({ 
      description: item.description, 
      assignedTo: item.assignedTo, 
      dueDate: item.dueDate, 
      status: item.status || 'pending', 
      priority: item.priority || 'medium' 
    }));
    
    const briefingData = {
      date: briefingForm.date,
      time: briefingForm.time,
      conductedBy: briefingForm.conductedBy,
      site: briefingForm.site,
      department: briefingForm.department,
      attendeesCount: briefingForm.attendeesCount,
      topics: briefingForm.topics.filter(topic => topic.trim() !== ''),
      keyPoints: briefingForm.keyPoints.filter(point => point.trim() !== ''),
      actionItems: actionItems,
      notes: briefingForm.notes,
      shift: briefingForm.shift,
      supervisors: supervisorsList,
      managers: managersList
    };
    
    const response = await briefingApi.createBriefing(briefingData, attachments);
    
    if (response.success) {
      toast.success('Staff briefing added successfully');
      await fetchBriefings();
      resetBriefingForm();
      setAttachments([]);
      setShowAddBriefing(false);
    } else {
      throw new Error(response.message || 'Failed to create briefing');
    }
  } catch (error: any) {
    console.error('Error creating briefing:', error);
    toast.error(error.response?.data?.message || error.message || 'Error adding staff briefing');
  } finally {
    setLoading(false);
  }
};
  
  // Update training
 const handleUpdateTraining = async () => {
  if (!editingTraining) return;
  
  try {
    setLoading(true);
    
    // ✅ supervisors and managers can be empty arrays
    const supervisorsList = [];
    const managersList = [];
    
    const existingAttachments = editTrainingAttachments
      .filter(att => !att.isNew)
      .map(({ isNew, file, ...rest }) => rest);
    
    const newFiles = editTrainingNewFiles;
    
    const updateData = {
      title: editTrainingForm.title,
      description: editTrainingForm.description,
      type: editTrainingForm.type,
      date: editTrainingForm.date,
      time: editTrainingForm.time,
      duration: editTrainingForm.duration,
      trainer: editTrainingForm.trainer,
      site: editTrainingForm.site,
      department: editTrainingForm.department,
      maxAttendees: editTrainingForm.maxAttendees,
      location: editTrainingForm.location,
      objectives: editTrainingForm.objectives.filter(obj => obj.trim() !== ''),
      supervisors: supervisorsList,
      managers: managersList,
      attachments: existingAttachments
    };
    
    const response = await trainingApi.updateTraining(editingTraining._id, updateData, newFiles);
    
    if (response.success) {
      toast.success('Training session updated successfully');
      await fetchTrainings();
      setShowEditTrainingDialog(false);
      setEditingTraining(null);
      resetEditTrainingForm();
      setEditTrainingAttachments([]);
      setEditTrainingNewFiles([]);
    } else {
      throw new Error(response.message || 'Failed to update training');
    }
  } catch (error: any) {
    console.error('Error updating training:', error);
    toast.error(error.response?.data?.message || error.message || 'Error updating training session');
  } finally {
    setLoading(false);
  }
};
  
 const handleUpdateBriefing = async () => {
  if (!editingBriefing) return;
  
  try {
    setLoading(true);
    
    // ✅ supervisors and managers can be empty arrays
    const supervisorsList = [];
    const managersList = [];
    
    const actionItems = editBriefingForm.actionItems.map(item => ({ 
      description: item.description, 
      assignedTo: item.assignedTo, 
      dueDate: item.dueDate, 
      status: item.status || 'pending', 
      priority: item.priority || 'medium' 
    }));
    
    const existingAttachments = editBriefingAttachments
      .filter(att => !att.isNew)
      .map(({ isNew, file, ...rest }) => rest);
    
    const newFiles = editBriefingNewFiles;
    
    const updateData = {
      date: editBriefingForm.date,
      time: editBriefingForm.time,
      conductedBy: editBriefingForm.conductedBy,
      site: editBriefingForm.site,
      department: editBriefingForm.department,
      attendeesCount: editBriefingForm.attendeesCount,
      topics: editBriefingForm.topics.filter(topic => topic.trim() !== ''),
      keyPoints: editBriefingForm.keyPoints.filter(point => point.trim() !== ''),
      actionItems: actionItems,
      notes: editBriefingForm.notes,
      shift: editBriefingForm.shift,
      supervisors: supervisorsList,
      managers: managersList,
      attachments: existingAttachments
    };
    
    const response = await briefingApi.updateBriefing(editingBriefing._id, updateData, newFiles);
    
    if (response.success) {
      toast.success('Staff briefing updated successfully');
      await fetchBriefings();
      setShowEditBriefingDialog(false);
      setEditingBriefing(null);
      resetEditBriefingForm();
      setEditBriefingAttachments([]);
      setEditBriefingNewFiles([]);
    } else {
      throw new Error(response.message || 'Failed to update briefing');
    }
  } catch (error: any) {
    console.error('Error updating briefing:', error);
    toast.error(error.response?.data?.message || error.message || 'Error updating staff briefing');
  } finally {
    setLoading(false);
  }
};
  
  // Delete training session
  const deleteTraining = async (id: string) => {
    try {
      await trainingApi.deleteTraining(id);
      await fetchTrainings();
      toast.success('Training session deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting training session');
    }
  };
  
  // Delete briefing
  const deleteBriefing = async (id: string) => {
    try {
      await briefingApi.deleteBriefing(id);
      await fetchBriefings();
      toast.success('Staff briefing deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting staff briefing');
    }
  };
  
  // Update training status
  const updateTrainingStatus = async (id: string, status: TrainingSession['status']) => {
    try {
      await trainingApi.updateTrainingStatus(id, status);
      await fetchTrainings();
      toast.success(`Training status updated to ${status}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating training status');
    }
  };
  
  // Update action item status
  const updateActionItemStatus = async (briefingId: string, actionItemId: string, status: ActionItem['status']) => {
    try {
      await briefingApi.updateActionItemStatus(briefingId, actionItemId, status);
      await fetchBriefings();
      toast.success('Action item status updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating action item status');
    }
  };
  
  // Open edit dialogs
  const openEditTrainingDialog = (training: TrainingSession) => {
    setEditingTraining(training);
    setEditTrainingForm({
      title: training.title,
      description: training.description,
      type: training.type,
      date: training.date,
      time: training.time,
      duration: training.duration,
      trainer: training.trainer,
      site: training.site,
      department: training.department,
      maxAttendees: training.maxAttendees,
      location: training.location,
      objectives: training.objectives || []
    });
    setEditSelectedSupervisors(training.supervisors?.map(s => s.id) || []);
    setEditSelectedManagers(training.managers?.map(m => m.id) || []);
    
    const existingAttachments = (training.attachments || []).map(att => ({
      ...att,
      isNew: false
    }));
    setEditTrainingAttachments(existingAttachments);
    setEditTrainingNewFiles([]);
    
    setShowEditTrainingDialog(true);
  };
  
  const openEditBriefingDialog = (briefing: StaffBriefing) => {
    setEditingBriefing(briefing);
    setEditBriefingForm({
      date: briefing.date,
      time: briefing.time,
      conductedBy: briefing.conductedBy,
      site: briefing.site,
      department: briefing.department,
      attendeesCount: briefing.attendeesCount,
      topics: briefing.topics || [],
      keyPoints: briefing.keyPoints || [],
      actionItems: briefing.actionItems || [],
      notes: briefing.notes,
      shift: briefing.shift
    });
    setEditSelectedSupervisors(briefing.supervisors?.map(s => s.id) || []);
    setEditSelectedManagers(briefing.managers?.map(m => m.id) || []);
    
    const existingAttachments = (briefing.attachments || []).map(att => ({
      ...att,
      isNew: false
    }));
    setEditBriefingAttachments(existingAttachments);
    setEditBriefingNewFiles([]);
    
    setShowEditBriefingDialog(true);
  };
  
  // Reset forms
  const resetTrainingForm = () => {
    setTrainingForm({
      title: '',
      description: '',
      type: 'safety',
      date: '',
      time: '',
      duration: '',
      trainer: '',
      site: '',
      department: 'All Departments',
      maxAttendees: 20,
      location: '',
      objectives: []
    });
    setSelectedSupervisors([]);
    setSelectedManagers([]);
    setSelectedEmployees([]);
    setSupervisorSearchQuery("");
    setManagerSearchQuery("");
    setEmployeeSearchQuery("");
  };
  
  const resetBriefingForm = () => {
    setBriefingForm({
      date: '',
      time: '',
      conductedBy: '',
      site: '',
      department: '',
      attendeesCount: 0,
      topics: [],
      keyPoints: [],
      actionItems: [],
      notes: '',
      shift: 'morning'
    });
    setSelectedSupervisors([]);
    setSelectedManagers([]);
    setSupervisorSearchQuery("");
    setManagerSearchQuery("");
  };
  
  const resetEditTrainingForm = () => {
    setEditTrainingForm({
      title: '',
      description: '',
      type: 'safety',
      date: '',
      time: '',
      duration: '',
      trainer: '',
      site: '',
      department: 'All Departments',
      maxAttendees: 20,
      location: '',
      objectives: []
    });
    setEditSelectedSupervisors([]);
    setEditSelectedManagers([]);
  };
  
  const resetEditBriefingForm = () => {
    setEditBriefingForm({
      date: '',
      time: '',
      conductedBy: '',
      site: '',
      department: '',
      attendeesCount: 0,
      topics: [],
      keyPoints: [],
      actionItems: [],
      notes: '',
      shift: 'morning'
    });
    setEditSelectedSupervisors([]);
    setEditSelectedManagers([]);
  };
  
  // Add objective field
  const addObjective = () => {
    setTrainingForm(prev => ({
      ...prev,
      objectives: [...prev.objectives, '']
    }));
  };
  
  // Remove objective field
  const removeObjective = (index: number) => {
    setTrainingForm(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };
  
  // Update objective
  const updateObjective = (index: number, value: string) => {
    setTrainingForm(prev => {
      const newObjectives = [...prev.objectives];
      newObjectives[index] = value;
      return { ...prev, objectives: newObjectives };
    });
  };
  
  // Edit objective handlers
  const addEditObjective = () => {
    setEditTrainingForm(prev => ({
      ...prev,
      objectives: [...prev.objectives, '']
    }));
  };
  
  const removeEditObjective = (index: number) => {
    setEditTrainingForm(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };
  
  const updateEditObjective = (index: number, value: string) => {
    setEditTrainingForm(prev => {
      const newObjectives = [...prev.objectives];
      newObjectives[index] = value;
      return { ...prev, objectives: newObjectives };
    });
  };
  
  // Add topic field
  const addTopic = () => {
    setBriefingForm(prev => ({
      ...prev,
      topics: [...prev.topics, '']
    }));
  };
  
  // Remove topic field
  const removeTopic = (index: number) => {
    setBriefingForm(prev => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== index)
    }));
  };
  
  // Update topic
  const updateTopic = (index: number, value: string) => {
    setBriefingForm(prev => {
      const newTopics = [...prev.topics];
      newTopics[index] = value;
      return { ...prev, topics: newTopics };
    });
  };
  
  // Edit topic handlers
  const addEditTopic = () => {
    setEditBriefingForm(prev => ({
      ...prev,
      topics: [...prev.topics, '']
    }));
  };
  
  const removeEditTopic = (index: number) => {
    setEditBriefingForm(prev => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== index)
    }));
  };
  
  const updateEditTopic = (index: number, value: string) => {
    setEditBriefingForm(prev => {
      const newTopics = [...prev.topics];
      newTopics[index] = value;
      return { ...prev, topics: newTopics };
    });
  };
  
  // Add key point field
  const addKeyPoint = () => {
    setBriefingForm(prev => ({
      ...prev,
      keyPoints: [...prev.keyPoints, '']
    }));
  };
  
  // Remove key point field
  const removeKeyPoint = (index: number) => {
    setBriefingForm(prev => ({
      ...prev,
      keyPoints: prev.keyPoints.filter((_, i) => i !== index)
    }));
  };
  
  // Update key point
  const updateKeyPoint = (index: number, value: string) => {
    setBriefingForm(prev => {
      const newKeyPoints = [...prev.keyPoints];
      newKeyPoints[index] = value;
      return { ...prev, keyPoints: newKeyPoints };
    });
  };
  
  // Edit key point handlers
  const addEditKeyPoint = () => {
    setEditBriefingForm(prev => ({
      ...prev,
      keyPoints: [...prev.keyPoints, '']
    }));
  };
  
  const removeEditKeyPoint = (index: number) => {
    setEditBriefingForm(prev => ({
      ...prev,
      keyPoints: prev.keyPoints.filter((_, i) => i !== index)
    }));
  };
  
  const updateEditKeyPoint = (index: number, value: string) => {
    setEditBriefingForm(prev => {
      const newKeyPoints = [...prev.keyPoints];
      newKeyPoints[index] = value;
      return { ...prev, keyPoints: newKeyPoints };
    });
  };
  
  // Add action item
  const addActionItem = () => {
    setBriefingForm(prev => ({
      ...prev,
      actionItems: [
        ...prev.actionItems,
        {
          description: '',
          assignedTo: '',
          dueDate: '',
          status: 'pending',
          priority: 'medium'
        }
      ]
    }));
  };
  
  // Remove action item
  const removeActionItem = (index: number) => {
    setBriefingForm(prev => ({
      ...prev,
      actionItems: prev.actionItems.filter((_, i) => i !== index)
    }));
  };
  
  // Update action item
  const updateActionItem = (index: number, field: string, value: string) => {
    setBriefingForm(prev => {
      const newActionItems = [...prev.actionItems];
      newActionItems[index] = { ...newActionItems[index], [field]: value };
      return { ...prev, actionItems: newActionItems };
    });
  };
  
  // Edit action item handlers
  const addEditActionItem = () => {
    setEditBriefingForm(prev => ({
      ...prev,
      actionItems: [
        ...prev.actionItems,
        {
          description: '',
          assignedTo: '',
          dueDate: '',
          status: 'pending',
          priority: 'medium'
        }
      ]
    }));
  };
  
  const removeEditActionItem = (index: number) => {
    setEditBriefingForm(prev => ({
      ...prev,
      actionItems: prev.actionItems.filter((_, i) => i !== index)
    }));
  };
  
  const updateEditActionItem = (index: number, field: string, value: string) => {
    setEditBriefingForm(prev => {
      const newActionItems = [...prev.actionItems];
      newActionItems[index] = { ...newActionItems[index], [field]: value };
      return { ...prev, actionItems: newActionItems };
    });
  };
  
  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'ongoing': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };
  
  // Get priority badge color
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };
  
  // Get shift badge color
  const getShiftBadge = (shift: string) => {
    switch (shift) {
      case 'morning': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'evening': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'night': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };
  
  // Get type color
  const getTypeColor = (type: string) => {
    const found = trainingTypes.find(t => t.value === type);
    return found?.color || 'bg-gray-100 text-gray-800';
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };
  
  // Calendar navigation
  const nextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };
  
  const prevMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };
  
  // Get events for calendar
  const getCalendarEvents = () => {
    const events = [];
    
    trainingSessions.forEach(session => {
      events.push({
        id: session._id,
        title: session.title,
        date: session.date,
        type: 'training',
        color: 'bg-blue-500',
        session
      });
    });
    
    staffBriefings.forEach(briefing => {
      events.push({
        id: briefing._id,
        title: `Briefing - ${briefing.department}`,
        date: briefing.date,
        type: 'briefing',
        color: 'bg-green-500',
        briefing
      });
    });
    
    return events;
  };
  
  const calendarEvents = getCalendarEvents();
  
  // Filtered lists for multi-select
  const filteredSupervisorsList = filteredSupervisors.filter(sup => 
    sup.name.toLowerCase().includes(supervisorSearchQuery.toLowerCase()) ||
    (sup.department && sup.department.toLowerCase().includes(supervisorSearchQuery.toLowerCase()))
  );
  const filteredManagersList = filteredManagers.filter(mgr => 
    mgr.name.toLowerCase().includes(managerSearchQuery.toLowerCase()) ||
    (mgr.department && mgr.department.toLowerCase().includes(managerSearchQuery.toLowerCase()))
  );
  const filteredEmployeesList = filteredEmployees.filter(emp => 
    emp.name.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
    (emp.position && emp.position.toLowerCase().includes(employeeSearchQuery.toLowerCase()))
  );
  
  const filteredEditSupervisorsList = filteredSupervisors.filter(sup => 
    sup.name.toLowerCase().includes(editSupervisorSearchQuery.toLowerCase()) ||
    (sup.department && sup.department.toLowerCase().includes(editSupervisorSearchQuery.toLowerCase()))
  );
  const filteredEditManagersList = filteredManagers.filter(mgr => 
    mgr.name.toLowerCase().includes(editManagerSearchQuery.toLowerCase()) ||
    (mgr.department && mgr.department.toLowerCase().includes(editManagerSearchQuery.toLowerCase()))
  );
  
  // Stats calculations
  const totalTrainings = trainingSessions.length;
  const totalBriefings = staffBriefings.length;
  const completedTrainings = trainingSessions.filter(t => t.status === 'completed').length;
  const pendingActions = staffBriefings.reduce((acc, briefing) => 
    acc + briefing.actionItems.filter(a => a.status === 'pending').length, 0
  );

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Training & Staff Briefing
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
              Manage training sessions and daily staff briefings for your assigned sites
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
             {!loadingData.sites && (
  <Badge variant="outline" className="bg-blue-50">
    <Building className="h-3 w-3 mr-1" />
    Your Sites: {managerAssignedSiteNames.length > 0 
      ? managerAssignedSiteNames.join(', ') 
      : 'No sites assigned'}
  </Badge>
)}
{loadingData.sites && (
  <Badge variant="outline" className="bg-blue-50 animate-pulse">
    <Building className="h-3 w-3 mr-1" />
    Loading sites...
  </Badge>
)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
              className="flex-1 sm:flex-none min-w-[100px]"
              disabled={loading}
            >
              {viewMode === 'list' ? (
                <>
                  <CalendarDays className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Calendar View</span>
                  <span className="sm:hidden">Calendar</span>
                </>
              ) : (
                <>
                  <List className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">List View</span>
                  <span className="sm:hidden">List</span>
                </>
              )}
            </Button>
            
            <Dialog open={showAddTraining} onOpenChange={setShowAddTraining}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none min-w-[100px]" disabled={loading}>
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Training</span>
                  <span className="sm:hidden">Training</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Add New Training Session</DialogTitle>
                  <DialogDescription className="text-sm">
                    Schedule a new training session for your team.
                  </DialogDescription>
                </DialogHeader>
                
                <AddTrainingFormComponent 
                  trainingForm={trainingForm}
                  setTrainingForm={setTrainingForm}
                  addObjective={addObjective}
                  removeObjective={removeObjective}
                  updateObjective={updateObjective}
                  sites={sites}
                />
                
               
                <EmployeesMultiSelect 
                  selected={selectedEmployees}
                  onToggle={handleEmployeeToggle}
                  searchQuery={employeeSearchQuery}
                  setSearchQuery={setEmployeeSearchQuery}
                  disabled={!trainingForm.site}
                  filteredEmployeesList={filteredEmployeesList}
                />
                <AttachmentsSection 
                  attachments={attachments}
                  onUpload={handleFileUpload}
                  onRemove={removeAttachment}
                  fileInputRef={fileInputRef}
                />
                
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAddTraining} disabled={loading} className="w-full sm:w-auto">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Training Session
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showAddBriefing} onOpenChange={setShowAddBriefing}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="flex-1 sm:flex-none min-w-[100px]" disabled={loading}>
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Briefing</span>
                  <span className="sm:hidden">Briefing</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Add New Staff Briefing</DialogTitle>
                  <DialogDescription className="text-sm">
                    Record daily staff briefing details and action items.
                  </DialogDescription>
                </DialogHeader>
                
                <AddBriefingFormComponent 
                  briefingForm={briefingForm}
                  setBriefingForm={setBriefingForm}
                  addTopic={addTopic}
                  removeTopic={removeTopic}
                  updateTopic={updateTopic}
                  addKeyPoint={addKeyPoint}
                  removeKeyPoint={removeKeyPoint}
                  updateKeyPoint={updateKeyPoint}
                  sites={sites}
                />
               
                <ActionItemsSection 
                  actionItems={briefingForm.actionItems}
                  onAdd={addActionItem}
                  onRemove={removeActionItem}
                  onUpdate={updateActionItem}
                />
                <AttachmentsSection 
                  attachments={attachments}
                  onUpload={handleFileUpload}
                  onRemove={removeAttachment}
                  fileInputRef={fileInputRef}
                />
                
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAddBriefing} disabled={loading} className="w-full sm:w-auto">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Staff Briefing
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <MobileStatCard title="Total Training" value={totalTrainings} icon={Calendar} color="blue" />
          <MobileStatCard title="Briefings" value={totalBriefings} icon={Users} color="green" />
          <MobileStatCard title="Completed" value={completedTrainings} icon={CheckCircle} color="purple" />
          <MobileStatCard title="Pending Actions" value={pendingActions} icon={AlertCircle} color="red" />
        </div>
      </motion.div>

      {/* Main Content */}
      {loadingData.trainings && loadingData.briefings ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : viewMode === 'list' ? (
        <>
          {/* Tabs */}
          <Tabs defaultValue="training" className="mb-4 sm:mb-6" onValueChange={(value: any) => setActiveTab(value)}>
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="training" className="flex items-center gap-2 text-xs sm:text-sm">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Training</span>
                <span className="xs:hidden">TRN</span>
              </TabsTrigger>
              <TabsTrigger value="briefing" className="flex items-center gap-2 text-xs sm:text-sm">
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Briefings</span>
                <span className="xs:hidden">BRF</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4 sm:mb-6"
          >
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <Input
                      placeholder={activeTab === 'training' ? "Search training..." : "Search briefings..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-64 text-sm"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                        <SelectTrigger className="w-32 sm:w-40 text-sm">
                          <SelectValue placeholder="All Depts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          {departments.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {activeTab === 'training' && (
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-28 sm:w-32 text-sm">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="ongoing">Ongoing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    
                    <Button variant="outline" size="sm" className="text-sm" disabled={loading}>
                      <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">Export</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Training Sessions Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'training' ? (
              <motion.div
                key="training"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Training Sessions</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Manage weekly training sessions and track attendance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    {trainingSessions.length === 0 ? (
                      <div className="text-center py-8 sm:py-12">
                        <Calendar className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
                          No training sessions found
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                          Try adjusting your filters or add a new training session.
                        </p>
                        <Button onClick={() => setShowAddTraining(true)} size="sm" className="text-xs sm:text-sm">
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Add Training
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {/* Desktop View */}
                        <div className="hidden md:block">
                          {trainingSessions.map(session => {
                            const canEdit = session.createdBy === managerId;
                            return (
                              <Card key={session._id} className="overflow-hidden mb-4">
                                <div className="p-4 sm:p-6">
                                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="min-w-0 flex-1">
                                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                                            {session.title}
                                          </h3>
                                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                            {session.description}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                          <Badge className={getTypeColor(session.type)}>
                                            {trainingTypes.find(t => t.value === session.type)?.label}
                                          </Badge>
                                          <Badge className={getStatusBadge(session.status)}>
                                            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                          </Badge>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                            {formatDate(session.date)}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                            {session.time} ({session.duration})
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                            {session.trainer}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                          <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {session.site}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-row lg:flex-col gap-2 lg:min-w-[200px]">
                                      <Button variant="outline" size="sm" className="flex-1 lg:w-full" onClick={() => setSelectedTraining(session)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </Button>
                                      
                                      {canEdit && (
                                        <>
                                          <Button variant="outline" size="sm" className="flex-1 lg:w-full" onClick={() => openEditTrainingDialog(session)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                          </Button>
                                          <Select
                                            value={session.status}
                                            onValueChange={(value: any) => updateTrainingStatus(session._id, value)}
                                          >
                                            <SelectTrigger className="flex-1 h-8 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="scheduled">Scheduled</SelectItem>
                                              <SelectItem value="ongoing">Ongoing</SelectItem>
                                              <SelectItem value="completed">Completed</SelectItem>
                                              <SelectItem value="cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteTraining(session._id)}
                                            className="flex-shrink-0 px-2"
                                          >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>

                        {/* Mobile View */}
                        <div className="md:hidden space-y-3">
                          {trainingSessions.map(session => (
                            <MobileTrainingCard 
                              key={session._id} 
                              session={{...session, currentManagerId: managerId}} 
                              onView={setSelectedTraining}
                              onUpdateStatus={updateTrainingStatus}
                              onDelete={deleteTraining}
                              getTypeColor={getTypeColor}
                              getStatusBadge={getStatusBadge}
                              formatDate={formatDate}
                              trainingTypes={trainingTypes}
                              loading={loading}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="briefing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Staff Briefings</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Daily staff briefings and action items
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    {staffBriefings.length === 0 ? (
                      <div className="text-center py-8 sm:py-12">
                        <MessageSquare className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
                          No staff briefings found
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                          Try adjusting your filters or add a new staff briefing.
                        </p>
                        <Button onClick={() => setShowAddBriefing(true)} size="sm" className="text-xs sm:text-sm">
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Add Briefing
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        {/* Desktop View */}
                        <div className="hidden md:block">
                          {staffBriefings.map(briefing => {
                            const canEdit = briefing.createdBy === managerId;
                            return (
                              <Card key={briefing._id} className="overflow-hidden mb-4">
                                <div className="p-4 sm:p-6">
                                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            Staff Briefing - {briefing.site}
                                          </h3>
                                          <div className="flex flex-wrap items-center gap-3 mt-1">
                                            <Badge className={getShiftBadge(briefing.shift)}>
                                              {briefing.shift.charAt(0).toUpperCase() + briefing.shift.slice(1)} Shift
                                            </Badge>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                              by {briefing.conductedBy}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-right ml-4 flex-shrink-0">
                                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {formatDate(briefing.date)}
                                          </p>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">{briefing.time}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Department:</p>
                                          <p className="text-gray-600 dark:text-gray-400">{briefing.department}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Attendees:</p>
                                          <p className="text-gray-600 dark:text-gray-400">{briefing.attendeesCount} staff</p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-row lg:flex-col gap-2 lg:min-w-[120px]">
                                      <Button variant="outline" size="sm" className="flex-1 lg:w-full" onClick={() => setSelectedBriefing(briefing)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View
                                      </Button>
                                      
                                      {canEdit && (
                                        <>
                                          <Button variant="outline" size="sm" className="flex-1 lg:w-full" onClick={() => openEditBriefingDialog(briefing)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteBriefing(briefing._id)}
                                            className="flex-shrink-0 px-2"
                                          >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>

                        {/* Mobile View */}
                        <div className="md:hidden space-y-3">
                          {staffBriefings.map(briefing => (
                            <MobileBriefingCard 
                              key={briefing._id} 
                              briefing={{...briefing, currentManagerId: managerId}} 
                              onView={setSelectedBriefing}
                              onDelete={deleteBriefing}
                              onUpdateAction={updateActionItemStatus}
                              getShiftBadge={getShiftBadge}
                              getPriorityBadge={getPriorityBadge}
                              formatDate={formatDate}
                              loading={loading}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* Calendar View */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">Training & Briefing Calendar</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    View all scheduled training sessions and staff briefings
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-sm sm:text-base font-semibold min-w-[140px] text-center">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {/* Calendar Grid - Simplified for now */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div key={idx} className="text-center font-medium text-gray-500 dark:text-gray-400 py-2 text-xs sm:text-sm">
                    <span className="hidden sm:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}</span>
                    <span className="sm:hidden">{day}</span>
                  </div>
                ))}
                
                {/* Placeholder calendar days */}
                {[...Array(35)].map((_, idx) => (
                  <div
                    key={idx}
                    className="aspect-square border rounded p-1 sm:p-2 text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <div className="text-right text-gray-600 dark:text-gray-400">{idx + 1}</div>
                  </div>
                ))}
              </div>
              
              {/* Upcoming Events */}
              <div className="space-y-3 mt-6 sm:mt-8">
                <h4 className="text-sm sm:text-base font-semibold">Upcoming Events</h4>
                {calendarEvents
                  .filter(event => new Date(event.date) >= new Date())
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 5)
                  .map(event => (
                    <div key={event.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 sm:h-3 sm:w-3 rounded-full ${event.color}`}></div>
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-medium truncate max-w-[200px]">{event.title}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {formatDate(event.date)} • {event.type === 'training' ? 'Training' : 'Briefing'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs sm:text-sm ml-auto sm:ml-0"
                        onClick={() => {
                          if (event.type === 'training') {
                            setSelectedTraining(event.session);
                          } else {
                            setSelectedBriefing(event.briefing);
                          }
                        }}
                      >
                        View
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {/* Detail Dialogs */}
      <TrainingDetailDialog 
        training={selectedTraining} 
        open={!!selectedTraining} 
        onClose={() => setSelectedTraining(null)} 
        onEdit={openEditTrainingDialog}
        onUpdateStatus={updateTrainingStatus}
        getStatusBadge={getStatusBadge}
        getTypeColor={getTypeColor}
        formatDate={formatDate}
        trainingTypes={trainingTypes}
      />
      <BriefingDetailDialog 
        briefing={selectedBriefing} 
        open={!!selectedBriefing} 
        onClose={() => setSelectedBriefing(null)} 
        onEdit={openEditBriefingDialog}
        onUpdateAction={updateActionItemStatus}
        getShiftBadge={getShiftBadge}
        getPriorityBadge={getPriorityBadge}
        formatDate={formatDate}
      />
      
      {/* Edit Dialogs */}
      <Dialog open={showEditTrainingDialog} onOpenChange={setShowEditTrainingDialog}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Training Session</DialogTitle>
            <DialogDescription className="text-sm">Update the training session details</DialogDescription>
          </DialogHeader>
          
          <EditTrainingFormComponent 
            editTrainingForm={editTrainingForm}
            setEditTrainingForm={setEditTrainingForm}
            addEditObjective={addEditObjective}
            removeEditObjective={removeEditObjective}
            updateEditObjective={updateEditObjective}
            sites={sites}
          />
          
            
          <AttachmentsSection 
            attachments={editTrainingAttachments}
            onUpload={handleEditTrainingFileUpload}
            onRemove={removeEditTrainingAttachment}
            fileInputRef={editTrainingFileInputRef}
          />
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowEditTrainingDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateTraining} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Training
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showEditBriefingDialog} onOpenChange={setShowEditBriefingDialog}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Staff Briefing</DialogTitle>
            <DialogDescription className="text-sm">Update the staff briefing details</DialogDescription>
          </DialogHeader>
          
          <EditBriefingFormComponent 
            editBriefingForm={editBriefingForm}
            setEditBriefingForm={setEditBriefingForm}
            addEditTopic={addEditTopic}
            removeEditTopic={removeEditTopic}
            updateEditTopic={updateEditTopic}
            addEditKeyPoint={addEditKeyPoint}
            removeEditKeyPoint={removeEditKeyPoint}
            updateEditKeyPoint={updateEditKeyPoint}
            sites={sites}
          />
         
        
          <ActionItemsSection 
            actionItems={editBriefingForm.actionItems}
            onAdd={addEditActionItem}
            onRemove={removeEditActionItem}
            onUpdate={updateEditActionItem}
          />
          <AttachmentsSection 
            attachments={editBriefingAttachments}
            onUpload={handleEditBriefingFileUpload}
            onRemove={removeEditBriefingAttachment}
            fileInputRef={editBriefingFileInputRef}
          />
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowEditBriefingDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateBriefing} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Briefing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper components
const Star: React.FC<{ className: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const List: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);

const Check: React.FC<{ className?: string }> = ({ className = "h-3 w-3" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

export default TrainingBriefingSectionManager;
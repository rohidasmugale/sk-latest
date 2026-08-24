// components/TrainingAndBriefing.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Calendar, Clock, Users, FileText, Image as ImageIcon, Video, File, CheckCircle, XCircle,
  Plus, Search, Filter, Download, Eye, Edit, Trash2, Upload, CalendarDays, Clock4, User,
  Building, Target, MessageSquare, AlertCircle, TrendingUp, ChevronRight, ChevronLeft,
  CheckSquare, Square, RefreshCw, MoreVertical, ChevronDown, ChevronUp, X, List as ListIcon, UserCog, UserCheck,
  Link as LinkIcon, Download as DownloadIcon, ExternalLink,
  Check
} from "lucide-react";
import { format } from 'date-fns';
import { trainingApi, trainingApi as trainingApiDefault } from '../../../services/trainingApi';
import { briefingApi, briefingApi as briefingApiDefault } from '../../../services/briefingApi';
import { siteService, Site } from '@/services/SiteService';
import assignTaskService, { AssignTask } from '@/services/assignTaskService';

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
  attachments: Array<{ _id?: string; name: string; type: string; url: string; size: string; uploadedAt?: string }>;
  feedback: Array<{ employeeId: string; employeeName: string; rating: number; comment: string }>;
  location: string;
  objectives: string[];
  supervisors?: Array<{ id: string; name: string }>;
  managers?: Array<{ id: string; name: string }>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
interface TrainingAndBriefingProps {
  selectedSite?: string;  // site ID or "all"
  sites?: Site[];         // list of all sites (for display)
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
  actionItems: Array<{
    _id?: string;
    id?: string;
    description: string;
    assignedTo: string;
    dueDate: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
  }>;
  attachments: Array<{ _id?: string; name: string; type: string; url: string; size: string; uploadedAt?: string }>;
  notes: string;
  shift: 'morning' | 'evening' | 'night';
  supervisors?: Array<{ id: string; name: string }>;
  managers?: Array<{ id: string; name: string }>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
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
  { value: 'safety', label: 'Safety Training', color: 'bg-red-100 text-red-800' },
  { value: 'technical', label: 'Technical Training', color: 'bg-blue-100 text-blue-800' },
  { value: 'soft_skills', label: 'Soft Skills', color: 'bg-green-100 text-green-800' },
  { value: 'compliance', label: 'Compliance', color: 'bg-purple-100 text-purple-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
];
const shifts = ['morning', 'evening', 'night'];
const priorities = ['low', 'medium', 'high'];

// Attachment Viewer Component
const AttachmentViewer = ({ attachment, onClose }: { attachment: any; onClose: () => void }) => {
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
};

// Training Detail Dialog
const TrainingDetailDialog = ({ training, open, onClose, onEdit, onUpdateStatus }: any) => {
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);

  if (!training) return null;

  const getTypeColor = (type: string) => {
    const found = trainingTypes.find(t => t.value === type);
    return found?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
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
                    {trainingTypes.find(t => t.value === training.type)?.label || training.type}
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
                  <span>{format(new Date(training.date), "dd MMMM yyyy")} at {training.time}</span>
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
                <span>Created: {format(new Date(training.createdAt), "dd MMM yyyy, hh:mm a")}</span>
                <span>Last Updated: {format(new Date(training.updatedAt), "dd MMM yyyy, hh:mm a")}</span>
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
};

// Briefing Detail Dialog
const BriefingDetailDialog = ({ briefing, open, onClose, onEdit, onUpdateAction }: any) => {
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);

  if (!briefing) return null;

  const getShiftBadge = (shift: string) => {
    switch (shift) {
      case 'morning': return 'bg-blue-100 text-blue-800';
      case 'evening': return 'bg-purple-100 text-purple-800';
      case 'night': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
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
                  <span>{format(new Date(briefing.date), "dd MMMM yyyy")} at {briefing.time}</span>
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
                          <span>Due: {format(new Date(item.dueDate), "dd MMM yyyy")}</span>
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
                <span>Created: {format(new Date(briefing.createdAt), "dd MMM yyyy, hh:mm a")}</span>
                <span>Last Updated: {format(new Date(briefing.updatedAt), "dd MMM yyyy, hh:mm a")}</span>
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
};

// Mobile responsive supervisor selection card
const MobileSupervisorCard = ({ supervisor, selected, onToggle }: { supervisor: Supervisor; selected: boolean; onToggle: (id: string) => void }) => {
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
};

// Mobile responsive manager selection card
const MobileManagerCard = ({ manager, selected, onToggle }: { manager: Manager; selected: boolean; onToggle: (id: string) => void }) => {
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
};

// Mobile responsive training card
const MobileTrainingCard = ({ session, onView, onUpdateStatus, onDelete, getTypeColor, getStatusBadge, formatDate, trainingTypes, loading }: any) => {
  const [expanded, setExpanded] = useState(false);
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
                <DropdownMenuItem onClick={() => onUpdateStatus(session._id, 'scheduled')}><Calendar className="h-4 w-4 mr-2" /> Scheduled</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateStatus(session._id, 'ongoing')}><Clock className="h-4 w-4 mr-2" /> Ongoing</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateStatus(session._id, 'completed')}><CheckCircle className="h-4 w-4 mr-2" /> Completed</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdateStatus(session._id, 'cancelled')}><XCircle className="h-4 w-4 mr-2" /> Cancelled</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(session._id)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(!expanded)}>
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
};

// Mobile responsive briefing card
const MobileBriefingCard = ({ briefing, onView, onDelete, onUpdateAction, getShiftBadge, getPriorityBadge, formatDate, loading }: any) => {
  const [expanded, setExpanded] = useState(false);
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
                <DropdownMenuItem onClick={() => onDelete(briefing._id)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(!expanded)}>
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
};

const MobileStatCard = ({ title, value, subValue, icon: Icon, color = "blue" }: any) => {
  const colorClasses: any = { blue: "bg-blue-100 text-blue-600", green: "bg-green-100 text-green-600", purple: "bg-purple-100 text-purple-600", red: "bg-red-100 text-red-600" };
  return (<Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{title}</p><p className="text-xl font-bold mt-1">{value}</p>{subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}</div><div className={`p-3 rounded-lg ${colorClasses[color]}`}><Icon className="h-5 w-5" /></div></div></CardContent></Card>);
};

const TrainingAndBriefing: React.FC<TrainingAndBriefingProps> = ({ selectedSite = "all", sites = [] }) => {
  const [activeTab, setActiveTab] = useState<'training' | 'briefing'>('briefing');
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

  // File upload refs and states
  const trainingFileInputRef = useRef<HTMLInputElement>(null);
  const briefingFileInputRef = useRef<HTMLInputElement>(null);
  const editTrainingFileInputRef = useRef<HTMLInputElement>(null);
  const editBriefingFileInputRef = useRef<HTMLInputElement>(null);
  const [trainingAttachments, setTrainingAttachments] = useState<File[]>([]);
  const [briefingAttachments, setBriefingAttachments] = useState<File[]>([]);
  const [editTrainingAttachments, setEditTrainingAttachments] = useState<ExistingAttachment[]>([]);
  const [editBriefingAttachments, setEditBriefingAttachments] = useState<ExistingAttachment[]>([]);
  const [editTrainingNewFiles, setEditTrainingNewFiles] = useState<File[]>([]);
  const [editBriefingNewFiles, setEditBriefingNewFiles] = useState<File[]>([]);

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalTrainings: 0, staffBriefings: 0, completedTraining: 0, pendingActions: 0 });
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState<{ date: Date; events: any[] } | null>(null);
  // Site and supervisor/manager states
  const [localSites, setLocalSites] = useState<Site[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [filteredSupervisors, setFilteredSupervisors] = useState<Supervisor[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<Manager[]>([]);

  // Multi-select states for training
  const [trainingSelectedSupervisors, setTrainingSelectedSupervisors] = useState<string[]>([]);
  const [trainingSelectedManagers, setTrainingSelectedManagers] = useState<string[]>([]);
  const [trainingSupervisorSearchQuery, setTrainingSupervisorSearchQuery] = useState("");
  const [trainingManagerSearchQuery, setTrainingManagerSearchQuery] = useState("");

  // Multi-select states for briefing
  const [briefingSelectedSupervisors, setBriefingSelectedSupervisors] = useState<string[]>([]);
  const [briefingSelectedManagers, setBriefingSelectedManagers] = useState<string[]>([]);
  const [briefingSupervisorSearchQuery, setBriefingSupervisorSearchQuery] = useState("");
  const [briefingManagerSearchQuery, setBriefingManagerSearchQuery] = useState("");

  // Training form state
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
    objectives: ['']
  });

  // Briefing form state
  const [briefingForm, setBriefingForm] = useState({
    date: '',
    time: '',
    conductedBy: '',
    site: '',
    department: '',
    attendeesCount: 0,
    topics: [''],
    keyPoints: [''],
    actionItems: [] as any[],
    notes: '',
    shift: 'morning' as const
  });

  // Site filtering
  const siteFilteredTrainingSessions = useMemo(() => {
    if (selectedSite === "all") return trainingSessions;
    const site = sites.find(s => s._id === selectedSite);
    return trainingSessions.filter(session => site ? session.site === site.name : false);
  }, [trainingSessions, selectedSite, sites]);

  const siteFilteredStaffBriefings = useMemo(() => {
    if (selectedSite === "all") return staffBriefings;
    const site = sites.find(s => s._id === selectedSite);
    return staffBriefings.filter(briefing => site ? briefing.site === site.name : false);
  }, [staffBriefings, selectedSite, sites]);
  // Stats from filtered data (replaces API stats)
  const filteredStats = useMemo(() => {
    const totalTrainings = siteFilteredTrainingSessions.length;
    const totalBriefings = siteFilteredStaffBriefings.length;
    const completedTrainings = siteFilteredTrainingSessions.filter(t => t.status === 'completed').length;
    const pendingActions = siteFilteredStaffBriefings.reduce((acc, briefing) =>
      acc + briefing.actionItems.filter(a => a.status === 'pending').length, 0
    );
    return { totalTrainings, totalBriefings, completedTraining: completedTrainings, pendingActions };
  }, [siteFilteredTrainingSessions, siteFilteredStaffBriefings]);
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch sites, supervisors, and managers on mount
  useEffect(() => {
    fetchSites();
    fetchSupervisorsAndManagers();
    fetchTrainingSessions();
    fetchStaffBriefings();
    fetchStats();
  }, []);

  // Filter supervisors and managers for training when site changes
  useEffect(() => {
    if (trainingForm.site) {
      const selectedSite = sites.find(s => s.name === trainingForm.site);
      if (selectedSite) {
        const siteSupervisors = supervisors.filter(sup => sup.assignedSites?.includes(selectedSite._id) || sup.site === trainingForm.site);
        setFilteredSupervisors(siteSupervisors);
        const siteManagers = managers.filter(mgr => mgr.assignedSites?.includes(selectedSite._id) || mgr.site === trainingForm.site);
        setFilteredManagers(siteManagers);
      } else {
        setFilteredSupervisors([]);
        setFilteredManagers([]);
      }
    } else {
      setFilteredSupervisors([]);
      setFilteredManagers([]);
    }
  }, [trainingForm.site, sites, supervisors, managers]);

  // Filter supervisors and managers for briefing when site changes
  useEffect(() => {
    if (briefingForm.site) {
      const selectedSite = sites.find(s => s.name === briefingForm.site);
      if (selectedSite) {
        const siteSupervisors = supervisors.filter(sup => sup.assignedSites?.includes(selectedSite._id) || sup.site === briefingForm.site);
        setFilteredSupervisors(siteSupervisors);
        const siteManagers = managers.filter(mgr => mgr.assignedSites?.includes(selectedSite._id) || mgr.site === briefingForm.site);
        setFilteredManagers(siteManagers);
      } else {
        setFilteredSupervisors([]);
        setFilteredManagers([]);
      }
    } else {
      setFilteredSupervisors([]);
      setFilteredManagers([]);
    }
  }, [briefingForm.site, sites, supervisors, managers]);

  useEffect(() => {
    fetchTrainingSessions();
    fetchStaffBriefings();
    fetchStats();
  }, [searchTerm, filterDepartment, filterStatus]);

  const fetchSites = async () => {
  try {
    const data = await siteService.getAllSites();
    setLocalSites(data);
  } catch (error) {
    console.error("Error fetching sites:", error);
  }
};

  const fetchSupervisorsAndManagers = async () => {
    try {
      const tasksData = await assignTaskService.getAllAssignTasks();
      const supervisorMap = new Map<string, Supervisor>();
      const managerMap = new Map<string, Manager>();

      tasksData.forEach((task: AssignTask) => {
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
      });

      setSupervisors(Array.from(supervisorMap.values()));
      setManagers(Array.from(managerMap.values()));
    } catch (error) {
      console.error("Error fetching supervisors and managers:", error);
    }
  };

  const fetchTrainingSessions = async () => {
    try {
      setLoading(true);
      const filters = { department: filterDepartment === 'all' ? '' : filterDepartment, status: filterStatus === 'all' ? '' : filterStatus, search: searchTerm };
      const response = await trainingApi.getAllTrainings(filters);
      setTrainingSessions(response.trainings || []);
    } catch (error: any) {
      console.error('Error fetching training sessions:', error);
      toast.error('Error fetching training sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffBriefings = async () => {
    try {
      const filters = { department: filterDepartment === 'all' ? '' : filterDepartment, search: searchTerm };
      const response = await briefingApi.getAllBriefings(filters);
      setStaffBriefings(response.briefings || []);
    } catch (error: any) {
      console.error('Error fetching staff briefings:', error);
      toast.error('Error fetching staff briefings');
    }
  };

  const fetchStats = async () => {
    try {
      const [trainingStats, briefingStats] = await Promise.all([trainingApi.getTrainingStats(), briefingApi.getBriefingStats()]);
      setStats({
        totalTrainings: trainingStats.data?.totalTrainings || trainingSessions.length,
        staffBriefings: briefingStats.data?.totalBriefings || staffBriefings.length,
        completedTraining: trainingStats.data?.completedTrainings || trainingSessions.filter(t => t.status === 'completed').length,
        pendingActions: briefingStats.data?.pendingActions || staffBriefings.reduce((acc, b) => acc + (b.actionItems?.filter(a => a.status === 'pending').length || 0), 0)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalTrainings: trainingSessions.length,
        staffBriefings: staffBriefings.length,
        completedTraining: trainingSessions.filter(t => t.status === 'completed').length,
        pendingActions: staffBriefings.reduce((acc, b) => acc + (b.actionItems?.filter(a => a.status === 'pending').length || 0), 0)
      });
    }
  };

  const filteredTrainingSessions = siteFilteredTrainingSessions.filter(session => {
    const matchesSearch = session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.trainer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.site?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || session.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const filteredStaffBriefings = siteFilteredStaffBriefings.filter(briefing => {
    const matchesSearch = briefing.conductedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      briefing.site?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      briefing.topics?.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDepartment = filterDepartment === 'all' || briefing.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleTrainingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setTrainingAttachments(prev => [...prev, ...files]);
    toast.success(`${files.length} file(s) added to training`);
  };

  const handleBriefingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setBriefingAttachments(prev => [...prev, ...files]);
    toast.success(`${files.length} file(s) added to briefing`);
  };

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

  const removeTrainingAttachment = (index: number) => {
    setTrainingAttachments(prev => prev.filter((_, i) => i !== index));
    toast.info('File removed');
  };

  const removeBriefingAttachment = (index: number) => {
    setBriefingAttachments(prev => prev.filter((_, i) => i !== index));
    toast.info('File removed');
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

  // Training supervisor selection handlers
  const handleTrainingSupervisorToggle = (supervisorId: string) => {
    setTrainingSelectedSupervisors(prev => {
      if (prev.includes(supervisorId)) {
        return prev.filter(id => id !== supervisorId);
      } else {
        return [...prev, supervisorId];
      }
    });
  };

  const handleTrainingManagerToggle = (managerId: string) => {
    setTrainingSelectedManagers(prev => {
      if (prev.includes(managerId)) {
        return prev.filter(id => id !== managerId);
      } else {
        return [...prev, managerId];
      }
    });
  };

  // Briefing supervisor selection handlers
  const handleBriefingSupervisorToggle = (supervisorId: string) => {
    setBriefingSelectedSupervisors(prev => {
      if (prev.includes(supervisorId)) {
        return prev.filter(id => id !== supervisorId);
      } else {
        return [...prev, supervisorId];
      }
    });
  };

  const handleBriefingManagerToggle = (managerId: string) => {
    setBriefingSelectedManagers(prev => {
      if (prev.includes(managerId)) {
        return prev.filter(id => id !== managerId);
      } else {
        return [...prev, managerId];
      }
    });
  };

  const handleAddTraining = async () => {
    if (!trainingForm.title || !trainingForm.date || !trainingForm.trainer) {
      toast.error('Please fill in all required fields (Title, Date, Trainer)');
      return;
    }


    try {
      const supervisorsList = trainingSelectedSupervisors.map(supId => {
        const sup = filteredSupervisors.find(s => s._id === supId);
        return sup ? { id: sup._id, name: sup.name } : null;
      }).filter(Boolean);

      const managersList = trainingSelectedManagers.map(mgrId => {
        const mgr = filteredManagers.find(m => m._id === mgrId);
        return mgr ? { id: mgr._id, name: mgr.name } : null;
      }).filter(Boolean);

      const trainingData = {
        title: trainingForm.title,
        description: trainingForm.description || '',
        type: trainingForm.type,
        date: trainingForm.date,
        time: trainingForm.time || '',
        duration: trainingForm.duration || '',
        trainer: trainingForm.trainer,
        site: trainingForm.site || '',
        department: trainingForm.department,
        maxAttendees: trainingForm.maxAttendees || 20,
        location: trainingForm.location || '',
        objectives: trainingForm.objectives.filter(obj => obj.trim() !== ''),
        supervisors: supervisorsList,
        managers: managersList
      };

      console.log('Sending training data:', trainingData);
      const response = await trainingApi.createTraining(trainingData, trainingAttachments);

      if (response.success) {
        toast.success(response.message || 'Training session added successfully');
        await fetchTrainingSessions();
        await fetchStats();
        resetTrainingForm();
        setTrainingAttachments([]);
        setShowAddTraining(false);
      } else {
        throw new Error(response.message || 'Failed to create training');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || error.message || 'Error adding training session');
    }
  };

  const handleAddBriefing = async () => {
    if (!briefingForm.date || !briefingForm.conductedBy || !briefingForm.site) {
      toast.error('Please fill in all required fields (Date, Conducted By, Site)');
      return;
    }



    try {
      const supervisorsList = briefingSelectedSupervisors.map(supId => {
        const sup = filteredSupervisors.find(s => s._id === supId);
        return sup ? { id: sup._id, name: sup.name } : null;
      }).filter(Boolean);

      const managersList = briefingSelectedManagers.map(mgrId => {
        const mgr = filteredManagers.find(m => m._id === mgrId);
        return mgr ? { id: mgr._id, name: mgr.name } : null;
      }).filter(Boolean);

      const actionItems = briefingForm.actionItems.map((item: any) => ({
        description: item.description,
        assignedTo: item.assignedTo,
        dueDate: item.dueDate,
        status: item.status || 'pending',
        priority: item.priority || 'medium'
      }));

      const briefingData = {
        date: briefingForm.date,
        time: briefingForm.time || '',
        conductedBy: briefingForm.conductedBy,
        site: briefingForm.site,
        department: briefingForm.department || '',
        attendeesCount: briefingForm.attendeesCount || 0,
        topics: briefingForm.topics.filter(topic => topic.trim() !== ''),
        keyPoints: briefingForm.keyPoints.filter(point => point.trim() !== ''),
        actionItems: actionItems,
        notes: briefingForm.notes || '',
        shift: briefingForm.shift,
        supervisors: supervisorsList,
        managers: managersList
      };

      console.log('Sending briefing data:', briefingData);
      const response = await briefingApi.createBriefing(briefingData, briefingAttachments);

      if (response.success) {
        toast.success(response.message || 'Staff briefing added successfully');
        await fetchStaffBriefings();
        await fetchStats();
        resetBriefingForm();
        setBriefingAttachments([]);
        setShowAddBriefing(false);
      } else {
        throw new Error(response.message || 'Failed to create briefing');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || error.message || 'Error adding staff briefing');
    }
  };

  const handleUpdateTraining = async () => {
    if (!editingTraining) return;

    try {
      const supervisorsList = trainingSelectedSupervisors.map(supId => {
        const sup = filteredSupervisors.find(s => s._id === supId);
        return sup ? { id: sup._id, name: sup.name } : null;
      }).filter(Boolean);

      const managersList = trainingSelectedManagers.map(mgrId => {
        const mgr = filteredManagers.find(m => m._id === mgrId);
        return mgr ? { id: mgr._id, name: mgr.name } : null;
      }).filter(Boolean);

      const existingAttachments = editTrainingAttachments
        .filter(att => !att.isNew)
        .map(({ isNew, file, ...rest }) => rest);

      const newFiles = editTrainingNewFiles;

      const updateData = {
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
        attachments: existingAttachments
      };

      console.log('Updating training with data:', updateData);
      console.log('New files to upload:', newFiles.length);

      // Make sure to use the imported trainingApi
      const response = await trainingApi.updateTraining(editingTraining._id, updateData, newFiles);

      if (response.success) {
        toast.success('Training session updated successfully');
        await fetchTrainingSessions();
        await fetchStats();
        setShowEditTrainingDialog(false);
        setEditingTraining(null);
        resetTrainingForm();
        setEditTrainingAttachments([]);
        setEditTrainingNewFiles([]);
      } else {
        throw new Error(response.message || 'Failed to update training');
      }
    } catch (error: any) {
      console.error('Error updating training:', error);
      toast.error(error.response?.data?.message || error.message || 'Error updating training session');
    }
  };

  const handleUpdateBriefing = async () => {
    if (!editingBriefing) return;

    try {
      const supervisorsList = briefingSelectedSupervisors.map(supId => {
        const sup = filteredSupervisors.find(s => s._id === supId);
        return sup ? { id: sup._id, name: sup.name } : null;
      }).filter(Boolean);

      const managersList = briefingSelectedManagers.map(mgrId => {
        const mgr = filteredManagers.find(m => m._id === mgrId);
        return mgr ? { id: mgr._id, name: mgr.name } : null;
      }).filter(Boolean);

      const actionItems = briefingForm.actionItems.map((item: any) => ({
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
        managers: managersList,
        attachments: existingAttachments
      };

      console.log('Updating briefing with data:', updateData);
      console.log('New files to upload:', newFiles.length);

      // Make sure to use the imported briefingApi
      const response = await briefingApi.updateBriefing(editingBriefing._id, updateData, newFiles);

      if (response.success) {
        toast.success('Staff briefing updated successfully');
        await fetchStaffBriefings();
        await fetchStats();
        setShowEditBriefingDialog(false);
        setEditingBriefing(null);
        resetBriefingForm();
        setEditBriefingAttachments([]);
        setEditBriefingNewFiles([]);
      } else {
        throw new Error(response.message || 'Failed to update briefing');
      }
    } catch (error: any) {
      console.error('Error updating briefing:', error);
      toast.error(error.response?.data?.message || error.message || 'Error updating staff briefing');
    }
  };

  const openEditTrainingDialog = (training: TrainingSession) => {
    setEditingTraining(training);
    setTrainingForm({
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
      objectives: training.objectives?.length ? training.objectives : ['']
    });
    setTrainingSelectedSupervisors(training.supervisors?.map(s => s.id) || []);
    setTrainingSelectedManagers(training.managers?.map(m => m.id) || []);

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
    setBriefingForm({
      date: briefing.date,
      time: briefing.time,
      conductedBy: briefing.conductedBy,
      site: briefing.site,
      department: briefing.department,
      attendeesCount: briefing.attendeesCount,
      topics: briefing.topics?.length ? briefing.topics : [''],
      keyPoints: briefing.keyPoints?.length ? briefing.keyPoints : [''],
      actionItems: briefing.actionItems || [],
      notes: briefing.notes,
      shift: briefing.shift
    });
    setBriefingSelectedSupervisors(briefing.supervisors?.map(s => s.id) || []);
    setBriefingSelectedManagers(briefing.managers?.map(m => m.id) || []);

    const existingAttachments = (briefing.attachments || []).map(att => ({
      ...att,
      isNew: false
    }));
    setEditBriefingAttachments(existingAttachments);
    setEditBriefingNewFiles([]);

    setShowEditBriefingDialog(true);
  };

  const resetTrainingForm = () => {
    setTrainingForm({
      title: '', description: '', type: 'safety', date: '', time: '', duration: '',
      trainer: '', site: '', department: 'All Departments', maxAttendees: 20, location: '', objectives: ['']
    });
    setTrainingSelectedSupervisors([]);
    setTrainingSelectedManagers([]);
    setTrainingSupervisorSearchQuery("");
    setTrainingManagerSearchQuery("");
    setTrainingAttachments([]);
  };

  const resetBriefingForm = () => {
    setBriefingForm({
      date: '', time: '', conductedBy: '', site: '', department: '', attendeesCount: 0,
      topics: [''], keyPoints: [''], actionItems: [], notes: '', shift: 'morning'
    });
    setBriefingSelectedSupervisors([]);
    setBriefingSelectedManagers([]);
    setBriefingSupervisorSearchQuery("");
    setBriefingManagerSearchQuery("");
    setBriefingAttachments([]);
  };

  const deleteTraining = async (id: string) => {
    try {
      await trainingApi.deleteTraining(id);
      await fetchTrainingSessions();
      await fetchStats();
      toast.success('Training session deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting training session');
    }
  };

  const deleteBriefing = async (id: string) => {
    try {
      await briefingApi.deleteBriefing(id);
      await fetchStaffBriefings();
      await fetchStats();
      toast.success('Staff briefing deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting staff briefing');
    }
  };

  const updateTrainingStatus = async (id: string, status: TrainingSession['status']) => {
    try {
      await trainingApi.updateTrainingStatus(id, status);
      await fetchTrainingSessions();
      await fetchStats();
      toast.success(`Training status updated to ${status}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating training status');
    }
  };

  const updateActionItemStatus = async (briefingId: string, actionItemId: string, status: string) => {
    try {
      await briefingApi.updateActionItemStatus(briefingId, actionItemId, status);
      await fetchStaffBriefings();
      await fetchStats();
      toast.success('Action item status updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error updating action item status');
    }
  };

  const addObjective = () => { setTrainingForm(prev => ({ ...prev, objectives: [...prev.objectives, ''] })); };
  const removeObjective = (index: number) => { setTrainingForm(prev => ({ ...prev, objectives: prev.objectives.filter((_, i) => i !== index) })); };
  const updateObjective = (index: number, value: string) => { const newObjectives = [...trainingForm.objectives]; newObjectives[index] = value; setTrainingForm(prev => ({ ...prev, objectives: newObjectives })); };
  const addTopic = () => { setBriefingForm(prev => ({ ...prev, topics: [...prev.topics, ''] })); };
  const removeTopic = (index: number) => { setBriefingForm(prev => ({ ...prev, topics: prev.topics.filter((_, i) => i !== index) })); };
  const updateTopic = (index: number, value: string) => { const newTopics = [...briefingForm.topics]; newTopics[index] = value; setBriefingForm(prev => ({ ...prev, topics: newTopics })); };
  const addKeyPoint = () => { setBriefingForm(prev => ({ ...prev, keyPoints: [...prev.keyPoints, ''] })); };
  const removeKeyPoint = (index: number) => { setBriefingForm(prev => ({ ...prev, keyPoints: prev.keyPoints.filter((_, i) => i !== index) })); };
  const updateKeyPoint = (index: number, value: string) => { const newKeyPoints = [...briefingForm.keyPoints]; newKeyPoints[index] = value; setBriefingForm(prev => ({ ...prev, keyPoints: newKeyPoints })); };
  const addActionItem = () => { setBriefingForm(prev => ({ ...prev, actionItems: [...prev.actionItems, { description: '', assignedTo: '', dueDate: '', status: 'pending', priority: 'medium' }] })); };
  const removeActionItem = (index: number) => { setBriefingForm(prev => ({ ...prev, actionItems: prev.actionItems.filter((_, i) => i !== index) })); };
  const updateActionItem = (index: number, field: string, value: string) => { const newActionItems = [...briefingForm.actionItems]; newActionItems[index] = { ...newActionItems[index], [field]: value }; setBriefingForm(prev => ({ ...prev, actionItems: newActionItems })); };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getShiftBadge = (shift: string) => {
    switch (shift) {
      case 'morning': return 'bg-blue-100 text-blue-800';
      case 'evening': return 'bg-purple-100 text-purple-800';
      case 'night': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    const found = trainingTypes.find(t => t.value === type);
    return found?.color || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const nextMonth = () => { setCurrentMonth(prev => { const newDate = new Date(prev); newDate.setMonth(newDate.getMonth() + 1); return newDate; }); };
  const prevMonth = () => { setCurrentMonth(prev => { const newDate = new Date(prev); newDate.setMonth(newDate.getMonth() - 1); return newDate; }); };
  const getCalendarEvents = () => {
    const events: any[] = [];
    siteFilteredTrainingSessions.forEach(session => {
      events.push({ id: session._id, title: session.title, date: session.date, type: 'training', color: 'bg-blue-500', session });
    });
    siteFilteredStaffBriefings.forEach(briefing => {
      events.push({ id: briefing._id, title: `Briefing - ${briefing.department}`, date: briefing.date, type: 'briefing', color: 'bg-green-500', briefing });
    });
    return events;
  };
  const calendarEvents = getCalendarEvents();
  const handleRefresh = () => { fetchTrainingSessions(); fetchStaffBriefings(); fetchStats(); toast.success('Data refreshed'); };

  const filteredTrainingSupervisors = filteredSupervisors.filter(sup => sup.name.toLowerCase().includes(trainingSupervisorSearchQuery.toLowerCase()) || (sup.department && sup.department.toLowerCase().includes(trainingSupervisorSearchQuery.toLowerCase())));
  const filteredTrainingManagers = filteredManagers.filter(mgr => mgr.name.toLowerCase().includes(trainingManagerSearchQuery.toLowerCase()) || (mgr.department && mgr.department.toLowerCase().includes(trainingManagerSearchQuery.toLowerCase())));
  const filteredBriefingSupervisors = filteredSupervisors.filter(sup => sup.name.toLowerCase().includes(briefingSupervisorSearchQuery.toLowerCase()) || (sup.department && sup.department.toLowerCase().includes(briefingSupervisorSearchQuery.toLowerCase())));
  const filteredBriefingManagers = filteredManagers.filter(mgr => mgr.name.toLowerCase().includes(briefingManagerSearchQuery.toLowerCase()) || (mgr.department && mgr.department.toLowerCase().includes(briefingManagerSearchQuery.toLowerCase())));

  // Training Edit Dialog
  const TrainingEditDialog = () => (
    <Dialog open={showEditTrainingDialog} onOpenChange={setShowEditTrainingDialog}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Training Session</DialogTitle>
          <DialogDescription>Update the training session details</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Title *</label><Input value={trainingForm.title} onChange={(e) => setTrainingForm(prev => ({ ...prev, title: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Type</label><Select value={trainingForm.type} onValueChange={(value: any) => setTrainingForm(prev => ({ ...prev, type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{trainingTypes.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent></Select></div>
            <div><label className="text-sm font-medium">Date *</label><Input type="date" value={trainingForm.date} onChange={(e) => setTrainingForm(prev => ({ ...prev, date: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Time</label><Input type="time" value={trainingForm.time} onChange={(e) => setTrainingForm(prev => ({ ...prev, time: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Duration</label><Input placeholder="e.g., 2 hours" value={trainingForm.duration} onChange={(e) => setTrainingForm(prev => ({ ...prev, duration: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Trainer *</label><Input value={trainingForm.trainer} onChange={(e) => setTrainingForm(prev => ({ ...prev, trainer: e.target.value }))} /></div>
          </div>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Site</label><Select value={trainingForm.site} onValueChange={(value) => setTrainingForm(prev => ({ ...prev, site: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sites.map(s => (<SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>))}</SelectContent></Select></div>
            <div><label className="text-sm font-medium">Department</label><Select value={trainingForm.department} onValueChange={(value) => setTrainingForm(prev => ({ ...prev, department: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{departments.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent></Select></div>
            <div><label className="text-sm font-medium">Max Attendees</label><Input type="number" value={trainingForm.maxAttendees} onChange={(e) => setTrainingForm(prev => ({ ...prev, maxAttendees: parseInt(e.target.value) || 1 }))} /></div>
            <div><label className="text-sm font-medium">Location</label><Input value={trainingForm.location} onChange={(e) => setTrainingForm(prev => ({ ...prev, location: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Description</label><Textarea value={trainingForm.description} onChange={(e) => setTrainingForm(prev => ({ ...prev, description: e.target.value }))} rows={3} /></div>
          </div>
        </div>



        {/* Training Objectives */}
        <div className="py-4 border-t">
          <div><label className="text-sm font-medium">Training Objectives</label><div className="space-y-2 mt-2">{trainingForm.objectives.map((objective, index) => (<div key={index} className="flex gap-2"><Input placeholder={`Objective ${index + 1}`} value={objective} onChange={(e) => updateObjective(index, e.target.value)} /><Button variant="ghost" size="sm" onClick={() => removeObjective(index)}><X className="h-4 w-4" /></Button></div>))}<Button variant="outline" size="sm" onClick={addObjective}><Plus className="h-4 w-4 mr-2" />Add Objective</Button></div></div>
        </div>

        {/* Training Attachments Section in Edit */}
        <div className="py-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Attachments</h3>
              <p className="text-xs text-gray-500">Upload training materials, photos, or videos</p>
            </div>
            <div>
              <input
                type="file"
                ref={editTrainingFileInputRef}
                multiple
                onChange={handleEditTrainingFileUpload}
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx"
              />
              <Button type="button" variant="outline" onClick={() => editTrainingFileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Add Files
              </Button>
            </div>
          </div>

          {editTrainingAttachments.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {editTrainingAttachments.map((att, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    {att.type === 'image' ? (
                      <ImageIcon className="h-5 w-5 text-blue-500" />
                    ) : att.type === 'video' ? (
                      <Video className="h-5 w-5 text-red-500" />
                    ) : (
                      <File className="h-5 w-5 text-gray-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.name}</p>
                      <p className="text-xs text-gray-500">{att.size}</p>
                    </div>
                    {att.url && !att.isNew && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(att.url, '_blank')}
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
                    onClick={() => removeEditTrainingAttachment(index)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter><Button onClick={handleUpdateTraining}>Update Training</Button><Button variant="outline" onClick={() => setShowEditTrainingDialog(false)}>Cancel</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Briefing Edit Dialog
  const BriefingEditDialog = () => (
    <Dialog open={showEditBriefingDialog} onOpenChange={setShowEditBriefingDialog}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Staff Briefing</DialogTitle>
          <DialogDescription>Update the staff briefing details</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Date *</label><Input type="date" value={briefingForm.date} onChange={(e) => setBriefingForm(prev => ({ ...prev, date: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Time</label><Input type="time" value={briefingForm.time} onChange={(e) => setBriefingForm(prev => ({ ...prev, time: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Shift</label><Select value={briefingForm.shift} onValueChange={(value: any) => setBriefingForm(prev => ({ ...prev, shift: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{shifts.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select></div>
            <div><label className="text-sm font-medium">Conducted By *</label><Input value={briefingForm.conductedBy} onChange={(e) => setBriefingForm(prev => ({ ...prev, conductedBy: e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Site *</label><Select value={briefingForm.site} onValueChange={(value) => setBriefingForm(prev => ({ ...prev, site: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sites.map(s => (<SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>))}</SelectContent></Select></div>
            <div><label className="text-sm font-medium">Department</label><Select value={briefingForm.department} onValueChange={(value) => setBriefingForm(prev => ({ ...prev, department: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{departments.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent></Select></div>
            <div><label className="text-sm font-medium">Attendees Count</label><Input type="number" value={briefingForm.attendeesCount} onChange={(e) => setBriefingForm(prev => ({ ...prev, attendeesCount: parseInt(e.target.value) || 0 }))} /></div>
          </div>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Topics</label>{briefingForm.topics.map((topic, idx) => (<div key={idx} className="flex gap-2 mb-2"><Input value={topic} onChange={(e) => updateTopic(idx, e.target.value)} placeholder={`Topic ${idx + 1}`} /><Button variant="ghost" size="sm" onClick={() => removeTopic(idx)}><X className="h-4 w-4" /></Button></div>))}<Button variant="outline" size="sm" onClick={addTopic}><Plus className="h-4 w-4 mr-2" />Add Topic</Button></div>
            <div><label className="text-sm font-medium">Key Points</label>{briefingForm.keyPoints.map((point, idx) => (<div key={idx} className="flex gap-2 mb-2"><Input value={point} onChange={(e) => updateKeyPoint(idx, e.target.value)} placeholder={`Key Point ${idx + 1}`} /><Button variant="ghost" size="sm" onClick={() => removeKeyPoint(idx)}><X className="h-4 w-4" /></Button></div>))}<Button variant="outline" size="sm" onClick={addKeyPoint}><Plus className="h-4 w-4 mr-2" />Add Key Point</Button></div>
            <div><label className="text-sm font-medium">Notes</label><Textarea value={briefingForm.notes} onChange={(e) => setBriefingForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} /></div>
          </div>
        </div>




        {/* Action Items Section in Edit */}
        <div className="py-4 border-t">
          <div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-semibold">Action Items</h3><p className="text-xs text-gray-500">Add tasks assigned during briefing</p></div><Button type="button" variant="outline" onClick={addActionItem}><Plus className="h-4 w-4 mr-2" />Add Item</Button></div>
          {briefingForm.actionItems.map((item, idx) => (<div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded mb-2"><Input placeholder="Description" value={item.description} onChange={(e) => updateActionItem(idx, 'description', e.target.value)} /><Input placeholder="Assigned To" value={item.assignedTo} onChange={(e) => updateActionItem(idx, 'assignedTo', e.target.value)} /><Input type="date" value={item.dueDate} onChange={(e) => updateActionItem(idx, 'dueDate', e.target.value)} /><Select value={item.priority} onValueChange={(v) => updateActionItem(idx, 'priority', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{priorities.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><Button variant="ghost" size="sm" onClick={() => removeActionItem(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>))}
        </div>

        {/* Briefing Attachments Section in Edit */}
        <div className="py-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Attachments</h3>
              <p className="text-xs text-gray-500">Upload photos, documents, or other files</p>
            </div>
            <div>
              <input
                type="file"
                ref={editBriefingFileInputRef}
                multiple
                onChange={handleEditBriefingFileUpload}
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx"
              />
              <Button type="button" variant="outline" onClick={() => editBriefingFileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Add Files
              </Button>
            </div>
          </div>

          {editBriefingAttachments.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {editBriefingAttachments.map((att, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    {att.type === 'image' ? (
                      <ImageIcon className="h-5 w-5 text-blue-500" />
                    ) : att.type === 'video' ? (
                      <Video className="h-5 w-5 text-red-500" />
                    ) : (
                      <File className="h-5 w-5 text-gray-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.name}</p>
                      <p className="text-xs text-gray-500">{att.size}</p>
                    </div>
                    {att.url && !att.isNew && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(att.url, '_blank')}
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
                    onClick={() => removeEditBriefingAttachment(index)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter><Button onClick={handleUpdateBriefing}>Update Briefing</Button><Button variant="outline" onClick={() => setShowEditBriefingDialog(false)}>Cancel</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
          <div><h1 className="text-2xl md:text-3xl font-bold text-gray-900">Training & Staff Briefing</h1><p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">Manage training sessions and daily staff briefings</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size={isMobileView ? "sm" : "default"} onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} disabled={loading}>{viewMode === 'list' ? (<><CalendarDays className="h-4 w-4 mr-2" />{!isMobileView && "Calendar View"}{isMobileView && "Calendar"}</>) : (<><ListIcon className="h-4 w-4 mr-2" />{!isMobileView && "List View"}{isMobileView && "List"}</>)}</Button>
            <Button variant="outline" size={isMobileView ? "sm" : "default"} onClick={handleRefresh} disabled={loading}><RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />{!isMobileView && "Refresh"}</Button>

            {/* Add Training Dialog */}
            <Dialog open={showAddTraining} onOpenChange={setShowAddTraining}>
              <DialogTrigger asChild><Button size={isMobileView ? "sm" : "default"}><Plus className="h-4 w-4 mr-2" />{!isMobileView && "Add Training"}{isMobileView && "Training"}</Button></DialogTrigger>
              <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add New Training Session</DialogTitle><DialogDescription>Schedule a new training session for your team.</DialogDescription></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-3">
                    <div><label className="text-sm font-medium">Title *</label><Input value={trainingForm.title} onChange={(e) => setTrainingForm(prev => ({ ...prev, title: e.target.value }))} /></div>
                    <div><label className="text-sm font-medium">Type</label><Select value={trainingForm.type} onValueChange={(value: any) => setTrainingForm(prev => ({ ...prev, type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{trainingTypes.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent></Select></div>
                    <div><label className="text-sm font-medium">Date *</label><Input type="date" value={trainingForm.date} onChange={(e) => setTrainingForm(prev => ({ ...prev, date: e.target.value }))} /></div>
                    <div><label className="text-sm font-medium">Time</label><Input type="time" value={trainingForm.time} onChange={(e) => setTrainingForm(prev => ({ ...prev, time: e.target.value }))} /></div>
                    <div><label className="text-sm font-medium">Duration</label><Input placeholder="e.g., 2 hours" value={trainingForm.duration} onChange={(e) => setTrainingForm(prev => ({ ...prev, duration: e.target.value }))} /></div>
                    <div><label className="text-sm font-medium">Trainer *</label><Input value={trainingForm.trainer} onChange={(e) => setTrainingForm(prev => ({ ...prev, trainer: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-3">
                    <div><label className="text-sm font-medium">Site</label><Select value={trainingForm.site} onValueChange={(value) => setTrainingForm(prev => ({ ...prev, site: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sites.map(s => (<SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>))}</SelectContent></Select></div>
                    <div><label className="text-sm font-medium">Department</label><Select value={trainingForm.department} onValueChange={(value) => setTrainingForm(prev => ({ ...prev, department: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{departments.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent></Select></div>
                    <div><label className="text-sm font-medium">Max Attendees</label><Input type="number" value={trainingForm.maxAttendees} onChange={(e) => setTrainingForm(prev => ({ ...prev, maxAttendees: parseInt(e.target.value) || 1 }))} /></div>
                    <div><label className="text-sm font-medium">Location</label><Input value={trainingForm.location} onChange={(e) => setTrainingForm(prev => ({ ...prev, location: e.target.value }))} /></div>
                    <div><label className="text-sm font-medium">Description</label><Textarea value={trainingForm.description} onChange={(e) => setTrainingForm(prev => ({ ...prev, description: e.target.value }))} rows={3} /></div>
                  </div>
                </div>





                {/* Training Objectives */}
                <div className="py-4 border-t">
                  <div><label className="text-sm font-medium">Training Objectives</label><div className="space-y-2 mt-2">{trainingForm.objectives.map((objective, index) => (<div key={index} className="flex gap-2"><Input placeholder={`Objective ${index + 1}`} value={objective} onChange={(e) => updateObjective(index, e.target.value)} /><Button variant="ghost" size="sm" onClick={() => removeObjective(index)}><X className="h-4 w-4" /></Button></div>))}<Button variant="outline" size="sm" onClick={addObjective}><Plus className="h-4 w-4 mr-2" />Add Objective</Button></div></div>
                </div>

                {/* Training Attachments */}
                <div className="py-4 border-t">
                  <div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-semibold">Attachments</h3><p className="text-xs text-gray-500">Upload training materials, photos, or videos</p></div><div><input type="file" ref={trainingFileInputRef} multiple onChange={handleTrainingFileUpload} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx" /><Button type="button" variant="outline" onClick={() => trainingFileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" />Upload Files</Button></div></div>
                  {trainingAttachments.length > 0 && (<div className="space-y-2 max-h-40 overflow-y-auto">{trainingAttachments.map((file, index) => (<div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-3 flex-1">{file.type.startsWith('image/') ? <ImageIcon className="h-5 w-5 text-blue-500" /> : file.type.startsWith('video/') ? <Video className="h-5 w-5 text-red-500" /> : <File className="h-5 w-5 text-gray-500" />}<div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{file.name}</p><p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</p></div></div><Button variant="ghost" size="sm" onClick={() => removeTrainingAttachment(index)} className="h-8 w-8 p-0"><Trash2 className="h-4 w-4 text-red-500" /></Button></div>))}</div>)}
                </div>

                <DialogFooter><Button onClick={handleAddTraining}>Add Training</Button><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose></DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Briefing Dialog */}
            <Dialog open={showAddBriefing} onOpenChange={setShowAddBriefing}>
              <DialogTrigger asChild><Button variant="secondary" size={isMobileView ? "sm" : "default"}><Plus className="h-4 w-4 mr-2" />{!isMobileView && "Add Briefing"}{isMobileView && "Briefing"}</Button></DialogTrigger>
              <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add New Staff Briefing</DialogTitle><DialogDescription>Record daily staff briefing details and action items.</DialogDescription></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-3">
                    <div><label className="text-sm font-medium">Date *</label><Input type="date" value={briefingForm.date} onChange={(e) => setBriefingForm(prev => ({ ...prev, date: e.target.value }))} /></div>
                    <div><label className="text-sm font-medium">Time</label><Input type="time" value={briefingForm.time} onChange={(e) => setBriefingForm(prev => ({ ...prev, time: e.target.value }))} /></div>
                    <div><label className="text-sm font-medium">Shift</label><Select value={briefingForm.shift} onValueChange={(value: any) => setBriefingForm(prev => ({ ...prev, shift: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{shifts.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select></div>
                    <div><label className="text-sm font-medium">Conducted By *</label><Input value={briefingForm.conductedBy} onChange={(e) => setBriefingForm(prev => ({ ...prev, conductedBy: e.target.value }))} /></div>
                    <div><label className="text-sm font-medium">Site *</label><Select value={briefingForm.site} onValueChange={(value) => setBriefingForm(prev => ({ ...prev, site: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sites.map(s => (<SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>))}</SelectContent></Select></div>
                    <div><label className="text-sm font-medium">Department</label><Select value={briefingForm.department} onValueChange={(value) => setBriefingForm(prev => ({ ...prev, department: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{departments.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent></Select></div>
                    <div><label className="text-sm font-medium">Attendees Count</label><Input type="number" value={briefingForm.attendeesCount} onChange={(e) => setBriefingForm(prev => ({ ...prev, attendeesCount: parseInt(e.target.value) || 0 }))} /></div>
                  </div>
                  <div className="space-y-3">
                    <div><label className="text-sm font-medium">Topics</label>{briefingForm.topics.map((topic, idx) => (<div key={idx} className="flex gap-2 mb-2"><Input value={topic} onChange={(e) => updateTopic(idx, e.target.value)} placeholder={`Topic ${idx + 1}`} /><Button variant="ghost" size="sm" onClick={() => removeTopic(idx)}><X className="h-4 w-4" /></Button></div>))}<Button variant="outline" size="sm" onClick={addTopic}><Plus className="h-4 w-4 mr-2" />Add Topic</Button></div>
                    <div><label className="text-sm font-medium">Key Points</label>{briefingForm.keyPoints.map((point, idx) => (<div key={idx} className="flex gap-2 mb-2"><Input value={point} onChange={(e) => updateKeyPoint(idx, e.target.value)} placeholder={`Key Point ${idx + 1}`} /><Button variant="ghost" size="sm" onClick={() => removeKeyPoint(idx)}><X className="h-4 w-4" /></Button></div>))}<Button variant="outline" size="sm" onClick={addKeyPoint}><Plus className="h-4 w-4 mr-2" />Add Key Point</Button></div>
                    <div><label className="text-sm font-medium">Notes</label><Textarea value={briefingForm.notes} onChange={(e) => setBriefingForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} /></div>
                  </div>
                </div>





                {/* Action Items */}
                <div className="py-4 border-t">
                  <div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-semibold">Action Items</h3><p className="text-xs text-gray-500">Add tasks assigned during briefing</p></div><Button type="button" variant="outline" onClick={addActionItem}><Plus className="h-4 w-4 mr-2" />Add Item</Button></div>
                  {briefingForm.actionItems.map((item, idx) => (<div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded mb-2"><Input placeholder="Description" value={item.description} onChange={(e) => updateActionItem(idx, 'description', e.target.value)} /><Input placeholder="Assigned To" value={item.assignedTo} onChange={(e) => updateActionItem(idx, 'assignedTo', e.target.value)} /><Input type="date" value={item.dueDate} onChange={(e) => updateActionItem(idx, 'dueDate', e.target.value)} /><Select value={item.priority} onValueChange={(v) => updateActionItem(idx, 'priority', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{priorities.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><Button variant="ghost" size="sm" onClick={() => removeActionItem(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>))}
                </div>

                {/* Briefing Attachments */}
                <div className="py-4 border-t">
                  <div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-semibold">Attachments</h3><p className="text-xs text-gray-500">Upload photos, documents, or other files</p></div><div><input type="file" ref={briefingFileInputRef} multiple onChange={handleBriefingFileUpload} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx" /><Button type="button" variant="outline" onClick={() => briefingFileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" />Upload Files</Button></div></div>
                  {briefingAttachments.length > 0 && (<div className="space-y-2 max-h-40 overflow-y-auto">{briefingAttachments.map((file, index) => (<div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-3 flex-1">{file.type.startsWith('image/') ? <ImageIcon className="h-5 w-5 text-blue-500" /> : file.type.startsWith('video/') ? <Video className="h-5 w-5 text-red-500" /> : <File className="h-5 w-5 text-gray-500" />}<div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{file.name}</p><p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</p></div></div><Button variant="ghost" size="sm" onClick={() => removeBriefingAttachment(index)} className="h-8 w-8 p-0"><Trash2 className="h-4 w-4 text-red-500" /></Button></div>))}</div>)}
                </div>

                <DialogFooter><Button onClick={handleAddBriefing}>Add Briefing</Button><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {isMobileView ? (<><MobileStatCard title="Total Trainings" value={filteredStats.totalTrainings} icon={Calendar} color="blue" /><MobileStatCard title="Staff Briefings" value={filteredStats.totalBriefings} icon={Users} color="green" /><MobileStatCard title="Completed" value={filteredStats.completedTraining} icon={CheckCircle} color="purple" /><MobileStatCard title="Pending Actions" value={filteredStats.pendingActions} icon={AlertCircle} color="red" /></>) : (<><Card><CardContent className="p-6"><div><p className="text-sm text-gray-600">Total Training Sessions</p><p className="text-2xl font-bold">{filteredStats.totalTrainings}</p></div><div className="p-3 bg-blue-100 rounded-full"><Calendar className="h-6 w-6 text-blue-600" /></div></CardContent></Card><Card><CardContent className="p-6"><div><p className="text-sm text-gray-600">Staff Briefings</p><p className="text-2xl font-bold">{filteredStats.totalBriefings}</p></div><div className="p-3 bg-green-100 rounded-full"><Users className="h-6 w-6 text-green-600" /></div></CardContent></Card><Card><CardContent className="p-6"><div><p className="text-sm text-gray-600">Completed Training</p><p className="text-2xl font-bold">{filteredStats.completedTraining}</p></div><div className="p-3 bg-purple-100 rounded-full"><CheckCircle className="h-6 w-6 text-purple-600" /></div></CardContent></Card><Card><CardContent className="p-6"><div><p className="text-sm text-gray-600">Pending Actions</p><p className="text-2xl font-bold">{filteredStats.pendingActions}</p></div><div className="p-3 bg-red-100 rounded-full"><AlertCircle className="h-6 w-6 text-red-600" /></div></CardContent></Card></>)}
        </div>
      </motion.div>

      {(() => {
        if (loading && viewMode === 'list') {
          return <div className="flex justify-center py-16"><RefreshCw className="h-8 w-8 animate-spin text-blue-500" /></div>;
        }
        if (viewMode === 'list') {
          return (
            <>
              {/* Your entire list view content – Tabs, filters, etc. */}
              <Tabs defaultValue="briefing" onValueChange={(v: any) => setActiveTab(v)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="training">Training</TabsTrigger>
                  <TabsTrigger value="briefing">Briefings</TabsTrigger>
                </TabsList>
              </Tabs>
              <Card className="mt-4">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <Search className="h-4 w-4" />
                      <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {departments.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {activeTab === 'training' && (
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="ongoing">Ongoing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <AnimatePresence>
                {activeTab === 'training' ? (
                  <motion.div key="training">
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle>Training Sessions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {filteredTrainingSessions.length === 0 ? (
                          <div className="text-center py-12">
                            <Calendar className="h-12 w-12 mx-auto text-gray-300" />
                            <p>No training sessions found</p>
                          </div>
                        ) : isMobileView ? (
                          <div className="space-y-3">
                            {filteredTrainingSessions.map(s => (
                              <MobileTrainingCard
                                key={s._id}
                                session={s}
                                onView={(s) => setSelectedTraining(s)}
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
                        ) : (
                          <div className="space-y-4">
                            {filteredTrainingSessions.map(s => (
                              <Card key={s._id}>
                                <CardContent className="p-4">
                                  <div className="flex justify-between">
                                    <div>
                                      <h3 className="font-semibold">{s.title}</h3>
                                      <p className="text-sm text-gray-600">{s.trainer}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <Badge className={getTypeColor(s.type)}>
                                        {trainingTypes.find(t => t.value === s.type)?.label}
                                      </Badge>
                                      <Badge className={getStatusBadge(s.status)}>
                                        {s.status}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-4 gap-4 mt-4">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span className="text-xs">{formatDate(s.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span className="text-xs">{s.time}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Building className="h-3 w-3" />
                                      <span className="text-xs">{s.site}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      <span className="text-xs">{s.attendees?.length}/{s.maxAttendees}</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2 mt-4">
                                    <Button variant="outline" size="sm" onClick={() => setSelectedTraining(s)}>
                                      <Eye className="h-4 w-4 mr-1" />View
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => openEditTrainingDialog(s)}>
                                      <Edit className="h-4 w-4 mr-1" />Edit
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => deleteTraining(s._id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div key="briefing">
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle>Staff Briefings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {filteredStaffBriefings.length === 0 ? (
                          <div className="text-center py-12">
                            <MessageSquare className="h-12 w-12 mx-auto text-gray-300" />
                            <p>No staff briefings found</p>
                          </div>
                        ) : isMobileView ? (
                          <div className="space-y-3">
                            {filteredStaffBriefings.map(b => (
                              <MobileBriefingCard
                                key={b._id}
                                briefing={b}
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
                        ) : (
                          <div className="space-y-4">
                            {filteredStaffBriefings.map(b => (
                              <Card key={b._id}>
                                <CardContent className="p-4">
                                  <div className="flex justify-between">
                                    <div>
                                      <h3 className="font-semibold">{b.site}</h3>
                                      <p className="text-sm text-gray-600">by {b.conductedBy}</p>
                                    </div>
                                    <Badge className={getShiftBadge(b.shift)}>{b.shift}</Badge>
                                  </div>
                                  <div className="grid grid-cols-3 gap-4 mt-4">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span className="text-xs">{formatDate(b.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span className="text-xs">{b.time}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      <span className="text-xs">{b.attendeesCount} attendees</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2 mt-4">
                                    <Button variant="outline" size="sm" onClick={() => setSelectedBriefing(b)}>
                                      <Eye className="h-4 w-4 mr-1" />View
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => openEditBriefingDialog(b)}>
                                      <Edit className="h-4 w-4 mr-1" />Edit
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => deleteBriefing(b._id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          );
        }
        // Calendar view
        return (
          <Card>
            <CardHeader>
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
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-medium text-gray-500 dark:text-gray-400 py-2 text-xs sm:text-sm">
                    {isMobileView ? day.slice(0, 1) : day}
                  </div>
                ))}
              </div>

              {(() => {
                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

                const eventsByDate: Record<string, any[]> = {};
                calendarEvents.forEach(ev => {
                  const key = new Date(ev.date).toDateString();
                  if (!eventsByDate[key]) eventsByDate[key] = [];
                  eventsByDate[key].push(ev);
                });

                return (
                  <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {[...Array(totalCells)].map((_, idx) => {
                      const dayNumber = idx - firstDay + 1;
                      const isValid = dayNumber >= 1 && dayNumber <= daysInMonth;
                      const dateObj = isValid ? new Date(year, month, dayNumber) : null;
                      const dateKey = dateObj?.toDateString();
                      const dayEvents = dateKey ? eventsByDate[dateKey] || [] : [];

                      return (
                        <div
                          key={idx}
                          className={`aspect-square border rounded p-1 sm:p-2 text-xs sm:text-sm transition-colors ${isValid
                            ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
                            : 'opacity-0 pointer-events-none'
                            }`}
                          onClick={() => {
                            if (isValid && dayEvents.length > 0) {
                              setSelectedDateEvents({ date: dateObj!, events: dayEvents });
                            }
                          }}
                        >

                          {isValid && (
                            <>
                              <div className="text-right text-gray-600 dark:text-gray-400">{dayNumber}</div>
                              {dayEvents.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                                  {dayEvents.slice(0, 3).map((ev, i) => (
                                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${ev.color}`} />
                                  ))}
                                  {dayEvents.length > 3 && (
                                    <span className="text-[8px] text-gray-400">+{dayEvents.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

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
        );
      })()}
      {selectedDateEvents && (
        <Dialog open={!!selectedDateEvents} onOpenChange={() => setSelectedDateEvents(null)}>
          <DialogContent className="max-w-lg w-[95vw] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Events on {selectedDateEvents.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </DialogTitle>
              <DialogDescription>Click on any event to view details</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              {selectedDateEvents.events.map(ev => (
                <Card key={ev.id} className="cursor-pointer hover:bg-gray-50" onClick={() => {
                  if (ev.type === 'training') {
                    setSelectedTraining(ev.session);
                  } else {
                    setSelectedBriefing(ev.briefing);
                  }
                  setSelectedDateEvents(null);
                }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{ev.title}</p>
                      <p className="text-sm text-gray-500">{ev.type === 'training' ? 'Training' : 'Briefing'}</p>
                    </div>
                    <Badge variant={ev.type === 'training' ? 'default' : 'secondary'}>
                      {ev.type}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              {selectedDateEvents.events.length === 0 && (
                <p className="text-center text-gray-500">No events on this day</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDateEvents(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {/* Detail Dialogs */}
      <TrainingDetailDialog training={selectedTraining} open={!!selectedTraining} onClose={() => setSelectedTraining(null)} onEdit={openEditTrainingDialog} onUpdateStatus={updateTrainingStatus} />
      <BriefingDetailDialog briefing={selectedBriefing} open={!!selectedBriefing} onClose={() => setSelectedBriefing(null)} onEdit={openEditBriefingDialog} onUpdateAction={updateActionItemStatus} />
      <TrainingEditDialog />
      <BriefingEditDialog />
    </div>
  );
};

export default TrainingAndBriefing;
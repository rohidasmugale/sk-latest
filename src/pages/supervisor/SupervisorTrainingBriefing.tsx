//SupervisorTrainingBriefing.tsx
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
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
  Calendar, Clock, Users, Image as ImageIcon, Video, File, CheckCircle, XCircle,
  Plus, Search, Filter, Download, Eye, Edit, Trash2, Upload, CalendarDays,
  User, Building, Target, MessageSquare, AlertCircle, ChevronRight, ChevronLeft,
  CheckSquare, Square, X, RefreshCw, MoreVertical, ChevronDown, ChevronUp, List,
  UserCheck, UserCog, Loader2, ExternalLink, Download as DownloadIcon,
  Menu, Camera
} from "lucide-react";
import { format } from 'date-fns';
import { useRole } from "@/context/RoleContext";
import { trainingApi } from '@/api/trainingApi';
import { briefingApi } from '@/api/briefingApi';
import { siteService, Site } from '@/services/SiteService';
import assignTaskService, { AssignTask } from '@/services/assignTaskService';
import axios from "axios";
import { useOutletContext } from 'react-router-dom';
import CameraCapture from './CameraCapture';

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

// Types (same as original, but Attachment extended with metadata)
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
  location?: { lat: number; lng: number };
  capturedAt?: string;
}

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
  location?: { lat: number; lng: number };
  capturedAt?: string;
}

// ✅ Departments restricted to 4
const departments = ['Housekeeping', 'Security', 'Waste Management', 'Parking Management'];

const trainingTypes = [
  { value: 'safety', label: 'Safety Training', color: 'bg-red-100 text-red-800' },
  { value: 'technical', label: 'Technical Training', color: 'bg-blue-100 text-blue-800' },
  { value: 'soft_skills', label: 'Soft Skills', color: 'bg-green-100 text-green-800' },
  { value: 'compliance', label: 'Compliance', color: 'bg-purple-100 text-purple-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
];
const shifts = ['morning', 'evening', 'night'];
const priorities = ['low', 'medium', 'high'];

// Helper to get current location
const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) reject("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err.message)
    );
  });
};

// ========== Memoized Components ==========
const AttachmentViewer = memo(({ attachment, onClose }: { attachment: any; onClose: () => void }) => {
  const isImage = attachment.type === 'image' || attachment.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isVideo = attachment.type === 'video' || attachment.url?.match(/\.(mp4|mov|avi|webm)$/i);
  const isPDF = attachment.url?.match(/\.pdf$/i);
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-auto">
        <DialogHeader><DialogTitle>{attachment.name}</DialogTitle><DialogDescription>File size: {attachment.size}</DialogDescription></DialogHeader>
        <div className="mt-4">
          {isImage && <img src={attachment.url} alt={attachment.name} className="max-w-full h-auto rounded-lg" />}
          {isVideo && <video controls className="w-full rounded-lg"><source src={attachment.url} /></video>}
          {isPDF && <iframe src={attachment.url} className="w-full h-[70vh] rounded-lg" title={attachment.name} />}
          {!isImage && !isVideo && !isPDF && (
            <div className="text-center py-12">
              <File className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Preview not available</p>
              <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg"><DownloadIcon className="h-4 w-4" /> Download</a>
            </div>
          )}
        </div>
        <DialogFooter>
          <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg"><ExternalLink className="h-4 w-4" /> Open in New Tab</a>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
AttachmentViewer.displayName = 'AttachmentViewer';

// Training Detail Dialog (unchanged, but uses updated Attachment type)
const TrainingDetailDialog = memo(({ training, open, onClose, onEdit, onUpdateStatus, getStatusBadge, getTypeColor, formatDate, trainingTypes }: any) => {
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);
  if (!training) return null;
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Training Session Details</DialogTitle></DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
              <div className="flex justify-between"><div><h2 className="text-xl font-bold">{training.title}</h2><p className="text-gray-600">{training.description}</p></div><div className="flex gap-2"><Badge className={getTypeColor(training.type)}>{trainingTypes.find((t: any) => t.value === training.type)?.label}</Badge><Badge className={getStatusBadge(training.status)}>{training.status}</Badge></div></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-xs">Date & Time</label><div className="flex items-center gap-2 p-2 bg-gray-50 rounded"><Calendar className="h-4 w-4" /><span>{formatDate(training.date)} at {training.time}</span></div></div>
              <div><label className="text-xs">Duration</label><div className="flex items-center gap-2 p-2 bg-gray-50 rounded"><Clock className="h-4 w-4" /><span>{training.duration}</span></div></div>
              <div><label className="text-xs">Trainer</label><div className="flex items-center gap-2 p-2 bg-gray-50 rounded"><User className="h-4 w-4" /><span>{training.trainer}</span></div></div>
              <div><label className="text-xs">Location</label><div className="flex items-center gap-2 p-2 bg-gray-50 rounded"><Target className="h-4 w-4" /><span>{training.location}</span></div></div>
              <div><label className="text-xs">Site</label><div className="flex items-center gap-2 p-2 bg-gray-50 rounded"><Building className="h-4 w-4" /><span>{training.site}</span></div></div>
              <div><label className="text-xs">Department</label><div className="flex items-center gap-2 p-2 bg-gray-50 rounded"><Users className="h-4 w-4" /><span>{training.department}</span></div></div>
              <div><label className="text-xs">Max Attendees</label><div className="flex items-center gap-2 p-2 bg-gray-50 rounded"><Users className="h-4 w-4" /><span>{training.maxAttendees}</span></div></div>
              <div><label className="text-xs">Current Attendees</label><div className="flex items-center gap-2 p-2 bg-gray-50 rounded"><Users className="h-4 w-4" /><span>{training.attendees?.length || 0}</span></div></div>
            </div>
            {training.supervisors?.length > 0 && (<div><h4 className="font-semibold text-sm mb-2">Supervisors</h4><div className="flex flex-wrap gap-2">{training.supervisors.map((sup: any, idx: number) => (<Badge key={idx} variant="outline"><User className="h-3 w-3 mr-1" />{sup.name}</Badge>))}</div></div>)}
            {training.managers?.length > 0 && (<div><h4 className="font-semibold text-sm mb-2">Managers</h4><div className="flex flex-wrap gap-2">{training.managers.map((mgr: any, idx: number) => (<Badge key={idx} variant="outline"><UserCog className="h-3 w-3 mr-1" />{mgr.name}</Badge>))}</div></div>)}
            {training.objectives?.length > 0 && (<div><h4 className="font-semibold text-sm mb-2">Objectives</h4><ul className="list-disc pl-5">{training.objectives.map((obj: string, idx: number) => (<li key={idx} className="text-sm">{obj}</li>))}</ul></div>)}
            {training.attachments?.length > 0 && (<div><h4 className="font-semibold text-sm mb-2">Attachments</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{training.attachments.map((att: any, idx: number) => (<div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer" onClick={() => setSelectedAttachment(att)}><div className="flex items-center gap-2">{att.type === 'image' ? <ImageIcon className="h-4 w-4 text-blue-500" /> : <File className="h-4 w-4 text-gray-500" />}<span className="text-sm truncate">{att.name}</span></div><Eye className="h-4 w-4" /></div>))}</div></div>)}
            <div className="border-t pt-4 text-xs text-gray-500"><div>Created: {formatDate(training.createdAt)}</div><div>Last Updated: {formatDate(training.updatedAt)}</div>{training.createdBy && <div>Created By: {training.createdBy}</div>}</div>
            <div className="flex gap-3 pt-4"><Button onClick={() => { onClose(); onEdit(training); }} className="flex-1"><Edit className="h-4 w-4 mr-2" />Edit</Button><Select value={training.status} onValueChange={(value) => onUpdateStatus(training._id, value)}><SelectTrigger className="flex-1"><SelectValue placeholder="Update Status" /></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="ongoing">Ongoing</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select><Button variant="outline" onClick={onClose}>Close</Button></div>
          </div>
        </DialogContent>
      </Dialog>
      {selectedAttachment && <AttachmentViewer attachment={selectedAttachment} onClose={() => setSelectedAttachment(null)} />}
    </>
  );
});
TrainingDetailDialog.displayName = 'TrainingDetailDialog';

// Briefing Detail Dialog (unchanged)
const BriefingDetailDialog = memo(({ briefing, open, onClose, onEdit, onUpdateAction, getShiftBadge, getPriorityBadge, formatDate }: any) => {
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);
  if (!briefing) return null;
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Staff Briefing Details</DialogTitle></DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4">
              <div className="flex justify-between"><div><h2 className="text-xl font-bold">{briefing.site}</h2><p className="text-gray-600">Conducted by: {briefing.conductedBy}</p></div><Badge className={getShiftBadge(briefing.shift)}>{briefing.shift} shift</Badge></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-xs">Date & Time</label><div className="flex items-center gap-2 p-2 bg-gray-50 rounded"><Calendar className="h-4 w-4" /><span>{formatDate(briefing.date)} at {briefing.time}</span></div></div>
              <div><label className="text-xs">Attendees</label><div className="flex items-center gap-2 p-2 bg-gray-50 rounded"><Users className="h-4 w-4" /><span>{briefing.attendeesCount} staff</span></div></div>
              <div><label className="text-xs">Department</label><div className="flex items-center gap-2 p-2 bg-gray-50 rounded"><Building className="h-4 w-4" /><span>{briefing.department}</span></div></div>
            </div>
            {briefing.supervisors?.length > 0 && (<div><h4 className="font-semibold text-sm mb-2">Supervisors</h4><div className="flex flex-wrap gap-2">{briefing.supervisors.map((sup: any, idx: number) => (<Badge key={idx} variant="outline"><User className="h-3 w-3 mr-1" />{sup.name}</Badge>))}</div></div>)}
            {briefing.managers?.length > 0 && (<div><h4 className="font-semibold text-sm mb-2">Managers</h4><div className="flex flex-wrap gap-2">{briefing.managers.map((mgr: any, idx: number) => (<Badge key={idx} variant="outline"><UserCog className="h-3 w-3 mr-1" />{mgr.name}</Badge>))}</div></div>)}
            {briefing.topics?.length > 0 && (<div><h4 className="font-semibold text-sm mb-2">Topics</h4><div className="flex flex-wrap gap-2">{briefing.topics.map((t: string, idx: number) => (<Badge key={idx} variant="outline">{t}</Badge>))}</div></div>)}
            {briefing.keyPoints?.length > 0 && (<div><h4 className="font-semibold text-sm mb-2">Key Points</h4><ul className="list-disc pl-5">{briefing.keyPoints.map((p: string, idx: number) => (<li key={idx} className="text-sm">{p}</li>))}</ul></div>)}
            {briefing.actionItems?.length > 0 && (<div><h4 className="font-semibold text-sm mb-2">Action Items</h4><div className="space-y-2">{briefing.actionItems.map((item: any, idx: number) => (<div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded"><Button variant="ghost" size="icon" className="h-6 w-6 mt-1" onClick={() => onUpdateAction(briefing._id, item._id || item.id, item.status === 'completed' ? 'pending' : 'completed')}>{item.status === 'completed' ? <CheckSquare className="h-4 w-4 text-green-500" /> : <Square className="h-4 w-4 text-gray-400" />}</Button><div className="flex-1"><p className="font-medium text-sm">{item.description}</p><div className="flex gap-3 text-xs"><span>Assigned to: {item.assignedTo}</span><span>Due: {formatDate(item.dueDate)}</span></div></div><Badge className={getPriorityBadge(item.priority)}>{item.priority}</Badge></div>))}</div></div>)}
            {briefing.notes && (<div><h4 className="font-semibold text-sm mb-2">Notes</h4><div className="p-3 bg-gray-50 rounded">{briefing.notes}</div></div>)}
            {briefing.attachments?.length > 0 && (<div><h4 className="font-semibold text-sm mb-2">Attachments</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{briefing.attachments.map((att: any, idx: number) => (<div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer" onClick={() => setSelectedAttachment(att)}><div className="flex items-center gap-2">{att.type === 'image' ? <ImageIcon className="h-4 w-4 text-blue-500" /> : <File className="h-4 w-4 text-gray-500" />}<span className="text-sm truncate">{att.name}</span></div><Eye className="h-4 w-4" /></div>))}</div></div>)}
            <div className="border-t pt-4 text-xs text-gray-500"><div>Created: {formatDate(briefing.createdAt)}</div><div>Last Updated: {formatDate(briefing.updatedAt)}</div>{briefing.createdBy && <div>Created By: {briefing.createdBy}</div>}</div>
            <div className="flex gap-3 pt-4"><Button onClick={() => { onClose(); onEdit(briefing); }} className="flex-1"><Edit className="h-4 w-4 mr-2" />Edit</Button><Button variant="outline" onClick={onClose}>Close</Button></div>
          </div>
        </DialogContent>
      </Dialog>
      {selectedAttachment && <AttachmentViewer attachment={selectedAttachment} onClose={() => setSelectedAttachment(null)} />}
    </>
  );
});
BriefingDetailDialog.displayName = 'BriefingDetailDialog';

// Mobile Cards (unchanged but referenced)
const MobileSupervisorCard = memo(({ supervisor, selected, onToggle }: any) => (
  <div onClick={() => onToggle(supervisor._id)} className={`p-3 border rounded-lg mb-2 cursor-pointer ${selected ? 'border-primary bg-primary/5' : ''}`}>
    <div className="flex items-center gap-3"><div className={`flex items-center justify-center h-5 w-5 rounded border ${selected ? 'bg-primary border-primary' : 'border-gray-300'}`}>{selected && <Check className="h-3 w-3 text-primary-foreground" />}</div><div><h4 className="font-medium text-sm">{supervisor.name}</h4><p className="text-xs text-muted-foreground">{supervisor.department}</p></div></div>
  </div>
));
MobileSupervisorCard.displayName = 'MobileSupervisorCard';

const MobileManagerCard = memo(({ manager, selected, onToggle }: any) => (
  <div onClick={() => onToggle(manager._id)} className={`p-3 border rounded-lg mb-2 cursor-pointer ${selected ? 'border-primary bg-primary/5' : ''}`}>
    <div className="flex items-center gap-3"><div className={`flex items-center justify-center h-5 w-5 rounded border ${selected ? 'bg-primary border-primary' : 'border-gray-300'}`}>{selected && <Check className="h-3 w-3 text-primary-foreground" />}</div><div><h4 className="font-medium text-sm">{manager.name}</h4><p className="text-xs text-muted-foreground">{manager.department}</p></div></div>
  </div>
));
MobileManagerCard.displayName = 'MobileManagerCard';

const MobileEmployeeCard = memo(({ employee, selected, onToggle }: any) => (
  <div onClick={() => onToggle(employee._id)} className={`p-3 border rounded-lg mb-2 cursor-pointer ${selected ? 'border-primary bg-primary/5' : ''}`}>
    <div className="flex items-center gap-3"><div className={`flex items-center justify-center h-5 w-5 rounded border ${selected ? 'bg-primary border-primary' : 'border-gray-300'}`}>{selected && <Check className="h-3 w-3 text-primary-foreground" />}</div><div><h4 className="font-medium text-sm">{employee.name}</h4><p className="text-xs text-muted-foreground">{employee.position}</p></div></div>
  </div>
));
MobileEmployeeCard.displayName = 'MobileEmployeeCard';

const MobileTrainingCard = memo(({ session, onView, onUpdateStatus, onDelete, getTypeColor, getStatusBadge, formatDate, trainingTypes, canEdit }: any) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="mb-3"><CardContent className="p-4">
      <div className="flex justify-between"><div><h3 className="font-semibold">{session.title}</h3><p className="text-xs text-muted-foreground">Trainer: {session.trainer}</p></div><div className="flex gap-1"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onView(session)}>View</DropdownMenuItem>{canEdit && (<><DropdownMenuItem onClick={() => onUpdateStatus(session._id, 'scheduled')}>Scheduled</DropdownMenuItem><DropdownMenuItem onClick={() => onUpdateStatus(session._id, 'ongoing')}>Ongoing</DropdownMenuItem><DropdownMenuItem onClick={() => onUpdateStatus(session._id, 'completed')}>Completed</DropdownMenuItem><DropdownMenuItem onClick={() => onUpdateStatus(session._id, 'cancelled')}>Cancelled</DropdownMenuItem><DropdownMenuItem onClick={() => onDelete(session._id)} className="text-red-600">Delete</DropdownMenuItem></>)}</DropdownMenuContent></DropdownMenu><Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)}>{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></div></div>
      <div className="flex gap-2 mt-2"><Badge className={getTypeColor(session.type)}>{trainingTypes.find((t: any) => t.value === session.type)?.label}</Badge><Badge className={getStatusBadge(session.status)}>{session.status}</Badge></div>
      <div className="grid grid-cols-2 gap-2 mt-2 text-xs"><div><Calendar className="inline h-3 w-3 mr-1" />{formatDate(session.date)}</div><div><Clock className="inline h-3 w-3 mr-1" />{session.time}</div><div><Building className="inline h-3 w-3 mr-1" />{session.site}</div><div><Users className="inline h-3 w-3 mr-1" />{session.attendees?.length}/{session.maxAttendees}</div></div>
      {expanded && (<div className="mt-3 pt-3 border-t"><p className="text-xs text-muted-foreground">Description</p><p className="text-sm">{session.description}</p>{session.location && <><p className="text-xs text-muted-foreground mt-2">Location</p><p className="text-sm">{session.location}</p></>}</div>)}
    </CardContent></Card>
  );
});
MobileTrainingCard.displayName = 'MobileTrainingCard';

const MobileBriefingCard = memo(({ briefing, onView, onDelete, onUpdateAction, getShiftBadge, getPriorityBadge, formatDate, canEdit }: any) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="mb-3"><CardContent className="p-4">
      <div className="flex justify-between"><div><h3 className="font-semibold">{briefing.site}</h3><p className="text-xs text-muted-foreground">by {briefing.conductedBy}</p></div><div className="flex gap-1"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onView(briefing)}>View</DropdownMenuItem>{canEdit && (<DropdownMenuItem onClick={() => onDelete(briefing._id)} className="text-red-600">Delete</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu><Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)}>{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></div></div>
      <div className="flex gap-2 mt-2"><Badge className={getShiftBadge(briefing.shift)}>{briefing.shift}</Badge><Badge variant="outline">{briefing.department}</Badge></div>
      <div className="grid grid-cols-2 gap-2 mt-2 text-xs"><div><Calendar className="inline h-3 w-3 mr-1" />{formatDate(briefing.date)}</div><div><Clock className="inline h-3 w-3 mr-1" />{briefing.time}</div><div><Users className="inline h-3 w-3 mr-1" />{briefing.attendeesCount} attendees</div></div>
      {expanded && (<div className="mt-3 pt-3 border-t">{briefing.topics?.length > 0 && (<><p className="text-xs text-muted-foreground">Topics</p><div className="flex flex-wrap gap-1 mt-1">{briefing.topics.slice(0, 2).map((t: string, idx: number) => (<Badge key={idx} variant="outline">{t}</Badge>))}{briefing.topics.length > 2 && <Badge variant="outline">+{briefing.topics.length - 2}</Badge>}</div></>)}</div>)}
    </CardContent></Card>
  );
});
MobileBriefingCard.displayName = 'MobileBriefingCard';

const MobileStatCard = memo(({ title, value, icon: Icon, color = "blue" }: any) => {
  const colors: any = { blue: "bg-blue-100 text-blue-600", green: "bg-green-100 text-green-600", purple: "bg-purple-100 text-purple-600", red: "bg-red-100 text-red-600" };
  return (<Card><CardContent className="p-4"><div className="flex justify-between"><div><p className="text-xs text-muted-foreground">{title}</p><p className="text-xl font-bold mt-1">{value}</p></div><div className={`p-3 rounded-lg ${colors[color]}`}><Icon className="h-5 w-5" /></div></div></CardContent></Card>);
});
MobileStatCard.displayName = 'MobileStatCard';

// Attachments Section with "Take Photo" button
const AttachmentsSection = memo(({ attachments, onUpload, onRemove, fileInputRef, title = "Attachments", onTakePhoto }: any) => {
  return (
    <div className="py-4 border-t">
      <div className="flex justify-between items-center mb-4">
        <div><h3 className="text-lg font-semibold">{title}</h3><p className="text-xs text-gray-500">Upload files or take a photo</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onTakePhoto}><Camera className="h-4 w-4 mr-2" />Take Photo</Button>
          <input type="file" ref={fileInputRef} multiple onChange={onUpload} className="hidden" accept="image/*,video/*,.pdf,.doc,.docx" />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" />Upload</Button>
        </div>
      </div>
      {attachments.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {attachments.map((file: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                {file.type?.startsWith('image/') || file.type === 'image' ? <ImageIcon className="h-5 w-5 text-blue-500" /> : file.type?.startsWith('video/') ? <Video className="h-5 w-5 text-red-500" /> : <File className="h-5 w-5 text-gray-500" />}
                <div>
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{file.size}</p>
                  {file.location && <p className="text-[10px] text-gray-400">📍 {file.location.lat.toFixed(6)}, {file.location.lng.toFixed(6)}</p>}
                  {file.capturedAt && <p className="text-[10px] text-gray-400">🕒 {new Date(file.capturedAt).toLocaleString()}</p>}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onRemove(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
AttachmentsSection.displayName = 'AttachmentsSection';

// MultiSelect components (unchanged, but used)

const ActionItemsSection = memo(({ actionItems, onAdd, onRemove, onUpdate }: any) => (
  <div className="py-4 border-t"><div className="flex justify-between mb-4"><div><h3 className="text-lg font-semibold">Action Items</h3></div><Button variant="outline" onClick={onAdd}><Plus className="h-4 w-4 mr-2" />Add</Button></div>
    {actionItems.map((item: any, idx: number) => (
      <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded mb-3">
        <div className="sm:col-span-2"><Input placeholder="Description" value={item.description} onChange={(e) => onUpdate(idx, 'description', e.target.value)} /></div>
        <div><Input placeholder="Assigned To" value={item.assignedTo} onChange={(e) => onUpdate(idx, 'assignedTo', e.target.value)} /></div>
        <div className="flex gap-2"><Input type="date" value={item.dueDate} onChange={(e) => onUpdate(idx, 'dueDate', e.target.value)} /><Select value={item.priority} onValueChange={(v) => onUpdate(idx, 'priority', v)}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{priorities.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><Button variant="ghost" size="sm" onClick={() => onRemove(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>
      </div>
    ))}
  </div>
));
ActionItemsSection.displayName = 'ActionItemsSection';

// Form components (department selects now use the restricted list)
const AddTrainingFormComponent = memo(({ trainingForm, setTrainingForm, addObjective, removeObjective, updateObjective, sites }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
    <div className="space-y-4">
      <div><label className="text-sm font-medium">Title *</label><Input value={trainingForm.title} onChange={(e) => setTrainingForm((p: any) => ({ ...p, title: e.target.value }))} /></div>
      <div><label className="text-sm font-medium">Type</label><Select value={trainingForm.type} onValueChange={(v) => setTrainingForm((p: any) => ({ ...p, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{trainingTypes.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent></Select></div>
      <div><label className="text-sm font-medium">Date *</label><Input type="date" value={trainingForm.date} onChange={(e) => setTrainingForm((p: any) => ({ ...p, date: e.target.value }))} /></div>
      <div><label className="text-sm font-medium">Time</label><Input type="time" value={trainingForm.time} onChange={(e) => setTrainingForm((p: any) => ({ ...p, time: e.target.value }))} /></div>
      <div><label className="text-sm font-medium">Duration</label><Input placeholder="e.g., 2 hours" value={trainingForm.duration} onChange={(e) => setTrainingForm((p: any) => ({ ...p, duration: e.target.value }))} /></div>
      <div><label className="text-sm font-medium">Trainer *</label><Input value={trainingForm.trainer} onChange={(e) => setTrainingForm((p: any) => ({ ...p, trainer: e.target.value }))} /></div>
    </div>
    <div className="space-y-4">
      <div><label className="text-sm font-medium">Site *</label><Select value={trainingForm.site} onValueChange={(v) => setTrainingForm((p: any) => ({ ...p, site: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sites.map((s: Site) => (<SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>))}</SelectContent></Select></div>
      <div><label className="text-sm font-medium">Department</label><Select value={trainingForm.department} onValueChange={(v) => setTrainingForm((p: any) => ({ ...p, department: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{departments.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent></Select></div>
      <div><label className="text-sm font-medium">Max Attendees</label><Input type="number" value={trainingForm.maxAttendees} onChange={(e) => setTrainingForm((p: any) => ({ ...p, maxAttendees: parseInt(e.target.value) || 1 }))} /></div>
      <div><label className="text-sm font-medium">Location</label><Input value={trainingForm.location} onChange={(e) => setTrainingForm((p: any) => ({ ...p, location: e.target.value }))} /></div>
      <div><label className="text-sm font-medium">Objectives</label><div className="space-y-2">{trainingForm.objectives.map((obj: string, idx: number) => (<div key={idx} className="flex gap-2"><Input value={obj} onChange={(e) => updateObjective(idx, e.target.value)} /><Button variant="ghost" size="sm" onClick={() => removeObjective(idx)}><X className="h-4 w-4" /></Button></div>))}<Button variant="outline" size="sm" onClick={addObjective}><Plus className="h-4 w-4 mr-2" />Add</Button></div></div>
      <div><label className="text-sm font-medium">Description</label><Textarea value={trainingForm.description} onChange={(e) => setTrainingForm((p: any) => ({ ...p, description: e.target.value }))} rows={3} /></div>
    </div>
  </div>
));
AddTrainingFormComponent.displayName = 'AddTrainingFormComponent';

// Add Briefing Form (site removed, conductedBy optional)
const AddBriefingFormComponent = memo(({ briefingForm, setBriefingForm, addTopic, removeTopic, updateTopic, addKeyPoint, removeKeyPoint, updateKeyPoint }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
    <div className="space-y-4">
      <div><label className="text-sm font-medium">Date *</label><Input type="date" value={briefingForm.date} onChange={(e) => setBriefingForm((p: any) => ({ ...p, date: e.target.value }))} /></div>
      <div><label className="text-sm font-medium">Time</label><Input type="time" value={briefingForm.time} onChange={(e) => setBriefingForm((p: any) => ({ ...p, time: e.target.value }))} /></div>
      <div><label className="text-sm font-medium">Shift</label><Select value={briefingForm.shift} onValueChange={(v) => setBriefingForm((p: any) => ({ ...p, shift: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{shifts.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select></div>
      <div><label className="text-sm font-medium">Conducted By (optional)</label><Input value={briefingForm.conductedBy} onChange={(e) => setBriefingForm((p: any) => ({ ...p, conductedBy: e.target.value }))} /></div>
      <div><label className="text-sm font-medium">Department</label><Select value={briefingForm.department} onValueChange={(v) => setBriefingForm((p: any) => ({ ...p, department: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{departments.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent></Select></div>
      <div><label className="text-sm font-medium">Attendees Count</label><Input type="number" value={briefingForm.attendeesCount} onChange={(e) => setBriefingForm((p: any) => ({ ...p, attendeesCount: parseInt(e.target.value) || 0 }))} /></div>
    </div>
    <div className="space-y-4">
      <div><label className="text-sm font-medium">Topics</label><div className="space-y-2">{briefingForm.topics.map((topic: string, idx: number) => (<div key={idx} className="flex gap-2"><Input value={topic} onChange={(e) => updateTopic(idx, e.target.value)} /><Button variant="ghost" size="sm" onClick={() => removeTopic(idx)}><X className="h-4 w-4" /></Button></div>))}<Button variant="outline" size="sm" onClick={addTopic}><Plus className="h-4 w-4 mr-2" />Add Topic</Button></div></div>
      <div><label className="text-sm font-medium">Key Points</label><div className="space-y-2">{briefingForm.keyPoints.map((point: string, idx: number) => (<div key={idx} className="flex gap-2"><Input value={point} onChange={(e) => updateKeyPoint(idx, e.target.value)} /><Button variant="ghost" size="sm" onClick={() => removeKeyPoint(idx)}><X className="h-4 w-4" /></Button></div>))}<Button variant="outline" size="sm" onClick={addKeyPoint}><Plus className="h-4 w-4 mr-2" />Add Key Point</Button></div></div>
      <div><label className="text-sm font-medium">Notes</label><Textarea value={briefingForm.notes} onChange={(e) => setBriefingForm((p: any) => ({ ...p, notes: e.target.value }))} rows={3} /></div>
    </div>
  </div>
));
AddBriefingFormComponent.displayName = 'AddBriefingFormComponent';

// Edit forms similarly updated
const EditTrainingFormComponent = memo(({ editTrainingForm, setEditTrainingForm, addEditObjective, removeEditObjective, updateEditObjective, sites }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
    <div className="space-y-4">
      <div><label>Title *</label><Input value={editTrainingForm.title} onChange={(e) => setEditTrainingForm((p: any) => ({ ...p, title: e.target.value }))} /></div>
      <div><label>Type</label><Select value={editTrainingForm.type} onValueChange={(v) => setEditTrainingForm((p: any) => ({ ...p, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{trainingTypes.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent></Select></div>
      <div><label>Date *</label><Input type="date" value={editTrainingForm.date} onChange={(e) => setEditTrainingForm((p: any) => ({ ...p, date: e.target.value }))} /></div>
      <div><label>Time</label><Input type="time" value={editTrainingForm.time} onChange={(e) => setEditTrainingForm((p: any) => ({ ...p, time: e.target.value }))} /></div>
      <div><label>Duration</label><Input value={editTrainingForm.duration} onChange={(e) => setEditTrainingForm((p: any) => ({ ...p, duration: e.target.value }))} /></div>
      <div><label>Trainer *</label><Input value={editTrainingForm.trainer} onChange={(e) => setEditTrainingForm((p: any) => ({ ...p, trainer: e.target.value }))} /></div>
    </div>
    <div className="space-y-4">
      <div><label>Site *</label><Select value={editTrainingForm.site} onValueChange={(v) => setEditTrainingForm((p: any) => ({ ...p, site: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sites.map((s: Site) => (<SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>))}</SelectContent></Select></div>
      <div><label>Department</label><Select value={editTrainingForm.department} onValueChange={(v) => setEditTrainingForm((p: any) => ({ ...p, department: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{departments.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent></Select></div>
      <div><label>Max Attendees</label><Input type="number" value={editTrainingForm.maxAttendees} onChange={(e) => setEditTrainingForm((p: any) => ({ ...p, maxAttendees: parseInt(e.target.value) || 1 }))} /></div>
      <div><label>Location</label><Input value={editTrainingForm.location} onChange={(e) => setEditTrainingForm((p: any) => ({ ...p, location: e.target.value }))} /></div>
      <div><label>Objectives</label><div className="space-y-2">{editTrainingForm.objectives.map((obj: string, idx: number) => (<div key={idx} className="flex gap-2"><Input value={obj} onChange={(e) => updateEditObjective(idx, e.target.value)} /><Button variant="ghost" size="sm" onClick={() => removeEditObjective(idx)}><X /></Button></div>))}<Button variant="outline" size="sm" onClick={addEditObjective}><Plus className="h-4 w-4 mr-2" />Add</Button></div></div>
      <div><label>Description</label><Textarea value={editTrainingForm.description} onChange={(e) => setEditTrainingForm((p: any) => ({ ...p, description: e.target.value }))} rows={3} /></div>
    </div>
  </div>
));
EditTrainingFormComponent.displayName = 'EditTrainingFormComponent';

const EditBriefingFormComponent = memo(({ editBriefingForm, setEditBriefingForm, addEditTopic, removeEditTopic, updateEditTopic, addEditKeyPoint, removeEditKeyPoint, updateEditKeyPoint }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
    <div className="space-y-4">
      <div><label>Date *</label><Input type="date" value={editBriefingForm.date} onChange={(e) => setEditBriefingForm((p: any) => ({ ...p, date: e.target.value }))} /></div>
      <div><label>Time</label><Input type="time" value={editBriefingForm.time} onChange={(e) => setEditBriefingForm((p: any) => ({ ...p, time: e.target.value }))} /></div>
      <div><label>Shift</label><Select value={editBriefingForm.shift} onValueChange={(v) => setEditBriefingForm((p: any) => ({ ...p, shift: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{shifts.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select></div>
      <div><label>Conducted By (optional)</label><Input value={editBriefingForm.conductedBy} onChange={(e) => setEditBriefingForm((p: any) => ({ ...p, conductedBy: e.target.value }))} /></div>
      <div><label>Department</label><Select value={editBriefingForm.department} onValueChange={(v) => setEditBriefingForm((p: any) => ({ ...p, department: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{departments.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent></Select></div>
      <div><label>Attendees Count</label><Input type="number" value={editBriefingForm.attendeesCount} onChange={(e) => setEditBriefingForm((p: any) => ({ ...p, attendeesCount: parseInt(e.target.value) || 0 }))} /></div>
    </div>
    <div className="space-y-4">
      <div><label>Topics</label><div className="space-y-2">{editBriefingForm.topics.map((topic: string, idx: number) => (<div key={idx} className="flex gap-2"><Input value={topic} onChange={(e) => updateEditTopic(idx, e.target.value)} /><Button variant="ghost" size="sm" onClick={() => removeEditTopic(idx)}><X /></Button></div>))}<Button variant="outline" size="sm" onClick={addEditTopic}><Plus /> Add Topic</Button></div></div>
      <div><label>Key Points</label><div className="space-y-2">{editBriefingForm.keyPoints.map((point: string, idx: number) => (<div key={idx} className="flex gap-2"><Input value={point} onChange={(e) => updateEditKeyPoint(idx, e.target.value)} /><Button variant="ghost" size="sm" onClick={() => removeEditKeyPoint(idx)}><X /></Button></div>))}<Button variant="outline" size="sm" onClick={addEditKeyPoint}><Plus /> Add Key Point</Button></div></div>
      <div><label>Notes</label><Textarea value={editBriefingForm.notes} onChange={(e) => setEditBriefingForm((p: any) => ({ ...p, notes: e.target.value }))} rows={3} /></div>
    </div>
  </div>
));
EditBriefingFormComponent.displayName = 'EditBriefingFormComponent';

// Main Component
const SupervisorTrainingBriefing: React.FC = () => {
  const { user: authUser, isAuthenticated } = useRole();
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
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
  const [trainingAttachments, setTrainingAttachments] = useState<File[]>([]);
  const [briefingAttachments, setBriefingAttachments] = useState<File[]>([]);
  const [editTrainingAttachments, setEditTrainingAttachments] = useState<ExistingAttachment[]>([]);
  const [editBriefingAttachments, setEditBriefingAttachments] = useState<ExistingAttachment[]>([]);
  const [editTrainingNewFiles, setEditTrainingNewFiles] = useState<File[]>([]);
  const [editBriefingNewFiles, setEditBriefingNewFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editTrainingFileInputRef = useRef<HTMLInputElement>(null);
  const editBriefingFileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState({ sites: true, supervisors: true, managers: true, employees: true, trainings: true, briefings: true });
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Camera states
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraAction, setCameraAction] = useState<'training' | 'briefing' | 'editTraining' | 'editBriefing' | null>(null);
  const [photoMetadata, setPhotoMetadata] = useState<Map<string, { location: any; capturedAt: string }>>(new Map());

  // Data states
  const [sites, setSites] = useState<Site[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const supervisorId = authUser?._id || authUser?.id || "";
  const supervisorName = authUser?.name || "Supervisor";
  const [supervisorAssignedSites, setSupervisorAssignedSites] = useState<string[]>([]);
  const [supervisorAssignedSiteNames, setSupervisorAssignedSiteNames] = useState<string[]>([]);

  const [filteredSupervisors, setFilteredSupervisors] = useState<Supervisor[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<Manager[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);

  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [supervisorSearchQuery, setSupervisorSearchQuery] = useState("");
  const [managerSearchQuery, setManagerSearchQuery] = useState("");

  const [editSelectedSupervisors, setEditSelectedSupervisors] = useState<string[]>([]);
  const [editSelectedManagers, setEditSelectedManagers] = useState<string[]>([]);
  const [editSupervisorSearchQuery, setEditSupervisorSearchQuery] = useState("");
  const [editManagerSearchQuery, setEditManagerSearchQuery] = useState("");

  const [trainingForm, setTrainingForm] = useState({
    title: '', description: '', type: 'safety' as const, date: '', time: '', duration: '', trainer: '', site: '', department: 'Housekeeping', maxAttendees: 20, location: '', objectives: [] as string[]
  });
  const [editTrainingForm, setEditTrainingForm] = useState({
    title: '', description: '', type: 'safety' as const, date: '', time: '', duration: '', trainer: '', site: '', department: 'Housekeeping', maxAttendees: 20, location: '', objectives: [] as string[]
  });
  const [briefingForm, setBriefingForm] = useState({
    date: '', time: '', conductedBy: '', department: 'Housekeeping', attendeesCount: 0, topics: [] as string[], keyPoints: [] as string[], actionItems: [] as any[], notes: '', shift: 'morning' as const
  });
  const [editBriefingForm, setEditBriefingForm] = useState({
    date: '', time: '', conductedBy: '', department: 'Housekeeping', attendeesCount: 0, topics: [] as string[], keyPoints: [] as string[], actionItems: [] as ActionItem[], notes: '', shift: 'morning' as const
  });

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchSupervisorAssignedSites = useCallback(async () => {
    if (!supervisorId) return;
    try {
      // First try to get sites from tasks
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

      // If no tasks found, fallback to your employee site
      if (assignedSitesSet.size === 0) {
        const empRes = await axios.get(`${API_URL}/employees/${supervisorId}`);
        if (empRes.data && empRes.data.siteName) {
          const siteName = empRes.data.siteName;
          assignedSiteNamesSet.add(siteName);
          // Find site ID from the sites list (which will be fetched later)
          // We'll store the name, and later when sites are loaded, we can get the ID
          // For now, set a temporary placeholder
          assignedSitesSet.add('fallback');
        }
      }

      setSupervisorAssignedSites(Array.from(assignedSitesSet));
      setSupervisorAssignedSiteNames(Array.from(assignedSiteNamesSet));
      console.log('Assigned sites:', Array.from(assignedSiteNamesSet));
    } catch (error) {
      console.error("Error fetching supervisor assigned sites:", error);
      toast.error("Failed to load your assigned sites");
    }
  }, [supervisorId]);

  useEffect(() => {
    if (supervisorId && isAuthenticated) fetchSupervisorAssignedSites();
  }, [supervisorId, isAuthenticated, fetchSupervisorAssignedSites]);

  useEffect(() => {
    if (supervisorAssignedSites.length > 0) fetchAllData();
  }, [supervisorAssignedSites]);

  useEffect(() => {
    if (supervisorAssignedSites.length > 0) { fetchTrainings(); fetchBriefings(); }
  }, [searchTerm, filterDepartment, filterStatus, supervisorAssignedSites]);

  useEffect(() => {
    if (trainingForm.site) filterDataBySite(trainingForm.site);
  }, [trainingForm.site, supervisors, managers, employees]);

  useEffect(() => {
    if (editTrainingForm.site) filterDataBySiteForEdit(editTrainingForm.site);
  }, [editTrainingForm.site, supervisors, managers, employees]);

  const filterDataBySiteForEdit = (siteName: string) => {
    const selectedSite = sites.find(site => site.name === siteName);
    if (!selectedSite) { setFilteredSupervisors([]); setFilteredManagers([]); setFilteredEmployees([]); return; }
    setFilteredSupervisors(supervisors.filter(sup => sup.assignedSites?.includes(selectedSite._id) || sup.site === siteName));
    setFilteredManagers(managers.filter(mgr => mgr.assignedSites?.includes(selectedSite._id) || mgr.site === siteName));
    setFilteredEmployees(employees.filter(emp => emp.siteName === siteName || emp.assignedSites?.includes(selectedSite._id)));
  };

  const fetchAllData = async () => {
    try {
      setLoadingData({ sites: true, supervisors: true, managers: true, employees: true, trainings: true, briefings: true });
      await Promise.all([fetchSites(), fetchSupervisorsAndManagers(), fetchEmployees(), fetchTrainings(), fetchBriefings()]);
    } catch (error) { console.error(error); toast.error("Failed to load data"); }
    finally { setLoadingData({ sites: false, supervisors: false, managers: false, employees: false, trainings: false, briefings: false }); }
  };

  const fetchSites = async () => {
    try {
      const data = await siteService.getAllSites();
      setSites(data.filter(site => supervisorAssignedSites.includes(site._id)));
    } catch (error) { console.error(error); toast.error("Failed to load sites"); }
  };

  const fetchSupervisorsAndManagers = async () => {
    try {
      const tasksData = await assignTaskService.getAllAssignTasks();
      const supervisorMap = new Map<string, Supervisor>();
      const managerMap = new Map<string, Manager>();
      tasksData.forEach((task: AssignTask) => {
        if (supervisorAssignedSites.includes(task.siteId)) {
          task.assignedSupervisors?.forEach(user => {
            if (!supervisorMap.has(user.userId)) supervisorMap.set(user.userId, { _id: user.userId, name: user.name, email: '', role: 'supervisor', department: task.taskType || 'General', site: task.siteName, assignedSites: [task.siteId] });
            else { const existing = supervisorMap.get(user.userId); if (existing && !existing.assignedSites?.includes(task.siteId)) existing.assignedSites = [...(existing.assignedSites || []), task.siteId]; }
          });
          task.assignedManagers?.forEach(user => {
            if (!managerMap.has(user.userId)) managerMap.set(user.userId, { _id: user.userId, name: user.name, email: '', role: 'manager', department: task.taskType || 'General', site: task.siteName, assignedSites: [task.siteId] });
            else { const existing = managerMap.get(user.userId); if (existing && !existing.assignedSites?.includes(task.siteId)) existing.assignedSites = [...(existing.assignedSites || []), task.siteId]; }
          });
        }
      });
      setSupervisors(Array.from(supervisorMap.values()));
      setManagers(Array.from(managerMap.values()));
    } catch (error) { console.error(error); toast.error("Failed to load supervisors/managers"); }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/employees`);
      if (response.data.success) {
        const employeesData = response.data.data || [];
        const filtered = employeesData.filter((emp: Employee) => (emp.siteName && supervisorAssignedSiteNames.includes(emp.siteName)) || (emp.assignedSites && emp.assignedSites.some(site => supervisorAssignedSites.includes(site))));
        setEmployees(Array.from(new Map(filtered.map((emp: Employee) => [emp._id, emp])).values()).filter(emp => emp.status === "active"));
      }
    } catch (error) { console.error(error); toast.error("Failed to load employees"); }
  };

  const fetchTrainings = async () => {
    try {
      setLoadingData(prev => ({ ...prev, trainings: true }));
      const response = await trainingApi.getAllTrainings({ search: searchTerm, department: filterDepartment === 'all' ? '' : filterDepartment, status: filterStatus === 'all' ? '' : filterStatus });
      if (response.success) setTrainingSessions(response.trainings.filter((t: TrainingSession) => supervisorAssignedSiteNames.includes(t.site)));
    } catch (error) { console.error(error); toast.error("Failed to load trainings"); }
    finally { setLoadingData(prev => ({ ...prev, trainings: false })); }
  };

  const fetchBriefings = async () => {
    try {
      setLoadingData(prev => ({ ...prev, briefings: true }));
      const response = await briefingApi.getAllBriefings({ search: searchTerm, department: filterDepartment === 'all' ? '' : filterDepartment });
      if (response.success) setStaffBriefings(response.briefings.filter((b: StaffBriefing) => supervisorAssignedSiteNames.includes(b.site)));
    } catch (error) { console.error(error); toast.error("Failed to load briefings"); }
    finally { setLoadingData(prev => ({ ...prev, briefings: false })); }
  };

  const filterDataBySite = (siteName: string) => {
    const selectedSite = sites.find(site => site.name === siteName);
    if (!selectedSite) { setFilteredSupervisors([]); setFilteredManagers([]); setFilteredEmployees([]); return; }
    setFilteredSupervisors(supervisors.filter(sup => sup.assignedSites?.includes(selectedSite._id) || sup.site === siteName));
    setFilteredManagers(managers.filter(mgr => mgr.assignedSites?.includes(selectedSite._id) || mgr.site === siteName));
    setFilteredEmployees(employees.filter(emp => emp.siteName === siteName || emp.assignedSites?.includes(selectedSite._id)));
  };

  // Camera handlers
  const handleTakePhoto = (type: 'training' | 'briefing' | 'editTraining' | 'editBriefing') => {
    setCameraAction(type);
    setCameraOpen(true);
  };

  const handlePhotoCapture = async (photoFile: File) => {
    if (!cameraAction) return;
    let location = null;
    try { location = await getCurrentLocation(); } catch (err) { toast.warning("Location not available"); }
    const capturedAt = new Date().toISOString();
    const metadata = { location, capturedAt };
    setPhotoMetadata(prev => new Map(prev).set(photoFile.name, metadata));

    if (cameraAction === 'training') {
      setTrainingAttachments(prev => [...prev, photoFile]);
    } else if (cameraAction === 'briefing') {
      setBriefingAttachments(prev => [...prev, photoFile]);
    } else if (cameraAction === 'editTraining') {
      const newAtt = { name: photoFile.name, type: 'image', url: URL.createObjectURL(photoFile), size: `${(photoFile.size / 1024).toFixed(1)} KB`, isNew: true, file: photoFile, location, capturedAt };
      setEditTrainingAttachments(prev => [...prev, newAtt]);
      setEditTrainingNewFiles(prev => [...prev, photoFile]);
    } else if (cameraAction === 'editBriefing') {
      const newAtt = { name: photoFile.name, type: 'image', url: URL.createObjectURL(photoFile), size: `${(photoFile.size / 1024).toFixed(1)} KB`, isNew: true, file: photoFile, location, capturedAt };
      setEditBriefingAttachments(prev => [...prev, newAtt]);
      setEditBriefingNewFiles(prev => [...prev, photoFile]);
    }
    toast.success("Photo captured with location and timestamp");
    setCameraOpen(false);
    setCameraAction(null);
  };

  // Upload handlers
  const handleTrainingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { setTrainingAttachments(prev => [...prev, ...Array.from(e.target.files || [])]); toast.success(`${e.target.files?.length} file(s) added`); };
  const handleBriefingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { setBriefingAttachments(prev => [...prev, ...Array.from(e.target.files || [])]); toast.success(`${e.target.files?.length} file(s) added`); };
  const handleEditTrainingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map(file => ({ name: file.name, type: file.type.startsWith('image/') ? 'image' : 'document', url: URL.createObjectURL(file), size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, isNew: true, file }));
    setEditTrainingAttachments(prev => [...prev, ...newAttachments]);
    setEditTrainingNewFiles(prev => [...prev, ...files]);
    toast.success(`${files.length} file(s) added`);
  };
  const handleEditBriefingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map(file => ({ name: file.name, type: file.type.startsWith('image/') ? 'image' : 'document', url: URL.createObjectURL(file), size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, isNew: true, file }));
    setEditBriefingAttachments(prev => [...prev, ...newAttachments]);
    setEditBriefingNewFiles(prev => [...prev, ...files]);
    toast.success(`${files.length} file(s) added`);
  };
  const removeTrainingAttachment = (index: number) => setTrainingAttachments(prev => prev.filter((_, i) => i !== index));
  const removeBriefingAttachment = (index: number) => setBriefingAttachments(prev => prev.filter((_, i) => i !== index));
  const removeEditTrainingAttachment = (index: number) => {
    const att = editTrainingAttachments[index];
    if (att.isNew && att.url) URL.revokeObjectURL(att.url);
    setEditTrainingAttachments(prev => prev.filter((_, i) => i !== index));
    if (att.isNew && att.file) setEditTrainingNewFiles(prev => prev.filter(f => f !== att.file));
  };
  const removeEditBriefingAttachment = (index: number) => {
    const att = editBriefingAttachments[index];
    if (att.isNew && att.url) URL.revokeObjectURL(att.url);
    setEditBriefingAttachments(prev => prev.filter((_, i) => i !== index));
    if (att.isNew && att.file) setEditBriefingNewFiles(prev => prev.filter(f => f !== att.file));
  };

  const handleSupervisorToggle = (id: string) => setSelectedSupervisors(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const handleManagerToggle = (id: string) => setSelectedManagers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const handleEmployeeToggle = (id: string) => setSelectedEmployees(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const handleEditSupervisorToggle = (id: string) => setEditSelectedSupervisors(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const handleEditManagerToggle = (id: string) => setEditSelectedManagers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const addObjective = () => setTrainingForm(p => ({ ...p, objectives: [...p.objectives, ''] }));
  const removeObjective = (i: number) => setTrainingForm(p => ({ ...p, objectives: p.objectives.filter((_, idx) => idx !== i) }));
  const updateObjective = (i: number, v: string) => setTrainingForm(p => ({ ...p, objectives: p.objectives.map((o, idx) => idx === i ? v : o) }));
  const addEditObjective = () => setEditTrainingForm(p => ({ ...p, objectives: [...p.objectives, ''] }));
  const removeEditObjective = (i: number) => setEditTrainingForm(p => ({ ...p, objectives: p.objectives.filter((_, idx) => idx !== i) }));
  const updateEditObjective = (i: number, v: string) => setEditTrainingForm(p => ({ ...p, objectives: p.objectives.map((o, idx) => idx === i ? v : o) }));

  const addTopic = () => setBriefingForm(p => ({ ...p, topics: [...p.topics, ''] }));
  const removeTopic = (i: number) => setBriefingForm(p => ({ ...p, topics: p.topics.filter((_, idx) => idx !== i) }));
  const updateTopic = (i: number, v: string) => setBriefingForm(p => ({ ...p, topics: p.topics.map((t, idx) => idx === i ? v : t) }));
  const addEditTopic = () => setEditBriefingForm(p => ({ ...p, topics: [...p.topics, ''] }));
  const removeEditTopic = (i: number) => setEditBriefingForm(p => ({ ...p, topics: p.topics.filter((_, idx) => idx !== i) }));
  const updateEditTopic = (i: number, v: string) => setEditBriefingForm(p => ({ ...p, topics: p.topics.map((t, idx) => idx === i ? v : t) }));

  const addKeyPoint = () => setBriefingForm(p => ({ ...p, keyPoints: [...p.keyPoints, ''] }));
  const removeKeyPoint = (i: number) => setBriefingForm(p => ({ ...p, keyPoints: p.keyPoints.filter((_, idx) => idx !== i) }));
  const updateKeyPoint = (i: number, v: string) => setBriefingForm(p => ({ ...p, keyPoints: p.keyPoints.map((k, idx) => idx === i ? v : k) }));
  const addEditKeyPoint = () => setEditBriefingForm(p => ({ ...p, keyPoints: [...p.keyPoints, ''] }));
  const removeEditKeyPoint = (i: number) => setEditBriefingForm(p => ({ ...p, keyPoints: p.keyPoints.filter((_, idx) => idx !== i) }));
  const updateEditKeyPoint = (i: number, v: string) => setEditBriefingForm(p => ({ ...p, keyPoints: p.keyPoints.map((k, idx) => idx === i ? v : k) }));

  const addActionItem = () => setBriefingForm(p => ({ ...p, actionItems: [...p.actionItems, { description: '', assignedTo: '', dueDate: '', status: 'pending', priority: 'medium' }] }));
  const removeActionItem = (i: number) => setBriefingForm(p => ({ ...p, actionItems: p.actionItems.filter((_, idx) => idx !== i) }));
  const updateActionItem = (i: number, field: string, val: string) => setBriefingForm(p => ({ ...p, actionItems: p.actionItems.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));
  const addEditActionItem = () => setEditBriefingForm(p => ({ ...p, actionItems: [...p.actionItems, { description: '', assignedTo: '', dueDate: '', status: 'pending', priority: 'medium' }] }));
  const removeEditActionItem = (i: number) => setEditBriefingForm(p => ({ ...p, actionItems: p.actionItems.filter((_, idx) => idx !== i) }));
  const updateEditActionItem = (i: number, field: string, val: string) => setEditBriefingForm(p => ({ ...p, actionItems: p.actionItems.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));

  const handleAddTraining = async () => {
    if (!trainingForm.title || !trainingForm.date || !trainingForm.trainer) { toast.error('Please fill required fields'); return; }
    if (selectedSupervisors.length === 0) { toast.error('Please select at least one supervisor'); return; }
    if (selectedManagers.length === 0) { toast.error('Please select at least one manager'); return; }
    try {
      setLoading(true);
      const supervisorsList = selectedSupervisors.map(id => { const s = filteredSupervisors.find(sup => sup._id === id); return s ? { id: s._id, name: s.name } : null; }).filter(Boolean);
      const managersList = selectedManagers.map(id => { const m = filteredManagers.find(mgr => mgr._id === id); return m ? { id: m._id, name: m.name } : null; }).filter(Boolean);
      const response = await trainingApi.createTraining({
        title: trainingForm.title, description: trainingForm.description, type: trainingForm.type, date: trainingForm.date, time: trainingForm.time,
        duration: trainingForm.duration, trainer: trainingForm.trainer, site: trainingForm.site, department: trainingForm.department,
        maxAttendees: trainingForm.maxAttendees, location: trainingForm.location, objectives: trainingForm.objectives.filter(o => o.trim() !== ''),
        supervisors: supervisorsList, managers: managersList, attendees: selectedEmployees
      }, trainingAttachments);
      if (response.success) { toast.success('Training added'); await fetchTrainings(); resetTrainingForm(); setTrainingAttachments([]); setShowAddTraining(false); }
      else throw new Error(response.message);
    } catch (error: any) { toast.error(error.message); }
    finally { setLoading(false); }
  };

  const handleAddBriefing = async () => {
    if (!briefingForm.date) { toast.error('Date is required'); return; }
    if (selectedSupervisors.length === 0) { toast.error('Please select at least one supervisor'); return; }
    if (selectedManagers.length === 0) { toast.error('Please select at least one manager'); return; }
    try {
      setLoading(true);
      const siteName = supervisorAssignedSiteNames[0];
      if (!siteName) { toast.error('No site assigned'); return; }
      const supervisorsList = selectedSupervisors.map(id => { const s = filteredSupervisors.find(sup => sup._id === id); return s ? { id: s._id, name: s.name } : null; }).filter(Boolean);
      const managersList = selectedManagers.map(id => { const m = filteredManagers.find(mgr => mgr._id === id); return m ? { id: m._id, name: m.name } : null; }).filter(Boolean);
      const actionItems = briefingForm.actionItems.map((item: any) => ({ description: item.description, assignedTo: item.assignedTo, dueDate: item.dueDate, status: item.status || 'pending', priority: item.priority || 'medium' }));
      const response = await briefingApi.createBriefing({
        date: briefingForm.date, time: briefingForm.time, conductedBy: briefingForm.conductedBy, site: siteName, department: briefingForm.department,
        attendeesCount: briefingForm.attendeesCount, topics: briefingForm.topics.filter(t => t.trim() !== ''), keyPoints: briefingForm.keyPoints.filter(k => k.trim() !== ''),
        actionItems: actionItems, notes: briefingForm.notes, shift: briefingForm.shift, supervisors: supervisorsList, managers: managersList
      }, briefingAttachments);
      if (response.success) { toast.success('Briefing added'); await fetchBriefings(); resetBriefingForm(); setBriefingAttachments([]); setShowAddBriefing(false); }
      else throw new Error(response.message);
    } catch (error: any) { toast.error(error.message); }
    finally { setLoading(false); }
  };

  const handleUpdateTraining = async () => {
    if (!editingTraining) return;
    try {
      setLoading(true);
      const supervisorsList = editSelectedSupervisors.map(id => { const s = filteredSupervisors.find(sup => sup._id === id); return s ? { id: s._id, name: s.name } : null; }).filter(Boolean);
      const managersList = editSelectedManagers.map(id => { const m = filteredManagers.find(mgr => mgr._id === id); return m ? { id: m._id, name: m.name } : null; }).filter(Boolean);
      const existingAttachments = editTrainingAttachments.filter(att => !att.isNew).map(({ isNew, file, ...rest }) => rest);
      const response = await trainingApi.updateTraining(editingTraining._id, {
        title: editTrainingForm.title, description: editTrainingForm.description, type: editTrainingForm.type, date: editTrainingForm.date,
        time: editTrainingForm.time, duration: editTrainingForm.duration, trainer: editTrainingForm.trainer, site: editTrainingForm.site,
        department: editTrainingForm.department, maxAttendees: editTrainingForm.maxAttendees, location: editTrainingForm.location,
        objectives: editTrainingForm.objectives.filter(o => o.trim() !== ''), supervisors: supervisorsList, managers: managersList, attachments: existingAttachments
      }, editTrainingNewFiles);
      if (response.success) { toast.success('Training updated'); await fetchTrainings(); setShowEditTrainingDialog(false); setEditingTraining(null); resetEditTrainingForm(); setEditTrainingAttachments([]); setEditTrainingNewFiles([]); }
      else throw new Error(response.message);
    } catch (error: any) { toast.error(error.message); }
    finally { setLoading(false); }
  };

  const handleUpdateBriefing = async () => {
    if (!editingBriefing) return;
    try {
      setLoading(true);
      const siteName = supervisorAssignedSiteNames[0];
      const supervisorsList = editSelectedSupervisors.map(id => { const s = filteredSupervisors.find(sup => sup._id === id); return s ? { id: s._id, name: s.name } : null; }).filter(Boolean);
      const managersList = editSelectedManagers.map(id => { const m = filteredManagers.find(mgr => mgr._id === id); return m ? { id: m._id, name: m.name } : null; }).filter(Boolean);
      const actionItems = editBriefingForm.actionItems.map(item => ({ description: item.description, assignedTo: item.assignedTo, dueDate: item.dueDate, status: item.status || 'pending', priority: item.priority || 'medium' }));
      const existingAttachments = editBriefingAttachments.filter(att => !att.isNew).map(({ isNew, file, ...rest }) => rest);
      const response = await briefingApi.updateBriefing(editingBriefing._id, {
        date: editBriefingForm.date, time: editBriefingForm.time, conductedBy: editBriefingForm.conductedBy, site: siteName,
        department: editBriefingForm.department, attendeesCount: editBriefingForm.attendeesCount, topics: editBriefingForm.topics.filter(t => t.trim() !== ''),
        keyPoints: editBriefingForm.keyPoints.filter(k => k.trim() !== ''), actionItems: actionItems, notes: editBriefingForm.notes, shift: editBriefingForm.shift,
        supervisors: supervisorsList, managers: managersList, attachments: existingAttachments
      }, editBriefingNewFiles);
      if (response.success) { toast.success('Briefing updated'); await fetchBriefings(); setShowEditBriefingDialog(false); setEditingBriefing(null); resetEditBriefingForm(); setEditBriefingAttachments([]); setEditBriefingNewFiles([]); }
      else throw new Error(response.message);
    } catch (error: any) { toast.error(error.message); }
    finally { setLoading(false); }
  };

  const deleteTraining = async (id: string) => { try { await trainingApi.deleteTraining(id); await fetchTrainings(); toast.success('Training deleted'); } catch (error) { toast.error('Error deleting training'); } };
  const deleteBriefing = async (id: string) => { try { await briefingApi.deleteBriefing(id); await fetchBriefings(); toast.success('Briefing deleted'); } catch (error) { toast.error('Error deleting briefing'); } };
  const updateTrainingStatus = async (id: string, status: string) => { try { await trainingApi.updateTrainingStatus(id, status); await fetchTrainings(); toast.success(`Status updated to ${status}`); } catch (error) { toast.error('Error updating status'); } };
  const updateActionItemStatus = async (briefingId: string, actionId: string, status: string) => { try { await briefingApi.updateActionItemStatus(briefingId, actionId, status); await fetchBriefings(); toast.success('Action item updated'); } catch (error) { toast.error('Error updating action item'); } };

  const resetTrainingForm = () => {
    setTrainingForm({ title: '', description: '', type: 'safety', date: '', time: '', duration: '', trainer: '', site: '', department: 'Housekeeping', maxAttendees: 20, location: '', objectives: [] });
    setSelectedSupervisors([]); setSelectedManagers([]); setSelectedEmployees([]);
    setSupervisorSearchQuery(""); setManagerSearchQuery(""); setEmployeeSearchQuery("");
  };
  const resetBriefingForm = () => {
    setBriefingForm({ date: '', time: '', conductedBy: '', department: 'Housekeeping', attendeesCount: 0, topics: [], keyPoints: [], actionItems: [], notes: '', shift: 'morning' });
    setSelectedSupervisors([]); setSelectedManagers([]);
    setSupervisorSearchQuery(""); setManagerSearchQuery("");
  };
  const resetEditTrainingForm = () => {
    setEditTrainingForm({ title: '', description: '', type: 'safety', date: '', time: '', duration: '', trainer: '', site: '', department: 'Housekeeping', maxAttendees: 20, location: '', objectives: [] });
    setEditSelectedSupervisors([]); setEditSelectedManagers([]);
  };
  const resetEditBriefingForm = () => {
    setEditBriefingForm({ date: '', time: '', conductedBy: '', department: 'Housekeeping', attendeesCount: 0, topics: [], keyPoints: [], actionItems: [], notes: '', shift: 'morning' });
    setEditSelectedSupervisors([]); setEditSelectedManagers([]);
  };

  const openEditTrainingDialog = (training: TrainingSession) => {
    setEditingTraining(training);
    setEditTrainingForm({ title: training.title, description: training.description, type: training.type, date: training.date, time: training.time, duration: training.duration, trainer: training.trainer, site: training.site, department: training.department, maxAttendees: training.maxAttendees, location: training.location, objectives: training.objectives || [] });
    setEditSelectedSupervisors(training.supervisors?.map(s => s.id) || []);
    setEditSelectedManagers(training.managers?.map(m => m.id) || []);
    setEditTrainingAttachments((training.attachments || []).map(att => ({ ...att, isNew: false })));
    setEditTrainingNewFiles([]);
    setShowEditTrainingDialog(true);
  };
  const openEditBriefingDialog = (briefing: StaffBriefing) => {
    setEditingBriefing(briefing);
    setEditBriefingForm({ date: briefing.date, time: briefing.time, conductedBy: briefing.conductedBy, department: briefing.department, attendeesCount: briefing.attendeesCount, topics: briefing.topics || [], keyPoints: briefing.keyPoints || [], actionItems: briefing.actionItems || [], notes: briefing.notes, shift: briefing.shift });
    setEditSelectedSupervisors(briefing.supervisors?.map(s => s.id) || []);
    setEditSelectedManagers(briefing.managers?.map(m => m.id) || []);
    setEditBriefingAttachments((briefing.attachments || []).map(att => ({ ...att, isNew: false })));
    setEditBriefingNewFiles([]);
    setShowEditBriefingDialog(true);
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
  const getTypeColor = (type: string) => trainingTypes.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-800';
  const formatDate = (dateString: string) => { try { const date = new Date(dateString); if (isNaN(date.getTime())) return dateString; return date.toLocaleDateString(); } catch { return dateString; } };
  const handleRefresh = () => { fetchTrainings(); fetchBriefings(); toast.success('Refreshed'); };

  const filteredSupervisorsList = filteredSupervisors.filter(sup => sup.name.toLowerCase().includes(supervisorSearchQuery.toLowerCase()));
  const filteredManagersList = filteredManagers.filter(mgr => mgr.name.toLowerCase().includes(managerSearchQuery.toLowerCase()));
  const filteredEmployeesList = filteredEmployees.filter(emp => emp.name.toLowerCase().includes(employeeSearchQuery.toLowerCase()) || emp.employeeId.toLowerCase().includes(employeeSearchQuery.toLowerCase()));
  const filteredEditSupervisorsList = filteredSupervisors.filter(sup => sup.name.toLowerCase().includes(editSupervisorSearchQuery.toLowerCase()));
  const filteredEditManagersList = filteredManagers.filter(mgr => mgr.name.toLowerCase().includes(editManagerSearchQuery.toLowerCase()));

  const totalTrainings = trainingSessions.length;
  const totalBriefings = staffBriefings.length;
  const completedTrainings = trainingSessions.filter(t => t.status === 'completed').length;
  const pendingActions = staffBriefings.reduce((acc, b) => acc + b.actionItems.filter(a => a.status === 'pending').length, 0);

  if (loadingData.sites && loadingData.trainings && loadingData.briefings) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.header className="bg-card border-b px-4 md:px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden"><Menu className="h-5 w-5" /></Button>
            <div><h1 className="text-xl md:text-2xl font-bold">Training & Staff Briefing</h1><p className="text-xs text-muted-foreground">Manage sessions for your assigned sites</p></div>
          </div>
        </div>
      </motion.header>

      <div className="p-3 sm:p-4 md:p-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <div><Badge variant="outline" className="bg-blue-50"><Building className="h-3 w-3 mr-1" />Site: {supervisorAssignedSiteNames[0] || 'Loading...'}</Badge></div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />Refresh
              </Button>
              <Dialog open={showAddTraining} onOpenChange={setShowAddTraining}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />Add Training
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add New Training Session</DialogTitle></DialogHeader>
                  <AddTrainingFormComponent trainingForm={trainingForm} setTrainingForm={setTrainingForm} addObjective={addObjective} removeObjective={removeObjective} updateObjective={updateObjective} sites={sites} />

                  <AttachmentsSection attachments={trainingAttachments} onUpload={handleTrainingFileUpload} onRemove={removeTrainingAttachment} fileInputRef={fileInputRef} title="Training Attachments" onTakePhoto={() => handleTakePhoto('training')} />
                  <DialogFooter><Button onClick={handleAddTraining}>Add Training</Button><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose></DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={showAddBriefing} onOpenChange={setShowAddBriefing}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <Plus className="h-4 w-4 mr-1" />Add Briefing
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add New Staff Briefing</DialogTitle></DialogHeader>
                  <AddBriefingFormComponent briefingForm={briefingForm} setBriefingForm={setBriefingForm} addTopic={addTopic} removeTopic={removeTopic} updateTopic={updateTopic} addKeyPoint={addKeyPoint} removeKeyPoint={removeKeyPoint} updateKeyPoint={updateKeyPoint} />

                  <ActionItemsSection actionItems={briefingForm.actionItems} onAdd={addActionItem} onRemove={removeActionItem} onUpdate={updateActionItem} />
                  <AttachmentsSection attachments={briefingAttachments} onUpload={handleBriefingFileUpload} onRemove={removeBriefingAttachment} fileInputRef={fileInputRef} title="Briefing Attachments" onTakePhoto={() => handleTakePhoto('briefing')} />
                  <DialogFooter><Button onClick={handleAddBriefing}>Add Briefing</Button><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MobileStatCard title="Total Trainings" value={totalTrainings} icon={Calendar} color="blue" />
            <MobileStatCard title="Staff Briefings" value={totalBriefings} icon={Users} color="green" />
            <MobileStatCard title="Completed" value={completedTrainings} icon={CheckCircle} color="purple" />
            <MobileStatCard title="Pending Actions" value={pendingActions} icon={AlertCircle} color="red" />
          </div>
        </div>

        <Tabs defaultValue="training" onValueChange={(v: any) => setActiveTab(v)} className="mt-4">
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="training">Training</TabsTrigger><TabsTrigger value="briefing">Briefings</TabsTrigger></TabsList>
          <Card className="mt-4"><CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div>
              <div className="flex gap-2">
                <Select value={filterDepartment} onValueChange={setFilterDepartment}><SelectTrigger className="w-32"><SelectValue placeholder="Department" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{departments.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent></Select>
                {activeTab === 'training' && (<Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="ongoing">Ongoing</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>)}
              </div>
            </div>
          </CardContent></Card>
          <AnimatePresence mode="wait">
            {activeTab === 'training' ? (
              <motion.div key="training" className="mt-4">
                <Card><CardHeader><CardTitle>Training Sessions</CardTitle></CardHeader><CardContent>
                  {trainingSessions.length === 0 ? (
                    <div className="text-center py-12"><Calendar className="h-12 w-12 mx-auto text-gray-300" /><p>No training sessions</p><Button onClick={() => setShowAddTraining(true)} className="mt-4">Add Training</Button></div>
                  ) : isMobileView ? (
                    <div className="space-y-3">{trainingSessions.map(s => (<MobileTrainingCard key={s._id} session={s} onView={setSelectedTraining} onUpdateStatus={updateTrainingStatus} onDelete={deleteTraining} getTypeColor={getTypeColor} getStatusBadge={getStatusBadge} formatDate={formatDate} trainingTypes={trainingTypes} canEdit={s.createdBy === supervisorId} />))}</div>
                  ) : (
                    <div className="space-y-4">{trainingSessions.map(s => (
                      <Card key={s._id}><CardContent className="p-4">
                        <div className="flex justify-between"><div><h3 className="font-semibold">{s.title}</h3><p className="text-sm text-gray-600">{s.trainer}</p></div><div className="flex gap-2"><Badge className={getTypeColor(s.type)}>{trainingTypes.find(t => t.value === s.type)?.label}</Badge><Badge className={getStatusBadge(s.status)}>{s.status}</Badge></div></div>
                        <div className="grid grid-cols-4 gap-4 mt-4"><div><Calendar className="inline h-3 w-3 mr-1" />{formatDate(s.date)}</div><div><Clock className="inline h-3 w-3 mr-1" />{s.time}</div><div><Building className="inline h-3 w-3 mr-1" />{s.site}</div><div><Users className="inline h-3 w-3 mr-1" />{s.attendees?.length}/{s.maxAttendees}</div></div>
                        <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setSelectedTraining(s)}><Eye className="h-4 w-4 mr-1" />View</Button>{s.createdBy === supervisorId && (<><Button variant="outline" size="sm" onClick={() => openEditTrainingDialog(s)}><Edit className="h-4 w-4 mr-1" />Edit</Button><Button variant="destructive" size="sm" onClick={() => deleteTraining(s._id)}><Trash2 className="h-4 w-4" /></Button></>)}</div>
                      </CardContent></Card>))}</div>
                  )}
                </CardContent></Card>
              </motion.div>
            ) : (
              <motion.div key="briefing" className="mt-4">
                <Card><CardHeader><CardTitle>Staff Briefings</CardTitle></CardHeader><CardContent>
                  {staffBriefings.length === 0 ? (
                    <div className="text-center py-12"><MessageSquare className="h-12 w-12 mx-auto text-gray-300" /><p>No staff briefings</p><Button onClick={() => setShowAddBriefing(true)} className="mt-4">Add Briefing</Button></div>
                  ) : isMobileView ? (
                    <div className="space-y-3">{staffBriefings.map(b => (<MobileBriefingCard key={b._id} briefing={b} onView={setSelectedBriefing} onDelete={deleteBriefing} onUpdateAction={updateActionItemStatus} getShiftBadge={getShiftBadge} getPriorityBadge={getPriorityBadge} formatDate={formatDate} canEdit={b.createdBy === supervisorId} />))}</div>
                  ) : (
                    <div className="space-y-4">{staffBriefings.map(b => (
                      <Card key={b._id}><CardContent className="p-4">
                        <div className="flex justify-between"><div><h3 className="font-semibold">{b.site}</h3><p className="text-sm text-gray-600">by {b.conductedBy}</p></div><Badge className={getShiftBadge(b.shift)}>{b.shift}</Badge></div>
                        <div className="grid grid-cols-3 gap-4 mt-4"><div><Calendar className="inline h-3 w-3 mr-1" />{formatDate(b.date)}</div><div><Clock className="inline h-3 w-3 mr-1" />{b.time}</div><div><Users className="inline h-3 w-3 mr-1" />{b.attendeesCount} attendees</div></div>
                        <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setSelectedBriefing(b)}><Eye className="h-4 w-4 mr-1" />View</Button>{b.createdBy === supervisorId && (<><Button variant="outline" size="sm" onClick={() => openEditBriefingDialog(b)}><Edit className="h-4 w-4 mr-1" />Edit</Button><Button variant="destructive" size="sm" onClick={() => deleteBriefing(b._id)}><Trash2 className="h-4 w-4" /></Button></>)}</div>
                      </CardContent></Card>))}</div>
                  )}
                </CardContent></Card>
              </motion.div>
            )}
          </AnimatePresence>
        </Tabs>

        <TrainingDetailDialog training={selectedTraining} open={!!selectedTraining} onClose={() => setSelectedTraining(null)} onEdit={openEditTrainingDialog} onUpdateStatus={updateTrainingStatus} getStatusBadge={getStatusBadge} getTypeColor={getTypeColor} formatDate={formatDate} trainingTypes={trainingTypes} />
        <BriefingDetailDialog briefing={selectedBriefing} open={!!selectedBriefing} onClose={() => setSelectedBriefing(null)} onEdit={openEditBriefingDialog} onUpdateAction={updateActionItemStatus} getShiftBadge={getShiftBadge} getPriorityBadge={getPriorityBadge} formatDate={formatDate} />

        <Dialog open={showEditTrainingDialog} onOpenChange={setShowEditTrainingDialog}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Training Session</DialogTitle></DialogHeader>
            <EditTrainingFormComponent editTrainingForm={editTrainingForm} setEditTrainingForm={setEditTrainingForm} addEditObjective={addEditObjective} removeEditObjective={removeEditObjective} updateEditObjective={updateEditObjective} sites={sites} />

            <AttachmentsSection attachments={editTrainingAttachments} onUpload={handleEditTrainingFileUpload} onRemove={removeEditTrainingAttachment} fileInputRef={editTrainingFileInputRef} title="Attachments" onTakePhoto={() => handleTakePhoto('editTraining')} />
            <DialogFooter><Button onClick={handleUpdateTraining}>Update Training</Button><Button variant="outline" onClick={() => setShowEditTrainingDialog(false)}>Cancel</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditBriefingDialog} onOpenChange={setShowEditBriefingDialog}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Staff Briefing</DialogTitle></DialogHeader>
            <EditBriefingFormComponent editBriefingForm={editBriefingForm} setEditBriefingForm={setEditBriefingForm} addEditTopic={addEditTopic} removeEditTopic={removeEditTopic} updateEditTopic={updateEditTopic} addEditKeyPoint={addEditKeyPoint} removeEditKeyPoint={removeEditKeyPoint} updateEditKeyPoint={updateEditKeyPoint} />

            <ActionItemsSection actionItems={editBriefingForm.actionItems} onAdd={addEditActionItem} onRemove={removeEditActionItem} onUpdate={updateEditActionItem} />
            <AttachmentsSection attachments={editBriefingAttachments} onUpload={handleEditBriefingFileUpload} onRemove={removeEditBriefingAttachment} fileInputRef={editBriefingFileInputRef} title="Attachments" onTakePhoto={() => handleTakePhoto('editBriefing')} />
            <DialogFooter><Button onClick={handleUpdateBriefing}>Update Briefing</Button><Button variant="outline" onClick={() => setShowEditBriefingDialog(false)}>Cancel</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <CameraCapture open={cameraOpen} onOpenChange={setCameraOpen} onCapture={handlePhotoCapture} title="Take Photo" description="Capture a photo with location and timestamp" actionLabel="Capture" />
    </div>
  );
};

const Check = ({ className = "h-3 w-3" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
);

export default SupervisorTrainingBriefing;
// components/work-query/WorkQueryList.tsx
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Search, Plus, X, Eye, Clock, AlertCircle, CheckCircle, MessageCircle, User, Trash2,
    RefreshCw, Building2, Loader2, Mail, Info, Camera, Image as ImageIcon, Upload, Trash,
    ZoomIn, RotateCw, Reply, Filter, ChevronDown, ChevronUp, FileText, Activity,
    Sparkles, HardHat, Shield, Car, Truck
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useWorkQuery } from "@/hooks/useWorkQuery";
import type { WorkQuery } from "@/services/workQueryApi";

// ============================================================
// Shared badges (unchanged)
// ============================================================
const PriorityBadge = ({ priority }: { priority: string }) => {
    const styles: Record<string, string> = {
        low: "bg-green-100 text-green-800 border-green-200",
        medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
        high: "bg-orange-100 text-orange-800 border-orange-200",
        critical: "bg-red-100 text-red-800 border-red-200"
    };
    const icons: Record<string, JSX.Element> = {
        low: <CheckCircle className="h-3 w-3" />,
        medium: <Clock className="h-3 w-3" />,
        high: <AlertCircle className="h-3 w-3" />,
        critical: <AlertCircle className="h-3 w-3" />
    };
    return (
        <Badge variant="outline" className={`${styles[priority]} flex items-center gap-1`}>
            {icons[priority]}
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </Badge>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
        "in-progress": "bg-blue-100 text-blue-800 border-blue-200",
        resolved: "bg-green-100 text-green-800 border-green-200",
        rejected: "bg-red-100 text-red-800 border-red-200"
    };
    const icons: Record<string, JSX.Element> = {
        pending: <Clock className="h-3 w-3" />,
        "in-progress": <AlertCircle className="h-3 w-3" />,
        resolved: <CheckCircle className="h-3 w-3" />,
        rejected: <X className="h-3 w-3" />
    };
    return (
        <Badge variant="outline" className={`${styles[status]} flex items-center gap-1`}>
            {icons[status]}
            {status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </Badge>
    );
};

const ServiceIcon = ({ type }: { type: string }) => {
    const icons: Record<string, JSX.Element> = {
        cleaning: <Sparkles className="h-4 w-4" />,
        "waste-management": <Trash2 className="h-4 w-4" />,
        "parking-management": <Car className="h-4 w-4" />,
        security: <Shield className="h-4 w-4" />,
        maintenance: <HardHat className="h-4 w-4" />,
        default: <Truck className="h-4 w-4" />
    };
    return icons[type] || icons.default;
};

// ============================================================
// Image file (for creation) types
// ============================================================
interface ImageFile {
    file: File;
    preview: string;
    id: string;
}

const SERVICE_EXAMPLES = [
    { id: "CLEAN001", name: "Office Cleaning Service", type: "cleaning" },
    { id: "WASTE001", name: "Biomedical Waste Collection", type: "waste-management" },
    { id: "PARK001", name: "Parking Lot Management", type: "parking-management" },
    { id: "SEC001", name: "Security Patrol Service", type: "security" },
    { id: "MAINT001", name: "HVAC Maintenance", type: "maintenance" },
];

const SERVICE_TYPES = [
    { value: "cleaning", label: "Cleaning", icon: <Sparkles className="h-4 w-4" /> },
    { value: "waste-management", label: "Waste Management", icon: <Trash2 className="h-4 w-4" /> },
    { value: "parking-management", label: "Parking Management", icon: <Car className="h-4 w-4" /> },
    { value: "security", label: "Security", icon: <Shield className="h-4 w-4" /> },
    { value: "maintenance", label: "Maintenance", icon: <HardHat className="h-4 w-4" /> },
    { value: "other", label: "Other", icon: <Truck className="h-4 w-4" /> }
];

// ============================================================
// Photo Upload (unchanged)
// ============================================================
const PhotoUpload = ({
    images, onImagesChange, maxImages = 5, disabled = false
}: {
    images: ImageFile[];
    onImagesChange: (images: ImageFile[]) => void;
    maxImages?: number;
    disabled?: boolean;
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (images.length + files.length > maxImages) {
            toast.error(`You can only upload up to ${maxImages} images`);
            return;
        }
        const newImages: ImageFile[] = files.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            id: Math.random().toString(36).substring(7)
        }));
        onImagesChange([...images, ...newImages]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveImage = (id: string) => {
        const img = images.find(i => i.id === id);
        if (img) URL.revokeObjectURL(img.preview);
        onImagesChange(images.filter(i => i.id !== id));
    };

    return (
        <div className="space-y-3">
            <Label className="text-sm">Photos (Optional)</Label>
            <p className="text-xs text-muted-foreground">
                Upload images to document the issue (Max {maxImages} images)
            </p>

            {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {images.map((image) => (
                        <div key={image.id} className="relative group">
                            <div
                                className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer"
                                onClick={() => setPreviewImage(image.preview)}
                            >
                                <img src={image.preview} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button type="button" size="icon" variant="secondary" className="h-7 w-7"
                                        onClick={(e) => { e.stopPropagation(); setPreviewImage(image.preview); }}>
                                        <ZoomIn className="h-3 w-3" />
                                    </Button>
                                    <Button type="button" size="icon" variant="destructive" className="h-7 w-7"
                                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(image.id); }}>
                                        <Trash className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {images.length < maxImages && !disabled && (
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload from Gallery
                    </Button>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                        onChange={handleFileSelect} disabled={disabled} />
                </div>
            )}

            <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
                    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center bg-black">
                        {previewImage && <img src={previewImage} alt="Full size" className="max-w-full max-h-[85vh] object-contain" />}
                        <Button type="button" variant="ghost" size="icon"
                            className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70"
                            onClick={() => setPreviewImage(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

// ============================================================
// Respond Dialog (for manager/admin/superadmin)
// ============================================================
const ResponseDialog = ({
    query, open, onClose, onRespond
}: {
    query: WorkQuery | null;
    open: boolean;
    onClose: () => void;
    onRespond: (id: string, status: WorkQuery['status'], response: string) => Promise<void>;
}) => {
    const [status, setStatus] = useState<WorkQuery['status']>('resolved');
    const [response, setResponse] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (query) {
            setStatus(query.status === 'pending' ? 'resolved' : query.status);
            setResponse(query.superadminResponse || '');
        }
    }, [query]);

    const handleSubmit = async () => {
        if (!query) return;
        if (status === 'resolved' && !response.trim()) {
            toast.error('Please provide a response when resolving the query');
            return;
        }
        setSubmitting(true);
        try {
            await onRespond(query._id, status, response);
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Respond to Work Query</DialogTitle>
                    <DialogDescription>Query: {query?.queryId} - {query?.title}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v as WorkQuery['status'])}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Response *</Label>
                        <Textarea
                            placeholder="Enter your response to this query..."
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            rows={5}
                            required={status === 'resolved'}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Reply className="h-4 w-4 mr-2" />}
                        Submit Response
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ============================================================
// View Details Dialog (unchanged)
// ============================================================
const ViewDetailsDialog = ({
    query, open, onClose, categories
}: {
    query: WorkQuery | null;
    open: boolean;
    onClose: () => void;
    categories: { value: string; label: string }[];
}) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const formatDate = (dateString: string) => {
        try { return format(new Date(dateString), "MMM dd, yyyy HH:mm"); }
        catch { return "Invalid date"; }
    };

    if (!query) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Query Details - {query.queryId}</DialogTitle>
                    <DialogDescription>
                        Submitted by {query.supervisorName} on {formatDate(query.createdAt)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label className="font-semibold">Title</Label><p className="mt-1 text-sm">{query.title}</p></div>
                        <div><Label className="font-semibold">Service</Label><p className="mt-1 text-sm">{query.serviceId}</p></div>
                        <div><Label className="font-semibold">Priority</Label><div className="mt-1"><PriorityBadge priority={query.priority} /></div></div>
                        <div><Label className="font-semibold">Status</Label><div className="mt-1"><StatusBadge status={query.status} /></div></div>
                        <div>
                            <Label className="font-semibold">Category</Label>
                            <p className="mt-1 text-sm">
                                {categories.find(c => c.value === query.category)?.label || query.category}
                            </p>
                        </div>
                        <div>
                            <Label className="font-semibold">Submitted By</Label>
                            <div className="mt-1 flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{query.supervisorName}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label className="font-semibold">Description</Label>
                        <p className="mt-1 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{query.description}</p>
                    </div>

                    {query.images && query.images.length > 0 && (
                        <div>
                            <Label className="font-semibold mb-2 block">Photos ({query.images.length})</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {query.images.map((image, idx) => (
                                    <div key={idx}
                                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer group"
                                        onClick={() => setSelectedImage(image.url)}>
                                        <img src={image.url} alt={`photo ${idx + 1}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <ZoomIn className="h-6 w-6 text-white" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {query.superadminResponse && (
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <Label className="font-semibold text-green-900">Superadmin Response</Label>
                            <p className="mt-1 text-sm text-green-800 whitespace-pre-wrap">{query.superadminResponse}</p>
                            {query.responseDate && (
                                <div className="text-xs text-green-600 mt-2">Responded on: {formatDate(query.responseDate)}</div>
                            )}
                        </div>
                    )}
                </div>

                <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                    <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
                        <div className="relative w-full h-full min-h-[300px] flex items-center justify-center bg-black">
                            {selectedImage && <img src={selectedImage} alt="Full size" className="max-w-full max-h-[85vh] object-contain" />}
                            <Button variant="ghost" size="icon"
                                className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70"
                                onClick={() => setSelectedImage(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
};

// ============================================================
// Main shared component
// ============================================================
interface SupervisorInfo {
    id: string;
    name: string;
    email?: string;
    department?: string;
    site?: string;
}

interface WorkQueryListProps {
    mode: 'supervisor' | 'superadmin' | 'manager' | 'admin';
    supervisorInfo?: SupervisorInfo;
}

export const WorkQueryList = ({ mode, supervisorInfo }: WorkQueryListProps) => {
    const isSupervisor = mode === 'supervisor';
    const isSuperadmin = mode === 'superadmin';
    const isManager = mode === 'manager';
    const isAdmin = mode === 'admin';

    // Roles that can see ALL queries (manager, admin, superadmin)
    const canSeeAll = isSuperadmin || isManager || isAdmin;
    // Roles that can respond (manager, admin, superadmin) – NOT supervisor
    const canRespond = isManager || isAdmin || isSuperadmin;
    // Roles that can create (supervisor, manager, admin) – NOT superadmin
    const canCreate = isSupervisor || isManager || isAdmin;

    const {
        workQueries,
        statistics,
        categories,
        priorities,
        statuses,
        pagination,
        loading,
        createWorkQuery,
        deleteWorkQuery,
        respondToWorkQuery,
        fetchWorkQueries,
        fetchStatistics,
        updateFilters,
        changePage
    } = useWorkQuery({
        supervisorId: isSupervisor ? supervisorInfo?.id : undefined,
        autoFetch: true, // always fetch; hook handles supervisorId presence
        initialFilters: { page: 1, limit: 10 }
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [showFilters, setShowFilters] = useState(false);
    const [isMobileView, setIsMobileView] = useState(false);

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedQueryForView, setSelectedQueryForView] = useState<WorkQuery | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedQueryForResponse, setSelectedQueryForResponse] = useState<WorkQuery | null>(null);
    const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);

    const [newQuery, setNewQuery] = useState({
        title: "",
        description: "",
        serviceId: "",
        priority: "medium" as "low" | "medium" | "high" | "critical",
        category: "service-quality",
    });
    const [queryImages, setQueryImages] = useState<ImageFile[]>([]);
    const [selectedServiceType, setSelectedServiceType] = useState("other");

    useEffect(() => {
        const checkMobile = () => setIsMobileView(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        return () => {
            queryImages.forEach(img => URL.revokeObjectURL(img.preview));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        updateFilters({
            search: searchTerm || undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, statusFilter, priorityFilter]);

    const handleRefresh = () => {
        fetchWorkQueries();
        fetchStatistics();
        toast.success("Refreshed");
    };

    const handleDialogClose = () => {
        setIsCreateDialogOpen(false);
        queryImages.forEach(img => URL.revokeObjectURL(img.preview));
        setTimeout(() => {
            setNewQuery({ title: "", description: "", serviceId: "", priority: "medium", category: "service-quality" });
            setQueryImages([]);
            setSelectedServiceType("other");
        }, 300);
    };

    const handleSubmitQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supervisorInfo?.id || !supervisorInfo?.name) {
            toast.error("User information is missing");
            return;
        }
        if (!newQuery.title.trim() || !newQuery.description.trim() || !newQuery.serviceId.trim()) {
            toast.error("Please fill in title, description, and service ID");
            return;
        }

        let serviceId = newQuery.serviceId;
        let serviceTitle = newQuery.serviceId;
        if (serviceId.includes(" - ")) {
            const parts = serviceId.split(" - ");
            serviceId = parts[0];
            serviceTitle = parts.slice(1).join(" - ");
        }
        serviceId = serviceId.trim().toUpperCase();

        const files = queryImages.map(img => img.file);

        const result = await createWorkQuery({
            title: newQuery.title,
            description: newQuery.description,
            serviceId,
            priority: newQuery.priority,
            category: newQuery.category,
            supervisorId: supervisorInfo.id,
            supervisorName: supervisorInfo.name,
            serviceTitle,
            serviceType: selectedServiceType
        }, files);

        if (result.success) {
            handleDialogClose();
        }
    };

    const handleDelete = async (id: string, title: string) => {
        const result = await deleteWorkQuery(id);
        if (result.success) {
            toast.success(`Query "${title}" deleted`);
        }
    };

    const handleRespond = async (id: string, status: WorkQuery['status'], response: string) => {
        await respondToWorkQuery(id, status, response);
    };

    const formatDate = (dateString: string) => {
        try { return format(new Date(dateString), "MMM dd, yyyy HH:mm"); }
        catch { return "Invalid date"; }
    };

    const statsAny = statistics as any;
    const supervisorStats = statsAny?.supervisorStats;

    if (loading.queries && workQueries.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading work queries...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Statistics cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <Card className="bg-white">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs md:text-sm text-muted-foreground">Total Queries</p>
                                <p className="text-lg md:text-2xl font-bold text-blue-600">
                                    {loading.statistics ? "..." : statsAny?.total || 0}
                                </p>
                            </div>
                            <FileText className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
                                <p className="text-lg md:text-2xl font-bold text-yellow-600">
                                    {loading.statistics ? "..." : statsAny?.statusCounts?.pending || 0}
                                </p>
                            </div>
                            <Clock className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs md:text-sm text-muted-foreground">In Progress</p>
                                <p className="text-lg md:text-2xl font-bold text-blue-600">
                                    {loading.statistics ? "..." : statsAny?.statusCounts?.['in-progress'] || 0}
                                </p>
                            </div>
                            <Activity className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white">
                    <CardContent className="p-3 md:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs md:text-sm text-muted-foreground">Resolved</p>
                                <p className="text-lg md:text-2xl font-bold text-green-600">
                                    {loading.statistics ? "..." : statsAny?.statusCounts?.resolved || 0}
                                </p>
                            </div>
                            <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Supervisor Info card – only for supervisor (and optionally manager/admin) */}
            {(isSupervisor || canCreate) && supervisorInfo && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-3 md:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm md:text-base">
                                    {supervisorInfo.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <div className="font-medium text-sm md:text-base text-blue-900">{supervisorInfo.name}</div>
                                    <div className="text-xs text-blue-700">{mode.charAt(0).toUpperCase() + mode.slice(1)}</div>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs">
                                {supervisorInfo.department && (
                                    <div className="flex items-center gap-1 text-blue-700">
                                        <Building2 className="h-3 w-3" /><span className="truncate">{supervisorInfo.department}</span>
                                    </div>
                                )}
                                {supervisorInfo.email && (
                                    <div className="flex items-center gap-1 text-blue-700">
                                        <Mail className="h-3 w-3" /><span className="truncate">{supervisorInfo.email}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Supervisor summary – only for manager, admin, superadmin (who see all) */}
            {canSeeAll && supervisorStats && supervisorStats.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Supervisor Summary</CardTitle>
                        <CardDescription>Query statistics by supervisor</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Supervisor</TableHead>
                                        <TableHead className="text-center">Total</TableHead>
                                        <TableHead className="text-center">Pending</TableHead>
                                        <TableHead className="text-center">Resolved</TableHead>
                                        <TableHead className="text-center">Resolution Rate</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {supervisorStats.map((sup: any) => (
                                        <TableRow key={sup.supervisorId}>
                                            <TableCell className="font-medium">{sup.supervisorName}</TableCell>
                                            <TableCell className="text-center">{sup.total}</TableCell>
                                            <TableCell className="text-center text-yellow-600">{sup.pending}</TableCell>
                                            <TableCell className="text-center text-green-600">{sup.resolved}</TableCell>
                                            <TableCell className="text-center">
                                                {sup.total > 0 ? Math.round((sup.resolved / sup.total) * 100) : 0}%
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main table card */}
            <Card>
                <CardHeader className="p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-lg md:text-xl">
                                {canSeeAll ? "All Work Queries" : "Work Queries"}
                            </CardTitle>
                            <CardDescription className="text-sm">
                                {canSeeAll
                                    ? "View and respond to queries from all supervisors"
                                    : "Manage and track issues with facility services"}
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            <Button variant="outline" onClick={handleRefresh} disabled={loading.queries}
                                size={isMobileView ? "sm" : "default"} className="flex-1 sm:flex-none">
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading.queries ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}
                                size={isMobileView ? "sm" : "default"} className="flex-1 sm:flex-none">
                                <Filter className="h-4 w-4 mr-2" />
                                Filters {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                            </Button>

                            {canCreate && (
                                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="flex-1 sm:flex-none" size={isMobileView ? "sm" : "default"}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            New Query
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
                                        <DialogHeader>
                                            <DialogTitle>Create New Work Query</DialogTitle>
                                            <DialogDescription>Report an issue with a facility service</DialogDescription>
                                        </DialogHeader>

                                        <form onSubmit={handleSubmitQuery} className="space-y-4 md:space-y-6">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="title">Query Title *</Label>
                                                    <Input id="title" value={newQuery.title}
                                                        onChange={(e) => setNewQuery(prev => ({ ...prev, title: e.target.value }))}
                                                        placeholder="Brief description of the issue" required disabled={loading.creating} />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="description">Detailed Description *</Label>
                                                    <Textarea id="description" value={newQuery.description}
                                                        onChange={(e) => setNewQuery(prev => ({ ...prev, description: e.target.value }))}
                                                        placeholder="Provide detailed information about the issue..." rows={4}
                                                        required disabled={loading.creating} />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="serviceId">Service ID/Name *</Label>
                                                        <Input id="serviceId" value={newQuery.serviceId}
                                                            onChange={(e) => setNewQuery(prev => ({ ...prev, serviceId: e.target.value }))}
                                                            placeholder="Enter Service ID or Name" required disabled={loading.creating} />
                                                        <div className="text-xs text-muted-foreground flex items-start gap-1">
                                                            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                                            <span>Enter the Service ID or Name you want to report an issue for</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="category">Category *</Label>
                                                        <Select value={newQuery.category}
                                                            onValueChange={(value) => setNewQuery(prev => ({ ...prev, category: value }))}
                                                            disabled={loading.creating}>
                                                            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                                            <SelectContent>
                                                                {categories.map(category => (
                                                                    <SelectItem key={category.value} value={category.value}>
                                                                        <div className="flex flex-col">
                                                                            <span>{category.label}</span>
                                                                            <span className="text-xs text-muted-foreground">{category.description}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Service Type (Optional)</Label>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                        {SERVICE_TYPES.map((serviceType) => (
                                                            <Button key={serviceType.value} type="button"
                                                                variant={selectedServiceType === serviceType.value ? "default" : "outline"}
                                                                className="justify-start h-auto py-2"
                                                                onClick={() => setSelectedServiceType(serviceType.value)}>
                                                                <div className="flex items-center gap-2">
                                                                    {serviceType.icon}
                                                                    <span className="truncate">{serviceType.label}</span>
                                                                </div>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="priority">Priority Level *</Label>
                                                    <Select value={newQuery.priority}
                                                        onValueChange={(value) => setNewQuery(prev => ({ ...prev, priority: value as any }))}
                                                        disabled={loading.creating}>
                                                        <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                                                        <SelectContent>
                                                            {priorities.map(priority => (
                                                                <SelectItem key={priority.value} value={priority.value}>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-2 h-2 rounded-full ${priority.value === 'low' ? 'bg-green-500' :
                                                                                priority.value === 'medium' ? 'bg-yellow-500' :
                                                                                    priority.value === 'high' ? 'bg-orange-500' : 'bg-red-500'
                                                                            }`} />
                                                                        <div className="flex flex-col">
                                                                            <span>{priority.label}</span>
                                                                            <span className="text-xs text-muted-foreground">{priority.description}</span>
                                                                        </div>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <PhotoUpload images={queryImages} onImagesChange={setQueryImages}
                                                maxImages={5} disabled={loading.creating} />

                                            <div className="p-3 md:p-4 bg-gray-50 rounded-lg border">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                                    <Label className="font-medium text-gray-900">Service Examples</Label>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {SERVICE_EXAMPLES.map((service, index) => (
                                                        <div key={index}
                                                            className="text-xs p-2 border rounded bg-white hover:bg-gray-50 cursor-pointer"
                                                            onClick={() => {
                                                                setNewQuery(prev => ({ ...prev, serviceId: `${service.id} - ${service.name}` }));
                                                                setSelectedServiceType(service.type);
                                                            }}>
                                                            <div className="flex items-center gap-2">
                                                                <ServiceIcon type={service.type} />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium truncate">{service.id}</div>
                                                                    <div className="text-muted-foreground truncate">{service.name}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <DialogFooter className="gap-2 flex-col sm:flex-row">
                                                <Button type="button" variant="outline" onClick={handleDialogClose}
                                                    disabled={loading.creating} className="w-full sm:w-auto">
                                                    Cancel
                                                </Button>
                                                <Button type="submit" disabled={loading.creating} className="w-full sm:w-auto">
                                                    {loading.creating ? (
                                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                                                    ) : "Submit Query"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 md:p-6 pt-0">
                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6 p-4 bg-gray-50 rounded-lg">
                            <div className="space-y-1 md:space-y-2">
                                <Label className="text-xs md:text-sm">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search queries..." value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                                </div>
                            </div>
                            <div className="space-y-1 md:space-y-2">
                                <Label className="text-xs md:text-sm">Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        {statuses.map(status => (
                                            <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1 md:space-y-2">
                                <Label className="text-xs md:text-sm">Priority</Label>
                                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                    <SelectTrigger><SelectValue placeholder="All Priorities" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Priorities</SelectItem>
                                        {priorities.map(priority => (
                                            <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {loading.queries ? (
                        <div className="text-center py-8 md:py-12">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                            <p className="mt-4 text-muted-foreground">Loading work queries...</p>
                        </div>
                    ) : workQueries.length === 0 ? (
                        <div className="text-center py-8 md:py-12 border rounded-lg">
                            <MessageCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-base md:text-lg font-medium">No queries found</h3>
                            <p className="text-sm text-muted-foreground px-4">
                                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                                    ? "No work queries match your current filters."
                                    : "No work queries have been created yet."}
                            </p>
                        </div>
                    ) : (
                        <>
                            {isMobileView ? (
                                <div className="space-y-3">
                                    {workQueries.map((query) => (
                                        <Card key={query._id} className="overflow-hidden">
                                            <CardContent className="p-4">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-mono text-xs text-gray-500">{query.queryId}</div>
                                                            <div className="font-medium text-sm mt-1">{query.title}</div>
                                                            {canSeeAll && (
                                                                <div className="text-xs text-gray-500 mt-0.5">by {query.supervisorName}</div>
                                                            )}
                                                        </div>
                                                        <PriorityBadge priority={query.priority} />
                                                    </div>

                                                    <div className="text-xs text-gray-600 line-clamp-2">{query.description}</div>

                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Building2 className="h-3 w-3" />
                                                        <span className="truncate">{query.serviceId}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <StatusBadge status={query.status} />
                                                        <span className="text-xs text-gray-500">{formatDate(query.createdAt)}</span>
                                                    </div>

                                                    {query.images && query.images.length > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-blue-600">
                                                            <ImageIcon className="h-3 w-3" />
                                                            <span>{query.images.length} photo(s)</span>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                                        <Button size="sm" variant="outline"
                                                            onClick={() => { setSelectedQueryForView(query); setIsViewDialogOpen(true); }}
                                                            className="w-full">
                                                            <Eye className="h-3 w-3 mr-1" /> View
                                                        </Button>

                                                        {canRespond && query.status !== 'resolved' && query.status !== 'rejected' && (
                                                            <Button size="sm" variant="default" className="w-full"
                                                                onClick={() => { setSelectedQueryForResponse(query); setIsResponseDialogOpen(true); }}
                                                                disabled={loading.updating}>
                                                                <Reply className="h-3 w-3 mr-1" /> Respond
                                                            </Button>
                                                        )}

                                                        {isSupervisor && (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button size="sm" variant="destructive" className="w-full"
                                                                        disabled={query.status === 'in-progress' || query.status === 'resolved' || loading.deleting}>
                                                                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Delete Work Query</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Are you sure you want to delete this work query? This action cannot be undone.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction className="bg-red-600 hover:bg-red-700"
                                                                            onClick={() => handleDelete(query._id, query.title)}>
                                                                            Delete
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Query ID</TableHead>
                                                <TableHead>Title</TableHead>
                                                {canSeeAll && <TableHead>Supervisor</TableHead>}
                                                <TableHead>Service</TableHead>
                                                <TableHead>Priority</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {workQueries.map((query) => (
                                                <TableRow key={query._id}>
                                                    <TableCell className="font-mono text-sm">{query.queryId}</TableCell>
                                                    <TableCell>
                                                        <div className="max-w-xs">
                                                            <div className="font-medium truncate">{query.title}</div>
                                                            <div className="text-xs text-muted-foreground truncate">
                                                                {query.description.substring(0, 50)}...
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    {canSeeAll && (
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <User className="h-4 w-4 text-muted-foreground" />
                                                                <span className="text-sm">{query.supervisorName}</span>
                                                            </div>
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        <div className="max-w-xs text-sm truncate">{query.serviceId}</div>
                                                    </TableCell>
                                                    <TableCell><PriorityBadge priority={query.priority} /></TableCell>
                                                    <TableCell><StatusBadge status={query.status} /></TableCell>
                                                    <TableCell className="whitespace-nowrap text-sm">{formatDate(query.createdAt)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="sm" variant="outline"
                                                                onClick={() => { setSelectedQueryForView(query); setIsViewDialogOpen(true); }}>
                                                                <Eye className="h-3 w-3 mr-1" /> View
                                                            </Button>

                                                            {canRespond && query.status !== 'resolved' && query.status !== 'rejected' && (
                                                                <Button size="sm" variant="default"
                                                                    onClick={() => { setSelectedQueryForResponse(query); setIsResponseDialogOpen(true); }}
                                                                    disabled={loading.updating}>
                                                                    <Reply className="h-3 w-3 mr-1" /> Respond
                                                                </Button>
                                                            )}

                                                            {isSupervisor && (
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button size="sm" variant="destructive"
                                                                            disabled={query.status === 'in-progress' || query.status === 'resolved' || loading.deleting}>
                                                                            <Trash2 className="h-3 w-3 mr-1" /> Delete
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Delete Work Query</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Are you sure you want to delete this work query? This action cannot be undone.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction className="bg-red-600 hover:bg-red-700"
                                                                                onClick={() => handleDelete(query._id, query.title)}>
                                                                                Delete
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {pagination.totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
                                    <div className="text-sm text-muted-foreground order-2 sm:order-1">
                                        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                                        {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                                    </div>
                                    <div className="flex items-center gap-2 order-1 sm:order-2">
                                        <Button variant="outline" size="sm" onClick={() => changePage(pagination.page - 1)}
                                            disabled={pagination.page === 1}>
                                            Previous
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (pagination.totalPages <= 5) pageNum = i + 1;
                                                else if (pagination.page <= 3) pageNum = i + 1;
                                                else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                                                else pageNum = pagination.page - 2 + i;
                                                return (
                                                    <Button key={pageNum} variant={pagination.page === pageNum ? "default" : "outline"}
                                                        size="sm" onClick={() => changePage(pageNum)} className="w-8 h-8 p-0">
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => changePage(pagination.page + 1)}
                                            disabled={pagination.page === pagination.totalPages}>
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <ViewDetailsDialog
                query={selectedQueryForView}
                open={isViewDialogOpen}
                onClose={() => { setIsViewDialogOpen(false); setSelectedQueryForView(null); }}
                categories={categories}
            />

            {canRespond && (
                <ResponseDialog
                    query={selectedQueryForResponse}
                    open={isResponseDialogOpen}
                    onClose={() => { setIsResponseDialogOpen(false); setSelectedQueryForResponse(null); }}
                    onRespond={handleRespond}
                />
            )}
        </div>
    );
};
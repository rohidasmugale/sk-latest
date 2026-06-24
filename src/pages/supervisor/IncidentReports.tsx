import { useState, useEffect, useCallback } from "react";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building, RefreshCw, Camera, X, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useRole } from "@/context/RoleContext";
import CameraCapture from "./CameraCapture";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const apiClient = axios.create({ baseURL: API_URL });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function IncidentReports() {
  const { user: currentUser, role } = useRole();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [supervisorSite, setSupervisorSite] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    site: "",
    employeeId: "",
    type: "accident",
    description: "",
    date: new Date().toISOString().split("T")[0]
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSupervisorSite = useCallback(async () => {
    if (!currentUser || role !== "supervisor") return;
    const supervisorId = currentUser._id || currentUser.id;
    try {
      const res = await apiClient.get('/tasks', { params: { limit: 1000 } });
      let tasks = res.data?.data || res.data || [];
      if (!Array.isArray(tasks)) tasks = [];
      const siteSet = new Set<string>();
      tasks.forEach((task: any) => {
        const assigned = task.assignedUsers?.some((u: any) => u.userId === supervisorId);
        const assignedOld = task.assignedTo === supervisorId;
        if ((assigned || assignedOld) && task.siteName) {
          siteSet.add(task.siteName);
        }
      });
      const siteArray = Array.from(siteSet);
      if (siteArray.length > 0) {
        setSupervisorSite(siteArray[0]);
        setForm(prev => ({ ...prev, site: siteArray[0] }));
      }
    } catch (error) {
      console.error("Error fetching supervisor site:", error);
    }
  }, [currentUser, role]);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await apiClient.get('/incidents/supervisor');
      setIncidents(res.data.data || []);
    } catch (error: any) {
      console.error("Fetch incidents error:", error);
      if (error.response?.status !== 404) toast.error("Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === "supervisor" && currentUser) {
      fetchSupervisorSite();
      fetchIncidents();
    } else {
      setLoading(false);
    }
  }, [currentUser, role, fetchSupervisorSite, fetchIncidents]);

  const handlePhotoCapture = (photoFile: File) => {
    setSelectedPhoto(photoFile);
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    toast.success("Photo captured");
  };

  const removePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setSelectedPhoto(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.site) {
      toast.error("No site assigned");
      return;
    }
    if (!form.description) {
      toast.error("Please enter a description");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("site", form.site);
      formData.append("employeeId", form.employeeId || "");
      formData.append("type", form.type);
      formData.append("description", form.description);
      formData.append("date", form.date);
      if (selectedPhoto) formData.append("photo", selectedPhoto);

      await apiClient.post('/incidents', formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Incident reported");
      setForm(prev => ({ ...prev, employeeId: "", description: "" }));
      removePhoto();
      await fetchIncidents();
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.response?.data?.message || "Failed to report");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter today's incidents + export old
  const today = new Date().toISOString().split('T')[0];
  const todaysIncidents = incidents.filter(inc => inc.date?.startsWith(today));
  const oldIncidents = incidents.filter(inc => !inc.date?.startsWith(today));

  const exportOldIncidents = () => {
    if (oldIncidents.length === 0) {
      toast.info("No old incidents to export");
      return;
    }
    const headers = ['Date', 'Site', 'Type', 'Description', 'Employee ID', 'Photo URL'];
    const rows = oldIncidents.map(inc => [
      inc.date,
      inc.site,
      inc.type,
      inc.description,
      inc.employeeId || '',
      inc.photoUrl || ''
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `incidents_old_${today}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Old incidents exported");
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!supervisorSite && !loading) {
    return (
      <div className="p-4">
        <BackButton />
        <div className="text-center py-8"><Building className="h-12 w-12 mx-auto mb-2" /><p>No site assigned</p></div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <BackButton />
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold">Incident Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchIncidents}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          {oldIncidents.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportOldIncidents}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Export Old
            </Button>
          )}
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="p-3 pb-0"><CardTitle className="text-sm font-semibold">Report New Incident</CardTitle></CardHeader>
        <CardContent className="p-3">
          <form onSubmit={handleSubmit} className="space-y-2">
            <Input value={form.site} readOnly className="bg-gray-50 text-sm h-9" />
            <Input placeholder="Employee ID (optional)" value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})} className="text-sm h-9" />
            <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="accident">Accident</SelectItem>
                <SelectItem value="issue">Issue</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="text-sm h-9" />
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="text-sm" />
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCameraOpen(true)}>
                  <Camera className="h-4 w-4 mr-1" /> Take Photo
                </Button>
                {selectedPhoto && (
                  <Button type="button" variant="ghost" size="sm" onClick={removePhoto}>
                    <X className="h-4 w-4 mr-1" /> Remove
                  </Button>
                )}
              </div>
              {photoPreview && (
                <div className="relative w-24 h-24">
                  <img src={photoPreview} alt="Incident preview" className="w-full h-full object-cover rounded border" />
                </div>
              )}
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-9 text-sm">
              {submitting ? "Submitting..." : "Report Incident"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="text-sm font-semibold mt-2">Today's Incidents</h2>
      {todaysIncidents.length === 0 ? (
        <p className="text-center text-muted-foreground text-xs">No incidents reported today.</p>
      ) : (
        <div className="space-y-2">
          {todaysIncidents.map(inc => (
            <Card key={inc._id} className="p-2 border-0 shadow-sm">
              <div className="flex justify-between items-center">
                <Badge variant={inc.type === "accident" ? "destructive" : "default"} className="text-[10px] px-1.5">{inc.type}</Badge>
                <span className="text-[10px] text-muted-foreground">{new Date(inc.date).toLocaleDateString()}</span>
              </div>
              <p className="text-xs font-medium mt-1">{inc.site}</p>
              {inc.employeeId && <p className="text-[10px] text-muted-foreground">Employee: {inc.employeeId}</p>}
              <p className="text-xs mt-1 line-clamp-2">{inc.description}</p>
              {inc.photoUrl && (
                <div className="mt-1">
                  <img src={inc.photoUrl} alt="Incident" className="h-16 w-16 object-cover rounded" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handlePhotoCapture}
        title="Take Incident Photo"
        description="Capture photo as evidence"
        actionLabel="Capture"
      />
    </div>
  );
}
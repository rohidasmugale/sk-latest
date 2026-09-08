import { useState, useEffect, useCallback } from "react";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, RefreshCw, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import CameraCapture from "./CameraCapture";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/badge";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const apiClient = axios.create({ baseURL: API_URL });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function CleaningPhotos() {
  const { user: currentUser, role } = useRole();
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  // ✅ CHANGED: site → siteId + siteName
  const [siteId, setSiteId] = useState("");
  const [siteName, setSiteName] = useState("");
  const [remark, setRemark] = useState("");
  const [supervisorSiteId, setSupervisorSiteId] = useState("");

  // Multi‑upload state – only for showing selected count, auto‑upload on selection
  const [selectedFileCount, setSelectedFileCount] = useState(0);

  // ✅ CHANGED: Fetch siteId from auth endpoint
  const fetchSupervisorSite = useCallback(async () => {
    if (!currentUser || role !== "supervisor") return;
    try {
      const res = await apiClient.get('/auth/supervisor-site');
      if (res.data.success && res.data.siteId) {
        setSupervisorSiteId(res.data.siteId);
        setSiteId(res.data.siteId);
        setSiteName(res.data.siteName);
      }
    } catch (error) {
      console.error("Error fetching supervisor site:", error);
    }
  }, [currentUser, role]);

  // ✅ CHANGED: Use siteId in API call
  const fetchPhotos = useCallback(async () => {
    try {
      const res = await apiClient.get('/cleaning-photos', {
        params: { siteId }
      });
      setPhotos(res.data.data || []);
    } catch (error: any) {
      console.error("Fetch photos error:", error);
      if (error.response?.status !== 404) toast.error("Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    if (role === "supervisor" && currentUser) {
      fetchSupervisorSite();
      fetchPhotos();
    } else {
      setLoading(false);
    }
  }, [currentUser, role, fetchSupervisorSite, fetchPhotos]);

  // ✅ CHANGED: Use siteId in upload
  const handlePhotoCapture = async (photoFile: File) => {
    if (!siteId) {
      toast.error("No site assigned");
      return;
    }
    const formData = new FormData();
    formData.append("photo", photoFile);
    formData.append("siteId", siteId);
    if (remark) formData.append("remark", remark);
    try {
      await apiClient.post('/cleaning-photos', formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Photo uploaded");
      setRemark("");
      await fetchPhotos();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.message || "Upload failed");
    }
  };

  // ✅ CHANGED: Use siteId in multi-upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!siteId) {
      toast.error("No site assigned");
      return;
    }
    const files = Array.from(e.target.files);
    setSelectedFileCount(files.length);

    const formData = new FormData();
    files.forEach(file => formData.append('photos', file));
    formData.append('siteId', siteId);
    if (remark) formData.append('remark', remark);

    try {
      await apiClient.post('/cleaning-photos/multiple', formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success(`${files.length} photos uploaded`);
      setSelectedFileCount(0);
      await fetchPhotos();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Upload failed");
    }
    e.target.value = '';
  };

  const today = new Date().toISOString().split('T')[0];
  const todaysPhotos = photos.filter(p => p.createdAt?.startsWith(today));
  const oldPhotos = photos.filter(p => !p.createdAt?.startsWith(today));

  const exportOldPhotos = () => {
    if (oldPhotos.length === 0) {
      toast.info("No old photos to export");
      return;
    }
    const headers = ['Date', 'Site', 'Photo URL', 'Remark'];
    const rows = oldPhotos.map(p => [
      p.createdAt?.split('T')[0],
      p.site,
      p.photoUrl,
      p.remark || ''
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cleaning_photos_old_${today}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Old photos exported");
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 space-y-4">
      <BackButton />
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Cleaning Photos</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchPhotos}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          {oldPhotos.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportOldPhotos}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Export Old
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Upload Cleaning Photo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Site name"
            value={siteName}
            readOnly
            className="bg-gray-50 text-sm"
          />
          <Textarea
            placeholder="Remark (optional)"
            value={remark}
            onChange={e => setRemark(e.target.value)}
            rows={2}
            className="text-sm"
          />

          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={() => setCameraOpen(true)} size="sm">
              <Camera className="h-4 w-4 mr-1" /> Take Photo
            </Button>

            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Select Photos
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </Button>
            </label>

            {selectedFileCount > 0 && (
              <Badge variant="outline">{selectedFileCount} uploading...</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <h2 className="text-base font-semibold">Today's Photos</h2>
      {todaysPhotos.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm">No photos uploaded today.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {todaysPhotos.map(photo => (
            <Card key={photo._id} className="p-2">
              <img src={photo.photoUrl} alt="Cleaning" className="w-full h-32 object-cover rounded" />
              <p className="text-xs mt-1 font-medium truncate">{photo.site}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(photo.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                {new Date(photo.createdAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </p>
              {photo.remark && <p className="text-xs mt-1 truncate">{photo.remark}</p>}
            </Card>
          ))}
        </div>
      )}

      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handlePhotoCapture}
        title="Take Cleaning Photo"
        actionLabel="Upload"
        continuous={true}
      />
    </div>
  );
}
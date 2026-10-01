import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { DashboardSidebar } from "@/components/shared/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, FileText, Download, Eye, Trash2, Edit, FileUp, Loader2,
  RefreshCw, Upload, Filter, MoreVertical, FolderOpen, Shield,
  Clock, Users, BarChart3, ChevronRight, Sparkles, Zap, TrendingUp,
  CheckCircle, FileCheck, FileSearch, FileBarChart, FileCode, FileX,
  FileDigit, FileOutput, FileInput, FileStack, FolderArchive,
  ArrowUpRight, ChevronDown, Star, Crown, Award, Target,
  Cloud, Lock, Globe, Cpu, Rocket, Wallet, ShieldCheck,
  Sparkle, Palette, Zap as ZapIcon, FileKey, FileSpreadsheet,
  FileImage, FileVideo, FileAudio, FileArchive, FolderSync,
  Layers, Box, Database, Server, HardDrive, Network,
  BarChart, PieChart, LineChart, Activity
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Import the document service
import documentService, { DocumentData } from "@/services/document.service";

interface Document {
  id: string;
  name: string;
  type: "PDF" | "XLSX" | "DOCX" | "JPG" | "PNG" | "OTHER";
  size: string;
  uploadedBy: string;
  date: string;
  category: "uploaded" | "generated" | "template" | "image" | "document" | "spreadsheet" | "presentation" | "other";
  description?: string;
  cloudinaryData?: {
    url: string;
    publicId: string;
    format: string;
  };
}

const initialDocuments: Document[] = [
  {
    id: "1",
    name: "Employee Joining Form",
    type: "PDF",
    size: "2.4 MB",
    uploadedBy: "Admin User",
    date: "2024-01-15",
    category: "uploaded",
    description: "Standard employee joining form"
  },
  {
    id: "2",
    name: "Monthly Salary Report",
    type: "XLSX",
    size: "1.8 MB",
    uploadedBy: "HR Manager",
    date: "2024-01-14",
    category: "generated",
    description: "Automated salary report for January"
  },
  {
    id: "3",
    name: "Invoice Template",
    type: "DOCX",
    size: "0.8 MB",
    uploadedBy: "Finance Team",
    date: "2024-01-13",
    category: "template",
    description: "Standard invoice template"
  },
  {
    id: "4",
    name: "Attendance Sheet",
    type: "XLSX",
    size: "1.2 MB",
    uploadedBy: "Operations",
    date: "2024-01-12",
    category: "uploaded",
    description: "Monthly attendance record"
  },
  {
    id: "5",
    name: "Company Logo",
    type: "PNG",
    size: "0.5 MB",
    uploadedBy: "Marketing",
    date: "2024-01-11",
    category: "image",
    description: "Company logo for branding"
  },
  {
    id: "6",
    name: "Product Image",
    type: "JPG",
    size: "1.2 MB",
    uploadedBy: "Marketing",
    date: "2024-01-10",
    category: "image",
    description: "Product photography"
  },
  {
    id: "7",
    name: "Experience Certificate",
    type: "DOCX",
    size: "0.9 MB",
    uploadedBy: "HR Manager",
    date: "2024-01-09",
    category: "template",
    description: "Employee experience certificate template"
  },
  {
    id: "8",
    name: "Q4 Financial Report",
    type: "XLSX",
    size: "3.1 MB",
    uploadedBy: "Finance",
    date: "2024-01-08",
    category: "generated",
    description: "Quarterly financial report"
  }
];

// Theme-aware gradient classes
const getThemeGradients = () => ({
  heroGradient: "bg-gradient-to-br from-primary/20 via-primary/10 to-purple-500/10 dark:from-primary/30 dark:via-primary/20 dark:to-purple-500/20",
  cardGradient: "bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-900/80 dark:to-gray-800/60 backdrop-blur-xl",
  glassCard: "bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-900/90 dark:to-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-2xl",
  premiumCard: "bg-gradient-to-br from-primary/5 via-primary/10 to-purple-500/5 dark:from-primary/10 dark:via-primary/15 dark:to-purple-500/10 backdrop-blur-xl border border-primary/20 dark:border-primary/30",
  accentGradient: "bg-gradient-to-r from-accent via-accent/90 to-pink-500/80",
  successGradient: "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500",
  warningGradient: "bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500",
  purpleGradient: "bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500",
});

// Main Component with Premium Design
const Documents = () => {
  // Add mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const handleMobileClose = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 dark:from-background dark:via-gray-950 dark:to-gray-900">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-60 h-60 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <DashboardHeader
        title="Documents Management"
        onMenuClick={handleMenuClick}
      />

      {/* Mobile Sidebar - Only shown when open */}
      {mobileSidebarOpen && (
        <DashboardSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={handleMobileClose}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative p-4 md:p-6 space-y-6 md:space-y-8 z-10"
      >
        {/* Premium Stats Section - Responsive Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <StatsCards />
        </motion.div>

        {/* All Documents Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4 md:space-y-6"
        >
          <AllDocumentsSection />
        </motion.div>
      </motion.div>
    </div>
  );
};

// Premium Stats Cards Component - Responsive
const StatsCards = () => {
  const [stats, setStats] = useState({
    total: 0,
    templates: 0,
    generated: 0,
    images: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await documentService.getDocuments();
        if (result.success && result.data) {
          const documents = result.data;

          // Calculate stats based on categories
          const templateCount = documents.filter((d: DocumentData) =>
            d.category === "template"
          ).length;

          const generatedCount = documents.filter((d: DocumentData) =>
            d.category === "generated"
          ).length;

          const imageCount = documents.filter((d: DocumentData) =>
            d.category === "image" ||
            d.mimetype?.startsWith('image/') ||
            d.originalname?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
          ).length;

          setStats({
            total: documents.length,
            templates: templateCount,
            generated: generatedCount,
            images: imageCount
          });
        } else {
          // Use initial documents as fallback
          setStats({
            total: initialDocuments.length,
            templates: initialDocuments.filter(d => d.category === "template").length,
            generated: initialDocuments.filter(d => d.category === "generated").length,
            images: initialDocuments.filter(d => d.category === "image").length
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
        setStats({
          total: initialDocuments.length,
          templates: initialDocuments.filter(d => d.category === "template").length,
          generated: initialDocuments.filter(d => d.category === "generated").length,
          images: initialDocuments.filter(d => d.category === "image").length
        });
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1 }}
        whileHover={{ y: -3, md: { y: -5 }, transition: { duration: 0.2 } }}
      >
        <StatCard
          title="Total Documents"
          value={stats.total}
          icon={<FileStack className="h-4 w-4 md:h-6 md:w-6" />}
          trend="+12%"
          color="from-primary to-blue-500"
          className="shadow-xl"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2 }}
        whileHover={{ y: -3, md: { y: -5 }, transition: { duration: 0.2 } }}
      >
        <StatCard
          title="Templates"
          value={stats.templates}
          icon={<FileCode className="h-4 w-4 md:h-6 md:w-6" />}
          trend="+15%"
          color="from-purple-500 to-violet-500"
          className="shadow-xl"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.3 }}
        whileHover={{ y: -3, md: { y: -5 }, transition: { duration: 0.2 } }}
      >
        <StatCard
          title="Generated"
          value={stats.generated}
          icon={<Zap className="h-4 w-4 md:h-6 md:w-6" />}
          trend="+24%"
          color="from-orange-500 to-amber-500"
          className="shadow-xl"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.4 }}
        whileHover={{ y: -3, md: { y: -5 }, transition: { duration: 0.2 } }}
      >
        <StatCard
          title="Images"
          value={stats.images}
          icon={<FileImage className="h-4 w-4 md:h-6 md:w-6" />}
          trend="+8%"
          color="from-green-500 to-emerald-500"
          className="shadow-xl"
        />
      </motion.div>
    </div>
  );
};

// Premium All Documents Section - Responsive
const AllDocumentsSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const fetchDocuments = async () => {
    console.log("📥 Starting to fetch documents...");
    setIsRefreshing(true);
    setIsLoading(true);
    try {
      const result = await documentService.getDocuments();
      console.log("📥 Fetch result:", result);

      if (result.success && result.data) {
        console.log(`📥 Found ${result.data.length} documents from backend`);
        const formattedDocuments: Document[] = result.data.map((doc: DocumentData) => {
          console.log("📝 Processing document:", doc.originalname);

          let frontendCategory: "uploaded" | "generated" | "template" | "image" | "document" | "spreadsheet" | "presentation" | "other" = "uploaded";

          if (doc.category === "template") {
            frontendCategory = "template";
          } else if (doc.category === "generated") {
            frontendCategory = "generated";
          } else if (doc.category === "image") {
            frontendCategory = "image";
          } else if (doc.category === "document") {
            frontendCategory = "document";
          } else if (doc.category === "spreadsheet") {
            frontendCategory = "spreadsheet";
          } else if (doc.category === "presentation") {
            frontendCategory = "presentation";
          } else if (doc.category === "other") {
            frontendCategory = "other";
          } else if (doc.category === "uploaded") {
            frontendCategory = "uploaded";
          }

          return {
            id: doc._id || doc.id || "",
            name: doc.originalname || doc.name || "Unnamed Document",
            type: documentService.getFileType(doc.mimetype?.split('/')[1] || doc.originalname?.split('.').pop() || doc.name?.split('.').pop() || ''),
            size: documentService.formatFileSize(doc.size || 0),
            uploadedBy: "Admin",
            date: doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] :
              doc.date ? new Date(doc.date).toISOString().split('T')[0] :
                new Date().toISOString().split('T')[0],
            category: frontendCategory,
            description: doc.description,
            cloudinaryData: {
              url: doc.url || "",
              publicId: doc.public_id || "",
              format: doc.mimetype?.split('/')[1] || 'unknown'
            }
          };
        });

        console.log(`✅ Formatted ${formattedDocuments.length} documents`);
        setDocuments(formattedDocuments);
      } else {
        console.warn("⚠️ Using fallback documents:", result.message);
        setDocuments(initialDocuments);
        if (result.message) {
          toast.error(result.message || "Failed to load documents");
        }
      }
    } catch (error) {
      console.error("🔥 Error fetching documents:", error);
      setDocuments(initialDocuments);
      toast.error("Unable to connect to server. Using demo data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
      const documentName = formData.get("document-name") as string;
      const description = formData.get("description") as string;
      const folder = formData.get("folder") as string || "documents";
      const frontendCategory = formData.get("category") as string || "uploaded";

      if (!fileInput.files || fileInput.files.length === 0) {
        toast.error("Please select a file to upload");
        setIsUploading(false);
        return;
      }

      const file = fileInput.files[0];

      // Map frontend category to backend category
      let backendCategory: string = "document"; // Default

      // Map based on the enum in your backend model
      if (frontendCategory === "template") {
        backendCategory = "template";
      } else if (frontendCategory === "generated") {
        backendCategory = "generated";
      } else if (frontendCategory === "image") {
        backendCategory = "image";
      } else if (frontendCategory === "uploaded") {
        // Check file type to determine more specific category
        if (file.type.startsWith('image/')) {
          backendCategory = "image";
        } else if (file.type.includes('spreadsheet') || file.name.match(/\.(xls|xlsx|csv)$/i)) {
          backendCategory = "spreadsheet";
        } else if (file.type.includes('presentation') || file.name.match(/\.(ppt|pptx)$/i)) {
          backendCategory = "presentation";
        } else if (file.type.includes('pdf') || file.type.includes('document') || file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
          backendCategory = "document";
        } else {
          backendCategory = "other";
        }
      } else {
        backendCategory = frontendCategory;
      }

      console.log("📤 Starting upload process...", {
        fileName: file.name,
        fileSize: file.size,
        documentName: documentName,
        folder: folder,
        frontendCategory: frontendCategory,
        backendCategory: backendCategory,
        description: description
      });

      const uploadResult = await documentService.uploadDocument(
        file,
        folder,
        description || undefined,
        backendCategory // Send the mapped category
      );

      console.log("📤 Upload result:", uploadResult);

      if (uploadResult.success && uploadResult.data) {
        console.log("✅ Document uploaded and saved:", {
          documentId: uploadResult.data.documentId,
          publicId: uploadResult.data.public_id,
          url: uploadResult.data.url,
          category: uploadResult.data.category
        });

        await fetchDocuments();

        toast.success("Document uploaded successfully!");
        setUploadDialogOpen(false);
        (e.target as HTMLFormElement).reset();
      } else {
        console.error("❌ Upload failed:", uploadResult.message);
        toast.error(uploadResult.message || "Upload failed");
      }
    } catch (error: any) {
      console.error("🔥 Upload error:", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to upload document. Please check your backend connection.";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, doc: Document) => {
    try {
      console.log("🗑️ Deleting document:", { docId, documentName: doc.name });

      const isRealMongoId = docId && (docId.length === 24 || /^[0-9a-fA-F]{24}$/.test(docId));

      if (!isRealMongoId) {
        console.log("🗑️ Deleting dummy document from local state");
        setDocuments(prev => prev.filter(d => d.id !== docId));
        toast.success("Document removed from local state");
        return;
      }

      const deleteResult = await documentService.deleteDocument(docId);

      if (deleteResult.success) {
        await fetchDocuments();
        toast.success("Document deleted successfully!");
      } else {
        toast.error(deleteResult.message || "Failed to delete document");
      }
    } catch (error: any) {
      console.error("🔥 Delete error:", error);
      toast.error("Failed to delete document from storage");
    }
  };

  const handleDownloadDocument = async (docName: string, doc?: Document) => {
    try {
      console.log("📥 Downloading document:", docName);

      if (doc?.cloudinaryData?.url) {
        const response = await fetch(doc.cloudinaryData.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = docName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Downloading ${docName}...`);
      } else {
        toast.success(`Downloading ${docName}...`);
      }
    } catch (error) {
      console.error("🔥 Download error:", error);
      toast.error("Failed to download document");
    }
  };

  const handleViewDocument = (doc: Document) => {
    if (doc.cloudinaryData?.url) {
      window.open(doc.cloudinaryData.url, '_blank');
      toast.success(`Opening ${doc.name}...`);
    } else {
      toast.error("Document URL not available");
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setIsLoading(true);
      try {
        console.log("🔍 Searching for:", searchQuery);
        const result = await documentService.searchDocuments(searchQuery);

        if (result.success && result.data) {
          console.log(`🔍 Found ${result.data.length} documents`);
          const formattedDocuments: Document[] = result.data.map((doc: DocumentData) => {
            let frontendCategory: "uploaded" | "generated" | "template" | "image" | "document" | "spreadsheet" | "presentation" | "other" = "uploaded";

            if (doc.category === "template") {
              frontendCategory = "template";
            } else if (doc.category === "generated") {
              frontendCategory = "generated";
            } else if (doc.category === "image") {
              frontendCategory = "image";
            } else if (doc.category === "document") {
              frontendCategory = "document";
            } else if (doc.category === "spreadsheet") {
              frontendCategory = "spreadsheet";
            } else if (doc.category === "presentation") {
              frontendCategory = "presentation";
            } else if (doc.category === "other") {
              frontendCategory = "other";
            } else if (doc.category === "uploaded") {
              frontendCategory = "uploaded";
            }

            return {
              id: doc._id || doc.id || "",
              name: doc.originalname || doc.name || "Unnamed Document",
              type: documentService.getFileType(doc.mimetype?.split('/')[1] || doc.originalname?.split('.').pop() || doc.name?.split('.').pop() || ''),
              size: documentService.formatFileSize(doc.size || 0),
              uploadedBy: "Admin",
              date: doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] :
                doc.date ? new Date(doc.date).toISOString().split('T')[0] :
                  new Date().toISOString().split('T')[0],
              category: frontendCategory,
              description: doc.description,
              cloudinaryData: {
                url: doc.url || "",
                publicId: doc.public_id || "",
                format: doc.mimetype?.split('/')[1] || 'unknown'
              }
            };
          });

          setDocuments(formattedDocuments);
        } else {
          console.warn("🔍 Search failed:", result.message);
          toast.error(result.message || "Search failed");
          fetchDocuments();
        }
      } catch (error) {
        console.error("🔥 Search error:", error);
        toast.error("Search failed");
        fetchDocuments();
      } finally {
        setIsLoading(false);
      }
    } else {
      fetchDocuments();
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredDocuments = documents
    .filter(doc => {
      const categoryMatch =
        selectedCategory === "all" ? true :
          selectedCategory === "uploaded" ? !['template', 'generated'].includes(doc.category) :
            doc.category === selectedCategory;
      return categoryMatch && (
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "oldest") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "size") {
        const getSize = (size: string) => parseFloat(size) * (size.includes('GB') ? 1024 : size.includes('MB') ? 1 : 0.001);
        return getSize(b.size) - getSize(a.size);
      }
      return 0;
    });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      uploaded: "default",
      template: "secondary",
      generated: "outline",
      image: "default",
      document: "default",
      spreadsheet: "default",
      presentation: "default",
      other: "outline"
    };
    return colors[category] || "outline";
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'PDF': return <FileText className="h-4 w-4 md:h-5 md:w-5 text-red-500" />;
      case 'DOCX': return <FileText className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />;
      case 'XLSX': return <FileSpreadsheet className="h-4 w-4 md:h-5 md:w-5 text-green-500" />;
      case 'JPG': case 'PNG': return <FileImage className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />;
      default: return <FileText className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />;
    }
  };

  const categories = [
    { id: "all", label: "All Categories", count: documents.length, color: "from-primary to-blue-500" },
    { id: "uploaded", label: "Uploaded", count: documents.filter(d => !['template', 'generated'].includes(d.category)).length, color: "from-green-500 to-emerald-500" },
    { id: "template", label: "Templates", count: documents.filter(d => d.category === "template").length, color: "from-purple-500 to-violet-500" },
    { id: "generated", label: "Generated", count: documents.filter(d => d.category === "generated").length, color: "from-orange-500 to-amber-500" },
    { id: "image", label: "Images", count: documents.filter(d => d.category === "image").length, color: "from-pink-500 to-rose-500" },
  ];
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Premium Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-6">
        <div>
          <h2 className="text-lg md:text-2xl font-bold">All Documents</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Manage all your documents with enterprise-grade features</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className={`h-8 w-8 md:h-10 md:w-10 ${viewMode === "grid" ? 'bg-gradient-to-r from-primary to-purple-500' : ''}`}
            >
              <Box className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              className={`h-8 w-8 md:h-10 md:w-10 ${viewMode === "list" ? 'bg-gradient-to-r from-primary to-purple-500' : ''}`}
            >
              <Layers className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocuments}
            disabled={isRefreshing}
            className="gap-1 md:gap-2 h-8 md:h-10 text-xs md:text-sm px-2 md:px-4"
          >
            <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Refresh</span>
          </Button>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 md:gap-2 h-8 md:h-10 text-xs md:text-sm px-2 md:px-4 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 shadow-lg hover:shadow-xl">
                <Upload className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden xs:inline">Upload</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 border-0 overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-br from-primary/20 to-purple-500/20 p-4 md:p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg md:text-2xl font-bold">Upload New Document</DialogTitle>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">Upload your document to the cloud</p>
                </DialogHeader>
              </div>
              <form onSubmit={handleUploadDocument} className="p-4 md:p-6 space-y-4 md:space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 md:space-y-6"
                >
                  {/* File Upload Zone */}
                  <div className="border-2 border-dashed border-primary/20 rounded-xl p-4 md:p-8 text-center bg-gradient-to-br from-primary/5 to-primary/0">
                    <Upload className="h-8 w-8 md:h-12 md:w-12 text-primary/50 mx-auto mb-2 md:mb-4" />
                    <p className="text-xs md:text-sm font-medium">Drop your files here or click to browse</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Supports PDF, DOCX, XLSX, JPG, PNG</p>
                    <Input
                      id="file"
                      name="file"
                      type="file"
                      required
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip,.rar,.ppt,.pptx"
                      disabled={isUploading}
                      className="mt-3 md:mt-4 bg-background cursor-pointer text-xs md:text-sm h-8 md:h-10"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="document-name" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                        <FileText className="h-3 w-3 md:h-4 md:w-4" />
                        Document Name
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="document-name"
                        name="document-name"
                        placeholder="Enter document name"
                        required
                        disabled={isUploading}
                        className="bg-background/50 text-xs md:text-sm h-8 md:h-10"
                      />
                    </div>

                    <div className="space-y-1 md:space-y-2">
                      <Label htmlFor="category" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                        <FolderOpen className="h-3 w-3 md:h-4 md:w-4" />
                        Category
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Select name="category" defaultValue="uploaded" required disabled={isUploading}>
                        <SelectTrigger className="bg-background/50 text-xs md:text-sm h-8 md:h-10">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uploaded" className="text-xs md:text-sm">Uploaded Document</SelectItem>
                          <SelectItem value="template" className="text-xs md:text-sm">Template</SelectItem>
                          <SelectItem value="generated" className="text-xs md:text-sm">Generated</SelectItem>
                          <SelectItem value="image" className="text-xs md:text-sm">Image</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1 md:space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                      <FileText className="h-3 w-3 md:h-4 md:w-4" />
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Enter document description"
                      disabled={isUploading}
                      className="bg-background/50 text-xs md:text-sm min-h-[80px] md:min-h-[100px]"
                    />
                  </div>
                </motion.div>

                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 text-xs md:text-sm h-8 md:h-10"
                    onClick={() => setUploadDialogOpen(false)}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 gap-1 md:gap-2 text-xs md:text-sm h-8 md:h-10 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3 md:h-4 md:w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Premium Search and Filter - Responsive */}
      <div className={`${getThemeGradients().glassCard} rounded-xl md:rounded-2xl p-4 md:p-6 shadow-2xl`}>
        <div className="flex flex-col lg:flex-row gap-3 md:gap-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents by name, type, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                className="pl-8 md:pl-12 h-8 md:h-12 bg-background/50 border-0 text-xs md:text-base shadow-inner"
              />
            </div>
          </div>

          <div className="flex gap-2 md:gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 md:h-12 min-w-[120px] md:min-w-[180px] bg-background/50 border-0 text-xs md:text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest" className="text-xs md:text-sm">Newest First</SelectItem>
                <SelectItem value="oldest" className="text-xs md:text-sm">Oldest First</SelectItem>
                <SelectItem value="name-asc" className="text-xs md:text-sm">Name A-Z</SelectItem>
                <SelectItem value="name-desc" className="text-xs md:text-sm">Name Z-A</SelectItem>
                <SelectItem value="size" className="text-xs md:text-sm">File Size</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterOpen(!filterOpen)}
              className="h-8 md:h-12 gap-1 md:gap-2 bg-background/50 border-0 text-xs md:text-sm px-2 md:px-4"
            >
              <Filter className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden xs:inline">Filter</span>
            </Button>
          </div>
        </div>

        {/* Premium Category Filters */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 md:mt-6 overflow-hidden"
            >
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 pt-3 md:pt-6 border-t border-white/10 dark:border-gray-700/30">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`h-auto py-2 md:py-4 px-2 md:px-4 rounded-lg md:rounded-xl text-xs md:text-sm ${selectedCategory === category.id ? `bg-gradient-to-r ${category.color} text-white` : ''}`}
                  >
                    <div className="text-left w-full">
                      <div className="font-medium text-xs md:text-sm truncate">{category.label}</div>
                      <div className="text-[10px] md:text-xs opacity-80 mt-0.5 md:mt-1">{category.count} docs</div>
                    </div>
                  </Button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {searchQuery && (
          <div className="flex items-center justify-between mt-3 md:mt-6 p-2 md:p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg md:rounded-xl">
            <div className="text-[10px] md:text-sm">
              Found <span className="font-bold text-primary text-xs md:text-lg">{filteredDocuments.length}</span> document(s)
              {searchQuery && ` for "${searchQuery}"`}
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="text-[10px] md:text-xs h-6 md:h-8 px-2"
              >
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Premium Documents Display */}
      {viewMode === "list" ? (
        <div className={`${getThemeGradients().glassCard} rounded-xl md:rounded-2xl overflow-hidden shadow-2xl`}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 md:py-20">
              <div className="relative">
                <Loader2 className="h-8 w-8 md:h-12 md:w-12 animate-spin text-primary" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-500 blur-xl opacity-20"></div>
              </div>
              <span className="text-xs md:text-sm text-muted-foreground mt-2 md:mt-4">Loading documents...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
                  <TableRow className="border-b-0">
                    <TableHead className="h-10 md:h-16 px-2 md:px-4 text-[10px] md:text-sm font-bold text-foreground/80">Document</TableHead>
                    <TableHead className="h-10 md:h-16 px-2 md:px-4 text-[10px] md:text-sm font-bold text-foreground/80 hidden md:table-cell">Type</TableHead>
                    <TableHead className="h-10 md:h-16 px-2 md:px-4 text-[10px] md:text-sm font-bold text-foreground/80 hidden lg:table-cell">Category</TableHead>
                    <TableHead className="h-10 md:h-16 px-2 md:px-4 text-[10px] md:text-sm font-bold text-foreground/80 hidden sm:table-cell">Size</TableHead>
                    <TableHead className="h-10 md:h-16 px-2 md:px-4 text-[10px] md:text-sm font-bold text-foreground/80 hidden xl:table-cell">Uploaded</TableHead>
                    <TableHead className="h-10 md:h-16 px-2 md:px-4 text-[10px] md:text-sm font-bold text-foreground/80 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 md:py-16 px-2 md:px-4">
                        <div className="flex flex-col items-center gap-2 md:gap-4">
                          <div className="relative">
                            <FileSearch className="h-12 w-12 md:h-20 md:w-20 text-muted-foreground/30" />
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-xl"></div>
                          </div>
                          <div className="text-center">
                            <div className="text-base md:text-2xl font-bold">No documents found</div>
                            <div className="text-[10px] md:text-sm text-muted-foreground mt-1 md:mt-2">
                              {searchQuery ? "Try a different search term" : "Upload your first document to get started"}
                            </div>
                          </div>
                          {!searchQuery && (
                            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                              <DialogTrigger asChild>
                                <Button size="sm" className="mt-1 md:mt-2 gap-1 md:gap-2 text-xs md:text-sm bg-gradient-to-r from-primary to-purple-500 h-7 md:h-10">
                                  <Upload className="h-3 w-3 md:h-4 md:w-4" />
                                  Upload Document
                                </Button>
                              </DialogTrigger>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <AnimatePresence>
                      {filteredDocuments.map((doc, index) => (
                        <motion.tr
                          key={doc.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="group border-b border-white/10 dark:border-gray-700/30 last:border-0 hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/0"
                        >
                          <TableCell className="py-2 md:py-4 px-2 md:px-4">
                            <div className="flex items-center gap-2 md:gap-4">
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-sm rounded-lg"></div>
                                <div className="relative p-1.5 md:p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                                  {getFileIcon(doc.type)}
                                </div>
                              </div>
                              <div className="min-w-0 max-w-[120px] md:max-w-none">
                                <div className="font-semibold text-xs md:text-lg truncate">{doc.name}</div>
                                <div className="flex md:hidden items-center gap-1 mt-0.5">
                                  <Badge variant="outline" className="text-[8px] px-1 py-0">
                                    {doc.type}
                                  </Badge>
                                  <span className="text-[8px] text-muted-foreground">{doc.size}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 md:py-4 px-2 md:px-4 hidden md:table-cell">
                            <Badge variant="outline" className="gap-1 md:gap-2 px-1.5 md:px-3 py-0.5 md:py-1.5 text-[8px] md:text-xs">
                              {doc.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 md:py-4 px-2 md:px-4 hidden lg:table-cell">
                            <Badge className={`gap-1 md:gap-2 px-1.5 md:px-3 py-0.5 md:py-1.5 text-[8px] md:text-xs ${doc.category === 'template' ? 'bg-gradient-to-r from-purple-500 to-violet-500' :
                                doc.category === 'generated' ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                                  doc.category === 'image' ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                                    'bg-gradient-to-r from-green-500 to-emerald-500'
                              }`}>
                              {doc.category.charAt(0).toUpperCase() + doc.category.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 md:py-4 px-2 md:px-4 hidden sm:table-cell">
                            <div className="flex items-center gap-1 md:gap-2">
                              <HardDrive className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                              <span className="text-[10px] md:text-sm font-medium">{doc.size}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 md:py-4 px-2 md:px-4 hidden xl:table-cell">
                            <div className="space-y-0.5 md:space-y-1">
                              <div className="font-medium text-[10px] md:text-sm flex items-center gap-1 md:gap-2">
                                <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                                <span className="truncate max-w-[80px]">{doc.uploadedBy}</span>
                              </div>
                              <div className="text-[8px] md:text-xs text-muted-foreground flex items-center gap-0.5 md:gap-1">
                                <Clock className="h-2 w-2 md:h-3 md:w-3" />
                                {doc.date}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 md:py-4 px-2 md:px-4">
                            <div className="flex justify-end gap-0.5 md:gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDocument(doc)}
                                title="View Document"
                                className="h-6 w-6 md:h-8 md:w-8 hover:bg-primary/10 rounded-full"
                              >
                                <Eye className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadDocument(doc.name, doc)}
                                title="Download Document"
                                className="h-6 w-6 md:h-8 md:w-8 hover:bg-primary/10 rounded-full"
                              >
                                <Download className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteDocument(doc.id, doc)}
                                title="Delete Document"
                                className="h-6 w-6 md:h-8 md:w-8 hover:bg-destructive/10 text-destructive rounded-full"
                              >
                                <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {filteredDocuments.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -3, md: { y: -5 }, transition: { duration: 0.2 } }}
            >
              <div className={`${getThemeGradients().glassCard} rounded-xl md:rounded-2xl p-3 md:p-5 hover:shadow-2xl transition-all duration-300 h-full`}>
                <div className="flex items-start justify-between mb-2 md:mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-sm rounded-lg"></div>
                    <div className="relative p-1.5 md:p-3 rounded-lg bg-background/50 backdrop-blur-sm">
                      {getFileIcon(doc.type)}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 md:h-8 md:w-8">
                    <MoreVertical className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>

                <h3 className="font-bold text-sm md:text-lg mb-1 md:mb-2 truncate">{doc.name}</h3>
                {doc.description && (
                  <p className="text-[10px] md:text-sm text-muted-foreground mb-2 md:mb-4 line-clamp-2">{doc.description}</p>
                )}

                <div className="flex items-center justify-between mb-2 md:mb-4">
                  <Badge className={`text-[8px] md:text-xs px-1.5 md:px-3 py-0.5 md:py-1.5 ${doc.category === 'template' ? 'bg-gradient-to-r from-purple-500 to-violet-500' :
                      doc.category === 'generated' ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                        doc.category === 'image' ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                          'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`}>
                    {doc.category}
                  </Badge>
                  <span className="text-[10px] md:text-sm font-medium">{doc.size}</span>
                </div>

                <div className="flex items-center justify-between text-[8px] md:text-xs text-muted-foreground mb-3 md:mb-6">
                  <div className="flex items-center gap-0.5 md:gap-1">
                    <Users className="h-2 w-2 md:h-3 md:w-3" />
                    <span className="truncate max-w-[50px] md:max-w-none">{doc.uploadedBy}</span>
                  </div>
                  <div className="flex items-center gap-0.5 md:gap-1">
                    <Clock className="h-2 w-2 md:h-3 md:w-3" />
                    {doc.date}
                  </div>
                </div>

                <div className="flex gap-1 md:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument(doc)}
                    className="flex-1 gap-0.5 md:gap-1 h-6 md:h-9 text-[10px] md:text-xs"
                  >
                    <Eye className="h-2 w-2 md:h-3 md:w-3" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument(doc.name, doc)}
                    className="flex-1 gap-0.5 md:gap-1 h-6 md:h-9 text-[10px] md:text-xs"
                  >
                    <Download className="h-2 w-2 md:h-3 md:w-3" />
                    Download
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// Premium StatCard Component - Responsive
const StatCard = ({
  title,
  value,
  icon,
  trend,
  color = "from-primary to-blue-500",
  className = ""
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: string;
  color?: string;
  className?: string;
}) => (
  <div className={`${getThemeGradients().glassCard} rounded-xl md:rounded-2xl p-3 md:p-6 ${className}`}>
    <div className="flex items-center justify-between mb-2 md:mb-4">
      <div className="p-1.5 md:p-3 rounded-lg md:rounded-xl bg-background/50 backdrop-blur-sm">
        {icon}
      </div>
      {trend && (
        <Badge className={`text-[8px] md:text-xs px-1.5 md:px-3 py-0.5 md:py-1.5 bg-gradient-to-r ${color}`}>
          {trend}
        </Badge>
      )}
    </div>

    <div className="mb-1 md:mb-2">
      <div className="text-lg md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] md:text-sm text-muted-foreground">{title}</div>
    </div>

    <div className="h-1 md:h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${color} rounded-full`}
        style={{ width: `${Math.min(value * 2, 100)}%` }}
      ></div>
    </div>
  </div>
);

export default Documents;
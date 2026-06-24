import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, XCircle, Trash2, Eye, Download, Loader2, Shield, AlertCircle, File } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

export const DOCUMENT_TYPES = [
  { value: 'aadhar', label: 'Aadhaar Card', icon: '🆔', required: true, pattern: '^[0-9]{12}$', patternMessage: 'Enter 12-digit Aadhar number' },
  { value: 'pan', label: 'PAN Card', icon: '💳', required: true, pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$', patternMessage: 'Enter PAN (e.g., ABCDE1234F)' },
  { value: 'police', label: 'Police Verification', icon: '👮', required: true, pattern: null },
  { value: 'driving', label: 'Driving License', icon: '🚗', required: false, pattern: null },
  { value: 'electricity', label: 'Electricity Bill', icon: '⚡', required: false, pattern: null },
  { value: 'voter', label: 'Voter ID', icon: '🗳️', required: false, pattern: null },
  { value: 'passport', label: 'Passport', icon: '🛂', required: false, pattern: null },
  { value: 'other', label: 'Other Document', icon: '📄', required: false, pattern: null }
];

interface Document {
  documentType: string;
  documentName: string;
  documentNumber?: string;
  fileUrl: string;
  uploadedAt: Date;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  expiryDate?: Date;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
  resourceType?: string;
}

interface DocumentUploadProps {
  employeeId: string;
  employeeName?: string;
  onDocumentUploaded?: () => void;
  existingDocuments?: Document[];
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ 
  employeeId,
  employeeName,
  onDocumentUploaded,
  existingDocuments = [] 
}) => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documents, setDocuments] = useState<Document[]>(existingDocuments);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDocuments(existingDocuments);
  }, [existingDocuments]);

  useEffect(() => {
    if (employeeId) {
      fetchDocumentStats();
    }
  }, [employeeId, documents]);

  const fetchDocumentStats = async () => {
    try {
      const response = await fetch(`${API_URL}/employees/${employeeId}/documents/stats`);
      if (!response.ok) {
        if (response.status === 404) {
          return;
        }
        throw new Error(`http error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching document stats:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Allow all file types
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/rtf'
      ];

      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(doc|docx|xls|xlsx|ppt|pptx|txt|rtf)$/i)) {
        toast.error('Please select a valid document file (PDF, Word, Excel, PowerPoint, Text, or Image)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // Increased to 10MB for office documents
        toast.error('File size should be less than 10MB');
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const validateDocumentNumber = () => {
    if (!documentNumber) return true;
    
    const docType = DOCUMENT_TYPES.find(d => d.value === selectedType);
    if (!docType || !docType.pattern) return true;
    
    const regex = new RegExp(docType.pattern);
    return regex.test(documentNumber);
  };

  const handleUpload = async () => {
    if (!selectedType) {
      toast.error('Please select document type');
      return;
    }

    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    if (!validateDocumentNumber()) {
      const docType = DOCUMENT_TYPES.find(d => d.value === selectedType);
      toast.error(docType?.patternMessage || 'Invalid document number format');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('documentType', selectedType);
      formData.append('documentName', DOCUMENT_TYPES.find(d => d.value === selectedType)?.label || selectedType);
      
      if (documentNumber) {
        formData.append('documentNumber', documentNumber);
      }
      
      if (expiryDate) {
        formData.append('expiryDate', expiryDate);
      }

      console.log('Uploading to:', `${API_URL}/employees/${employeeId}/documents`);
      
      const response = await fetch(`${API_URL}/employees/${employeeId}/documents`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Document upload route not found. Please check if the backend server has the document routes configured.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `http error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      toast.success('Document uploaded successfully');
      
      setSelectedType('');
      setDocumentNumber('');
      setExpiryDate('');
      setSelectedFile(null);
      setPreviewUrl(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      await fetchDocuments();
      
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }

    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document. Please check if the server is running and routes are configured.');
    } finally {
      setUploading(false);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/employees/${employeeId}/documents`);
      if (!response.ok) {
        throw new Error(`http error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentIndex: number) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/employees/${employeeId}/documents/${documentIndex}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `http error! status: ${response.status}`);
      }

      toast.success('Document deleted successfully');
      
      fetchDocuments();
      
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }

    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error(error.message || 'Failed to delete document');
    }
  };

  const handleVerifyDocument = async (documentIndex: number) => {
    try {
      const response = await fetch(`${API_URL}/employees/${employeeId}/documents/${documentIndex}/verify`, {
        method: 'PATCH'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `http error! status: ${response.status}`);
      }

      toast.success('Document verified successfully');
      
      fetchDocuments();
      
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }

    } catch (error: any) {
      console.error('Error verifying document:', error);
      toast.error(error.message || 'Failed to verify document');
    }
  };

  const openDocumentPreview = (document: Document) => {
    setSelectedDocument(document);
    setPreviewDialogOpen(true);
  };

  const getDocumentIcon = (type: string, fileType?: string) => {
    if (fileType) {
      if (fileType.includes('pdf')) return '📕';
      if (fileType.includes('word') || fileType.includes('document')) return '📘';
      if (fileType.includes('excel') || fileType.includes('sheet')) return '📗';
      if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📙';
      if (fileType.includes('image')) return '🖼️';
      if (fileType.includes('text')) return '📄';
    }
    const docType = DOCUMENT_TYPES.find(d => d.value === type);
    return docType?.icon || '📄';
  };

  const getFileTypeLabel = (fileType?: string) => {
    if (!fileType) return 'Document';
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('word')) return 'Word';
    if (fileType.includes('excel')) return 'Excel';
    if (fileType.includes('presentation')) return 'PowerPoint';
    if (fileType.includes('image')) return 'Image';
    if (fileType.includes('text')) return 'Text';
    return 'Document';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const isDocumentUploaded = (type: string) => {
    return documents.some(doc => doc.documentType === type);
  };

  const isDocumentVerified = (type: string) => {
    return documents.some(doc => doc.documentType === type && doc.verified);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-blue-600" />
          KYC Documents
          {employeeName && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              - {employeeName}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stats && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">KYC Progress</span>
              <span className="text-sm text-gray-600">
                {stats.uploadedRequired}/3 Required
              </span>
            </div>
            <Progress value={stats.completionPercentage} className="h-2" />
          </div>
        )}

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="view">
              Documents 
              {documents.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {documents.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document-type">Document Type <span className="text-red-500">*</span></Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger id="document-type">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => {
                      const uploaded = isDocumentUploaded(type.value);
                      const verified = isDocumentVerified(type.value);
                      return (
                        <SelectItem key={type.value} value={type.value} disabled={uploaded && !verified}>
                          <span className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            <span>{type.label}</span>
                            {type.required && <span className="text-red-500 text-xs">*</span>}
                            {uploaded && (
                              verified ? 
                                <CheckCircle className="h-3 w-3 text-green-500" /> : 
                                <AlertCircle className="h-3 w-3 text-amber-500" />
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {(selectedType === 'aadhar' || selectedType === 'pan' || selectedType === 'driving' || selectedType === 'passport') && (
                <div className="space-y-2">
                  <Label htmlFor="document-number">Document Number</Label>
                  <Input
                    id="document-number"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value.toUpperCase())}
                    placeholder={
                      selectedType === 'aadhar' ? 'Enter 12-digit Aadhar number' : 
                      selectedType === 'pan' ? 'Enter PAN number (e.g., ABCDE1234F)' : 
                      selectedType === 'driving' ? 'Enter driving license number' :
                      'Enter passport number'
                    }
                    maxLength={selectedType === 'aadhar' ? 12 : selectedType === 'pan' ? 10 : undefined}
                  />
                </div>
              )}

              {(selectedType === 'driving' || selectedType === 'passport') && (
                <div className="space-y-2">
                  <Label htmlFor="expiry-date">Expiry Date</Label>
                  <Input
                    id="expiry-date"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="file-upload">Upload File <span className="text-red-500">*</span></Label>
                <div 
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors bg-gray-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto h-6 w-6 text-gray-400" />
                  <p className="mt-1 text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, Word, Excel, PowerPoint, Text, or Image (max 10MB)
                  </p>
                  <Input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {previewUrl && (
                <div className="mt-2">
                  <img src={previewUrl} alt="Preview" className="max-h-32 mx-auto border rounded" />
                </div>
              )}

              {selectedFile && !previewUrl && (
                <div className="mt-2 p-2 bg-gray-50 rounded border text-sm flex items-center gap-2">
                  <File className="h-4 w-4 text-blue-500" />
                  <span className="truncate flex-1">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </span>
                </div>
              )}

              <Button 
                onClick={handleUpload} 
                disabled={!selectedType || !selectedFile || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="view" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No documents uploaded</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {documents.map((doc, index) => (
                  <div 
                    key={index} 
                    className={`border rounded-lg p-2 ${
                      doc.verified ? 'bg-green-50 border-green-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="text-xl">{getDocumentIcon(doc.documentType, doc.fileType)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-medium text-sm truncate">{doc.documentName}</span>
                            {doc.verified ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">Verified</Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 text-xs">Pending</Badge>
                            )}
                          </div>
                          {doc.documentNumber && (
                            <p className="text-xs text-gray-600 truncate">#{doc.documentNumber}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getFileTypeLabel(doc.fileType)}
                            </Badge>
                            {doc.fileSize && (
                              <span className="text-xs text-gray-500">
                                {formatFileSize(doc.fileSize)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                            {doc.expiryDate && ` • Expires: ${new Date(doc.expiryDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 ml-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0" 
                          onClick={() => openDocumentPreview(doc)}
                          title="Preview"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0" 
                          onClick={() => {
                            // Open in new tab for download
                            window.open(doc.fileUrl, '_blank');
                          }}
                          title="Download"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        {!doc.verified && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0 text-green-600" 
                            onClick={() => handleVerifyDocument(index)}
                            title="Verify"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0 text-red-600" 
                          onClick={() => handleDeleteDocument(index)}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedDocument?.documentName}</span>
              {selectedDocument?.verified ? (
                <Badge className="bg-green-100 text-green-800">Verified</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600">Pending</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="mt-4 h-[60vh] overflow-auto">
              {selectedDocument.fileType?.includes('pdf') ? (
                <iframe 
                  src={`${selectedDocument.fileUrl}#toolbar=0&navpanes=0`} 
                  className="w-full h-full border rounded-lg"
                  title="PDF Preview"
                />
              ) : selectedDocument.fileType?.includes('image') ? (
                <img 
                  src={selectedDocument.fileUrl} 
                  alt={selectedDocument.documentName}
                  className="max-w-full max-h-full mx-auto object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8">
                  <File className="h-24 w-24 text-blue-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{selectedDocument.fileName || selectedDocument.documentName}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {getFileTypeLabel(selectedDocument.fileType)} • {formatFileSize(selectedDocument.fileSize)}
                  </p>
                  <div className="flex gap-4">
                    <Button
                      onClick={() => window.open(selectedDocument.fileUrl, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download to View
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Try to open in a new tab with Google Docs Viewer for office documents
                        if (selectedDocument.fileType?.includes('word') || 
                            selectedDocument.fileType?.includes('excel') ||
                            selectedDocument.fileType?.includes('presentation')) {
                          const viewerUrl = `http://docs.google.com/gview?url=${encodeURIComponent(selectedDocument.fileUrl)}&embedded=true`;
                          window.open(viewerUrl, '_blank');
                        } else {
                          window.open(selectedDocument.fileUrl, '_blank');
                        }
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Open in Browser
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DocumentUpload;
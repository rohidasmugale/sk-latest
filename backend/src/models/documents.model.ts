// src/models/documents.model.ts
import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export const ALLOWED_MIMETYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
  'text/plain', 'text/html', 'text/csv', 'application/rtf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-zip-compressed',
  'application/x-rar-compressed', 'application/vnd.rar', 'application/x-7z-compressed',
  'application/octet-stream',
];

// Define the interface
export interface IDocument extends MongooseDocument {
  cloudinaryPublicId: any;
  url: string;
  public_id: string;
  originalname: string;
  mimetype: string;
  size: number;
  folder: string;
  // ✅ UPDATED: Added all frontend categories to enum
  category: 'image' | 'document' | 'spreadsheet' | 'presentation' | 'other' | 'uploaded' | 'generated' | 'template';
  uploadedBy?: mongoose.Types.ObjectId;
  description?: string;
  tags: string[];
  isArchived: boolean;
  uploadedAt: Date;
  lastAccessed: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema
const documentSchema = new Schema<IDocument>({
  url: {
    type: String,
    required: true,
    trim: true
  },
  public_id: {
    type: String,
    required: true,
    trim: true
  },
  originalname: {
    type: String,
    required: true,
    trim: true
  },
   mimetype: {
    type: String,
    required: true
    // no enum — enforce ALLOWED_MIMETYPES in the multer fileFilter
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  folder: {
    type: String,
    default: 'documents',
    trim: true
  },
  // ✅ UPDATED: Added all frontend categories to enum
  category: {
    type: String,
    enum: ['image', 'document', 'spreadsheet', 'presentation', 'other', 'uploaded', 'generated', 'template'],
    default: 'document'
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  tags: [{
    type: String,
    trim: true
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add indexes
documentSchema.index({ folder: 1, uploadedAt: -1 });
documentSchema.index({ mimetype: 1 });
documentSchema.index({ category: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ isArchived: 1 });

// Only derive a category when none was supplied at all.
documentSchema.pre<IDocument>('save', function (next) {
  if (!this.category) {
    if (this.mimetype.startsWith('image/')) {
      this.category = 'image';
    } else if (this.mimetype.includes('spreadsheet') || this.mimetype.includes('excel')) {
      this.category = 'spreadsheet';
    } else if (this.mimetype.includes('presentation') || this.mimetype.includes('powerpoint')) {
      this.category = 'presentation';
    } else if (
      this.mimetype === 'application/pdf' ||
      this.mimetype.includes('word') ||
      this.mimetype.includes('document') ||
      this.mimetype.includes('text')
    ) {
      this.category = 'document';
    } else {
      this.category = 'other';
    }
  }
  next();
});

// Create and export the model
const Document = mongoose.model<IDocument>('Document', documentSchema);

export default Document;
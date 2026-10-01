// utils/cloudinary.ts
import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from 'cloudinary';
import dotenv from 'dotenv';
import { Readable } from 'stream';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your_cloud_name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your_api_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret',
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  url: string;
  bytes: number;
  format: string;
  width: number;
  height: number;
  resource_type: string;
}

// Upload attendance photo with timestamp
export const uploadAttendancePhoto = async (
  fileBuffer: Buffer,
  employeeId: string,
  employeeName: string,
  actionType: 'checkin' | 'checkout' | 'breakin' | 'breakout'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer || fileBuffer.length === 0) {
      reject(new Error('Empty file buffer provided'));
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folder = `attendance-photos/${employeeId}`;
    const publicId = `${folder}/${actionType}_${timestamp}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: publicId,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          {
            width: 800,
            height: 800,
            crop: 'limit',
            quality: 'auto:best',
          },
          {
            fetch_format: 'auto',
          },
        ],
        context: {
          employee_id: employeeId,
          employee_name: employeeName,
          action_type: actionType,
          timestamp: new Date().toISOString(),
        },
      },
      (error: any, result: UploadApiResponse | undefined) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new Error(`Failed to upload photo: ${error.message}`));
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            url: result.url,
            bytes: result.bytes,
            format: result.format,
            width: result.width,
            height: result.height,
            resource_type: result.resource_type,
          });
        } else {
          reject(new Error('Cloudinary upload failed: No result returned'));
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

// Upload image to Cloudinary with error handling
export const uploadImageToCloudinary = async (
  fileBuffer: Buffer,
  folder: string = 'attendance-photos'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer || fileBuffer.length === 0) {
      reject(new Error('Empty file buffer provided'));
      return;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          {
            width: 800,
            height: 800,
            crop: 'limit',
            quality: 'auto:best',
          },
        ],
      },
      (error: any, result: UploadApiResponse | undefined) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new Error(`Failed to upload image: ${error.message}`));
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            url: result.url,
            bytes: result.bytes,
            format: result.format,
            width: result.width,
            height: result.height,
            resource_type: result.resource_type,
          });
        } else {
          reject(new Error('Cloudinary upload failed: No result returned'));
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

// Upload signature to Cloudinary
export const uploadSignatureToCloudinary = async (
  fileBuffer: Buffer,
  folder: string = 'employee-signatures'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer || fileBuffer.length === 0) {
      reject(new Error('Empty file buffer provided'));
      return;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          {
            width: 400,
            height: 200,
            crop: 'fill',
            background: 'white',
            quality: 'auto:best',
          },
        ],
      },
      (error: any, result: UploadApiResponse | undefined) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new Error(`Failed to upload signature: ${error.message}`));
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            url: result.url,
            bytes: result.bytes,
            format: result.format,
            width: result.width,
            height: result.height,
            resource_type: result.resource_type,
          });
        } else {
          reject(new Error('Cloudinary upload failed: No result returned'));
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

// Upload document to Cloudinary (supports all file types)
export const uploadDocumentToCloudinary = async (
  fileBuffer: Buffer,
  folder: string = 'employee-documents',
  originalFilename?: string
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer || fileBuffer.length === 0) {
      reject(new Error('Empty file buffer provided'));
      return;
    }

    const isPDF = fileBuffer.length > 4 &&
                  fileBuffer[0] === 0x25 &&
                  fileBuffer[1] === 0x50 &&
                  fileBuffer[2] === 0x44 &&
                  fileBuffer[3] === 0x46;

    const isOfficeDoc = fileBuffer.length > 4 &&
                       (fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B);

    let resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto';
    let format: string | undefined = undefined;

    if (isPDF) {
      // PDFs get 'image' resource type, not 'raw' — Cloudinary explicitly
      // supports this, and only 'image'/'video' deliveries get CORS headers
      // by default. Without this, pdf.js's cross-origin fetch() (used for
      // print/preview) silently fails and the file can't be rendered.
      resourceType = 'image';
      format = 'pdf';
    } else if (isOfficeDoc) {
      resourceType = 'raw';
      if (originalFilename) {
        const ext = originalFilename.split('.').pop()?.toLowerCase();
        if (ext === 'docx' || ext === 'xlsx' || ext === 'pptx') {
          format = ext;
        }
      }
    }

    const uploadOptions: UploadApiOptions = {
      folder: folder,
      resource_type: resourceType,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
      use_filename: true,
      unique_filename: true,
    };

    // Removed: flags: 'attachment' — this forced Content-Disposition:
    // attachment on every raw/PDF upload, which fights inline preview and
    // printing. The frontend's own "Download" button already handles
    // saving the file when the user explicitly wants that, via
    // fetch(url) + blob download, so we don't need Cloudinary to force it
    // at the delivery-URL level.

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error: any, result: UploadApiResponse | undefined) => {
        if (error) {
          console.error('Cloudinary document upload error:', error);
          reject(new Error(`Failed to upload document: ${error.message}`));
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            url: result.url,
            bytes: result.bytes,
            format: result.format,
            width: result.width || 0,
            height: result.height || 0,
            resource_type: result.resource_type,
          });
        } else {
          reject(new Error('Cloudinary upload failed: No result returned'));
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

// Delete image from Cloudinary
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    if (!publicId) {
      console.warn('No publicId provided for deletion');
      return false;
    }
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      console.log(`Successfully deleted image with publicId: ${publicId}`);
      return true;
    } else {
      console.warn(`Failed to delete image: ${result.result}`);
      return false;
    }
  } catch (error: any) {
    console.error('Error deleting image from Cloudinary:', error);
    return false;
  }
};

// Delete multiple images from Cloudinary
export const deleteMultipleFromCloudinary = async (publicIds: string[]): Promise<boolean> => {
  try {
    if (!publicIds || publicIds.length === 0) {
      return true;
    }
    
    const result = await cloudinary.api.delete_resources(publicIds);
    console.log(`Successfully deleted ${publicIds.length} images from Cloudinary`);
    return true;
  } catch (error: any) {
    console.error('Error deleting multiple from Cloudinary:', error);
    return false;
  }
};

// Get Cloudinary URL with transformations
export const getCloudinaryUrl = (publicId: string, options?: { width?: number; height?: number }): string => {
  const { width, height } = options || {};
  
  if (width && height) {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto'
    });
  }
  
  return cloudinary.url(publicId, {
    quality: 'auto',
    fetch_format: 'auto'
  });
};

// Upload multiple files
export const uploadMultipleToCloudinary = async (
  files: { buffer: Buffer; originalname: string }[],
  folder: string = 'employee-documents'
): Promise<CloudinaryUploadResult[]> => {
  if (!files || files.length === 0) {
    return [];
  }

  const uploadPromises = files.map((file) => {
    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
      if (!file.buffer || file.buffer.length === 0) {
        reject(new Error(`Empty file buffer for ${file.originalname}`));
        return;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          public_id: `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}`,
          allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'],
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
        },
        (error: any, result: UploadApiResponse | undefined) => {
          if (error) {
            console.error(`Cloudinary upload error for ${file.originalname}:`, error);
            reject(new Error(`Failed to upload ${file.originalname}: ${error.message}`));
          } else if (result) {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
              url: result.url,
              bytes: result.bytes,
              format: result.format,
              width: result.width,
              height: result.height,
              resource_type: result.resource_type,
            });
          } else {
            reject(new Error(`Upload failed for ${file.originalname}`));
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  });

  return Promise.all(uploadPromises);
};

// Stream upload for large files
export const uploadStreamToCloudinary = (
  stream: Readable,
  folder: string = 'attendance-photos'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      },
      (error: any, result: UploadApiResponse | undefined) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            url: result.url,
            bytes: result.bytes,
            format: result.format,
            width: result.width,
            height: result.height,
            resource_type: result.resource_type,
          });
        } else {
          reject(new Error('Upload failed'));
        }
      }
    );

    stream.pipe(uploadStream);
  });
};

export { cloudinary };

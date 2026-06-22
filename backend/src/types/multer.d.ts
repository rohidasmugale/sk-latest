import { Multer } from 'multer';

declare global {
  namespace Express {
    interface Multer extends import('multer').Multer {}
    interface Request {
      file?: Multer.File;
      files?: { [fieldname: string]: Multer.File[] } | Multer.File[];
    }
  }
}
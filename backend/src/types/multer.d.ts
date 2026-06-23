import { Multer } from 'multer';

declare global {
  namespace Express {
    namespace Multer {
      type File = Multer["File"];
      type FileFilterCallback = Multer.FileFilterCallback;
    }
  }
}

export {};
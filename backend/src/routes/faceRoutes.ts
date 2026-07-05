import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import Employee from '../models/Employee';

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://sk-face-service.onrender.com' 
    : 'http://localhost:8000');
console.log("FACE_SERVICE_URL =", FACE_SERVICE_URL);
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/register-face/:employeeId', upload.single('photo'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'Photo required' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const formData = new FormData();
    formData.append('file', file.buffer, { filename: 'photo.jpg' });

    const pyRes = await axios.post(`${FACE_SERVICE_URL}/embedding`, formData, {
      headers: formData.getHeaders(),
      timeout: 10000,
    });

    const data = pyRes.data as { success: boolean; message?: string; embedding?: number[] };
    if (!data.success) {
      return res.status(400).json({ success: false, message: data.message });
    }

    if (!employee.faceEmbeddings) employee.faceEmbeddings = [];
    employee.faceEmbeddings.push(data.embedding!);
    await employee.save();

    res.json({ success: true, message: 'Face registered successfully' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Registration failed' });
  }
});

export default router;

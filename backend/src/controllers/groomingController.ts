import { Request, Response } from 'express';
import Grooming from '../models/Grooming';
import Task from '../models/Task';
import Employee from '../models/Employee';

export const getTodayGrooming = async (req: Request, res: Response) => {
  try {
    const supervisorId = (req as any).userId;
    if (!supervisorId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const tasks = await Task.find({
      $or: [
        { 'assignedUsers.userId': supervisorId },
        { assignedTo: supervisorId }
      ]
    }).select('siteName');

    const siteNames = [...new Set(tasks.map(t => t.siteName).filter(Boolean))];

    const employees = await Employee.find({
      siteName: { $in: siteNames },
      status: 'active'
    }).select('_id name employeeId siteName');

    const employeeIds = employees.map(e => e._id);
    const today = new Date().toISOString().split('T')[0];
    const records = await Grooming.find({
      employeeId: { $in: employeeIds },
      date: today
    });

    res.json({ success: true, data: records });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const batchSaveGrooming = async (req: Request, res: Response) => {
  try {
    const { records } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or empty records array'
      });
    }

    const missingSiteId = records.some(r => !r.siteId);
    if (missingSiteId) {
      return res.status(400).json({
        success: false,
        message: 'Each record must include a valid siteId'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const supervisorId = (req as any).userId;

    const operations = records.map(record => {
      const siteId = record.siteId.toString();
      return {
        updateOne: {
          filter: {
            employeeId: record.employeeId,
            date: today,
            siteId: siteId
          },
          update: {
            $set: {
              ...record,
              date: today,
              supervisorId,
              siteId: siteId,
              updatedAt: new Date()
            }
          },
          upsert: true
        }
      };
    });

    const result = await Grooming.bulkWrite(operations);
    res.json({
      success: true,
      message: 'Grooming status saved',
      result: result
    });
  } catch (error: any) {
    console.error('Batch save error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
import { Request, Response } from 'express';
import Machine, { IMachine, IMaintenanceRecord } from '../models/machineModel';
import Task from '../models/Task';

export class MachineController {
  // Get all machines with filters
  async getMachines(req: Request, res: Response) {
    try {
      const { assignedTo, status, department, location, search } = req.query;
      
      let query: any = {};
      
      if (assignedTo) {
        query.assignedTo = assignedTo;
      }
      if (status) {
        query.status = status;
      }
      if (department) {
        query.department = department;
      }
      if (location) {
        query.location = location;
      }
      if (search) {
        query.$text = { $search: search as string };
      }
      
      const machines = await Machine.find(query).sort({ createdAt: -1 });
      
      const transformedMachines = machines.map(machine => {
        const obj = machine.toJSON();
        return {
          ...obj,
          id: obj._id,
          model: obj.modelNumber,
          serialNumber: obj.serialNumber || '',
          location: obj.location || ''
        };
      });
      
      res.json(transformedMachines);
    } catch (error: any) {
      console.error('Error fetching machines:', error);
      res.status(500).json({ error: error.message });
    }
  }


   
 async getMachinesForSupervisor(req: Request, res: Response) {
  try {
    const supervisorId = (req as any).userId;
    console.log('🔍 Supervisor ID from token:', supervisorId);

    if (!supervisorId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // 🐞 DEBUG: Log ALL tasks (no filter)
    const allTasks = await Task.find({}).lean();
    console.log('📋 ALL TASKS IN DATABASE:', JSON.stringify(allTasks, null, 2));

    // Now try to find tasks for this supervisor using both possible fields
    const tasks = await Task.find({
      $or: [
        { 'assignedSupervisors.userId': supervisorId },
         { 'assignedUsers.userId': supervisorId },     
        { assignedTo: supervisorId }
      ]
    }).select('siteName');

    console.log('📋 Filtered tasks found:', tasks.length, tasks.map(t => t.siteName));

    const siteNames = [...new Set(tasks.map(t => t.siteName).filter(Boolean))];
    console.log('📍 Unique site names from tasks:', siteNames);

    if (siteNames.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const machines = await Machine.find({ location: { $in: siteNames } }).sort({ createdAt: -1 });
    console.log('🖨️ Machines found in those sites:', machines.length, machines.map(m => ({ name: m.name, location: m.location })));

    const transformed = machines.map(m => ({
      _id: m._id,
      id: m._id,
      name: m.name,
      siteName: m.location || 'Unknown Site',
      status: m.status === 'operational' ? 'ok' : 'not_okay',
      lastUpdated: (m as any).updatedAt || (m as any).createdAt || new Date().toISOString()
    }));

    res.json({ success: true, data: transformed });
  } catch (error: any) {
    console.error('Error fetching supervisor machines:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
 // Get machine by ID
  async getMachineById(req: Request, res: Response) {
    try {
      const machine = await Machine.findById(req.params.id);
      if (!machine) {
        return res.status(404).json({ error: 'Machine not found' });
      }
      
      const obj = machine.toJSON();
      const transformedMachine = {
        ...obj,
        id: obj._id,
        model: obj.modelNumber,
        serialNumber: obj.serialNumber || '',
        location: obj.location || ''
      };
      
      res.json(transformedMachine);
    } catch (error: any) {
      console.error('Error fetching machine:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Create new machine
  async createMachine(req: Request, res: Response) {
    try {
      const data = req.body;
      
      let serialNumber = data.serialNumber;
      if (serialNumber === '' || serialNumber === null || serialNumber === undefined) {
        serialNumber = undefined;
      }
      
      const machineData = {
        name: data.name,
        cost: Number(data.cost),
        purchaseDate: data.purchaseDate,
        quantity: Number(data.quantity) || 1,
        description: data.description || '',
        status: data.status || 'operational',
        location: data.location || '',
        siteId: data.siteId || undefined,
        manufacturer: data.manufacturer || '',
        modelNumber: data.model || data.modelNumber || '',
        serialNumber: serialNumber,
        department: data.department || '',
        assignedTo: data.assignedTo || '',
        lastMaintenanceDate: data.lastMaintenanceDate || undefined,
        nextMaintenanceDate: data.nextMaintenanceDate || undefined,
        maintenanceHistory: []
      };
      
      console.log('Creating machine with data:', machineData);
      
      const machine = await Machine.create(machineData);
      
      const obj = machine.toJSON();
      const responseMachine = {
        ...obj,
        id: obj._id,
        model: obj.modelNumber,
        serialNumber: obj.serialNumber || '',
        location: obj.location || ''
      };
      
      console.log('Machine created successfully:', responseMachine);
      
      res.status(201).json(responseMachine);
    } catch (error: any) {
      console.error('Error creating machine:', error);
      
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        if (field === 'serialNumber') {
          res.status(400).json({ 
            error: 'Duplicate serial number. Please use a unique serial number or leave it blank.' 
          });
        } else {
          res.status(400).json({ 
            error: `Duplicate value for ${field}. Please use a unique value.` 
          });
        }
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  // Update machine
  async updateMachine(req: Request, res: Response) {
    try {
      const data = req.body;
      
      let serialNumber = data.serialNumber;
      if (serialNumber === '' || serialNumber === null || serialNumber === undefined) {
        serialNumber = undefined;
      }
      
      const updateData: any = { ...data };
      if (data.siteId !== undefined) updateData.siteId = data.siteId;
      if (data.model !== undefined) {
        updateData.modelNumber = data.model;
        delete updateData.model;
      }
      if (serialNumber !== undefined) {
        updateData.serialNumber = serialNumber;
      } else if (data.serialNumber === '') {
        updateData.serialNumber = undefined;
      }
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      console.log(`Updating machine ${req.params.id} with data:`, updateData);
      
      const machine = await Machine.findByIdAndUpdate(
        req.params.id, 
        updateData, 
        { new: true, runValidators: true }
      );
      
      if (!machine) {
        return res.status(404).json({ error: 'Machine not found' });
      }
      
      const obj = machine.toJSON();
      const responseMachine = {
        ...obj,
        id: obj._id,
        model: obj.modelNumber,
        serialNumber: obj.serialNumber || '',
        location: obj.location || ''
      };
      
      res.json(responseMachine);
    } catch (error: any) {
      console.error('Error updating machine:', error);
      
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        if (field === 'serialNumber') {
          res.status(400).json({ 
            error: 'Duplicate serial number. Please use a unique serial number or leave it blank.' 
          });
        } else {
          res.status(400).json({ 
            error: `Duplicate value for ${field}. Please use a unique value.` 
          });
        }
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  // Delete machine
  async deleteMachine(req: Request, res: Response) {
    try {
      const machine = await Machine.findByIdAndDelete(req.params.id);
      if (!machine) {
        return res.status(404).json({ error: 'Machine not found' });
      }
      res.json({ message: 'Machine deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting machine:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get machine statistics
  async getMachineStats(req: Request, res: Response) {
    try {
      const machines = await Machine.find({});
      
      const totalMachines = machines.length;
      const totalMachineValue = machines.reduce((sum, m) => sum + (m.cost * m.quantity), 0);
      const operationalMachines = machines.filter(m => m.status === 'operational').length;
      const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length;
      const outOfServiceMachines = machines.filter(m => m.status === 'out-of-service').length;
      
      const averageMachineCost = totalMachines > 0 ? totalMachineValue / totalMachines : 0;
      
      const machinesByDepartment = machines.reduce((acc, m) => {
        const dept = m.department || 'Unassigned';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const machinesByLocation = machines.reduce((acc, m) => {
        const loc = m.location || 'Unassigned';
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const today = new Date();
      
      const upcomingMaintenanceCount = machines.filter(machine => {
        if (!machine.nextMaintenanceDate) return false;
        const nextDate = new Date(machine.nextMaintenanceDate);
        return nextDate <= thirtyDaysFromNow && nextDate >= today;
      }).length;

      res.json({
        totalMachines,
        totalMachineValue,
        operationalMachines,
        maintenanceMachines,
        outOfServiceMachines,
        averageMachineCost,
        machinesByDepartment,
        machinesByLocation,
        upcomingMaintenanceCount
      });
    } catch (error: any) {
      console.error('Error fetching machine stats:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Search machines
  async searchMachines(req: Request, res: Response) {
    try {
      const { q } = req.query;
      
      if (!q) {
        const machines = await Machine.find({});
        const transformedMachines = machines.map(m => {
          const obj = m.toJSON();
          return {
            ...obj,
            id: obj._id,
            model: obj.modelNumber,
            serialNumber: obj.serialNumber || '',
            location: obj.location || ''
          };
        });
        return res.json(transformedMachines);
      }
      
      const machines = await Machine.find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { modelNumber: { $regex: q, $options: 'i' } },
          { location: { $regex: q, $options: 'i' } },
          { department: { $regex: q, $options: 'i' } }
        ]
      });
      
      const transformedMachines = machines.map(m => {
        const obj = m.toJSON();
        return {
          ...obj,
          id: obj._id,
          model: obj.modelNumber,
          serialNumber: obj.serialNumber || '',
          location: obj.location || ''
        };
      });
      
      res.json(transformedMachines);
    } catch (error: any) {
      console.error('Error searching machines:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Add maintenance record - WITH STATUS FIELD
  async addMaintenanceRecord(req: Request, res: Response) {
    try {
      const machine = await Machine.findById(req.params.id);
      if (!machine) {
        return res.status(404).json({ error: 'Machine not found' });
      }

      // Create maintenance record with status 'pending'
      const record: IMaintenanceRecord = {
        type: req.body.type,
        description: req.body.description,
        cost: Number(req.body.cost),
        performedBy: req.body.performedBy,
        date: req.body.date ? new Date(req.body.date) : new Date(),
        status: 'pending', // Always set to pending for new records
        expenseId: req.body.expenseId || undefined
      };
      
      console.log('📝 Adding maintenance record:', {
        machineName: machine.name,
        machineLocation: machine.location,
        type: record.type,
        description: record.description,
        cost: record.cost,
        performedBy: record.performedBy,
        status: record.status
      });
      
      machine.maintenanceHistory = machine.maintenanceHistory || [];
      machine.maintenanceHistory.push(record);
      
      machine.lastMaintenanceDate = new Date();
      
      if (record.type === 'Emergency' || record.type === 'Corrective') {
        machine.status = 'maintenance';
      }
      
      await machine.save();
      
      console.log('✅ Maintenance record saved with status: pending');
      
      const obj = machine.toJSON();
      const responseMachine = {
        ...obj,
        id: obj._id,
        model: obj.modelNumber,
        serialNumber: obj.serialNumber || '',
        location: obj.location || ''
      };

      res.json(responseMachine);
    } catch (error: any) {
      console.error('❌ Error adding maintenance record:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Approve maintenance record
  async approveMaintenanceRecord(req: Request, res: Response) {
    try {
      const { id, maintenanceIndex } = req.params;
      const { expenseId } = req.body;
      
      const machine = await Machine.findById(id);
      if (!machine) {
        return res.status(404).json({ error: 'Machine not found' });
      }
      
      const index = parseInt(maintenanceIndex);
      if (isNaN(index) || !machine.maintenanceHistory[index]) {
        return res.status(404).json({ error: 'Maintenance record not found' });
      }
      
      machine.maintenanceHistory[index].status = 'approved';
      if (expenseId) {
        machine.maintenanceHistory[index].expenseId = expenseId;
      }
      
      await machine.save();
      
      console.log(`✅ Maintenance record approved for machine: ${machine.name} at site: ${machine.location}`);
      
      const obj = machine.toJSON();
      const responseMachine = {
        ...obj,
        id: obj._id,
        model: obj.modelNumber,
        serialNumber: obj.serialNumber || '',
        location: obj.location || ''
      };
      
      res.json(responseMachine);
    } catch (error: any) {
      console.error('❌ Error approving maintenance record:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Reject maintenance record
  async rejectMaintenanceRecord(req: Request, res: Response) {
    try {
      const { id, maintenanceIndex } = req.params;
      const { reason } = req.body;
      
      const machine = await Machine.findById(id);
      if (!machine) {
        return res.status(404).json({ error: 'Machine not found' });
      }
      
      const index = parseInt(maintenanceIndex);
      if (isNaN(index) || !machine.maintenanceHistory[index]) {
        return res.status(404).json({ error: 'Maintenance record not found' });
      }
      
      machine.maintenanceHistory[index].status = 'rejected';
      
      await machine.save();
      
      console.log(`❌ Maintenance record rejected for machine: ${machine.name} at site: ${machine.location}`);
      
      const obj = machine.toJSON();
      const responseMachine = {
        ...obj,
        id: obj._id,
        model: obj.modelNumber,
        serialNumber: obj.serialNumber || '',
        location: obj.location || ''
      };
      
      res.json(responseMachine);
    } catch (error: any) {
      console.error('❌ Error rejecting maintenance record:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get pending maintenance records
  async getPendingMaintenanceRecords(req: Request, res: Response) {
    try {
      const machines = await Machine.find({});
      const pendingRecords: any[] = [];
      
      machines.forEach(machine => {
        if (machine.maintenanceHistory && machine.maintenanceHistory.length > 0) {
          machine.maintenanceHistory.forEach((record, index) => {
            // Check for pending status
            if (record.status === 'pending') {
              pendingRecords.push({
                machineId: machine._id,
                machineName: machine.name,
                machineLocation: machine.location || 'No site assigned',
                maintenanceIndex: index,
                record: {
                  type: record.type,
                  description: record.description,
                  cost: record.cost,
                  performedBy: record.performedBy,
                  date: record.date,
                  status: record.status
                }
              });
            }
          });
        }
      });
      
      console.log(`📋 Found ${pendingRecords.length} pending maintenance records`);
      if (pendingRecords.length > 0) {
        pendingRecords.forEach(record => {
          console.log(`   - ${record.machineName} at site: ${record.machineLocation}`);
        });
      }
      
      res.json(pendingRecords);
    } catch (error: any) {
      console.error('❌ Error fetching pending maintenance records:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const machineController = new MachineController();
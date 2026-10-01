import { Request, Response } from 'express';
import Client from '../models/Client';
import Lead from '../models/Lead';
import Communication from '../models/Communication';

// Get all clients
export const getAllClients = async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;
    
    let filter: any = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { value: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      filter.status = status;
    } else {
      filter.status = 'active';
    }
    
   const clients = await Client.find(filter).sort('name').lean();
    
    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching clients', 
      error: error.message 
    });
  }
};

// Get client by ID
export const getClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(id);
    
    if (!client) {
      return res.status(404).json({ 
        success: false,
        message: 'Client not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      data: client
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching client', 
      error: error.message 
    });
  }
};

// Create new client
export const createClient = async (req: Request, res: Response) => {
  try {
    const {
      name,
      company,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      gstNumber,
      contactPerson,
      contactPersonPhone,
      value,
      industry,
      notes,
      status = 'active'
    } = req.body;

    console.log('Received client data:', req.body); // Debug log

    // Validate required fields
    if (!name || !company || !email || !phone || !value || !industry) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, company, email, phone, value, and industry are required fields' 
      });
    }

    // Check if client with same email already exists
    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: 'Client with this email already exists'
      });
    }

    // Create new client
    const client = new Client({
      name,
      company,
      email,
      phone,
      address: address || '',
      city: city || 'Mumbai',
      state: state || '',
      pincode: pincode || '',
      gstNumber: gstNumber || '',
      contactPerson: contactPerson || '',
      contactPersonPhone: contactPersonPhone || '',
      value: value || '₹0',
      industry: industry || 'IT Services',
      notes: notes || '',
      status
    });

    await client.save();

    console.log('Client created successfully:', client); // Debug log

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: client
    });
  } catch (error: any) {
    console.error('Error creating client:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Client with this email already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error creating client', 
      error: error.message 
    });
  }
};

// Update client
export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('Updating client with data:', updateData); // Debug log

    // Remove _id from update data if present
    delete updateData._id;

    const client = await Client.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!client) {
      return res.status(404).json({ 
        success: false,
        message: 'Client not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Client updated successfully',
      data: client
    });
  } catch (error: any) {
    console.error('Error updating client:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Client with this email already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error updating client', 
      error: error.message 
    });
  }
};

// Delete client
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findByIdAndDelete(id);
    
    if (!client) {
      return res.status(404).json({ 
        success: false,
        message: 'Client not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error deleting client', 
      error: error.message 
    });
  }
};

// Search clients
export const searchClients = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    const filter = {
      status: 'active',
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { company: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
        { industry: { $regex: query, $options: 'i' } },
        { value: { $regex: query, $options: 'i' } }
      ]
    };
    
   const clients = await Client.find(filter).sort('name').lean();
    
    res.status(200).json({
      success: true,
      count: clients.length,
      data: clients
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error searching clients', 
      error: error.message 
    });
  }
};

// Toggle client status
export const toggleClientStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findById(id);
    if (!client) {
      return res.status(404).json({ 
        success: false,
        message: 'Client not found' 
      });
    }
    
    client.status = client.status === 'active' ? 'inactive' : 'active';
    await client.save();
    
    res.status(200).json({
      success: true,
      message: `Client ${client.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: client
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error toggling client status', 
      error: error.message 
    });
  }
};

// Get client statistics
export const getClientStats = async (req: Request, res: Response) => {
  try {
    const stats = await Client.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalClients = await Client.countDocuments();
    
    res.status(200).json({
      success: true,
      data: {
        stats,
        totalClients
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching client statistics', 
      error: error.message 
    });
  }
};

// Get CRM dashboard statistics
// Get CRM dashboard statistics - SIMPLIFIED VERSION
export const getCRMStats = async (req: Request, res: Response) => {
  try {
    console.log('=== Starting getCRMStats function ===');
    
    // Try simple counts first
    let totalClients = 0;
    let activeLeads = 0;
    let totalCommunications = 0;
    
    try {
      totalClients = await Client.countDocuments();
      console.log('Total clients count successful:', totalClients);
    } catch (clientError) {
      console.error('Error counting clients:', clientError);
    }
    
    try {
      activeLeads = await Lead.countDocuments({
        status: { $nin: ['closed-won', 'closed-lost'] }
      });
      console.log('Active leads count successful:', activeLeads);
    } catch (leadError) {
      console.error('Error counting leads:', leadError);
    }
    
    try {
      totalCommunications = await Communication.countDocuments();
      console.log('Total communications count successful:', totalCommunications);
    } catch (commError) {
      console.error('Error counting communications:', commError);
    }
    
    // Calculate total value - simplified
    let totalValue = 0;
    try {
      const activeClients = await Client.find({ status: 'active' }).select('value');
      console.log('Found active clients:', activeClients.length);
      
      for (const client of activeClients) {
        // Simple value extraction
        if (client.value) {
          // Remove currency symbols and commas
          const cleanValue = client.value.toString().replace(/[₹$,]/g, '');
          const numValue = parseFloat(cleanValue);
          if (!isNaN(numValue)) {
            totalValue += numValue;
          }
        }
      }
    } catch (valueError) {
      console.error('Error calculating total value:', valueError);
    }
    
    const formattedTotalValue = `₹${totalValue.toLocaleString('en-IN')}`;
    
    console.log('=== getCRMStats completed successfully ===');
    console.log('Final stats:', { totalClients, activeLeads, totalCommunications, totalValue: formattedTotalValue });
    
    res.status(200).json({
      success: true,
      data: {
        totalClients,
        activeLeads,
        totalCommunications,
        totalValue: formattedTotalValue
      }
    });
    
  } catch (error: any) {
    console.error('=== ERROR in getCRMStats ===');
    console.error('Full error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      success: false,
      message: 'Error fetching CRM statistics', 
      error: error.message 
    });
  }
};

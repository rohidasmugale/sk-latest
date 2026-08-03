import { Request, Response } from 'express';
import Site from '../models/Site';

// Helper function to clean object
const cleanObject = (obj: any) => {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// Helper function to get user info from request (you need to implement your auth middleware)
const getUserInfo = (req: Request): { userId: string; userRole: 'superadmin' | 'admin' | 'manager' } => {
  // This should come from your authentication middleware
  // For now, we'll use headers or fallback values
  const userId = req.headers['x-user-id'] as string || 'unknown-user';
  const userRole = (req.headers['x-user-role'] as 'superadmin' | 'admin' | 'manager') || 'admin';
  
  return { userId, userRole };
};

// Get all sites
export const getAllSites = async (req: Request, res: Response) => {
  try {
    console.log('📋 Fetching all sites');
    
    // Get user info for filtering if needed
    const { userId, userRole } = getUserInfo(req);
    console.log(`👤 User: ${userId}, Role: ${userRole}`);
    
    // You can add filtering based on user role here
    let query = Site.find();
    
    // If user is manager, they might only see their own sites
    if (userRole === 'manager') {
      query = query.where('addedBy').equals(userId);
    }
    
    const sites = await query.sort({ createdAt: -1 });
    console.log(`✅ Found ${sites.length} sites`);
    
    res.status(200).json(sites);
  } catch (error: any) {
    console.error('❌ Error fetching sites:', error);
    res.status(500).json({ 
      message: 'Error fetching sites', 
      error: error.message 
    });
  }
};

// Get site by ID
export const getSiteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`📋 Fetching site with ID: ${id}`);
    
    const site = await Site.findById(id);
    
    if (!site) {
      console.log(`❌ Site not found: ${id}`);
      return res.status(404).json({ message: 'Site not found' });
    }
    
    // Check permissions for managers
    const { userId, userRole } = getUserInfo(req);
    if (userRole === 'manager' && site.addedBy !== userId) {
      console.log(`⛔ Manager ${userId} trying to access site not added by them`);
      return res.status(403).json({ 
        message: 'Access denied. You can only view sites you added.' 
      });
    }
    
    console.log(`✅ Found site: ${site.name}, Added by: ${site.addedBy} (${site.addedByRole})`);
    res.status(200).json(site);
  } catch (error: any) {
    console.error('❌ Error fetching site:', error);
    res.status(500).json({ 
      message: 'Error fetching site', 
      error: error.message 
    });
  }
};

// Create new site - UPDATED VERSION with addedBy tracking
export const createSite = async (req: Request, res: Response) => {
  try {
    console.log('📝 CREATE SITE REQUEST START ============');
    console.log('📦 Request body received:', JSON.stringify(req.body, null, 2));
    
    // Get user info
    const { userId, userRole } = getUserInfo(req);
    console.log(`👤 Creating site for user: ${userId}, role: ${userRole}`);
    
    // Remove ALL id-related fields from request body including version fields
    const { _id, id, __v, ...requestData } = req.body;
    console.log('🧹 After removing id fields:', JSON.stringify(requestData, null, 2));
    
    // Check for any remaining id fields
    Object.keys(requestData).forEach(key => {
      if (key.toLowerCase().includes('id') && key !== 'clientId') {
        console.warn(`⚠️ Warning: Found potential id field: ${key} with value: ${requestData[key]}`);
      }
    });
    
    // Clean the data (remove empty values)
    const cleanedData = cleanObject(requestData);
    console.log('🧽 After cleaning empty values:', JSON.stringify(cleanedData, null, 2));
    
    // Validate required fields
    const requiredFields = ['name', 'clientName', 'location', 'areaSqft', 'contractValue', 'contractEndDate'];
    const missingFields = requiredFields.filter(field => !cleanedData[field]);
    
    if (missingFields.length > 0) {
      console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
      return res.status(400).json({ 
        message: 'Missing required fields',
        missingFields,
        receivedData: cleanedData
      });
    }
    
    // Prepare site data - create with type any to allow dynamic properties
    const siteData: any = {
      name: String(cleanedData.name).trim(),
      clientName: String(cleanedData.clientName).trim(),
      location: String(cleanedData.location).trim(),
      areaSqft: Number(cleanedData.areaSqft) || 0,
      contractValue: Number(cleanedData.contractValue) || 0,
      contractEndDate: new Date(cleanedData.contractEndDate),
      services: Array.isArray(cleanedData.services) ? cleanedData.services : [],
      
      staffDeployment: Array.isArray(cleanedData.staffDeployment) 
        ? cleanedData.staffDeployment.filter((item: any) => item && item.role && typeof item.count === 'number')
        : [],
      status: cleanedData.status === 'inactive' ? 'inactive' : 'active',
      addedBy: userId,
      addedByRole: userRole
    };
    siteData.shifts = Array.isArray(cleanedData.shifts)
  ? cleanedData.shifts.filter((s: any) => s && s.name && s.startTime && s.endTime)
  : [];
    // Only include clientId if it exists and is not empty
    if (cleanedData.clientId && cleanedData.clientId.trim() !== '') {
      siteData.clientId = String(cleanedData.clientId).trim();
    }
    
    // Include manager count and supervisor count if provided
    if (cleanedData.managerCount !== undefined) {
      siteData.managerCount = Number(cleanedData.managerCount) || 0;
    }
    
    if (cleanedData.supervisorCount !== undefined) {
      siteData.supervisorCount = Number(cleanedData.supervisorCount) || 0;
    }
    
    // Include manager if provided
    if (cleanedData.manager) {
      siteData.manager = String(cleanedData.manager).trim();
    }
    
    console.log('📊 Final site data to save:', JSON.stringify(siteData, null, 2));
    
    // Create new site instance
    const site = new Site(siteData);
    console.log('🏗️ Site instance created');
    
    // Validate the site data before saving
    const validationError = site.validateSync();
    if (validationError) {
      console.log('❌ Validation error:', validationError.errors);
      return res.status(400).json({ 
        message: 'Validation error',
        errors: validationError.errors 
      });
    }
    
    console.log('💾 Attempting to save site to database...');
    
    // Save to database
    await site.save();
    
    console.log(`✅ Site created successfully! ID: ${site._id}, Name: ${site.name}`);
    console.log(`👤 Added by: ${site.addedBy} (${site.addedByRole})`);
    console.log('📝 CREATE SITE REQUEST END ============\n');
    
    res.status(201).json({
      success: true,
      message: 'Site created successfully',
      site
    });
    
  } catch (error: any) {
    console.error('❌ CREATE SITE ERROR ============');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      console.error('Validation errors:', messages);
      return res.status(400).json({ 
        success: false,
        message: 'Validation error', 
        errors: messages
      });
    }
    
    if (error.code === 11000) {
      console.error('Duplicate key error pattern:', error.keyPattern);
      console.error('Duplicate key error value:', error.keyValue);
      
      const duplicateField = Object.keys(error.keyPattern)[0];
      const duplicateValue = error.keyValue[duplicateField];
      
      // Handle the case where value is null
      if (duplicateValue === null) {
        return res.status(400).json({ 
          success: false,
          message: 'Database constraint error',
          details: 'There is an issue with the database unique constraint. Please contact support.'
        });
      }
      
      return res.status(400).json({ 
        success: false,
        message: `Duplicate entry for ${duplicateField}`,
        field: duplicateField,
        value: duplicateValue,
        suggestion: `A site with ${duplicateField} "${duplicateValue}" already exists. Please use a different value.`
      });
    }
    
    console.error('❌ CREATE SITE ERROR END ============\n');
    
    res.status(500).json({ 
      success: false,
      message: 'Error creating site', 
      error: error.message
    });
  }
};

// Update site
export const updateSite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Updating site with ID: ${id}`);
    
    const { userId, userRole } = getUserInfo(req);
    
    const site = await Site.findById(id);
    if (!site) {
      return res.status(404).json({ success: false, message: 'Site not found' });
    }
    
    if (userRole === 'manager' && site.addedBy !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    
    const { _id, id: reqId, addedBy, addedByRole, ...updateData } = req.body;
    
    // Update all fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        (site as any)[key] = updateData[key];
      }
    });

    // ✅ CRITICAL: handle `shifts` explicitly
    if (updateData.shifts !== undefined) {
      site.shifts = updateData.shifts;
      site.markModified('shifts');   // force Mongoose to detect the change
    }
    
    await site.save();
    
    res.status(200).json({
      success: true,
      message: 'Site updated successfully',
      site
    });
  }  catch (error: any) {
    console.error('Error updating site:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Duplicate entry error' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error updating site', 
      error: error.message 
    });
  }
};

// Delete site
export const deleteSite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting site with ID: ${id}`);
    
    // Get user info
    const { userId, userRole } = getUserInfo(req);
    
    // Find site
    const site = await Site.findById(id);
    if (!site) {
      console.log(`❌ Site not found for deletion: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Site not found' 
      });
    }
    
    // Check permissions
    if (userRole === 'manager' && site.addedBy !== userId) {
      console.log(`⛔ Manager ${userId} trying to delete site not added by them`);
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. You can only delete sites you added.' 
      });
    }
    
    const deletedSite = await Site.findByIdAndDelete(id);
    
    if (!deletedSite) {
      console.log(`❌ Site not found for deletion: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Site not found' 
      });
    }
    
    console.log(`✅ Site deleted successfully: ${deletedSite.name}`);
    console.log(`👤 Deleted by: ${userId} (${userRole})`);
    
    res.status(200).json({
      success: true,
      message: 'Site deleted successfully',
      site: deletedSite
    });
  } catch (error: any) {
    console.error('Error deleting site:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting site', 
      error: error.message 
    });
  }
};

// Toggle site status
export const toggleSiteStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Toggling status for site ID: ${id}`);
    
    // Get user info
    const { userId, userRole } = getUserInfo(req);
    
    const site = await Site.findById(id);
    if (!site) {
      console.log(`❌ Site not found for status toggle: ${id}`);
      return res.status(404).json({ message: 'Site not found' });
    }
    
    // Check permissions
    if (userRole === 'manager' && site.addedBy !== userId) {
      console.log(`⛔ Manager ${userId} trying to toggle status of site not added by them`);
      return res.status(403).json({ 
        message: 'Access denied. You can only modify sites you added.' 
      });
    }
    
    const oldStatus = site.status;
    site.status = site.status === 'active' ? 'inactive' : 'active';
    await site.save();
    
    console.log(`✅ Site status toggled: ${site.name} is now ${site.status}`);
    console.log(`👤 Toggled by: ${userId} (${userRole})`);
    
    res.status(200).json({
      message: `Site ${site.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      site
    });
  } catch (error: any) {
    console.error('Error toggling site status:', error);
    res.status(500).json({ 
      message: 'Error toggling site status', 
      error: error.message 
    });
  }
};

// Get site statistics
export const getSiteStats = async (req: Request, res: Response) => {
  try {
    console.log('📊 Getting site statistics');
    
    // Get user info
    const { userId, userRole } = getUserInfo(req);
    
    let filter = {};
    
    // If user is manager, only get stats for their sites
    if (userRole === 'manager') {
      filter = { addedBy: userId };
    }
    
    const stats = await Site.aggregate([
      {
        $match: filter
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalContractValue: { $sum: '$contractValue' },
          totalArea: { $sum: '$areaSqft' }
        }
      }
    ]);
    
    // Get total staff across all sites
    const allSites = await Site.find(filter);
    const totalStaff = allSites.reduce((total, site) => {
      return total + site.staffDeployment.reduce((sum, item) => sum + item.count, 0);
    }, 0);
    
    // Get added by stats
    const addedByStats = await Site.aggregate([
      {
        $match: filter
      },
      {
        $group: {
          _id: '$addedByRole',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log(`📊 Statistics: ${allSites.length} sites, ${totalStaff} total staff`);
    console.log(`📊 Added by stats:`, addedByStats);
    
    res.status(200).json({
      stats,
      totalStaff,
      totalSites: allSites.length,
      addedByStats,
      userRole: userRole
    });
  } catch (error: any) {
    console.error('Error fetching site statistics:', error);
    res.status(500).json({ 
      message: 'Error fetching site statistics', 
      error: error.message 
    });
  }
};

// Search sites
export const searchSites = async (req: Request, res: Response) => {
  try {
    const { query, status, addedByRole, addedBy } = req.query;
    console.log(`🔍 Searching sites with query: "${query}", status: "${status}", addedByRole: "${addedByRole}"`);
    
    // Get user info
    const { userId, userRole } = getUserInfo(req);
    
    let filter: any = {};
    
    // If user is manager, only search their sites
    if (userRole === 'manager') {
      filter.addedBy = userId;
    }
    
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { clientName: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } }
      ];
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (addedByRole) {
      filter.addedByRole = addedByRole;
    }
    
    if (addedBy) {
      filter.addedBy = addedBy;
    }
    
    const sites = await Site.find(filter).sort({ createdAt: -1 });
    
    console.log(`🔍 Found ${sites.length} sites matching search`);
    
    res.status(200).json(sites);
  } catch (error: any) {
    console.error('Error searching sites:', error);
    res.status(500).json({ 
      message: 'Error searching sites', 
      error: error.message 
    });
  }
};

// Get sites by user
export const getSitesByUser = async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.params;
    console.log(`👤 Getting sites for user: ${userId}, role: ${role}`);
    
    // Get current user info
    const { userId: currentUserId, userRole: currentUserRole } = getUserInfo(req);
    
    // Check permissions
    if (currentUserRole === 'manager' && currentUserId !== userId) {
      console.log(`⛔ Manager ${currentUserId} trying to access sites of another user`);
      return res.status(403).json({ 
        message: 'Access denied. You can only view your own sites.' 
      });
    }
    
    let filter: any = { addedBy: userId };
    
    if (role) {
      filter.addedByRole = role;
    }
    
    const sites = await Site.find(filter).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${sites.length} sites for user ${userId}`);
    
    res.status(200).json({
      userId,
      role,
      count: sites.length,
      sites
    });
  } catch (error: any) {
    console.error('Error fetching sites by user:', error);
    res.status(500).json({ 
      message: 'Error fetching sites by user', 
      error: error.message 
    });
  }
};
import { Request, Response } from 'express';
import Communication from '../models/Communication';

// Get all communications (optional search by clientName)
export const getAllCommunications = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const filter: any = {};
    
    if (search && typeof search === 'string') {
      filter.clientName = { $regex: search, $options: 'i' };
    }

    const communications = await Communication.find(filter)
      .populate('clientId', 'name company email')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: communications
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching communications'
    });
  }
};

// Create a new communication
export const createCommunication = async (req: Request, res: Response) => {
  try {
    const comm = new Communication(req.body);
    await comm.save();
    
    // Populate clientId before sending response
    await comm.populate('clientId', 'name company email');

    res.status(201).json({
      success: true,
      data: comm,
      message: 'Communication logged successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating communication'
    });
  }
};

// Delete a communication
export const deleteCommunication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const comm = await Communication.findByIdAndDelete(id);
    
    if (!comm) {
      return res.status(404).json({
        success: false,
        message: 'Communication not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Communication deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting communication'
    });
  }
};
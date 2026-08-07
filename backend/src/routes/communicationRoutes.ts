import express from 'express';
import {
  getAllCommunications,
  createCommunication,
  deleteCommunication
} from '../controllers/communicationController';

const router = express.Router();

router.route('/')
  .get(getAllCommunications)
  .post(createCommunication);

router.route('/:id')
  .delete(deleteCommunication);

export default router;
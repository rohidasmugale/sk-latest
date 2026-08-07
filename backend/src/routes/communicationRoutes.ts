import express from 'express';
import {
  getAllCommunications,
  createCommunication,
  deleteCommunication
} from '../controllers/Communicationcontroller';

const router = express.Router();

router.route('/')
  .get(getAllCommunications)
  .post(createCommunication);

router.route('/:id')
  .delete(deleteCommunication);

export default router;
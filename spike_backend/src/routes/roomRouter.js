import express from 'express'
import { listRooms, postRooms, deleteRoom } from '../controllers/roomController.js';

const roomRouter = express.Router();
roomRouter.get('/listRooms', listRooms);
roomRouter.post('/createRoom', postRooms);
roomRouter.delete('/deleteRoom', deleteRoom);

export {roomRouter};
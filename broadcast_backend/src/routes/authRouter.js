import express from 'express';
import { regiController, loginController } from '../controllers/authController';

const authRouter = express.Router();
authRouter.post('/register',regiController);
authRouter.post('/login',loginController);

export {authRouter};
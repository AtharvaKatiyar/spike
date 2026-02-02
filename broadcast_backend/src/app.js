import express from 'express'
import { authRouter } from './routes/authRouter';
import {roomRouter} from './routes/roomRouter';
import 'dotenv/config';
import { verifyToken } from './controllers/authController';

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use('/api/auth', authRouter);
app.use('/broadcast', verifyToken, roomRouter);

app.get('/health', (req, res)=>{
    res.status(200).json({status: 'ok'})
})
app.use((err, req, res, next)=>{
    console.error(err.message);
    res.status(500).json({
        error: err.message || "Internal server error"
    });
})

export default app;
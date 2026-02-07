import http from 'node:http';
import app from './app.js';
import { startChatServer } from './ws/chatServer.js';
import 'dotenv/config';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
startChatServer(server);

server.listen(PORT, () => console.log(`Server running on : http://localhost:${PORT}`));
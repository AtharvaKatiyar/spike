import WebSocket, { WebSocketServer } from 'ws';
import {URL} from 'url';
import {verifyJwt} from '../utils/verifyJWT.js';
import {prisma} from '../lib/prisma.js'
const activeRooms = new Map();
const roomMessageCache = new Map();
const MAX_CACHE = 50;

function chatSystem(roomName, payload) {
    const sockets = activeRooms.get(roomName);
    if(!sockets) return;   
    const message = JSON.stringify(payload);
    for(const socket of sockets){
        if(socket.readyState === socket.OPEN){
            socket.send(message);
        }
    }
}

export function startChatServer(httpServer) {
    const wss = new WebSocketServer({server: httpServer});

    console.log("Websocket server attached.");

    wss.on("connection", async (ws,req)=>{
        try {
            const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
            const token = parsedUrl.searchParams.get("token");
            const roomName = parsedUrl.searchParams.get("room");

            if(!token || !roomName){
                ws.close(1008, 'Token and room name are required');
                return;
            }
            const decoded = verifyJwt(token);
            ws.userId = decoded.userId;
            const user = await prisma.user.findUnique({
                where: {id: ws.userId},
                select : {name: true}
            })
            if(!user){
                ws.close(1008, 'User not found');
                return;
            }  
            ws.userName = user.name;
            const room = await prisma.room.findUnique({
                where: {
                    name: roomName
                }
            })
            if(!room){
                ws.close(1008, 'Room not found');   
                return;
            }
            ws.roomId = room.id;
            ws.roomName = room.name;
            console.log(`User ${ws.userName} connected to room ${roomName}`);
            if(!activeRooms.has(roomName)){
                activeRooms.set(roomName, new Set());
            }
            activeRooms.get(roomName).add(ws);

            chatSystem(ws.roomName, {type: 'notification',event: 'join', user: ws.userName, timestamp: new Date()});

            let history = roomMessageCache.get(roomName)
            if(!history) {
                const messages = await prisma.message.findMany({
                    where: {
                        roomId: ws.roomId
                    },
                    orderBy: {createdAt: 'asc'},
                    take: MAX_CACHE,
                    include: {
                        user:{select: {name: true}}
                    }
                });
                history = messages.map((m)=>({
                    from: m.user.name,
                    content: m.content,
                    timestamp: m.createdAt
                }))
                roomMessageCache.set(roomName, history);
            }
            ws.send(
                JSON.stringify({
                    type: 'history',
                    messages: history
                })
            )


        } catch(err){
                console.log('Error accepting websocket connection: ', err); 
                ws.close(1008, 'Unauthorized');
                return;
        }
        ws.on('message', async(data) => {
            try{
                let payload;
                try{
                    payload = JSON.parse(data.toString());
                }
                catch {
                    return;
                }
                if(payload.type !== 'message' || typeof payload.content !== 'string'){
                    return;
                }
                const content = payload.content.trim();
                if(!content || content.length>1000) return;
                const saved = await prisma.message.create(  {
                    data: {
                        content,
                        userId: ws.userId,
                        roomId: ws.roomId
                    },
                    include: {
                        user: {
                            select: {name: true}
                        }
                    }
                })
                const outgoing = {
                    type: "message",
                    from: saved.user.name,
                    content: saved.content,
                    timestamp: saved.createdAt
                }
                const cache = roomMessageCache.get(ws.roomName) || [];
                cache.push(outgoing);
                if(cache.length > MAX_CACHE) cache.shift();
                roomMessageCache.set(ws.roomName, cache);
                const encoded = JSON.stringify(outgoing);

                const roomSockets = activeRooms.get(ws.roomName);
                if(!roomSockets)    return;
                for(const client of roomSockets){
                    if(client.readyState === client.OPEN){
                        client.send(encoded);
                    }
                } 
            } catch(err) {
                console.error("Error handling message: ",err);
            }
        })

        ws.on('close', ()=>{
            chatSystem(ws.roomName, {type: 'notification', event: 'leave', user: ws.userName, timestamp: new Date()});

            console.log(`Socket closed: ${ws.userId}`);
            const roomSockets = activeRooms.get(ws.roomName);
            if(roomSockets) {
                roomSockets.delete(ws);
                if(roomSockets.size === 0){
                    activeRooms.delete(ws.roomName);
                    roomMessageCache.delete(ws.roomName);
                }
            }
        })

        ws.on('error', (err)=>{
            console.log('Websocket error: ', err);
        })
    })
}
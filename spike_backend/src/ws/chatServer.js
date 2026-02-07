import WebSocket, { WebSocketServer } from 'ws';
import {URL} from 'url';
import {verifyJwt} from '../utils/verifyJWT.js';
import {prisma} from '../lib/prisma.js'
const activeRooms = new Map();

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
            console.log(`User ${ws.userId} connected to room ${roomName}`);
            if(!activeRooms.has(roomName)){
                activeRooms.set(roomName, new Set());
            }
            activeRooms.get(roomName).add(ws);

            const previousMessages = await prisma.message.findMany({
                where: {
                    roomId: ws.roomId
                },
                orderBy: {createdAt: 'asc'},
                take: 50,
                include: {
                    user:{select: {name: true}}
                }
            });

            ws.send(
                JSON.stringify({
                    type: 'history',
                    messages: previousMessages.map((m)=>({
                        from: m.user.name,
                        content: m.content,
                        timestamp: m.createdAt
                    }))
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
                const outgoing = JSON.stringify({
                    type: "message",
                    from: saved.user.name,
                    content: saved.content,
                    timestamp: saved.createdAt
                })

                const roomSockets = activeRooms.get(ws.roomName);
                if(!roomSockets)    return;
                for(const client of roomSockets){
                    if(client.readyState === client.OPEN){
                        client.send(outgoing)
                    }
                }
            } catch(err) {
                console.error("Error handling message: ",err);
            }
        })

        ws.on('close', ()=>{
            console.log(`Socket closed: ${ws.userId}`);
            const roomSockets = activeRooms.get(ws.roomName);
            if(roomSockets) {
                roomSockets.delete(ws);
                if(roomSockets.size === 0){
                    activeRooms.delete(ws.roomName);
                }
            }
        })

        ws.on('error', (err)=>{
            console.log('Websocket error: ', err);
        })
    })
}
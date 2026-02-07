import { prisma } from "../lib/prisma.js";
// import {Prisma} from '@prisma/client'

const listRooms = async (req, res, next) => {
    try{
        const allRooms = await prisma.room.findMany({
            where: {ownerId: req.user.userId},
            select: {
                name: true,
            }
        })
        if(allRooms.length === 0){
            return res.status(200).json({
                message: "No rooms created"
            })
        }
        return res.status(200).json({allRooms});
    } catch(error) {
        console.error("Error while getting rooms", error);
        next(error);
    }
}

const postRooms = async (req, res, next) => {
    try{
        const {name} = req.body;
        const room = await prisma.room.create({
            data: {
                name: name,
                ownerId: req.user.userId
            }
        })
        return res.status(200).json({message: "Room created successfully", id:room.id, name:room.name})

    } catch(error) {
        if( error.code === 'P2002')
            return res.status(409).json({message: "Room name must be unique"})

        console.error("Error while creating Room: ", error);
        next(error);
    }
}

const deleteRoom = async (req, res, next) => {
    try{
        const {name} = req.body;
        const userId = req.user.userId;
        const room = await prisma.room.findUnique({
            where: { name }
        })
        if(!room){
            return res.status(404).json({error: 'Room not found'});
        }
        if(room.ownerId !== userId){
            return res.status(403).json({error: "Forbidden"});
        }
        const deletedRoom = await prisma.room.delete({
            where: { name }
        })
        return res.status(200).json({message: 'Room deleted successfully', deletedRoom});
    } catch(error){
        console.error('Error while deleting the room: ',error);
        next(error);
    }
}

export {listRooms, postRooms, deleteRoom};
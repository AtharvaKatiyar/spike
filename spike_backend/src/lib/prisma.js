import {PrismaClient} from '../../generated/prisma/index.js';
import {PrismaPg} from '@prisma/adapter-pg'
import 'dotenv/config'
const connectionString = process.env.DATABASE_URL;
if(!connectionString){
    throw new Error('DATABASE_URL is not set. Set it in your environment or a .env file.');   
}
const adapter = new PrismaPg({connectionString});
const prisma = new PrismaClient({adapter});

export {prisma};
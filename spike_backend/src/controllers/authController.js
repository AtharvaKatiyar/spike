import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import jwt from 'jsonwebtoken'
import 'dotenv/config'
import { verifyJwt } from '../utils/verifyJWT';
const saltRounds = Number(process.env.SALT_ROUND);

const regiController = async(req, res, next) => {
    try{
        if(!req.body.email || !req.body.password || !req.body.name){
            return res.status(400).json({error: "Name, Email, Password Required !!"})
        }
        const name = req.body.name;
        const email = req.body.email;
        const passwordHash = await bcrypt.hash(req.body.password, saltRounds);
        try{
            const existing = await prisma.user.findUnique({
                where: {
                    name: name,
                    email: email
                }
            })
            if (existing)
                return res.status(409).json({error: "User already exists"})
            const user = await prisma.user.create({
                data: {
                    name: name,
                    email: email,
                    passwordHash: passwordHash
                }
            })
            return res.status(201).json({message: 'User Registered successfully', userId: user.id})
        }catch(error) {
            if(!res.headersSent){
                res.status(500).json({error: error.message})
            }
        }
    } catch(error){
        next(error);
    }
}

const loginController = async (req, res, next) => {
    const {email, password} = req.body;
    try {
        if(!req.body.email || !req.body.password){
            return res.status(400).json({error: "Email, Password Required !!"})
        }
        const existing = await prisma.user.findUnique({
            where: {email: email}
        })
        if(!existing)
            res.status(404).json({error: "User does not exist. Register to log in"})
        const isMatch = await bcrypt.compare(password.trim(), existing.passwordHash)
        if(!isMatch)
            return res.status(401).json({error: "Invalid Password"});
        const token = jwt.sign(
            {sub: existing.id},
            process.env.JWT_SECRET,
            {   algorithm: "HS256",
                expiresIn: "2h",
                issuer: "broadcast-server",
                audience: "broadcast-server-client"
            }
        )
        const {passwordHash: _, ...userWithoutPassword} = existing;
        return res.status(200).json({
            message: "Login Successfull",
            token,
            user: userWithoutPassword
        })
    } catch(error){
        next(error);
    }
}

const verifyToken = (req, res, next)=>{
    try{
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        req.user = verifyJwt(token);
        next();
    } catch(error){
        return res.status(403).json({error: 'Invalid or expired token'})
    }
}

export {regiController, loginController, verifyToken};
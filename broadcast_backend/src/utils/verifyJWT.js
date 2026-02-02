import jwt from 'jsonwebtoken';

export function verifyJwt(token) {
    if(!token) {
        throw new Error('No token provided');
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return {
        userId: payload.sub
    }
}
import inquirer from "inquirer";
import axios from "axios";
import {roomMenu} from "./room.js";

const API = "http://localhost:3000/api";
let session = {
    token: null,
    user: null
}

export async function RegisterFlow() {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Enter your name:'
        },
        {
            type: 'input',
            name: 'email',
            message: 'Enter your email:'
        },
        {
            type: 'password',
            name: 'password',
            message: 'Enter your password:',
            mask: '*'
        }
    ]);
    try{
        const res = await axios.post(`${API}/auth/register`,{
            name: answers.name,
            email: answers.email,
            password: answers.password
        })
        console.log(res.data.message);
        await LoginFlow();
    }catch(err){
        console.error("Registration failed: ", err.response ? err.response.data.error : err.message);
        process.exit(1);
    }
}

export async function LoginFlow() {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'email',
            message: 'Enter your email:'
        },
        {
            type: 'password',
            name: 'password',
            message: 'Enter your password:',
            mask: '*'
        }
    ]);
    try{
        const res = await axios.post(`${API}/auth/login`,{
            email: answers.email,
            password: answers.password
        })
        session.token = res.data.token;
        session.user = res.data.user;
        console.log("Login successful!");
        await roomMenu(session);
    }catch(err){
        console.error("Login failed: ", err.response ? err.response.data.error : err.message);
        process.exit(1);
    }
}
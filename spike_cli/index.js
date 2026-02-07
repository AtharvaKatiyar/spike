#!/usr/bin/env node
import inquirer from "inquirer";
import {RegisterFlow, LoginFlow} from './auth.js'


async function main() {
    console.clear();
    console.log("TTY:", process.stdin.isTTY);
    console.log("Welcome to Spike CLI");
    process.stdin.setRawMode?.(false);
    process.stdin.resume();

    const {action} = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Authentication Required. Please choose an action:',
        choices: ['Login', 'Register', 'Exit']
    }])
    if(action === 'Exit'){
        console.log("Goodbye!");
        process.exit(0);
    } else if(action === 'Login'){
        await LoginFlow();
    } else if(action === 'Register'){
        await RegisterFlow();
    }
}

main();

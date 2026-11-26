import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models.js';
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
await mongoose.connect(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/Adya');
const people=[['Mayank','mayank','admin'],['Vikas','vikas','operator'],['Naveen','naveen','operator'],['Shikha','shikha','viewer'],['Rinki','rinki','viewer']];
for(const [name,username,role] of people){if(!await User.exists({username})){if(!process.env.INITIAL_PASSWORD)throw new Error('Set INITIAL_PASSWORD in server/.env before creating seed accounts.');await User.create({name,username,role,passwordHash:await bcrypt.hash(process.env.INITIAL_PASSWORD,10)});console.log(`Created ${username} (${role})`);}else console.log(`Kept existing ${username}`);}
await mongoose.disconnect();

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, Order, Expense } from './models.js';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const app = express(); app.use(cors()); app.use(express.json({ limit: '1mb' }));
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET must be set in server/.env');
const tokenFor = u => jwt.sign({ id: u._id, role: u.role, name: u.name }, secret, { expiresIn: '14d' });
const auth = (req, res, next) => { try { req.user = jwt.verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''), secret); next(); } catch { res.status(401).json({ error: 'Please sign in again.' }); } };
const allow = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Your account cannot perform this action.' });
const sums = o => { const delivered = o.attempts.reduce((n,a)=>n+a.delivered,0), returned=o.attempts.reduce((n,a)=>n+a.returned,0), paid=o.attempts.reduce((n,a)=>n+a.paid,0); const regular=o.category==='Regular'; return { delivered, returned, paid, remaining: regular ? null : Math.max(0,o.quantity-delivered), pendingEmpty: Math.max(0,delivered-returned), balance: (regular?delivered:o.quantity)*o.price-paid }; };
const safeOrder = o => ({ ...o.toObject(), ...sums(o) });
const phoneClean = p => String(p||'').replace(/\D/g,'').replace(/^91(?=\d{10}$)/,'');

app.get('/api/health', (_,res)=>res.json({ ok:true }));
app.post('/api/auth/login', async (req,res)=>{ const u=await User.findOne({username:String(req.body.username||'').toLowerCase(),active:true}); if(!u || !await bcrypt.compare(req.body.password||'',u.passwordHash)) return res.status(401).json({error:'Invalid username or password.'}); res.json({ token:tokenFor(u), user:{id:u.id,name:u.name,username:u.username,role:u.role} }); });
app.get('/api/auth/me',auth,async(req,res)=>{const u=await User.findById(req.user.id).select('-passwordHash'); if(!u||!u.active)return res.status(401).json({error:'Account unavailable.'}); res.json(u);});

app.get('/api/orders',auth,async(req,res)=>{ const q={}; if(req.query.category)q.category=req.query.category; if(req.query.search){const s=String(req.query.search);q.$or=[{customerName:{$regex:s,$options:'i'}},{customerPhone:{$regex:s}}];} if(req.query.active==='true')q.active=true; let rows=await Order.find(q).sort({updatedAt:-1}); let result=rows.map(safeOrder); if(req.query.due==='true'){const day=new Date();day.setHours(23,59,59,999);result=result.filter(o=>o.category==='Regular' && o.active && o.nextDueDate && new Date(o.nextDueDate)<=day);} res.json(result); });
app.post('/api/orders',auth,allow('admin','operator'),async(req,res)=>{try{const d={...req.body,customerPhone:phoneClean(req.body.customerPhone),createdBy:req.user.name}; if(d.category==='Regular'){d.startDate=d.startDate||new Date();d.nextDueDate=d.startDate;} const o=await Order.create(d);res.status(201).json(safeOrder(o));}catch(e){res.status(400).json({error:e.message});}});
app.patch('/api/orders/:id',auth,allow('admin'),async(req,res)=>{try{const d={...req.body};if(d.customerPhone)d.customerPhone=phoneClean(d.customerPhone);const o=await Order.findByIdAndUpdate(req.params.id,d,{new:true,runValidators:true});if(!o)return res.sendStatus(404);res.json(safeOrder(o));}catch(e){res.status(400).json({error:e.message});}});
app.delete('/api/orders/:id',auth,allow('admin'),async(req,res)=>{const o=await Order.findByIdAndDelete(req.params.id);if(!o)return res.sendStatus(404);res.sendStatus(204);});
app.post('/api/orders/:id/attempts',auth,allow('admin','operator'),async(req,res)=>{try{const o=await Order.findById(req.params.id);if(!o)return res.sendStatus(404);const a={...req.body,by:req.user.name};if(a.delivered<0||a.returned<0||a.paid<0)throw Error('Values cannot be negative.');o.attempts.push(a);if(o.category!=='Regular'){const deliveredTotal=o.attempts.reduce((sum,item)=>sum+item.delivered,0);if(deliveredTotal>o.quantity)o.quantity=deliveredTotal;}if(o.category==='Regular'&&a.delivered>0){const d=new Date(a.date||new Date());d.setHours(0,0,0,0);if(o.frequency==='Alternate Day')d.setDate(d.getDate()+2);else if(o.frequency==='Custom Days'&&o.customDays?.length){for(let i=1;i<=7;i++){const candidate=new Date(d);candidate.setDate(candidate.getDate()+i);if(o.customDays.includes(candidate.getDay())){d.setTime(candidate.getTime());break;}}}else d.setDate(d.getDate()+1);o.nextDueDate=d;}await o.save();res.status(201).json(safeOrder(o));}catch(e){res.status(400).json({error:e.message});}});
app.patch('/api/orders/:id/attempts/:attemptId',auth,allow('admin'),async(req,res)=>{try{const o=await Order.findById(req.params.id);const a=o?.attempts.id(req.params.attemptId);if(!a)return res.sendStatus(404);Object.assign(a,req.body);if(o.category!=='Regular'){const deliveredTotal=o.attempts.reduce((sum,item)=>sum+item.delivered,0);if(deliveredTotal>o.quantity)o.quantity=deliveredTotal;}await o.save();res.json(safeOrder(o));}catch(e){res.status(400).json({error:e.message});}});
app.delete('/api/orders/:id/attempts/:attemptId',auth,allow('admin'),async(req,res)=>{const o=await Order.findById(req.params.id);if(!o)return res.sendStatus(404);o.attempts.id(req.params.attemptId)?.deleteOne();await o.save();res.json(safeOrder(o));});

app.get('/api/customers',auth,async(_,res)=>{const orders=await Order.find().sort({updatedAt:-1});const map=new Map();for(const o of orders){const phone=o.customerPhone;if(!map.has(phone))map.set(phone,{phone,name:o.customerName,location:o.location,types:new Set(),empty:0,balance:0,orders:[],ledger:[]});const c=map.get(phone),s=sums(o);c.types.add(o.category==='Regular'?`Regular - ${o.frequency}`:o.category==='Walk-In'?'Walk-In':'Event');c.empty+=s.pendingEmpty;c.balance+=s.balance;c.orders.push(safeOrder(o));for(const a of o.attempts)c.ledger.push({date:a.date,orderId:o.id,category:o.category,delivered:a.delivered,returned:a.returned,paid:a.paid,mode:a.paymentMode,notes:a.notes,by:a.by});}res.json([...map.values()].map(c=>({...c,types:[...c.types],ledger:c.ledger.sort((a,b)=>new Date(b.date)-new Date(a.date))})));});
app.get('/api/reports',auth,async(_,res)=>{const [orders,expenses]=await Promise.all([Order.find(),Expense.find().sort({date:-1})]);const received=orders.reduce((n,o)=>n+sums(o).paid,0),spent=expenses.reduce((n,e)=>n+e.amount,0);res.json({received,expenses:spent,net:received-spent,expensesList:expenses});});
app.post('/api/expenses',auth,allow('admin'),async(req,res)=>{try{const e=await Expense.create({...req.body,by:req.user.name});res.status(201).json(e);}catch(e){res.status(400).json({error:e.message});}});
app.patch('/api/expenses/:id',auth,allow('admin'),async(req,res)=>{try{const e=await Expense.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!e)return res.sendStatus(404);res.json(e);}catch(e){res.status(400).json({error:e.message});}});
app.delete('/api/expenses/:id',auth,allow('admin'),async(req,res)=>{await Expense.findByIdAndDelete(req.params.id);res.sendStatus(204);});
app.get('/api/staff',auth,allow('admin'),async(_,res)=>res.json(await User.find().select('-passwordHash').sort({name:1})));
app.post('/api/staff',auth,allow('admin'),async(req,res)=>{try{const u=await User.create({name:req.body.name,username:String(req.body.username).toLowerCase(),role:req.body.role,passwordHash:await bcrypt.hash(req.body.password,10)});res.status(201).json({id:u.id,name:u.name,username:u.username,role:u.role});}catch(e){res.status(400).json({error:e.message});}});
app.patch('/api/staff/:id',auth,allow('admin'),async(req,res)=>{try{const d={...req.body};if(d.password){d.passwordHash=await bcrypt.hash(d.password,10);delete d.password;}if(d.username)d.username=d.username.toLowerCase();const u=await User.findByIdAndUpdate(req.params.id,d,{new:true,runValidators:true}).select('-passwordHash');if(!u)return res.sendStatus(404);res.json(u);}catch(e){res.status(400).json({error:e.message});}});
app.delete('/api/staff/:id',auth,allow('admin'),async(req,res)=>{if(req.params.id===req.user.id)return res.status(400).json({error:'You cannot delete your own account.'});await User.findByIdAndDelete(req.params.id);res.sendStatus(204);});

const port=process.env.PORT||4000;
await mongoose.connect(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/Adya',{maxPoolSize:5,minPoolSize:0,serverSelectionTimeoutMS:10000});
if (!process.env.VERCEL) app.listen(port,'0.0.0.0',()=>console.log(`Adya RO Water API listening on ${port}`));

export default app;

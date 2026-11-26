import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
export const API=(process.env.EXPO_PUBLIC_API_URL||'http://localhost:4000/api').replace(/\/$/,'');
export type User={id:string;name:string;username:string;role:'admin'|'operator'|'viewer'};
let token:string|null=null; let current:User|null=null;
export function setSession(t:string|null,u:User|null){token=t;current=u;}
const SESSION_KEY='adya-ro-water-session';
export async function persistSession(t:string,u:User){setSession(t,u);await SecureStore.setItemAsync(SESSION_KEY,JSON.stringify({token:t,user:u}));}
export async function restoreSession():Promise<User|null>{try{const saved=await SecureStore.getItemAsync(SESSION_KEY);if(!saved)return null;const data=JSON.parse(saved);if(!data?.token||!data?.user?.id||!data?.user?.role){await SecureStore.deleteItemAsync(SESSION_KEY);return null;}setSession(data.token,data.user);return data.user as User;}catch{setSession(null,null);await SecureStore.deleteItemAsync(SESSION_KEY).catch(()=>{});return null;}}
export async function clearSession(){setSession(null,null);await SecureStore.deleteItemAsync(SESSION_KEY).catch(()=>{});}
export const session=()=>({token,user:current});
export async function api<T=any>(path:string,opts:RequestInit={}):Promise<T>{const res=await fetch(`${API}${path}`,{...opts,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...(opts.headers||{})}});if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.error||`Request failed (${res.status})`);}if(res.status===204)return undefined as T;return res.json();}
export function useSession(){const [user,setUser]=useState<User|null>(current);useEffect(()=>{const id=setInterval(()=>setUser(current),300);return()=>clearInterval(id)},[]);return user;}
export const money=(n:number)=>`₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
export const dateShort=(v:string)=>new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
export const dateTime=(v:string)=>new Date(v).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});
export function phoneLink(phone:string){const digits=String(phone||'').replace(/\D/g,'').replace(/^91(?=\d{10}$)/,'');return `91${digits}`;}
void Platform;

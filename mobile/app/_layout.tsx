import 'react-native-url-polyfill/auto';
import '../global.css';
import { Stack } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
export default function Layout(){return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}><StatusBar style="dark"/><Stack screenOptions={{headerShown:false}}/></KeyboardAvoidingView>;}

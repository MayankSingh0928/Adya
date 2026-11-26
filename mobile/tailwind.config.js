/** @type {import('tailwindcss').Config} */
module.exports = { content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'], presets: [require('nativewind/preset')], theme: { extend: { colors: { ink: '#132B27', leaf: '#087F65', mint: '#E5F4EF', canvas: '#F4F7F6', amber: '#B86A12' } } }, plugins: [] };

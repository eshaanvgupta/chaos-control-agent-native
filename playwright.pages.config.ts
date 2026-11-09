import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
export default defineConfig({testDir:'tests/pages',timeout:60000,workers:1,use:{baseURL:'http://127.0.0.1:4173/chaos-control-agent-native/',headless:true,launchOptions:existsSync(chrome)?{executablePath:chrome}:{},trace:'retain-on-failure'},reporter:'list'});

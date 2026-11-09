import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
export default defineConfig({testDir:'tests/e2e',timeout:90000,workers:1,use:{baseURL:'http://localhost:8080',headless:true,launchOptions:existsSync(chrome)?{executablePath:chrome}:{},trace:'retain-on-failure'},reporter:[['list'],['json',{outputFile:'test-results/e2e-results.json'}]]});

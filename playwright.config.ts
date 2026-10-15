import {defineConfig,devices} from '@playwright/test';
import {e2eAppOrigin} from './scripts/e2e-target';
export default defineConfig({testDir:'./tests/e2e',globalSetup:'./tests/e2e/global-setup.ts',fullyParallel:false,workers:1,timeout:45000,expect:{timeout:10000},reporter:[['list'],['html',{open:'never'}]],use:{baseURL:e2eAppOrigin,trace:'retain-on-failure'},projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}]});

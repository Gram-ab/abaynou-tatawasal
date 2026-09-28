import {verifyDev07} from '../tests/database/dev07-boundary';
verifyDev07().catch(error=>{console.error(error instanceof Error?error.message:'DEV-07 database verification failed');process.exitCode=1;});

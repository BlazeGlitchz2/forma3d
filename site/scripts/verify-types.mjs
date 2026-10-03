import {spawnSync} from 'node:child_process';
const r=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);console.log('FORMA_TYPES_PASSED');

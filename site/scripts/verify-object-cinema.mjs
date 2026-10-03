import {spawnSync} from 'node:child_process';
const checks=[['types',['scripts/verify-types.mjs']],['lint',['scripts/verify-lint.mjs']],['core',['--experimental-strip-types','--test','tests/core.test.ts']],['production',['scripts/verify-build.mjs']]];
for(const [name,args] of checks){const result=spawnSync(process.execPath,args,{stdio:'inherit'});if(result.status!==0)throw new Error(`${name} verification failed (${result.status}).`)}
console.log('FORMA_OBJECT_CINEMA_CHECKS_PASSED');

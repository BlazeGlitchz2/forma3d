import {spawnSync} from 'node:child_process';
const r=spawnSync(process.execPath,['node_modules/eslint/bin/eslint.js','.','--ignore-pattern','dist','--ignore-pattern','.next'],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);console.log('FORMA_LINT_PASSED');

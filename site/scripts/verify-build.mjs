import {spawnSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
const r=spawnSync(process.execPath,['/Users/hamzaahmad/.codex/plugins/cache/openai-curated-remote/sites/0.1.75/scripts/build-site.mjs'],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);const c=JSON.parse(readFileSync('dist/server/wrangler.json'));if(!existsSync('dist/server/index.js')||!c.d1_databases?.length||!c.r2_buckets?.length)throw new Error('Missing Worker or storage bindings.');console.log('FORMA_BUILD_PASSED');

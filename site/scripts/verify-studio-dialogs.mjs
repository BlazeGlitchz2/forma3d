import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['node_modules/eslint/bin/eslint.js', 'components/forma/AccountModal.tsx', 'components/forma/SupportModal.tsx'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('STUDIO_DIALOGS_LINT_OK');

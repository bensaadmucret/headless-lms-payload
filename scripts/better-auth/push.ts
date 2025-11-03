import { spawn } from 'node:child_process';

const child = spawn('npx', ['@better-auth/cli', 'push'], {
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

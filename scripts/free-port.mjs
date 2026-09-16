import { execSync } from 'node:child_process';

const PORT = 5173;

function freePort() {
  try {
    const output = execSync(`lsof -ti tcp:${PORT} -sTCP:LISTEN`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    if (!output) return;

    const pids = output.split('\n').map((p) => Number(p.trim())).filter(Boolean);
    let killedAny = false;

    for (const pid of pids) {
      if (pid && pid !== process.pid) {
        console.log(`[Vite Port Guard] Found lingering process (PID ${pid}) on port ${PORT}. Releasing port...`);
        try {
          process.kill(pid, 'SIGTERM');
          killedAny = true;
        } catch {
          try {
            process.kill(pid, 'SIGKILL');
            killedAny = true;
          } catch {
            // Already exited
          }
        }
      }
    }

    if (killedAny) {
      // Small pause to allow OS socket cleanup
      const end = Date.now() + 200;
      while (Date.now() < end) {
        // synchronous brief wait
      }
      console.log(`[Vite Port Guard] Port ${PORT} is now ready.`);
    }
  } catch {
    // Normal case: no process is listening on the port
  }
}

freePort();

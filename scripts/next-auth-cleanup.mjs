import { rm } from 'node:fs/promises';

// A local teardown failure must never prevent attempting database cleanup.
export async function cleanupNextAuth({ browser, server, directory, cleanupFixtures }) {
  const failures = [];
  for (const [stage, cleanup] of [
    ['browser', async () => browser?.close()],
    ['server', async () => {
      if (server && server.exitCode === null && server.signalCode === null) {
        const exited = new Promise(resolve => server.once('exit', resolve));
        if (!server.kill('SIGTERM')) throw new Error('Server did not accept termination.');
        await exited;
      }
    }],
    ['app', async () => { if (directory) await rm(directory, { recursive: true, force: true }); }],
    ['fixtures', cleanupFixtures],
  ]) {
    let timeout;
    try {
      if (stage === 'fixtures') await cleanup();
      else await Promise.race([cleanup(), new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Local cleanup timed out.')), 5_000);
      })]);
    } catch { failures.push(stage); }
    finally { clearTimeout(timeout); }
  }
  return failures;
}

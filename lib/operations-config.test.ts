import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('production safety configuration', () => {
  it('serializes deployments and waits for readiness before cleanup', async () => {
    const workflow = await readFile('.github/workflows/deploy.yml', 'utf8');
    expect(workflow).toContain('group: gubugu-production-deploy');
    expect(workflow).toContain('queue: max');
    expect(workflow.indexOf('--wait --wait-timeout')).toBeLessThan(
      workflow.indexOf('docker rmi'),
    );
  });

  it('only expires completed gubugu backup artifacts', async () => {
    const script = await readFile('ops/backup-production.sh', 'utf8');
    expect(script).toContain('umask 077');
    expect(script).toContain('pg_restore -l');
    expect(script).toContain("-name 'postgres-*.dump'");
    expect(script).not.toContain(
      'find "$backup_dir" -type f -mtime +30 -delete',
    );
  });
});

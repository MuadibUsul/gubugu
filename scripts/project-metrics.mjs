import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function filesUnder(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else files.push(path.replaceAll('\\', '/'));
  }

  return files;
}

const [appFiles, sourceFiles, migrations] = await Promise.all([
  filesUnder('app'),
  Promise.all(
    ['app', 'components', 'lib', 'server', 'drizzle'].map(filesUnder),
  ).then((groups) => groups.flat()),
  filesUnder('drizzle/migrations'),
]);

const metrics = {
  routes: appFiles.filter((file) => /\/(page|route)\.tsx?$/.test(file)).length,
  testFiles: sourceFiles.filter((file) => /\.test\.tsx?$/.test(file)).length,
  migrations: migrations.filter((file) => /\/\d{4}_[^/]+\.sql$/.test(file))
    .length,
};

console.log(JSON.stringify(metrics, null, 2));

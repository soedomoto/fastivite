import { build as esbuild } from 'esbuild';
import { readFileSync, rmSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';

let _filename = '';
try {
  _filename = fileURLToPath(import.meta.url);
} catch (err) {
  _filename = __filename;
}

/** @type {import('..').BuildVite} */
const _buildVite = async ({ outDir, entryServer }) => {
  await build({ build: { manifest: true, outDir: `${outDir}/client` } });
  await build({ build: { ssr: entryServer, outDir: `${outDir}/server` } });
};

/** @type {import('..').BuildServer} */
const _buildServer = async ({
  outDir,
  entryServer,
  apiCwd,
  apiFilePattern,
}) => {
  // Build vite app
  await _buildVite({ outDir, entryServer });

  // Scan apis file
  let apiPaths = globSync(apiFilePattern, { cwd: apiCwd });

  let apiFiles = apiPaths.map((apiFile) => join(apiCwd, apiFile));
  await Promise.all(
    apiFiles.map((apiFile, idx) => {
      return esbuild({
        bundle: true,
        minify: false,
        external: ['vite', 'fsevents'],
        format: 'esm',
        platform: 'node',
        entryPoints: [apiFile],
        outfile: `${outDir}/apis/${apiPaths[idx].replace('ts', 'js')}`,
      });
    })
  );

  let apiPaths2 = apiPaths
    .map((path) => {
      let path2 = path
        .split('/')
        .filter(
          (p) =>
            !['api.ts', 'api.js', 'api', 'index.ts', 'index.js'].includes(p)
        )
        .filter((p) => !!p);

      return ['', 'api', ...path2].join('/');
    })
    .reduce(
      (obj, path, idx) => ({
        ...obj,
        [path]: apiPaths[idx].replace('.ts', '').replace('.js', ''),
      }),
      {}
    );

  writeFileSync(`${outDir}/apis.json`, JSON.stringify(apiPaths2));

  // Build fastify server
  let tmpJs = `${outDir}/server.js`;
  writeFileSync(tmpJs, readFileSync(join(dirname(_filename), 'server.js')));
  await esbuild({
    bundle: true,
    minify: true,
    external: ['vite', 'fsevents'],
    format: 'cjs',
    platform: 'node',
    entryPoints: [tmpJs],
    outfile: `${outDir}/server.cjs`,
  });

  rmSync(tmpJs, { recursive: true, force: true });
  rmSync(`${outDir}/apis.json`, { recursive: true, force: true });
  rmSync(`${outDir}/server`, { recursive: true, force: true });
  rmSync(`${outDir}/apis`, { recursive: true, force: true });
};

export const buildServer = _buildServer;
export const buildVite = _buildVite;
export default { buildServer: _buildServer, buildVite: _buildVite };

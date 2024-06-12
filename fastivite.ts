#! /usr/bin/env tsx

import { FastifyInstance } from 'fastify';

(async () => {
  const FastifyCors = await import('@fastify/cors');
  const FastifyMiddie = await import('@fastify/middie');
  const { restartable } = await import('@fastify/restartable');
  const FastifyListRoutes = await import('fastify-print-routes');
  const { readFileSync, writeFileSync, rmSync } = await import(
    'fs'
  );
  const { default: trimStart } = await import('lodash/trimStart.js');
  const { default: trimEnd } = await import('lodash/trimEnd.js');
  const { default: debounce } = await import('lodash/debounce');
  const { dirname, join, relative } = await import('path');
  const { program } = await import('commander');
  const { createServer, build } = await import('vite');
  const { build: esbuild, context } = await import('esbuild');
  const { fork } = await import('child_process');
  const { globSync } = await import('glob');
  const { watch } = await import('chokidar');

  program
    .command('dev')
    .description('dev')
    .option('--host <host>', 'Host', '127.0.0.1')
    .option('--port <port>', 'Port', '6754')
    .option('--base <base>', 'Base', '')
    .option('--index <index>', 'index.html', './index.html')
    .option(
      '--entry-server <entry-server>',
      'entry-server.(j|t)sx',
      './src/entry-server.tsx'
    )
    .option(
      '--config-file <config-file>',
      'vite.config.(j|t)sx',
      './vite.config.ts'
    )
    .option(
      '--api-cwd <api-cwd>',
      'APIs working directory. e.g: src/pages',
      './src/pages'
    )
    .option(
      '--api-file-pattern <api-file-pattern...>',
      'APIs file pattern. e.g: **/api.ts',
      ['**/api.ts', '**/api/index.ts']
    )
    .option('--build-dir <build-dir>', 'Build directory', 'build')
    .action(
      async ({
        host,
        port,
        base,
        index,
        entryServer,
        configFile,
        apiCwd,
        apiFilePattern,
        buildDir,
      }) => {
        // Serve vite dev server
        let vite = await createServer({
          server: { middlewareMode: true },
          appType: 'custom',
          base,
          configFile,
        });

        // Api scanner and watcher
        let apiRoutes = {};
        let address = '';
        let restartServer = debounce(async () => {
          let server = await restartable(async (fastify, opts) => {
            const server = fastify(opts);

            await server.register(FastifyListRoutes, { colors: true });
            await server.register(FastifyMiddie);
            await server.register(FastifyCors, { origin: '*', methods: '*' });
            server.use(vite.middlewares);

            server.get('*', async (req, res) => {
              try {
                const url = trimEnd(trimStart(req.originalUrl, base), '/');

                let template = readFileSync(index, 'utf-8');
                template = await vite.transformIndexHtml(url, template);
                let render = (await vite.ssrLoadModule(entryServer)).render;

                const rendered = await render({ url });

                const html = template
                  .replace(`<!--app-head-->`, rendered.head ?? '')
                  .replace(`<!--app-html-->`, rendered.html ?? '');

                res.code(200).type('text/html').send(html);
              } catch (e) {
                if (e instanceof Error) {
                  vite?.ssrFixStacktrace(e);
                  console.log(e.stack);
                  res.code(500).send(e.stack);
                }
              }
            });

            Object.entries(apiRoutes).forEach(([path, fn]) => {
              server.register(fn, { path })
            })

            // TODO: Handle restart

            return server;
          }, { logger: true });

          if (!address) {
            address = await server.listen({ host: host, port: parseInt(port) });
            console.log('Fastivite dev server is listening at', address);
          }
        }, 200)

        watch(apiFilePattern, { cwd: apiCwd, persistent: true })
          .on('all', async (event, path, stats) => {
            let apiFile = join(apiCwd, path)
            let path2 = path
              .split('/')
              .filter(
                (p) =>
                  !['api.ts', 'api.js', 'api', 'index.ts', 'index.js'].includes(p)
              )
              .filter((p) => !!p);

            path = ['', 'api', ...path2].join('/');
            let fn = await import(join(process.cwd(), apiFile));
            apiRoutes = { ...apiRoutes, [path]: fn?.default };

            if (!address) restartServer()
          })
      }
    );

  program
    .command('build')
    .description('build')
    .option('--out-dir <out-dir>', 'Output directory', 'dist')
    .option(
      '--entry-server <entry-server>',
      'entry-server.(j|t)sx',
      './src/entry-server.tsx'
    )
    .option(
      '--api-cwd <api-cwd>',
      'APIs working directory. e.g: src/pages',
      './src/pages'
    )
    .option(
      '--api-file-pattern <api-file-pattern...>',
      'APIs file pattern. e.g: **/api.ts',
      ['**/api.ts', '**/api/index.ts']
    )
    .action(async ({ outDir, entryServer, apiCwd, apiFilePattern }) => {
      // Build vite app
      await build({ build: { manifest: true, outDir: `${outDir}/client` } });
      await build({ build: { ssr: entryServer, outDir: `${outDir}/server` } });

      // Scan apis file
      let apiPaths = globSync(apiFilePattern, { cwd: apiCwd });

      let apiFiles = apiPaths.map((apiFile) => join(apiCwd, apiFile));
      await Promise.all(apiFiles.map((apiFile, idx) => {
        return esbuild({
          bundle: true,
          minify: false,
          external: ['vite', 'fsevents'],
          format: 'esm',
          platform: 'node',
          entryPoints: [apiFile],
          outfile: `${outDir}/apis/${apiPaths[idx].replace('ts', 'js')}`,
        });

      }))

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
      writeFileSync(
        tmpJs,
        readFileSync(join(dirname(__filename), 'server.js'))
      );
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
    });

  program
    .command('preview')
    .description('preview')
    .option('--cwd <cwd>', 'Working directory', './dist')
    .option('--server-file <server-file>', 'Server file', 'server.cjs')
    .action(async ({ cwd, serverFile }) => {
      fork(serverFile, { cwd });
    });

  program.parse(process.argv);
})();

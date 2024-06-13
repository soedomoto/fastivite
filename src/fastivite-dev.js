import FastifyCors from '@fastify/cors';
import FastifyMiddie from '@fastify/middie';
import { restartable } from '@fastify/restartable';
import { build as esbuild } from 'esbuild';
import FastifyListRoutes from 'fastify-print-routes';
import { readFileSync } from 'fs';
import { globSync } from 'glob';
import _ from 'lodash';
import { join } from 'path';
import { createServer } from 'vite';

const _createDevServer = async ({
  host,
  port,
  base,
  index,
  entryServer,
  configFile,
  apiCwd,
  apiFilePattern,
  middleware = false,
}) => {
  // Serve vite dev server
  let vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base,
    configFile,
  });

  // Api scanner and watcher
  let tmpBuildDir = join(process.cwd(), 'dist', '.apis');
  let server = await restartable(
    async (fastify, opts) => {
      const server = fastify(opts);

      await server.register(FastifyListRoutes, { colors: true });
      await server.register(FastifyMiddie);
      await server.register(FastifyCors, { origin: '*', methods: '*' });
      server.use(vite.middlewares);

      server.get('*', async (req, res) => {
        try {
          const url = _.trimEnd(_.trimStart(req.originalUrl, base), '/');

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

      let apiPaths = globSync(apiFilePattern, { cwd: apiCwd });
      for (let apiPath of apiPaths) {
        let apiFile = join(apiCwd, apiPath);
        let apiJsPath = apiPath.replace('ts', 'js');
        let apiJsFile = join(tmpBuildDir, apiJsPath);
        await esbuild({
          format: 'esm',
          platform: 'node',
          entryPoints: [apiFile],
          outfile: apiJsFile,
        });

        let fn = await import(apiJsFile);
        let path = [
          '',
          'api',
          ...apiPath
            .split('/')
            .filter(
              (p) =>
                !['api.ts', 'api.js', 'api', 'index.ts', 'index.js'].includes(p)
            )
            .filter((p) => !!p),
        ].join('/');
        server.register(fn?.default, { path });
      }

      return server;
    },
    { logger: true }
  );

  if (!middleware) {
    let address = await server.listen({ host: host, port: parseInt(port) });
    console.log('Fastivite dev server is listening at', address);
  }

  return server;
};

export const createDevServer = _createDevServer;
export default { createDevServer: _createDevServer };
// exports.createDevServer = _createDevServer;

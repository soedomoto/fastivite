import FastifyCors from '@fastify/cors';
import FastifyMiddie from '@fastify/middie';
import { restartable } from '@fastify/restartable';
import { watch } from 'chokidar';
import FastifyListRoutes from 'fastify-print-routes';
import { readFileSync } from 'fs';
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
  let restartServer = _.debounce(async () => {
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

        Object.entries(apiRoutes).forEach(([path, fn]) => {
          server.register(fn, { path });
        });

        // TODO: Handle restart

        return server;
      },
      { logger: true }
    );

    if (!address) {
      address = await server.listen({ host: host, port: parseInt(port) });
      console.log('Fastivite dev server is listening at', address);
    }
  }, 200);

  watch(apiFilePattern, { cwd: apiCwd, persistent: true }).on(
    'all',
    async (event, path, stats) => {
      let apiFile = join(apiCwd, path);
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

      if (!address) restartServer();
    }
  );
};

export const createDevServer = _createDevServer;
export default { createDevServer: _createDevServer };
// exports.createDevServer = _createDevServer;

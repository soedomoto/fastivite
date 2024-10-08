import FastifyCors from '@fastify/cors';
import FastifyMiddie from '@fastify/middie';
import { fastify } from 'fastify';
import FastifyListRoutes from 'fastify-print-routes';
import { readFileSync } from 'fs';
import trimEnd from 'lodash/trimEnd.js';
import trimStart from 'lodash/trimStart.js';
import mercurius from 'mercurius';
import { dirname, join } from 'path';
import sirv from 'sirv';
import { fileURLToPath } from 'url';
import { render } from './server/entry-server.js';
// import lodash;
// import prismaClient;
// import contextPaths;
// import loaderPaths;
// import resolverPaths;

const base = process.env.BASE || '';

let _dirname;
try {
  _dirname = dirname(fileURLToPath(import.meta.url));
} catch (err) {
  _dirname = __dirname;
}

export default async function createServer() {
  const server = fastify({
    logger: true,
  });
  await server.register(FastifyListRoutes, {
    colors: true,
  });
  await server.register(FastifyMiddie);
  await server.register(FastifyCors, {
    origin: '*',
    methods: '*',
  });

  server.decorate('prisma', null);

  let resolvers = {};
  let loaders = {};
  let contexts = [];

  await server.register(mercurius, {
    schema: readFileSync(join(_dirname, 'schema.gql'), 'utf-8'),
    resolvers: resolvers,
    loaders: loaders,
    context: async (req, rep) => {
      let context = {};
      for (let c of contexts) {
        let ctx = await c(req, rep);
        context = {
          ...context,
          ...ctx,
        };
      }
      return context;
    },
  });

  server.use(
    base,
    sirv(join(_dirname, 'client'), {
      dev: false,
      etag: true,
      dotfiles: false,
      maxAge: 31536000, // 1Y
      immutable: true,
      gzip: true,
      brotli: true,
      extensions: [],
    })
  );

  server.get('*', async (req, res) => {
    try {
      const url = trimEnd(trimStart(req.originalUrl, base), '/');
      const host = `${req.protocol}://${req.hostname}`;

      let template = readFileSync(join(_dirname, 'client/index.html'), 'utf-8');
      const rendered = await render({
        url, host, req, rep: res
      });
      const html = template
        .replace(`<!--app-head-->`, rendered.head ?? '')
        .replace(`<!--app-html-->`, rendered.html ?? '');
      res.code(200).type('text/html').send(html);
    } catch (e) {
      if (e instanceof Error) {
        console.log(e.stack);
        res.code(500).send(e.stack);
      }
    }
  });

  return server;
}

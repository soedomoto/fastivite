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

const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || '5173';
const base = process.env.BASE || '';

let _dirname;
try {
  _dirname = dirname(fileURLToPath(import.meta.url));
} catch (err) {
  _dirname = __dirname;
}

async function main() {
  const server = fastify({ logger: true });
  await server.register(FastifyListRoutes, { colors: true });
  await server.register(FastifyMiddie);
  await server.register(FastifyCors, { origin: '*', methods: '*' });

  await server.register(mercurius, {
    schema: readFileSync(join(_dirname, 'schema.gql'), 'utf-8'),
    resolvers: {},
  });

  server.use(base, sirv(join(_dirname, 'client'), { extensions: [] }));
  server.get('*', async (req, res) => {
    try {
      const url = trimEnd(trimStart(req.originalUrl, base), '/');
      let template = readFileSync(join(_dirname, 'client/index.html'), 'utf-8');
      const rendered = await render({ url });
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

  const addr = await server.listen({ host: host, port: parseInt(port) });
  console.log('Fastivite server is listening at', addr);
}

void main();

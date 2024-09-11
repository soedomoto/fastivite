import createServer from "./create-server";

const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || '5173';

async function main() {
  const server = await createServer()

  const addr = await server.listen({
    host: host,
    port: parseInt(port),
  });

  console.log('Fastivite server is listening at', addr);
}
void main();

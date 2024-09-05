import createServer from "./create-server";

async function main() {
  const server = await createServer()

  const addr = await server.listen({
    host: host,
    port: parseInt(port),
  });

  console.log('Fastivite server is listening at', addr);
}
void main();

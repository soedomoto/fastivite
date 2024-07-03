import FastifyCors from '@fastify/cors'
import FastifyMiddie from '@fastify/middie'
import { restartable } from '@fastify/restartable'
import { build as esbuild } from 'esbuild'
import { FastifyInstance } from 'fastify'
import FastifyListRoutes from 'fastify-print-routes'
import { readFileSync } from 'fs'
import { globSync } from 'glob'
import _ from 'lodash'
import { join } from 'path'
import { createServer } from 'vite'
import { pathToFileURL } from 'url'

export type CreateViteMiddlewareOptions = {
  base?: string | undefined
  index: string
  entryServer: string
  configFile?: string | undefined
}

export type CreateDevServerParams = CreateViteMiddlewareOptions & {
  host?: string | undefined
  port: number
  apiEnabled?: boolean | undefined
  apiCwd: string
  apiFilePattern: string | string[]
  middleware?: boolean
  registerVite?: boolean
  prismaClientFile?: string | undefined
}

export const createViteMiddleware = async (server: FastifyInstance, options: CreateViteMiddlewareOptions) => {
  // Serve vite dev server
  let vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base: options?.base,
    configFile: options?.configFile
  })

  server.use(vite.middlewares)
  server.get('*', async (req, res) => {
    try {
      const host = `${req.protocol}://${req.hostname}`
      const url = _.trimEnd(_.trimStart(req.originalUrl, options?.base), '/')

      let template = readFileSync(options?.index, 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      let render = (await vite.ssrLoadModule(options?.entryServer)).render

      const rendered = await render({ url, host })

      const html = template.replace(`<!--app-head-->`, rendered.head ?? '').replace(
        `<!--app-html-->`,
        `
          ${rendered.html ?? ''}
          <script type="text/javascript">
            window.VITE_BASE_URL = '${host}';
          </script>
        `
      )

      res.code(200).type('text/html').send(html)
    } catch (e) {
      if (e instanceof Error) {
        vite?.ssrFixStacktrace(e)
        console.log(e.stack)
        res.code(500).send(e.stack)
      }
    }
  })
}

export const createDevServer = async ({
  host,
  port,
  registerVite = true,
  base,
  index,
  entryServer,
  configFile,
  apiEnabled = false,
  apiCwd,
  apiFilePattern,
  middleware = false,
  prismaClientFile
}: CreateDevServerParams) => {
  // Api scanner and watcher
  let tmpBuildDir = join(process.cwd(), 'dist', '.apis')
  if (prismaClientFile) prismaClientFile = join(process.cwd(), prismaClientFile)

  let server = await restartable(
    async (fastify, opts) => {
      const server = fastify(opts)

      await server.register(FastifyListRoutes, { colors: true })
      await server.register(FastifyMiddie)
      await server.register(FastifyCors, { origin: '*', methods: '*' })

      if (!!prismaClientFile) {
        const { default: prismaClient } = await import(pathToFileURL(prismaClientFile).toString())

        server.decorate('prisma', prismaClient)
        server.addHook('onRequest', async req => {
          // @ts-ignore
          req.prisma = server.prisma
        })
      }

      if (registerVite) await server.register(createViteMiddleware, { base, index, entryServer, configFile })

      if (!!apiEnabled) {
        let apiPaths = globSync(apiFilePattern, { cwd: apiCwd })
        for (let apiPath of apiPaths) {
          let apiFile = join(apiCwd, apiPath)
          let apiJsPath = apiPath.replace('ts', 'js')
          let apiJsFile = join(tmpBuildDir, apiJsPath)
          await esbuild({
            format: 'esm',
            platform: 'node',
            entryPoints: [apiFile],
            outfile: apiJsFile
          })

          let fn = await import(pathToFileURL(apiJsFile).toString())
          let path = [
            '',
            'api',
            ...apiPath
              .split('/')
              .filter(p => !['api.ts', 'api.js', 'api', 'index.ts', 'index.js'].includes(p))
              .filter(p => !!p)
          ].join('/')
          server.register(fn?.default, { path })
        }
      }

      return server
    },
    { logger: true }
  )

  if (!middleware) {
    let address = await server.listen({ host: host, port: port })
    console.log('Fastivite dev server is listening at', address)
  }

  return server
}

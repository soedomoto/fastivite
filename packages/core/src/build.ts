import { build as esbuild } from 'esbuild'
import { readFileSync, rmSync, writeFileSync } from 'fs'
import { globSync } from 'glob'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { build } from 'vite'

export type BuildViteParams = {
  outDir: string | undefined
  entryServer: string | undefined
  configFile?: string | undefined
}

export type BuildServerParams = BuildViteParams & {
  apiCwd: string
  apiFilePattern: string | string[],
  prismaClientFile?: string | undefined
}

let _filename = ''
try {
  _filename = fileURLToPath(import.meta.url)
} catch (err) {
  _filename = __filename
}

export const buildVite = async ({ outDir, entryServer, configFile }: BuildViteParams) => {
  await build({ build: { manifest: true, outDir: `${outDir}/client` }, configFile })
  await build({ build: { ssr: entryServer, outDir: `${outDir}/server` }, configFile })
}

export const buildServer = async ({ outDir, entryServer, apiCwd, apiFilePattern, prismaClientFile }: BuildServerParams) => {
  // Build vite app
  await buildVite({ outDir, entryServer })

  // Build prisma client
  if (!!prismaClientFile) {
    await esbuild({
      format: 'esm',
      platform: 'node',
      entryPoints: [prismaClientFile],
      outfile: `${outDir}/prisma-client.js`
    })
  }

  // Scan apis file
  let apiPaths = globSync(apiFilePattern, { cwd: apiCwd })

  let apiFiles = apiPaths.map(apiFile => join(apiCwd, apiFile))
  await Promise.all(
    apiFiles.map((apiFile, idx) => {
      return esbuild({
        bundle: true,
        minify: false,
        external: ['vite', 'fsevents'],
        format: 'esm',
        platform: 'node',
        entryPoints: [apiFile],
        outfile: `${outDir}/apis/${apiPaths[idx].replace('ts', 'js')}`
      })
    })
  )

  let apiPaths2 = apiPaths
    .map(path => {
      let path2 = path
        .split('/')
        .filter(p => !['api.ts', 'api.js', 'api', 'index.ts', 'index.js'].includes(p))
        .filter(p => !!p)

      return ['', 'api', ...path2].join('/')
    })
    .reduce(
      (obj, path, idx) => ({
        ...obj,
        [path]: apiPaths[idx].replace('.ts', '').replace('.js', '')
      }),
      {}
    )

  writeFileSync(`${outDir}/apis.json`, JSON.stringify(apiPaths2))

  // Build fastify server
  let tmpJs = `${outDir}/server.js`
  writeFileSync(tmpJs, readFileSync(join(dirname(_filename), 'server.js')))
  await esbuild({
    bundle: true,
    minify: true,
    external: ['vite', 'fsevents'],
    format: 'cjs',
    platform: 'node',
    entryPoints: [tmpJs],
    outfile: `${outDir}/server.cjs`
  })

  rmSync(tmpJs, { recursive: true, force: true })
  rmSync(`${outDir}/apis.json`, { recursive: true, force: true })
  rmSync(`${outDir}/server`, { recursive: true, force: true })
  rmSync(`${outDir}/apis`, { recursive: true, force: true })
}

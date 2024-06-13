export type CreateApiPluginCallback = (fastify: import('fastify').FastifyInstance, path: string) => void
export function createApiPlugin(callback: CreateApiPluginCallback): void

export type CreateDevServerParams = {
    host?: string | undefined
    port?: string | undefined
    base?: string | undefined
    index?: string | undefined
    entryServer?: string | undefined
    configFile?: string | undefined
    apiEnabled?: boolean | undefined
    apiCwd?: string | undefined
    apiFilePattern?: string[] | undefined
    middleware?: boolean
}
export function createDevServer(params: CreateDevServerParams): Promise<import('fastify').FastifyInstance>

export type CreateDevServer = typeof createDevServer;

export type BuildViteParams = {
    outDir: string | undefined
    entryServer: string | undefined
}

export function buildVite(params: BuildViteParams): Promise<void>

export type BuildVite = typeof buildVite;

export type BuildServerParams = BuildViteParams & {
    apiCwd: string | undefined
    apiFilePattern: string[] | undefined
}

export function buildServer(params: BuildServerParams): Promise<void>

export type BuildServer = typeof buildServer;

export type PreviewServerParams = {
    cwd: string | undefined
    serverFile: string | undefined
}
export function previewServer(params: PreviewServerParams): Promise<void>

export type PreviewServer = typeof previewServer;
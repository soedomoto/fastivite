export type CreateApiPluginCallback = (fastify: import('fastify').FastifyInstance, path: string) => void
export function createApiPlugin(callback: CreateApiPluginCallback): void
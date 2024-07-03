import { FastifyInstance, FastifyPluginAsync, FastifyPluginOptions } from 'fastify'

export type FastivitePluginAsync = FastifyPluginAsync
export type FastivitePluginOptions = FastifyPluginOptions

export const registerPlugin = async (
  server: FastifyInstance,
  plugin: FastivitePluginAsync,
  options: FastivitePluginOptions
) => {
  await plugin(server, options)
}

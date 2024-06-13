import { FastifyInstance } from 'fastify'

type CreateApiPluginCallback = (fastify: FastifyInstance, path: string) => void

export const createApiPlugin = (callback: CreateApiPluginCallback) => {
  return function Plugin(fastify: FastifyInstance, { path }: { path: string }, done: () => void) {
    callback(fastify, path);
    done();
  };
};

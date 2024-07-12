import { FastifyReply, FastifyRequest } from 'fastify'

export type FastiviteRenderProps = {
  url?: string
  host?: string
  ssrManifest?: string
  req?: FastifyRequest
  rep?: FastifyReply
}

export type FastiviteRenderReturn = {
  head?: string
  html?: string
}

export type FastiviteRender = (props: FastiviteRenderProps) => FastiviteRenderReturn
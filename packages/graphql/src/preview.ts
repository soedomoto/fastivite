import { PreviewServerParams, previewServer } from '@fastivite/core';

export type PreviewGraphqlServerParams = PreviewServerParams;

export const previewGraphqlServer = (params: PreviewGraphqlServerParams) => {
  previewServer(params);
};

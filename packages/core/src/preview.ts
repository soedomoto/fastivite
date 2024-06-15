import { fork } from 'child_process';

export type PreviewServerParams = {
  cwd: string | undefined
  serverFile: string
}

export const previewServer = async ({ cwd, serverFile }: PreviewServerParams) => {
  fork(serverFile, { cwd });
};

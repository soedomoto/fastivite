import { fork } from 'child_process';

const _previewServer = async ({ cwd, serverFile }) => {
  fork(serverFile, { cwd });
};

export const previewServer = _previewServer;
export default { previewServer: _previewServer };
// exports.previewServer = _previewServer;

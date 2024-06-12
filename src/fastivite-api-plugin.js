const _createApiPlugin = (callback) => {
  return function Plugin(a, { path }, done) {
    callback(a, path);
    done();
  };
};

export const createApiPlugin = _createApiPlugin;
export default { createApiPlugin: _createApiPlugin };
// exports.createApiPlugin = _createApiPlugin;

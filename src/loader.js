/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
var loaderUtils = require('loader-utils');

var SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');

var WebWorkerTemplatePlugin = require('webpack/lib/webworker/WebWorkerTemplatePlugin');

var FetchCompileWasmTemplatePlugin = require('webpack/lib/web/FetchCompileWasmTemplatePlugin');

var CSS_WORKLET_PLUGIN_SYMBOL_KEY = require('./symbol');

var CSS_WORKLET_PLUGIN_SYMBOL = Symbol.for(CSS_WORKLET_PLUGIN_SYMBOL_KEY);
var NAME = 'CssWorkletPluginLoader';
var hasWarned = false;

function pitch(request) {
  this.cacheable(false);
  var cb = this.async();
  var compilerOptions = this._compiler.options || {};
  var pluginOptions = compilerOptions.plugins.find(function (p) { return p[CSS_WORKLET_PLUGIN_SYMBOL]; }).options;

  if (pluginOptions.globalObject == null && !hasWarned && compilerOptions.output && compilerOptions.output.globalObject === 'window') {
    hasWarned = true;
    console.warn('Warning (css-worklet-plugin): output.globalObject is set to "window". It must be set to "self" to support HMR in Worklets.');
  }

  var options = loaderUtils.getOptions(this) || {};
  var chunkFilename = compilerOptions.output.chunkFilename.replace(/\.([a-z]+)$/i, '.worklet.$1');
  var workletOptions = {
    filename: chunkFilename.replace(/\[(?:chunkhash|contenthash)(:\d+(?::\d+)?)?\]/g, '[hash$1]'),
    chunkFilename: chunkFilename,
    globalObject: pluginOptions.globalObject || 'self'
  };
  var plugins = (pluginOptions.plugins || []).map(function (plugin) {
    if (typeof plugin !== 'string') {
      return plugin;
    }

    var found = compilerOptions.plugins.find(function (p) { return p.constructor.name === plugin; });

    if (!found) {
      console.warn(("Warning (css-worklet-plugin): Plugin \"" + plugin + "\" is not found."));
    }

    return found;
  });

  var workletCompiler = this._compilation.createChildCompiler(NAME, workletOptions, plugins);

  workletCompiler.context = this._compiler.context;
  new WebWorkerTemplatePlugin(workletOptions).apply(workletCompiler);
  new FetchCompileWasmTemplatePlugin({
    mangleImports: compilerOptions.optimization.mangleWasmImports
  }).apply(workletCompiler);
  new SingleEntryPlugin(this.context, request, options.name).apply(workletCompiler);
  var subCache = "subcache " + __dirname + " " + request;
  workletCompiler.hooks.compilation.tap(NAME, function (compilation) {
    if (compilation.cache) {
      if (!compilation.cache[subCache]) { compilation.cache[subCache] = {}; }
      compilation.cache = compilation.cache[subCache];
    }
  });
  workletCompiler.runAsChild(function (err, entries, compilation) {
    if (!err && compilation.errors && compilation.errors.length) {
      err = compilation.errors[0];
    }

    var entry = entries && entries[0] && entries[0].files[0];
    if (!err && !entry) { err = Error(("CssWorkletPlugin: no entry for " + request)); }
    if (err) { return cb(err); }
    return cb(null, ("module.exports = __webpack_public_path__ + " + (JSON.stringify(entry))));
  });
}
module.exports = pitch;
//# sourceMappingURL=loader.js.map

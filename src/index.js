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
var path = require('path');

var ParserHelpers = require('webpack/lib/ParserHelpers');

var CSS_WORKLET_PLUGIN_SYMBOL_KEY = require('./symbol');

var NAME = 'CssWorkletPlugin';
var JS_TYPES = ['auto', 'esm', 'dynamic'];
var WORKLET_TYPES = ['paintWorklet', 'animationWorklet', 'layoutWorklet'];
var workerLoader = path.resolve(__dirname, 'loader.js');
var CSS_WORKLET_PLUGIN_SYMBOL = Symbol.for(CSS_WORKLET_PLUGIN_SYMBOL_KEY);

var handleWorklet = function (parser, workletId) { return function (expr) {
  if (expr.callee.property.name !== 'addModule') { return false; }
  var dep = parser.evaluateExpression(expr.arguments[0]);

  if (!dep.isString()) {
    parser.state.module.warnings.push({
      message: 'addModule() worklet will only be bundled if passed a String.'
    });
    return false;
  }

  var loaderOptions = {
    name: workletId + ''
  };
  var req = "require(" + (JSON.stringify(workerLoader + '?' + JSON.stringify(loaderOptions) + '!' + dep.string)) + ")";
  var id = "__webpack__worker__" + (workletId++);
  ParserHelpers.toConstantDependency(parser, id)(expr.arguments[0]);
  return ParserHelpers.addParsedVariableToModule(parser, id, req);
}; };

var CssWorkletPlugin = function CssWorkletPlugin(options) {
  this.options = options || {};
  this[CSS_WORKLET_PLUGIN_SYMBOL] = true;
};

CssWorkletPlugin.prototype.apply = function apply (compiler) {
  compiler.hooks.normalModuleFactory.tap(NAME, function (factory) {
    var workletId = 0;

    for (var i = 0, list = JS_TYPES; i < list.length; i += 1) {
      var type = list[i];

        factory.hooks.parser.for(("javascript/" + type)).tap(NAME, function (parser) {
        for (var i = 0, list = WORKLET_TYPES; i < list.length; i += 1) {
          var worklet = list[i];

            parser.hooks.callAnyMember.for(("CSS." + worklet)).tap(NAME, handleWorklet(parser, workletId));
        }
      });
    }
  });
};

module.exports = CssWorkletPlugin;
//# sourceMappingURL=index.js.map

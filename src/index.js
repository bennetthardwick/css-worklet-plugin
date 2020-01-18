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

const path = require('path');
const ParserHelpers = require('webpack/lib/ParserHelpers');
const CSS_WORKLET_PLUGIN_SYMBOL_KEY = require('./symbol');

const NAME = 'CssWorkletPlugin';
const JS_TYPES = ['auto', 'esm', 'dynamic'];
const WORKLET_TYPES = ['paintWorklet', 'animationWorklet', 'layoutWorklet'];
const workerLoader = path.resolve(__dirname, 'loader.js');

const CSS_WORKLET_PLUGIN_SYMBOL = Symbol.for(CSS_WORKLET_PLUGIN_SYMBOL_KEY);

const handleWorklet = (parser, workletId) => expr => {
  if (expr.callee.property.name !== 'addModule') return false;

  const dep = parser.evaluateExpression(expr.arguments[0]);
  if (!dep.isString()) {
    parser.state.module.warnings.push({
      message: 'addModule() worklet will only be bundled if passed a String.'
    });
    return false;
  }

  const loaderOptions = { name: workletId + '' };
  const req = `require(${JSON.stringify(workerLoader + '?' + JSON.stringify(loaderOptions) + '!' + dep.string)})`;
  const id = `__webpack__worker__${workletId++}`;
  ParserHelpers.toConstantDependency(parser, id)(expr.arguments[0]);

  return ParserHelpers.addParsedVariableToModule(parser, id, req);
};

class CssWorkletPlugin {
  constructor (options) {
    this.options = options || {};
    this[CSS_WORKLET_PLUGIN_SYMBOL] = true;
  }

  apply (compiler) {
    compiler.hooks.normalModuleFactory.tap(NAME, factory => {
      let workletId = 0;
      for (const type of JS_TYPES) {
        factory.hooks.parser.for(`javascript/${type}`).tap(NAME, parser => {
          for (const worklet of WORKLET_TYPES) {
            parser.hooks.callAnyMember.for(`CSS.${worklet}`).tap(NAME, handleWorklet(parser, workletId));
          }
        });
      }
    });
  }
}

module.exports = CssWorkletPlugin;

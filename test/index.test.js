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

import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import CssWorkletPlugin from '../src';
import { runWebpack, CountApplyWebpackPlugin, watchWebpack, statsWithAssets, sleep } from './_util';

jest.setTimeout(30000);

describe('css-worklet-plugin', () => {
  test('exports a class', () => {
    expect(CssWorkletPlugin).toBeInstanceOf(Function);
    const inst = new CssWorkletPlugin();
    expect(inst).toBeInstanceOf(CssWorkletPlugin);
    expect(inst).toHaveProperty('apply', expect.any(Function));
  });

  test('it replaces addModule() arg with require(css-worklet-loader)', async () => {
    const stats = await runWebpack('basic', {
      plugins: [
        new CssWorkletPlugin()
      ]
    });

    const assetNames = Object.keys(stats.assets);
    expect(assetNames).toHaveLength(2);
    expect(assetNames).toContainEqual('0.worklet.js');

    const main = stats.assets['main.js'];
    expect(main).toMatch(/[^\n]*CSS.paintWorklet.addModule\([^)]*\)[^\n]*/g);
    expect(main).toMatch(/module.exports = __webpack_require__\.p\s*\+\s*"0\.worklet\.js"/g);
  });

  test('it replaces multiple Worker exports with __webpack_require__', async () => {
    const stats = await runWebpack('multiple', {
      plugins: [
        new CssWorkletPlugin()
      ]
    });

    const assetNames = Object.keys(stats.assets);
    expect(assetNames).toHaveLength(3);
    expect(assetNames).toContainEqual('0.worklet.js');
    expect(assetNames).toContainEqual('1.worklet.js');

    const main = stats.assets['main.js'];
    expect(main).toMatch(/module.exports = __webpack_require__\.p\s*\+\s*"0\.worklet\.js"/g);
    expect(main).toMatch(/module.exports = __webpack_require__\.p\s*\+\s*"1\.worklet\.js"/g);
  });

  test('it does not enable other plugins when building worklet script', async () => {
    const countPlugin = new CountApplyWebpackPlugin();
    await runWebpack('basic', {
      plugins: [
        countPlugin,
        new CssWorkletPlugin()
      ]
    });
    expect(countPlugin.count).toStrictEqual(1);
  });

  test('plugins: instance enables plugins when building worklet script', async () => {
    const countPlugin = new CountApplyWebpackPlugin();
    await runWebpack('basic', {
      plugins: [
        new CssWorkletPlugin({
          plugins: [countPlugin]
        })
      ]
    });
    expect(countPlugin.count).toStrictEqual(1);
  });

  test('plugins: string passes plugins from main config', async () => {
    const countPlugin = new CountApplyWebpackPlugin();
    await runWebpack('basic', {
      plugins: [
        countPlugin,
        new CssWorkletPlugin({
          plugins: ['CountApplyWebpackPlugin']
        })
      ]
    });
    expect(countPlugin.count).toStrictEqual(2);
  });

  // https://github.com/gskachkov/houdini-css-wasm
  xtest('it bundles WASM file which imported dynamically', async () => {
    const stats = await runWebpack('wasm', {
      plugins: [
        new CssWorkletPlugin()
      ]
    });

    const assetNames = Object.keys(stats.assets);
    expect(assetNames).toHaveLength(4);
    expect(assetNames).toContainEqual(expect.stringMatching(/^[a-zA-Z0-9]+\.module\.wasm$/));
    expect(stats.assets['wasm.worklet.js']).toMatch(/WebAssembly\.instantiate/);
  });

  test('it skips Worker constructor with non-string 1st argument', async () => {
    const stats = await runWebpack('skip-blobs', {
      plugins: [
        new CssWorkletPlugin()
      ]
    });

    const assetNames = Object.keys(stats.assets);
    expect(assetNames).toHaveLength(1);

    expect(stats.assets['main.js']).not.toMatch(/CSS\s*.paintWorklet\s*\(\s*__webpack__worklet__/g);

    expect(stats.assets['main.js']).toMatch(/CSS\s*.paintWorklet\s*\(\s*new\s+Blob\s*\(\s*\[\s*""\s*\]\s*\)\s*\)/g);
  });

  describe('watch mode', () => {
    const workletFile = resolve(__dirname, 'fixtures', 'watch', 'worklet.js');
    const workletCode = readFileSync(workletFile, 'utf-8');
    afterAll(() => {
      writeFileSync(workletFile, workletCode);
    });

    test('it produces consistent modules in watch mode', async () => {
      const compiler = watchWebpack('watch', {
        plugins: [
          new CssWorkletPlugin()
        ]
      });

      function Deferred () {
        let controller;
        const p = new Promise((resolve, reject) => {
          controller = { resolve, reject };
        });
        Object.assign(p, controller);
        return p;
      }

      let stats;
      let ready = new Deferred();

      const watcher = compiler.watch({
        aggregateTimeout: 1,
        poll: 50,
        ignored: /node_modules|dist/
      }, (err, stats) => {
        if (err) ready.reject(err);
        else ready.resolve(statsWithAssets(stats));
      });

      try {
        for (let i = 1; i < 5; i++) {
          ready = new Deferred();
          writeFileSync(workletFile, workletCode.replace(/console\.log\('hello from worker( \d+)?'\)/, `console.log('hello from worker ${i}')`));
          await sleep(1000);
          stats = await ready;
          await sleep(1000);
          expect(Object.keys(stats.assets).sort()).toEqual(['0.worklet.js', 'main.js']);
          expect(stats.assets['0.worklet.js']).toContain(`hello from worker ${i}`);
        }
      } finally {
        watcher.close();
      }

      await sleep(1000);
    });
  });
});

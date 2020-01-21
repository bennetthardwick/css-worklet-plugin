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

import CSSWorkletPlugin from '../src';
import path from 'path';
import { createStaticServer } from './_server';
import { runWebpack } from './_util';
import { evaluatePage } from './_page';

jest.setTimeout(30000);

// TODO puppeteer chromium instance does not have paintworklet on CSS object
xdescribe('Integration', () => {
  test('The resulting Worklet is instantiated correctly', async () => {
    const fixture = 'basic';

    await runWebpack(fixture, {
      plugins: [new CSSWorkletPlugin()]
    });

    const server = await createStaticServer(path.resolve(__dirname, 'fixtures', fixture));

    const consoleText = await evaluatePage(server.url, /hello from worklet/g);

    expect(consoleText).toMatch(/hello from worklet/g);

    await server.stop();
  });
});

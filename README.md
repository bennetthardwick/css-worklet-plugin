# Automatically bundle & compile CSS Worklets within Webpack.</p>


### Features

Automatically compiles modules loaded in Web Workers:

```js
CSS.paintWorklet.addModule('./foo.js');
                           ^^^^^^^^^^
                           gets bundled using webpack
```

The best part? That worklet constructor works just fine without bundling turned on too.

## Installation

```sh
npm install -D css-worklet-plugin
```

Then drop it into your **webpack.config.js:**

```diff
+ const CssWorkletPlugin = require('css-worklet-plugin');

module.exports = {
  <...>
  plugins: [
+    new CssWorkletPlugin()
  ]
  <...>
}
```

## Usage

**worklet.js**: _(our worklet module)_

```js
class PaintStuff {
 ...
}

registerPaint('paint-stuff', PaintStuff);
```

**main.js**: _(our demo, on the main thread)_

```js
CSS.paintWorklet.addModule('./worklet.js')
```

main.css:
```css
.foo {
  background-image: paint(paint-stuff);
}
```

## Options

In most cases, no options are necessary to use WorkerPlugin.

### `globalObject`

WorkerPlugin will warn you if your Webpack configuration has `output.globalObject` set to `window`, since doing so breaks Hot Module Replacement in web workers.

If you're not using HMR and want to disable this warning, pass `globalObject:false`:

```js
new WorkerPlugin({
  // disable warnings about "window" breaking HMR:
  globalObject: false
})
```

To configure the value of `output.globalObject` for WorkerPlugin's internal Webpack Compiler, set `globalObject` to any String:

```js
new WorkerPlugin({
  // use "self" as the global object when receiving hot updates.
  globalObject: 'self' // <-- this is the default value
})
```

### `plugins`

By default, `WorkerPlugin` doesn't run any of your configured Webpack plugins when bundling worker code - this avoids running things like `html-webpack-plugin` twice. For cases where it's necessary to apply a plugin to Worker code, use the `plugins` option.

Here you can specify the names of plugins to "copy" from your existing Webpack configuration, or provide specific plugins to apply only to worker code:

```js
module.exports = {
  <...>
  plugins: [
    // an example of a plugin already being used:
    new SomeExistingPlugin({ <...> }),

    new WorkerPlugin({
      plugins: [
        // A string here will copy the named plugin from your configuration:
        'SomeExistingPlugin',
        
        // Or you can specify a plugin directly, only applied to Worker code:
        new SomePluginToApplyOnlyToWorkers({ <...> })
      ]
    })
  ]
  <...>
}
```

## License

Apache-2.0

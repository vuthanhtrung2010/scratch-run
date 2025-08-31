import webpack from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const noop_module_path = path.resolve(__dirname, 'src', 'build', 'noop-module');

export default {
  mode: 'production',
  devtool: false,
  target: 'node',
  output: {
    filename: 'index.cjs',
    path: path.resolve(__dirname, 'dist')
  },
  entry: './src/index.ts',
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      // Replace with fastestsmallesttextencoderdecoder
      'text-encoding$': path.resolve(
        __dirname,
        'src',
        'build',
        'text-encoding'
      ),

      // Force webpack to rebuild scratch-sb1-converter
      'scratch-sb1-converter$': path.resolve(
        __dirname,
        'node_modules',
        'scratch-sb1-converter',
        'index.js'
      ),

      // Remove dead modules
      htmlparser2$: noop_module_path,
      'canvas-toBlob$': noop_module_path,
      './extension-support/tw-default-extension-urls$': noop_module_path,
      '../util/scratch-link-websocket$': noop_module_path
    }
  },
  plugins: [
    // Remove extensions
    new webpack.NormalModuleReplacementPlugin(
      /\/extension-manager$/,
      path.resolve(__dirname, 'src', 'build', 'scratch-vm', 'extension-support', 'extension-manager.ts')
    ),

    // Remove log
    new webpack.NormalModuleReplacementPlugin(
      /\/log$/,
      path.resolve(__dirname, 'src', 'build', 'scratch-vm', 'util', 'log.ts')
    ),

    // Remove I/O modules
    new webpack.NormalModuleReplacementPlugin(/^\.\.\/io\//, (resource) => {
      const basename = path.basename(resource.request);
      resource.request = path.resolve(__dirname, 'src', 'build', 'scratch-vm', 'io', basename + '.ts');
    }),

    // Remove load-costume and load-sound
    new webpack.NormalModuleReplacementPlugin(
      /\.\/import\/load-(costume|sound)/,
      (resource) => {
        const match = resource.request.match(/\.\/import\/load-(costume|sound)/);
        if (match) {
          resource.request =
            path.resolve(__dirname, 'src', 'build', 'scratch-vm', 'import', 'load-' + match[1]! + '.ts');
        }
      }
    ),

    // Remove deserialize-assets, serialize-assets, and tw-costume-import-export
    new webpack.NormalModuleReplacementPlugin(
      /\.\/(?:serialization\/)?(deserialize-assets|serialize-assets|tw-costume-import-export)/,
      (resource) => {
        const match = resource.request.match(
          /(deserialize-assets|serialize-assets|tw-costume-import-export)/
        );
        if (match) {
          resource.request =
            path.resolve(__dirname, 'src', 'build', 'scratch-vm', 'serialization', match[1]! + '.ts');
        }
      }
    ),

    // Remove FontManager
    new webpack.NormalModuleReplacementPlugin(
      /\.\/tw-font-manager$/,
      path.resolve(__dirname, 'src', 'build', 'scratch-vm', 'engine', 'tw-font-manager.ts')
    ),

    // Remove extension urls
    new webpack.NormalModuleReplacementPlugin(
      /\.\/extension-support\/tw-default-extension-urls$/,
      path.resolve(__dirname, 'src', 'build', 'noop-module')
    ),

    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false
    })
  ],
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        loader: 'esbuild-loader',
        options: {
          target: 'esnext',
          loader: 'tsx'
        }
      }
    ]
  }
};

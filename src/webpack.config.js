/* eslint-env node */

const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = (env, argv) => {
  const config = {
    mode: 'production',
    entry: {
      asap: './js/asap.js',
      chat: {
        import: './js/chat.js',
        dependOn: 'asap'
      },
      comments: {
        import: './js/comments.js',
        dependOn: 'asap'
      },
      files: {
        import: './js/files.js',
        dependOn: 'asap'
      },
      messenger: {
        import: './js/messenger.js',
        dependOn: 'asap'
      },
      notifications: {
        import: './js/notifications.js',
        dependOn: 'asap'
      },
      posts: {
        import: './js/posts.js',
        dependOn: 'asap'
      },
      preview: {
        import: './js/preview.js',
        dependOn: 'asap'
      },
      "preview.worker": {
        import: 'pdfjs-dist/build/pdf.worker.min',
        filename: "preview.worker.js"
      },
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'wwwroot/js')
    },
    plugins: [
      new ESLintPlugin(),
      new webpack.DefinePlugin({
        WEAVY_DEVELOPMENT: JSON.stringify(argv.mode === "development" ? true : false),
        WEAVY_PRODUCTION: JSON.stringify(argv.mode === "production" ? true : false),
      })
    ],
    module: {
      noParse: /pdfjs-dist[\\/]build[\\/]pdf\.worker/,
      rules: [
        {
          test: /\.js$/,
          include: [
            path.resolve(__dirname, "js/")
          ],
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
          }
        }        
      ]
    },
    devtool: false,
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
            },
          },
          extractComments: false
        })
      ],
    },
    resolve: {
      alias: {
        '@microsoft/signalr$': '@microsoft/signalr/dist/browser/signalr.min.js',
        'highlight.js$': path.resolve(__dirname, "js/lib/highlight/md.js")
      },
    },
    externals: {
      // exclude signalR node imports
      "eventsource": "var null",
      "tough-cookie": "var null",
      "fetch-cookie": "var null"
    }
  };

  const devConfig = Object.assign({}, config, {
    mode: 'development',
    devtool: 'source-map'
  });

  return argv.mode === 'development' ? devConfig: config;
}

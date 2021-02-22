const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
// Is the current build a development build
const IS_DEV = (process.env.NODE_ENV === 'dev');

const dirNode = 'node_modules';
const dirApp = path.join(__dirname, '../src');
const dirAssets = path.join(__dirname, '../src/assets');


/**
 * Webpack Configuration
 */
module.exports = {
    entry: [
      require.resolve('./polyfills'),
      path.join(dirApp, 'index')
    ],
    resolve: {
      modules: [
        dirNode,
        dirApp,
        dirAssets
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: "index.[contenthash:4].css",
        chunkFilename: "index.[contenthash:4].css"
      }),

      new webpack.DefinePlugin({
        IS_DEV: IS_DEV
      })
    ],
    module: {
      rules: [
        // BABEL
        {
          test: /\.js$/,
          exclude: /(node_modules)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env'
              ],
              plugins: [
                [
                  '@babel/plugin-transform-runtime'
                ],
                [
                  '@babel/plugin-transform-modules-commonjs'
                ]
              ]
            }
          }
        },

        // STYLES
        {
          test: /\.css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader
            },
            {
              loader: 'css-loader',
              options: {
                sourceMap: IS_DEV
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: [require('autoprefixer')],
              },
            }
          ]
        },

        // CSS / SASS
        {
          test: /\.scss/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader
            },
            {
              loader: 'css-loader',
              options: {
                sourceMap: IS_DEV
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: [require('autoprefixer')],
              },
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: IS_DEV,
                includePaths: [dirAssets]
              }
            }
          ]
        },

        // IMAGES
        {
          test: /\.(jpe?g|png|gif)$/,
          loader: 'file-loader',
          options: {
            name: 'images/[name].[hash:4].[ext]',
            publicPath: 'images',
            outputPath: 'images/',
            esModule: false
          }
        },

        {
          test: /\.(html)$/,
          loader: 'html-loader',
          options: {
            minimize: false,
            attributes: {
              list: [
                {
                  tag: 'img',
                  attribute: 'src',
                  type: 'src'
                }
              ]
            }
          }
        }
      ]
    }
};

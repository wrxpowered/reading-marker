const path = require('path');
const merge = require('webpack-merge');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const webpackConfig = require('./webpack.config');
const packageinfo = require('../package.json');

module.exports = merge(webpackConfig, {

    // devtool: 'source-map',
    devtool: false,

    output: {
      publicPath: '',
      path: path.join(__dirname, '../build'),
      filename: '[name].[chunkhash].js'
    },

    plugins: [
      new CleanWebpackPlugin(),

      new FileManagerPlugin({
        onEnd: {
          copy: [
            {
              source: path.join(__dirname, '../build/**'),
              destination: path.join(__dirname, `../temp/reading-marker-build-v${packageinfo.version}/`)
            }
          ],
          archive: [
            {
              source: path.join(__dirname, `../temp/`),
              destination: path.join(__dirname, `../reading-marker-build-v${packageinfo.version}.zip`),
            }
          ],
          delete: [
            path.join(__dirname, '../temp/')
          ]
        }
      })

    ]

});

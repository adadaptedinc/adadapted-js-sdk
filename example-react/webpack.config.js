const path = require("path");
const autoprefixer = require("autoprefixer");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const WebpackBundleAnalyzer = require("webpack-bundle-analyzer");

/**
 * Various file path constants.
 * All values are absolute paths.
 */
const PATHS = {
    /**
     * Build output folder.
     */
    dist: path.resolve(__dirname, "./dist"),
    /**
     * "node_modules" folder.
     */
    nodeModules: path.resolve(__dirname, "./node_modules"),
    /**
     * Folder containing public static assets that should be copied directly to the
     * {@link #dist}/public folder
     */
    publicStatic: path.resolve(__dirname, "./public"),
    /**
     * Project root.
     */
    root: path.resolve(__dirname, "./"),
    /**
     * Project source folder.
     */
    src: path.resolve(__dirname, "./src"),
};

/**
 * Config for webpack-dev-server.
 * https://webpack.js.org/configuration/dev-server/
 */
const DEV_SERVER = {
    compress: true,
    disableHostCheck: true,
    open: true,
    openPage: "dev/index.html",
    overlay: true,
    port: 8000,
    publicPath: "http://localhost:8000/dev/",
};

module.exports = (env) => {
    const isDev = env.prod !== "true";
    const isSourceMap = env.sourceMap === "true";

    return {
        context: PATHS.root,
        devServer: DEV_SERVER,
        devtool: isSourceMap
            ? isDev
                ? "eval-source-map"
                : "source-map"
            : false,
        entry: [`${PATHS.src}/index.tsx`],
        mode: isDev ? "development" : "production",
        module: {
            rules: [
                // CSS/SCSS/SASS
                {
                    test: /\.(sa|sc|c)ss$/,
                    use: [
                        {
                            loader: isDev
                                ? "style-loader"
                                : MiniCssExtractPlugin.loader,
                        },
                        {
                            loader: "css-loader",
                            options: {
                                importLoaders: 2,
                                sourceMap: isSourceMap,
                            },
                        },
                        {
                            loader: "postcss-loader",
                            options: {
                                ident: "postcss",
                                plugins: [autoprefixer()],
                                sourceMap: isSourceMap,
                            },
                        },
                        {
                            loader: "sass-loader",
                            options: {
                                sourceMap: isSourceMap,
                            },
                        },
                    ],
                },
                // image/font files included by CSS
                {
                    test: /\.(woff|woff2|eot|ttf|svg|png|jpg|gif)$/,
                    use: [
                        {
                            loader: "url-loader",
                            options: {
                                limit: 1024,
                            },
                        },
                    ],
                },
                // typescript/javascript
                {
                    exclude: [PATHS.nodeModules],
                    include: [PATHS.src],
                    test: /\.(ts|js)(x?)$/,
                    use: [
                        {
                            loader: "babel-loader",
                            options: {
                                presets: [
                                    "@babel/env",
                                    "@babel/preset-react",
                                    "@babel/preset-typescript",
                                ],
                            },
                        },
                        ...(isDev
                            ? [
                                  // cache-loader/thread-loader combo is supposed to optimize rebuilds.
                                  // As suggested by ts-loader's README
                                  { loader: "cache-loader" },
                                  {
                                      loader: "thread-loader",
                                      options: {
                                          // there should be 1 cpu for the fork-ts-checker-webpack-plugin
                                          workers:
                                              require("os").cpus().length - 1,
                                      },
                                  },
                              ]
                            : []),
                        {
                            loader: "ts-loader",
                            options: {
                                compilerOptions: {
                                    isolatedModules: true,
                                    noEmitOnError: false,
                                    sourceMap: isSourceMap,
                                },
                                // happyPackMode = no compiler checks and compatible with thread-loader.
                                // fork-ts-checker-webpack-plugin will separately run compiler checks in dev mode.
                                happyPackMode: isDev,
                            },
                        },
                    ],
                },
            ],
        },
        optimization: {
            splitChunks: {
                automaticNameDelimiter: "~",
                cacheGroups: {
                    default: {
                        minChunks: 2,
                        priority: -20,
                        reuseExistingChunk: true,
                    },
                    vendors: {
                        priority: -10,
                        test: /[\\/]node_modules[\\/]/,
                    },
                },
                chunks: "all",
                maxAsyncRequests: 5,
                maxInitialRequests: 3,
                maxSize: 0,
                minChunks: 1,
                minSize: 30000,
                name: true,
            },
        },
        output: {
            filename: isDev ? "[name].js" : "[name].[hash].js",
            path: PATHS.dist,
            publicPath: "./",
        },
        plugins: [
            new WebpackBundleAnalyzer.BundleAnalyzerPlugin({
                analyzerMode: "static",
                openAnalyzer: false,
            }),
            new HtmlWebpackPlugin({
                publicPath: PATHS.publicStatic,
                template: `${PATHS.src}/index.ejs`,
                title: "react-typescript-template",
            }),
            new MiniCssExtractPlugin({
                chunkFilename: isDev ? "[id].css" : "[id].[hash].css",
                filename: isDev ? "[name].css" : "[name].[hash].css",
            }),
            new ForkTsCheckerWebpackPlugin({
                formatter: "codeframe",
            }),
        ],
        resolve: {
            alias: {
                src: PATHS.src,
            },
            extensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".scss"],
        },
    };
};

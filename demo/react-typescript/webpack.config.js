const webpack = require("webpack");
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
    hot: true,
    allowedHosts: ["127.0.0.1:8899", "localhost:8899"],
    open: ["dev/"],
    client: { overlay: true },
    port: 8899,
    devMiddleware: { publicPath: "http://127.0.0.1:8899/dev/" },
};

module.exports = (env) => {
    const isDev = env.build === "dev";
    const isSourceMap = env.sourceMap === "true";
    const isServerBuild = env.isServerBuild;
    const buildEnv = JSON.stringify(env.build);

    return {
        context: PATHS.root,
        devServer: DEV_SERVER,
        devtool: isSourceMap ? (!isServerBuild ? "eval-source-map" : "source-map") : false,
        entry: [`${PATHS.src}/index.tsx`],
        mode: isDev ? "development" : "production",
        module: {
            rules: [
                // CSS/SCSS/SASS
                {
                    test: /\.(sa|sc|c)ss$/,
                    use: [
                        { loader: !isServerBuild ? "style-loader" : MiniCssExtractPlugin.loader },
                        { loader: "css-loader", options: { importLoaders: 2, sourceMap: isSourceMap } },
                        {
                            loader: "postcss-loader",
                            options: { postcssOptions: { plugins: [autoprefixer()] }, sourceMap: isSourceMap },
                        },
                        {
                            loader: "sass-loader",
                            options: {
                                // Prefer `dart-sass`
                                implementation: require("sass"),
                                sourceMap: isSourceMap,
                            },
                        },
                    ],
                },
                // image/font files included by CSS
                {
                    test: /\.(woff|woff2|eot|ttf|svg|png|jpg|gif)$/,
                    use: [{ loader: "url-loader", options: { limit: 1024 } }],
                },
                // typescript/javascript
                {
                    exclude: [PATHS.nodeModules],
                    include: [PATHS.src],
                    test: /\.(t|j)sx?$/,
                    use: [
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
                                happyPackMode: !isServerBuild,
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
                    default: { minChunks: 2, priority: -20, reuseExistingChunk: true },
                    vendors: { priority: -10, test: /[\\/]node_modules[\\/]/ },
                },
                chunks: "all",
                maxAsyncRequests: 5,
                maxInitialRequests: 3,
                minChunks: 1,
                minSize: 30000,
                name: false,
            },
        },
        output: { filename: !isServerBuild ? "[name].js" : "[name].[hash].js", path: PATHS.dist, publicPath: "./" },
        plugins: [
            new WebpackBundleAnalyzer.BundleAnalyzerPlugin({ analyzerMode: "static", openAnalyzer: false }),
            new webpack.DefinePlugin({ BUILD_ENV: buildEnv, IS_LOCAL_RUN: !isServerBuild }),
            new HtmlWebpackPlugin({
                env: { appBuildEnv: buildEnv },
                publicPath: "./",
                template: `${PATHS.src}/index.ejs`,
                title: "AdAdapted: JS SDK",
            }),
            ...(!isServerBuild
                ? [new ForkTsCheckerWebpackPlugin({ formatter: "codeframe" })]
                : [new CopyWebpackPlugin({ patterns: [{ from: PATHS.publicStatic, to: `${PATHS.dist}/public` }] })]),
        ].concat(
            !isServerBuild
                ? []
                : [
                      new MiniCssExtractPlugin({
                          chunkFilename: "[id].[hash].css?t=" + new Date().getTime(),
                          filename: "[name].[hash].css?t=" + new Date().getTime(),
                      }),
                  ],
        ),
        resolve: { alias: { src: PATHS.src }, extensions: [".ts", ".tsx", ".js", ".jsx", ".json", ".scss"] },
    };
};

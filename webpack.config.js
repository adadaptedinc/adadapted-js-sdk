const path = require("path");
const autoprefixer = require("autoprefixer");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
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

module.exports = (env) => {
    const isDev = env.prod !== "true";
    const isSourceMap = env.sourceMap === "true";

    const createConfig = (libraryToTarget) => {
        return {
            context: PATHS.root,
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
                                    plugins: [
                                        [
                                            "@babel/plugin-transform-typescript",
                                            { allowNamespaces: true },
                                        ],
                                    ],
                                },
                            },
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
            output: {
                filename: "adadapted-js-sdk." + libraryToTarget + ".js",
                path: PATHS.dist,
                publicPath: "./",
                library: "AdadaptedJsSdk",
                libraryTarget: libraryToTarget,
            },
            plugins: [
                new WebpackBundleAnalyzer.BundleAnalyzerPlugin({
                    analyzerMode: "static",
                    openAnalyzer: false,
                }),
                new MiniCssExtractPlugin({
                    chunkFilename: "[id].css",
                    filename: "[name].css",
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

    return [
        createConfig("var"),
        createConfig("commonjs"),
        createConfig("commonjs2"),
        createConfig("amd"),
        createConfig("umd"),
        createConfig("window"),
    ];
};

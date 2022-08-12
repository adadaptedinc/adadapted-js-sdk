/**
 * These const variables are set within the webpack config at build time.
 * They are all listed within the webpack.DefinePlugin section of the config.
 *
 * These const variables need to be accounted for in the package.json jest
 * "globals" section so unit tests don't fail.
 */
declare const BUILD_ENV: string;
declare const IS_LOCAL_RUN: string;

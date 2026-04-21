import { defineConfig, globalIgnores } from "eslint/config";
import importPlugin from "eslint-plugin-import";
import jestPlugin from "eslint-plugin-jest";
import jsdocPlugin from "eslint-plugin-jsdoc";
import preferArrow from "eslint-plugin-prefer-arrow";
import { fixupPluginRules } from "@eslint/compat";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import stylistic from "@stylistic/eslint-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default defineConfig([
    globalIgnores([
        "__mocks__/**/*",
        "coverage/**/*",
        "dist/**/*",
        "node_modules/**/*",
        "**/webpack.config.js",
        "demo/**/*",
        "**/eslint.config.mjs",
    ]),
    {
        extends: compat.extends(
            "eslint:recommended",
            "plugin:jest/recommended",
        ),

        plugins: {
            import: fixupPluginRules(importPlugin),
            jest: jestPlugin,
            jsdoc: jsdocPlugin,
            "prefer-arrow": preferArrow,
            "@stylistic": stylistic,
        },

        languageOptions: {
            globals: {
                ...globals.browser,
                ...jestPlugin.environments.globals.globals,
            },

            ecmaVersion: 2022,
            sourceType: "module",

            parserOptions: { createDefaultProgram: true },
        },

        rules: {
            "@stylistic/no-extra-semi": "error",
            "@stylistic/quotes": [
                "error",
                "double",
                {
                    avoidEscape: true,
                    allowTemplateLiterals: "always",
                },
            ],
            "arrow-parens": ["off", "always"],
            "brace-style": ["off", "off"],
            complexity: "off",
            "constructor-super": "error",
            "eol-last": "off",
            eqeqeq: ["error", "smart"],
            "for-direction": "error",
            "getter-return": "error",
            "guard-for-in": "error",

            "id-denylist": [
                "error",
                "any",
                "Number",
                "number",
                "String",
                "string",
                "Boolean",
                "boolean",
                "Undefined",
                "undefined",
            ],

            "id-match": "error",
            "import/no-default-export": "off",
            "import/order": "off",
            indent: ["off"],
            "jest/no-commented-out-tests": "off",
            "jest/no-disabled-tests": "warn",
            "jest/expect-expect": "off",
            "jest/no-focused-tests": "error",
            "jest/no-identical-title": "error",
            "jest/prefer-to-have-length": "off",
            "jest/valid-expect": "error",
            "jest/valid-expect-in-promise": "off",
            "jsdoc/check-alignment": "error",
            "jsdoc/check-indentation": "off",
            "jsdoc/newline-after-description": "off",

            "jsdoc/require-jsdoc": [
                "error",
                {
                    contexts: [
                        "TSInterfaceDeclaration",
                        "TSTypeAliasDeclaration[modifiers='ExportKeyword']",
                        "TSEnumDeclaration",
                        "TSEnumMember",
                        "ExportNamedDeclaration[declaration.type]",
                        "ArrowFunctionExpression:not(Property ArrowFunctionExpression):not(JSXAttribute ArrowFunctionExpression):not(CallExpression ArrowFunctionExpression):not(NewExpression ArrowFunctionExpression)",
                        "FunctionExpression:not(Property FunctionExpression)",
                    ],

                    require: {
                        FunctionDeclaration: true,
                        MethodDefinition: true,
                        ClassDeclaration: true,
                        ArrowFunctionExpression: false,
                        FunctionExpression: false,
                    },
                },
            ],

            "jsdoc/require-param-type": "off",
            "jsdoc/require-returns-type": "off",
            "linebreak-style": "off",
            "max-classes-per-file": "off",
            "max-len": "off",
            "new-parens": "error",
            "newline-per-chained-call": "off",
            "no-array-constructor": "off",
            "no-async-promise-executor": "off",
            "no-bitwise": "off",
            "no-caller": "error",
            "no-case-declarations": "error",
            "no-class-assign": "error",
            "no-compare-neg-zero": "error",
            "no-cond-assign": "error",

            "no-console": [
                "error",
                {
                    allow: [
                        "warn",
                        "dir",
                        "timeLog",
                        "assert",
                        "clear",
                        "count",
                        "countReset",
                        "group",
                        "groupEnd",
                        "table",
                        "dirxml",
                        "error",
                        "groupCollapsed",
                        "Console",
                        "profile",
                        "profileEnd",
                        "timeStamp",
                        "context",
                    ],
                },
            ],

            "no-const-assign": "error",
            "no-constant-condition": "error",
            "no-control-regex": "error",
            "no-debugger": "error",
            "no-delete-var": "error",
            "no-dupe-args": "error",
            "no-dupe-class-members": "error",
            "no-dupe-else-if": "error",
            "no-dupe-keys": "error",
            "no-duplicate-case": "error",
            "no-empty": "error",
            "no-empty-character-class": "error",
            "no-empty-function": "off",
            "no-empty-pattern": "error",
            "no-eval": "error",
            "no-ex-assign": "error",
            "no-extra-boolean-cast": "error",
            "no-fallthrough": "off",
            "no-func-assign": "error",
            "no-global-assign": "error",
            "no-import-assign": "error",
            "no-inner-declarations": "error",
            "no-invalid-regexp": "error",
            "no-invalid-this": "off",
            "no-irregular-whitespace": "off",
            "no-misleading-character-class": "error",
            "no-mixed-spaces-and-tabs": "error",
            "no-multiple-empty-lines": "off",
            "no-new-symbol": "error",
            "no-new-wrappers": "error",
            "no-obj-calls": "error",
            "no-octal": "error",
            "no-prototype-builtins": "off",
            "no-redeclare": "off",
            "no-regex-spaces": "error",
            "no-self-assign": "error",
            "no-setter-return": "error",
            "no-shadow-restricted-names": "error",
            "no-sparse-arrays": "error",
            "no-template-curly-in-string": "error",
            "no-this-before-super": "error",
            "no-throw-literal": "error",
            "no-trailing-spaces": "off",
            "no-undef": "off",
            "no-undef-init": "error",
            "no-underscore-dangle": "error",
            "no-unexpected-multiline": "error",
            "no-unreachable": "error",
            "no-unsafe-finally": "error",
            "no-unsafe-negation": "error",
            "no-unused-labels": "error",
            "no-unused-vars": "off",
            "no-useless-catch": "error",
            "no-useless-escape": "off",
            "no-var": "error",
            "no-with": "error",
            "object-shorthand": "error",
            "one-var": ["error", "never"],
            "prefer-arrow/prefer-arrow-functions": "off",
            "prefer-const": "error",
            "quote-props": "off",
            radix: "error",
            "require-yield": "error",
            semi: ["error", "always"],
            "space-before-function-paren": "off",
            "space-in-parens": ["off", "never"],

            "spaced-comment": ["error", "always", { markers: ["/"] }],

            "use-isnan": "error",
            "valid-typeof": "off",
        },
    },
]);

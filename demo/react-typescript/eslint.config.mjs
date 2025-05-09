import { defineConfig, globalIgnores } from "eslint/config";
import importPlugin from "eslint-plugin-import";
import jsdocPlugin from "eslint-plugin-jsdoc";
import reactPlugin from "eslint-plugin-react";
import preferArrow from "eslint-plugin-prefer-arrow";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import { fixupPluginRules } from "@eslint/compat";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import stylisticJs from "@stylistic/eslint-plugin-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default defineConfig([
    globalIgnores(["dist/**/*", "node_modules/**/*", "**/webpack.config.js", "**/eslint.config.mjs"]),
    {
        extends: compat.extends(
            "eslint:recommended",
            "plugin:react/recommended",
            "plugin:@typescript-eslint/recommended",
            "plugin:@typescript-eslint/recommended-requiring-type-checking",
        ),

        plugins: {
            import: fixupPluginRules(importPlugin),
            jsdoc: jsdocPlugin,
            react: reactPlugin,
            "prefer-arrow": preferArrow,
            "@typescript-eslint": typescriptEslint,
            "@stylistic/js": stylisticJs,
        },

        languageOptions: {
            globals: { ...globals.browser },
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: "module",
            parserOptions: { project: "tsconfig.json", createDefaultProgram: true },
        },

        settings: { react: { pragma: "React", fragment: "Fragment", version: "detect" } },

        rules: {
            "@stylistic/js/comma-dangle": ["error", "always-multiline"],
            "@stylistic/js/no-extra-semi": "error",
            "@stylistic/js/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
            "@typescript-eslint/adjacent-overload-signatures": "error",
            "@typescript-eslint/array-type": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-wrapper-object-types": "error",
            "@typescript-eslint/consistent-type-assertions": "error",
            "@typescript-eslint/dot-notation": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/indent": "off",

            "@typescript-eslint/member-delimiter-style": [
                "off",
                {
                    multiline: { delimiter: "none", requireLast: true },

                    singleline: { delimiter: "semi", requireLast: false },
                },
            ],

            "@typescript-eslint/member-ordering": "off",
            "@typescript-eslint/naming-convention": "off",
            "@typescript-eslint/no-array-constructor": "error",
            "@typescript-eslint/no-empty-function": "error",
            "@typescript-eslint/no-empty-interface": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-extra-non-null-assertion": "error",
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/no-for-in-array": "error",
            "@typescript-eslint/no-inferrable-types": "off",
            "@typescript-eslint/no-misused-new": "error",
            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-parameter-properties": "off",

            "@typescript-eslint/no-shadow": ["error", { hoist: "all" }],

            "@typescript-eslint/no-this-alias": "error",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-enum-comparison": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unused-expressions": "error",
            "@typescript-eslint/no-unused-vars": "error",
            "@typescript-eslint/no-use-before-define": "off",
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/prefer-as-const": "error",
            "@typescript-eslint/prefer-for-of": "error",
            "@typescript-eslint/prefer-function-type": "error",
            "@typescript-eslint/prefer-namespace-keyword": "error",
            "@typescript-eslint/prefer-promise-reject-errors": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/semi": ["off", null],

            "@typescript-eslint/triple-slash-reference": [
                "error",
                { path: "always", types: "prefer-import", lib: "always" },
            ],

            "@typescript-eslint/type-annotation-spacing": "off",
            "@typescript-eslint/unbound-method": "off",
            "@typescript-eslint/unified-signatures": "error",
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
            "import/no-default-export": "error",
            "import/order": "off",
            indent: ["off"],
            "jsdoc/check-alignment": "error",
            "jsdoc/check-indentation": "off",
            "jsdoc/newline-after-description": "off",
            "jsdoc/require-jsdoc": [
                "error",
                {
                    contexts: [
                        // All interfaces
                        "TSInterfaceDeclaration",
                        // All exported type declarations
                        "TSTypeAliasDeclaration[modifiers='ExportKeyword']",
                        // All enums
                        "TSEnumDeclaration",
                        // All enum members
                        "TSEnumMember",
                        // This would enforce completed-docs on all namespaces that are not exported, but throws off how we would need to write exported namespaces
                        // because the plugin doesn't pick up jsDoc comments on exported namespaces as it does with non-exported namespaces. We would need to just
                        // write namespace NameOfNamespace and export { NameOfNamespace } at the bottom of the file.
                        // "TSModuleDeclaration",
                        // All exported variables that have some declaration type, including namespaces.
                        // Does not enforce on something like export type { ComboSelectTypes } from "./ComboSelect";
                        "ExportNamedDeclaration[declaration.type]",
                        // All arrow functions except those that are an object property, JSX prop, call expression (e.g. .map or filter(() => {})), or new expression (e.g. new Promise(() => {}))
                        "ArrowFunctionExpression:not(Property ArrowFunctionExpression):not(JSXAttribute ArrowFunctionExpression):not(CallExpression ArrowFunctionExpression):not(NewExpression ArrowFunctionExpression)",
                        // All function expressions except those that are an object property, like those in firebaseMockTypes.ts
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
                        "log",
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
            "no-extra-semi": "off",
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
            "no-prototype-builtins": "error",
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
            quotes: ["error", "double"],
            radix: "error",
            "react/display-name": "off",
            "react/jsx-boolean-value": "off",
            "react/jsx-curly-spacing": "off",
            "react/jsx-equals-spacing": "off",
            "react/jsx-key": "error",
            "react/jsx-no-bind": "off",
            "react/jsx-no-comment-textnodes": "error",
            "react/jsx-no-duplicate-props": "error",
            "react/jsx-no-target-blank": "error",
            "react/jsx-no-undef": "error",

            "react/jsx-tag-spacing": ["off", { afterOpening: "allow", closingSlash: "allow" }],

            "react/jsx-uses-react": "error",
            "react/jsx-uses-vars": "error",
            "react/jsx-wrap-multilines": "off",
            "react/no-children-prop": "error",
            "react/no-danger-with-children": "error",
            "react/no-deprecated": "error",
            "react/no-direct-mutation-state": "error",
            "react/no-find-dom-node": "error",
            "react/no-is-mounted": "error",
            "react/no-render-return-value": "error",
            "react/no-string-refs": "error",
            "react/no-unescaped-entities": "error",
            "react/no-unknown-property": "error",
            "react/no-unsafe": "off",
            "react/prop-types": "error",
            "react/react-in-jsx-scope": "error",
            "react/require-render-return": "error",
            "react/self-closing-comp": "error",
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

"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var Lint = require("tslint");
/**
 * Custom TSLint rule that fails on variable declaration that are initialized to null or undefined, but have no data
 * type specified.
 *
 * Fail example-react: let value = null;
 * Pass example-react: let value: string | null = null;
 *
 * This is used to work around this (intentional?) limitation of the typscript compiler's "strictNullChecks" feature:
 * {@link https://github.com/Microsoft/TypeScript/issues/21015}
 */
var Rule = /** @class */ (function (_super) {
    __extends(Rule, _super);
    function Rule() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Applies the rule.
     * @param sourceFile
     * @returns the new TS Lint rule.
     */
    Rule.prototype.apply = function (sourceFile) {
        return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
    };
    return Rule;
}(Lint.Rules.AbstractRule));
exports.Rule = Rule;
/**
 * The Walker class that defines the rule.
 */
var Walker = /** @class */ (function (_super) {
    __extends(Walker, _super);
    function Walker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Checks the variable and fails if it doesn't pass inspection.
     * @param node
     */
    Walker.prototype.visitVariableDeclaration = function (node) {
        if (!node.type && node.initializer) {
            if (node.initializer.kind === ts.SyntaxKind.NullKeyword
                || node.initializer.kind === ts.SyntaxKind.UndefinedKeyword) {
                this.addFailureAt(node.name.getStart(), node.name.getWidth(), "Variable '" + node.name.getText() + "' must be given a data type.");
            }
        }
    };
    return Walker;
}(Lint.RuleWalker));

import * as ts from "typescript";
import * as Lint from "tslint";

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
export class Rule extends Lint.Rules.AbstractRule {
    /**
     * Applies the rule.
     * @param sourceFile
     * @returns the new TS Lint rule.
     */
    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
    }
}

/**
 * The Walker class that defines the rule.
 */
class Walker extends Lint.RuleWalker {
    /**
     * Checks the variable and fails if it doesn't pass inspection.
     * @param node
     */
    public visitVariableDeclaration(node: ts.VariableDeclaration): void {
        if (!node.type && node.initializer) {
            if (node.initializer.kind === ts.SyntaxKind.NullKeyword
                || node.initializer.kind === ts.SyntaxKind.UndefinedKeyword) {
                this.addFailureAt(
                    node.name.getStart(),
                    node.name.getWidth(),
                    `Variable '${node.name.getText()}' must be given a data type.`
                );
            }
        }
    }
}

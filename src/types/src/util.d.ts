import { nil } from "./types";
import { NoInfer } from "type-zoo";
declare global {
    interface Window {
        MSStream: string;
    }
}
/**
 * Determine the mobile operating system.
 * @returns the operating system
 */
export declare function getOperatingSystem(): string;
/**
 * Determines if the current device needs support for "safe area" padding.
 * The safe area padding is used to support devices that have a "notch" at the
 * top of the screen and on-screen navigation buttons at the bottom of the
 * screen.
 *
 * Note: There are four possible CSS properties for the safe area:
 *      - safe-area-inset-top
 *      - safe-area-inset-bottom
 *      - safe-area-inset-left
 *      - safe-area-inset-right
 *
 * @returns a boolean indicating whether or not "safe area" padding is needed.
 */
export declare function needsSafeAreaPadding(): boolean;
/**
 * Generates a display friendly label based on a certain input format.
 * Example formats:
 *      testlable -> Testlabel
 *      test-label -> Test Label
 *      test-label-long -> Test Label Long
 * @param stringToReplace - The non-formatted string to be formatted.
 * @returns The formatted display friendly string.
 */
export declare function generateDisplayFriendlyLabel(
    stringToReplace: string
): string;
/**
 * Validates that the provided string is or is not a hexadecimal color string.
 * @param stringToValidate - The string to validate.
 * @returns true if the string is a hexadecimal color and false if not.
 */
export declare function isColorStringHex(
    stringToValidate: string | undefined
): boolean;
/**
 * Validates an email address.
 * @param emailAddress - The email address to validate.
 * @returns a boolean representing the validity of the email address.
 */
export declare function isValidEmailAddress(
    emailAddress: string | undefined
): boolean;
/**
 * Counts the number of properties in a object.
 * @param obj - The object to count the number of properties from.
 * @returns the total count of properties from the provided object.
 */
export declare function totalProperties<T>(obj: { [key: string]: T }): number;
/**
 * Creates a Promise that resolves after a setTimeout delay.
 * @param milliseconds - Number of milliseconds to wait before the
 *      promise is resolved.
 * @returns A promise that is asynchronously resolved after the specified delay.
 */
export declare function wait(milliseconds?: number): Promise<void>;
/**
 * Convenient utility for calling a function that may or may
 * not be undefined/null.
 * Does nothing if the provided function is undefined/null.
 * @param func - The function to be called.
 * @returns The return value of the executed function, or undefined if
 *      the function is null/undefined
 */
export declare function safeInvoke<R>(func: (() => R) | nil): R | undefined;
/**
 * See main definition above.
 * @param func - The function to call.
 * @param arg1 - Function argument.
 */
export declare function safeInvoke<A1, R>(
    func: ((arg1: A1) => R) | nil,
    arg1: NoInfer<A1>
): R | undefined;
/**
 * See main definition above.
 * @param func - The function to call.
 * @param arg1 - Function argument.
 * @param arg2 - Function argument.
 */
export declare function safeInvoke<A1, A2, R>(
    func: ((arg1: A1, arg2: A2) => R) | nil,
    arg1: NoInfer<A1>,
    arg2: NoInfer<A2>
): R | undefined;
/**
 * See main definition above.
 * @param func - The function to call.
 * @param arg1 - Function argument.
 * @param arg2 - Function argument.
 * @param arg3 - Function argument.
 */
export declare function safeInvoke<A1, A2, A3, R>(
    func: ((arg1: A1, arg2: A2, arg3: A3) => R) | nil,
    arg1: NoInfer<A1>,
    arg2: NoInfer<A2>,
    arg3: NoInfer<A3>
): R | undefined;
/**
 * See main definition above.
 * @param func - The function to call.
 * @param arg1 - Function argument.
 * @param arg2 - Function argument.
 * @param arg3 - Function argument.
 * @param arg4 - Function argument.
 */
export declare function safeInvoke<A1, A2, A3, A4, R>(
    func: ((arg1: A1, arg2: A2, arg3: A3, arg4: A4) => R) | nil,
    arg1: NoInfer<A1>,
    arg2: NoInfer<A2>,
    arg3: NoInfer<A3>,
    arg4: NoInfer<A4>
): R | undefined;
/**
 * See main definition above.
 * @param func - The function to call.
 * @param arg1 - Function argument.
 * @param arg2 - Function argument.
 * @param arg3 - Function argument.
 * @param arg4 - Function argument.
 * @param arg5 - Function argument.
 */
export declare function safeInvoke<A1, A2, A3, A4, A5, R>(
    func: ((arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => R) | nil,
    arg1: NoInfer<A1>,
    arg2: NoInfer<A2>,
    arg3: NoInfer<A3>,
    arg4: NoInfer<A4>,
    arg5: NoInfer<A5>
): R | undefined;
/**
 * See main definition above.
 * @param func - The function to call.
 * @param arg1 - Function argument.
 * @param arg2 - Function argument.
 * @param arg3 - Function argument.
 * @param arg4 - Function argument.
 * @param arg5 - Function argument.
 * @param arg6 - Function argument.
 */
export declare function safeInvoke<A1, A2, A3, A4, A5, A6, R>(
    func:
        | ((arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6) => R)
        | nil,
    arg1: NoInfer<A1>,
    arg2: NoInfer<A2>,
    arg3: NoInfer<A3>,
    arg4: NoInfer<A4>,
    arg5: NoInfer<A5>,
    arg6: NoInfer<A6>
): R | undefined;

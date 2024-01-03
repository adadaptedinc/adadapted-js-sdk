/**
 * Global imports and initialization for Jest unit tests.
 * @module
 */
import "@testing-library/jest-dom";
import crypto from "crypto";
import { TextEncoder, TextDecoder } from "util";

global.TextEncoder = TextEncoder;
// global.TextDecoder = TextDecoder;

Object.defineProperty(global, "crypto", {
    value: {
        getRandomValues: (arr: any) => crypto.randomBytes(arr.length),
        subtle: {
            digest: (algorithm: string, data: Uint8Array) => {
                return new Promise((resolve) =>
                    resolve(
                        crypto
                            .createHash(
                                algorithm.toLowerCase().replace("-", ""),
                            )
                            .update(data)
                            .digest(),
                    ),
                );
            },
        },
    },
});

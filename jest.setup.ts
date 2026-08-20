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
        // The real getRandomValues fills the array it is handed and returns it.
        // Returning a fresh Buffer instead leaves the caller's array as zeroes.
        getRandomValues: (arr: any) => {
            const randomBytes = crypto.randomBytes(arr.length);

            for (let i = 0; i < arr.length; i++) {
                arr[i] = randomBytes[i];
            }

            return arr;
        },
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

/**
 * jsdom does not implement IntersectionObserver, which the SDK uses to decide
 * whether an ad zone is on screen. This fake records what is being observed and
 * exposes a way for tests to drive visibility changes.
 */
class MockIntersectionObserver {
    static instances: MockIntersectionObserver[] = [];

    callback: (entries: any[]) => void;
    options: any;
    observedElements: Element[] = [];

    constructor(callback: (entries: any[]) => void, options?: any) {
        this.callback = callback;
        this.options = options;

        MockIntersectionObserver.instances.push(this);
    }

    observe(element: Element): void {
        this.observedElements.push(element);
    }

    unobserve(element: Element): void {
        this.observedElements = this.observedElements.filter(
            (observed) => observed !== element,
        );
    }

    disconnect(): void {
        this.observedElements = [];
    }

    takeRecords(): any[] {
        return [];
    }

    /**
     * Builds an entry the way the browser does. The intersectionRect matters: a
     * zone whose edge merely touches the edge of the view is reported as
     * intersecting with a zero area rect, and none of it is actually painted.
     */
    private buildEntry(
        target: Element,
        isIntersecting: boolean,
        intersectionRect?: { width: number; height: number },
    ): any {
        return {
            target,
            isIntersecting,
            intersectionRatio: isIntersecting ? 1 : 0,
            intersectionRect:
                intersectionRect ??
                (isIntersecting
                    ? { width: 300, height: 100 }
                    : { width: 0, height: 0 }),
        };
    }

    /**
     * Drives an intersection change for every element currently observed.
     */
    triggerAll(
        isIntersecting: boolean,
        intersectionRect?: { width: number; height: number },
    ): void {
        this.callback(
            this.observedElements.map((target) =>
                this.buildEntry(target, isIntersecting, intersectionRect),
            ),
        );
    }

    /**
     * Drives an intersection change for a single observed element.
     */
    trigger(
        target: Element,
        isIntersecting: boolean,
        intersectionRect?: { width: number; height: number },
    ): void {
        this.callback([
            this.buildEntry(target, isIntersecting, intersectionRect),
        ]);
    }

    /**
     * The observer the SDK most recently created.
     */
    static latest(): MockIntersectionObserver {
        return MockIntersectionObserver.instances[
            MockIntersectionObserver.instances.length - 1
        ];
    }

    static reset(): void {
        MockIntersectionObserver.instances = [];
    }
}

Object.defineProperty(global, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
});

(global as any).MockIntersectionObserver = MockIntersectionObserver;

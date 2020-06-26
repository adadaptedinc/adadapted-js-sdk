import { isValidEmailAddress, wait } from "./util";

describe("util", () => {
    test("wait() without a time duration", async () => {
        const start = Date.now();
        await wait();
        const duration = Date.now() - start;

        expect(duration).toBeGreaterThanOrEqual(0);
    });

    test("wait() with a time duration", async () => {
        const start = Date.now();
        await wait(100);
        const duration = Date.now() - start;

        expect(duration).toBeGreaterThanOrEqual(99);
    });

    describe("isValidEmailAddress()", () => {
        test("Valid email address provided", () => {
            expect(isValidEmailAddress("test@email.com")).toBe(true);
        });

        test("Invalid email address provided", () => {
            expect(isValidEmailAddress("test@email")).toBe(false);
        });

        test("Undefined email address provided", () => {
            expect(isValidEmailAddress(undefined)).toBe(false);
        });
    });
});

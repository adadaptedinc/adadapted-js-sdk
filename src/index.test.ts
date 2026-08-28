import AdadaptedJsSdk from "./index";
import { setImmediate } from "timers";
import { fireEvent } from "@testing-library/dom";
import {
    expect,
    describe,
    it,
    jest,
    beforeEach,
    afterEach,
} from "@jest/globals";

const TEST_ZONE_1_ID = "1";
const TEST_ZONE_2_ID = "2";

const AD_RETRIEVE_URL = "/v/1.0.0/ad/retrieve";
const INTERCEPT_RETRIEVE_URL = "/v/1.0.0/intercept/retrieve";
const INTERCEPT_EVENTS_URL = "/v/1.0.0/intercept/events";
const AD_EVENTS_URL = "/v/1.0.0/ad/events";
const SDK_EVENTS_URL = "/v/1/android/events";
const PAYLOAD_PICKUP_URL = "/v/1/pickup";

/**
 * An add-to-list ad, as the v1.0.0 ad service returns it.
 */
const testAtlAd = {
    id: "1275::102151::309::1194::6313::133",
    impression_id: "1::::::FAA4370X65538313-AA",
    refresh_time: 60,
    creative_url:
        "https://ad.img.qa.adadapted.dev/platform/ads/133/6313/1194/102151.html",
    action_type: "c",
    action_path: "",
    payload: {
        detailed_list_items: [
            {
                tracking_id: "573391ab-ae54-4446-b367-7a9b1bafdb12",
                product_title: "Tabasco Original",
                product_brand: "",
                product_category: "",
                product_barcode: "011210000155",
                product_sku: "",
                product_discount: "",
                product_image:
                    "https://ad.img.qa.adadapted.dev/platform/images/7338baeb.png",
            },
            {
                tracking_id: "d8cf0271-3c7c-4aa0-a914-c011603e9e8e",
                product_title: "Tabasco Chipotle",
                product_brand: "",
                product_category: "",
                product_barcode: "011210007703",
                product_sku: "",
                product_discount: "",
                product_image:
                    "https://ad.img.qa.adadapted.dev/platform/images/7338baeb.png",
            },
        ],
    },
};

/**
 * An ad that opens a popover, as the v1.0.0 ad service returns it.
 */
const testPopupAd = {
    id: "1275::102151::309::1191::6313::133",
    impression_id: "2::::::73381C0X65538313-AA",
    refresh_time: 60,
    creative_url:
        "https://ad.img.qa.adadapted.dev/platform/ads/133/6313/1191/102151.html",
    action_type: "p",
    action_path: "https://some-action-path.com?a=1",
    payload: {},
};

/**
 * The no-fill response shape: a successful response carrying an empty ad whose
 * only meaningful field is the refresh_time backoff.
 */
const testNoFillAd = {
    id: "",
    impression_id: "",
    refresh_time: 300,
    creative_url: "",
    action_type: "",
    action_path: "",
    payload: {},
};

/**
 * Wraps an ad in the v1.0.0 success envelope.
 */
const buildAdResponse = (ad: any) => ({
    success: true,
    data: {
        ad,
        port_width: 360,
        port_height: 200,
    },
});

const milkKeywordIntercepts = [
    {
        term_id: "milk",
        term: "milk",
        replacement: "Horizon Whole Milk",
        priority: 2,
    },
    {
        term_id: "milk",
        term: "milk",
        replacement: "Fair Life 2% Milk",
        priority: 3,
    },
    {
        term_id: "milk",
        term: "milk",
        replacement: "Meijer 2% Milk",
        priority: 1,
    },
];

/**
 * The v1.0.0 intercept payload. NOTE: min_match_length is no longer served, so
 * the SDK applies its own minimum.
 */
const testKeywordIntercepts = {
    terms: [
        {
            term_id: "chocolate",
            term: "chocolate",
            replacement: "Hershey's Chocolate Bar",
            priority: 1,
        },
        ...milkKeywordIntercepts,
    ],
    search_id: "TEST_SEARCH_ID",
};

const baseTestProps: AdadaptedJsSdk.InitializeProps = {
    apiKey: "TEST_API_KEY",
    advertiserId: "JS_SDK_TEST_USER_UDID",
    allowRetargeting: true,
    enablePayloads: true,
    enableKeywordIntercept: true,
    apiEnv: "dev",
    bundleId: "TEST_BUNDLE_ID",
    bundleVersion: "TEST_BUNDLE_VERSION",
    zonePlacements: {
        [TEST_ZONE_1_ID]: "zone1",
        [TEST_ZONE_2_ID]: "zone2",
    },
    params: {
        storeId: "123",
    },
};

const testCartId = "TEST_CART_ID";
const testListName = "TEST_LIST_NAME";
const testItemNames = ["ITEM_NAME_1", "ITEM_NAME_2", "ITEM_NAME_3"];
const testStoreId = "TEST_STORE_ID";

/**
 * The SDK's internal state, which src/index.d.ts deliberately does not declare.
 *
 * None of this is public API - a consumer cannot see any of it, and it can change
 * without that being a breaking change. The tests reach for it anyway where the
 * alternative is a much weaker assertion, and go through this cast so that every
 * such place is obvious rather than looking like supported surface.
 */
interface SdkInternals {
    zones: { [key: string]: any };
    intersectionObserver: any;
    documentEventAbortController: any;
    sessionLastActiveAt: number | undefined;
    sessionPersistedAt: number | undefined;
    sessionIsBackgrounded: boolean;
}

/**
 * Reaches into the SDK's internal state.
 * @param sdkInstance - The SDK instance to inspect.
 * @returns the instance, typed as its internals.
 */
const internals = (sdkInstance: AdadaptedJsSdk): SdkInternals =>
    sdkInstance as unknown as SdkInternals;

const flushPromises = () => new Promise(setImmediate);

/**
 * Builds a resolved fetch response.
 */
const jsonResponse = (body: any, status = 200) =>
    Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
    });

/**
 * The shape of the fetch mock installed by mockFetch.
 */
type FetchMock = jest.Mock<(url: string, init?: any) => Promise<any>>;

/**
 * Installs a fetch mock that answers each SDK endpoint with the shape that
 * endpoint actually returns. Ads are handed out per zone, so each zone can be
 * given its own ad, a no-fill, or a failure.
 */
const mockFetch = (options?: {
    adsByZoneId?: { [zoneId: string]: any };
    interceptData?: any;
    payloads?: any[];
    rejectUrlsContaining?: string[];
    errorStatusForUrlsContaining?: string[];
}) => {
    const adsByZoneId = options?.adsByZoneId ?? {
        [TEST_ZONE_1_ID]: testAtlAd,
        [TEST_ZONE_2_ID]: testPopupAd,
    };

    const fetchMock = jest.fn((url: string, init?: any) => {
        if (options?.rejectUrlsContaining?.some((part) => url.includes(part))) {
            return Promise.reject(new Error("Request failed"));
        }

        if (
            options?.errorStatusForUrlsContaining?.some((part) =>
                url.includes(part),
            )
        ) {
            return jsonResponse(
                { success: false, message: "Something went wrong" },
                500,
            );
        }

        if (url.includes(AD_RETRIEVE_URL)) {
            const requestBody = init?.body ? JSON.parse(init.body) : {};
            const ad = adsByZoneId[requestBody.zoneId];

            return jsonResponse(buildAdResponse(ad ?? testNoFillAd));
        }

        if (url.includes(INTERCEPT_RETRIEVE_URL)) {
            return jsonResponse({
                success: true,
                data: options?.interceptData ?? testKeywordIntercepts,
            });
        }

        if (url.includes(PAYLOAD_PICKUP_URL)) {
            return jsonResponse({ payloads: options?.payloads ?? [] });
        }

        // The event endpoints answer with an empty object.
        return jsonResponse({});
    });

    // @ts-ignore
    global.fetch = fetchMock;

    return fetchMock;
};

/**
 * The IntersectionObserver fake the SDK is currently using, installed by
 * jest.setup.ts.
 */
const getObserver = () => (global as any).MockIntersectionObserver.latest();

/**
 * Drives the intersection observer so every mounted zone reports as on or off
 * screen, then lets any resulting requests settle.
 */
const setZonesOnScreen = async (isIntersecting: boolean) => {
    getObserver().triggerAll(isIntersecting);

    await flushPromises();
};

/**
 * Sets the document's visibility and raises the matching event, standing in for
 * the user switching browser tabs.
 */
const setDocumentVisibility = (visibilityState: "visible" | "hidden") => {
    Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => visibilityState,
    });

    document.dispatchEvent(new Event("visibilitychange"));
};

/**
 * Sets whether the document currently has focus, standing in for the browser
 * itself gaining or losing focus to another application while this tab stays on
 * screen. NOTE: jsdom's document.hasFocus() returns false by default, so a focused
 * page has to be modelled explicitly.
 */
const setDocumentFocus = (hasFocus: boolean) => {
    Object.defineProperty(document, "hasFocus", {
        configurable: true,
        writable: true,
        value: () => hasFocus,
    });

    window.dispatchEvent(new Event(hasFocus ? "focus" : "blur"));
};

/**
 * Every ad event of the given type that was reported to the API.
 */
const getReportedAdEvents = (fetchMock: FetchMock, eventType: string) => {
    return fetchMock.mock.calls
        .filter(([url]) => (url as string).includes(AD_EVENTS_URL))
        .map(([, init]) => JSON.parse((init as any).body))
        .flatMap((body) => body.events)
        .filter((event) => event.event_type === eventType);
};

/**
 * Every SDK event of the given name that was reported to the API.
 */
const getReportedSdkEvents = (fetchMock: FetchMock, eventName: string) => {
    return fetchMock.mock.calls
        .filter(([url]) => (url as string).includes(SDK_EVENTS_URL))
        .map(([, init]) => JSON.parse((init as any).body))
        .flatMap((body) => body.events)
        .filter((event) => event.event_name === eventName);
};

/**
 * The bodies of every ad retrieve request that was made.
 */
const getAdRequestBodies = (fetchMock: FetchMock) => {
    return fetchMock.mock.calls
        .filter(([url]) => (url as string).includes(AD_RETRIEVE_URL))
        .map(([, init]) => JSON.parse((init as any).body));
};

describe("AdadaptedJsSdk", () => {
    let sdk: AdadaptedJsSdk | null = null;
    let fetchMock: FetchMock;
    // Every instance a test builds, so afterEach can tear all of them down. A
    // leaked instance keeps its document listeners and answers the next test's
    // visibilitychange, which produces failures in whichever test runs next.
    let liveSdks: AdadaptedJsSdk[] = [];

    /**
     * Builds an SDK instance that is guaranteed to be unmounted after the test.
     */
    const createSdk = (): AdadaptedJsSdk => {
        const instance = new AdadaptedJsSdk();

        liveSdks.push(instance);

        return instance;
    };

    beforeEach(() => {
        fetchMock = mockFetch();

        document.body.innerHTML = `
            <div id="zone1"></div>
            <div id="zone2"></div>
        `;

        // Sessions persist across page loads, so without this a session created by
        // one test would be resumed by the next.
        localStorage.clear();

        // These define own properties on the shared jsdom document, so a test that
        // leaves the tab hidden or unfocused would leave it that way for every test
        // that follows. A normal page is visible and focused.
        setDocumentVisibility("visible");
        setDocumentFocus(true);

        (global as any).MockIntersectionObserver.reset();

        liveSdks = [];
        sdk = createSdk();
    });

    afterEach(() => {
        // Tears down the document listeners and observers, so a previous test's SDK
        // can't react to events raised by the next one.
        for (const instance of liveSdks) {
            instance.unmount();
        }

        liveSdks = [];

        jest.resetAllMocks();
    });

    describe("initialize()", () => {
        it("rejects when apiKey isn't provided", async () => {
            const testSdk = sdk!;

            // Asserted through rejects, so deleting the validation fails the test
            // instead of skipping an untaken catch block.
            await expect(
                testSdk.initialize({
                    ...baseTestProps,
                    // @ts-ignore
                    apiKey: undefined,
                }),
            ).rejects.toBe(
                "API key must be provided for the AdAdapted SDK to be initialized.",
            );
        });

        it("rejects when advertiserId isn't provided", async () => {
            const testSdk = sdk!;

            // Asserted through rejects, so deleting the validation fails the test
            // instead of skipping an untaken catch block.
            await expect(
                testSdk.initialize({
                    ...baseTestProps,
                    // @ts-ignore
                    advertiserId: undefined,
                }),
            ).rejects.toBe(
                "A unique identifier(advertiserId) must be provided for the AdAdapted SDK to be initialized.",
            );
        });

        it("rejects when allowRetargeting isn't provided", async () => {
            const testSdk = sdk!;

            // Asserted through rejects, so deleting the validation fails the test
            // instead of skipping an untaken catch block.
            await expect(
                testSdk.initialize({
                    ...baseTestProps,
                    // @ts-ignore
                    allowRetargeting: undefined,
                }),
            ).rejects.toBe(
                "A user's privacy decision to opt-in or opt-out for ad retargeting(allowRetargeting) must be provided for the AdAdapted SDK to be initialized.",
            );
        });

        it("still resolves when the ad requests fail, since there is no session request to fail", async () => {
            fetchMock = mockFetch({ rejectUrlsContaining: ["/"] });

            const testSdk = sdk!;

            await expect(
                testSdk.initialize(baseTestProps),
            ).resolves.toBeUndefined();

            // A client generated session ID does not depend on the network.
            expect(testSdk.getSessionId()).toMatch(/^JS[A-Z0-9]{32}$/);
        });

        it("resolves and sets internal property values as expected", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.apiKey).toBe(baseTestProps.apiKey);
            expect(testSdk.advertiserId).toBe(baseTestProps.advertiserId);
            expect(testSdk.allowRetargeting).toBe(
                baseTestProps.allowRetargeting,
            );
            expect(testSdk.enablePayloads).toBe(baseTestProps.enablePayloads);
            expect(testSdk.enableKeywordIntercept).toBe(
                baseTestProps.enableKeywordIntercept,
            );
            expect(testSdk.bundleId).toBe(baseTestProps.bundleId);
            expect(testSdk.bundleVersion).toBe(baseTestProps.bundleVersion);
            expect(testSdk.zonePlacements).toEqual(
                baseTestProps.zonePlacements,
            );
            expect(testSdk.params).toEqual(baseTestProps.params);
        });
    });

    describe("apiEnv", () => {
        it("the correct API URL is set when the dev environment is specified", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.apiEnv).toBe("https://sandbox.adadapted.com");
        });

        it("the correct API URL is set when the prod environment is specified", async () => {
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                apiEnv: "prod",
            });

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.apiEnv).toBe("https://ads.adadapted.com");
        });
    });

    describe("allowRetargeting", () => {
        it("retargeting is allowed", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.allowRetargeting).toBe(true);
        });

        it("retargeting is not allowed", async () => {
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                allowRetargeting: false,
            });

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.allowRetargeting).toBe(false);
        });
    });

    describe("enablePayloads", () => {
        it("payloads are enabled", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.enablePayloads).toBe(true);
        });

        it("payloads are not enabled", async () => {
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                enablePayloads: false,
            });

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.enablePayloads).toBe(false);
        });
    });

    describe("client callbacks", () => {
        // NOTE: These cover defaulting and wiring only. That each callback fires at
        //       the right moment, with the right payload, is covered by the ad
        //       serving, attribution and review-regression suites.
        it("defaults every callback to a no-op, so omitting them cannot throw", async () => {
            const testSdk = sdk!;

            await testSdk.initialize({
                apiKey: baseTestProps.apiKey,
                advertiserId: baseTestProps.advertiserId,
                allowRetargeting: true,
            });
            await flushPromises();

            expect(() => testSdk.onAdZonesRefreshed()).not.toThrow();
            expect(() =>
                testSdk.onAddItemsTriggered([], {
                    adId: "",
                    zoneId: "",
                    acknowledge: () => {},
                }),
            ).not.toThrow();
            expect(() =>
                testSdk.onExternalContentAdClicked("AD_ID"),
            ).not.toThrow();
            expect(() => testSdk.onPayloadsAvailable([])).not.toThrow();
            expect(() => testSdk.onAdRetrieved("1", true)).not.toThrow();
        });

        it("adopts each callback the client supplies", async () => {
            const callbacks = {
                onAdZonesRefreshed: jest.fn(),
                onAddItemsTriggered: jest.fn(),
                onExternalContentAdClicked: jest.fn(),
                onPayloadsAvailable: jest.fn(),
                onAdRetrieved: jest.fn(),
            };
            const testSdk = sdk!;

            await testSdk.initialize({ ...baseTestProps, ...callbacks });

            for (const name of Object.keys(callbacks)) {
                expect((testSdk as any)[name]).toBe((callbacks as any)[name]);
            }
        });

        it("does not let one client callback's failure stop the others", async () => {
            const consoleErrorSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => {});
            const onAdRetrieved = jest.fn(() => {
                throw new Error("client blew up");
            });
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onAdRetrieved,
            });
            await setZonesOnScreen(true);

            expect(onAdRetrieved).toHaveBeenCalled();
            // The throw is contained rather than escaping into ad serving.
            expect(getReportedAdEvents(fetchMock, "impression").length).toBe(2);

            consoleErrorSpy.mockRestore();
        });
    });

    describe("performKeywordSearch()", () => {
        it("is called without session ID being defined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.sessionId = "";

            expect(testSdk.performKeywordSearch("")).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "AdAdapted JS SDK has not been initialized.",
            );
        });

        it("is called without keyword intercepts being defined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.sessionId = "TEST_SESSION_ID";
            testSdk.keywordIntercepts = undefined;

            expect(testSdk.performKeywordSearch("")).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "No available keyword intercepts.",
            );
        });

        describe("insufficient search term provided", () => {
            it("search term not provided", () => {
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = testKeywordIntercepts;

                // @ts-ignore
                expect(testSdk.performKeywordSearch(null)).toEqual([]);
            });

            it("search term is provided but is empty string", () => {
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = testKeywordIntercepts;

                // @ts-ignore
                expect(testSdk.performKeywordSearch("")).toEqual([]);
            });

            it("search term is provided but doesn't meet required match length", () => {
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = testKeywordIntercepts;

                // @ts-ignore
                expect(testSdk.performKeywordSearch("ch")).toEqual([]);
            });
        });

        describe("search term is provided and meets the required match length", () => {
            it("has results when a search term that matches is provided", () => {
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = testKeywordIntercepts;

                milkKeywordIntercepts.sort((a, b) =>
                    a.priority > b.priority ? 1 : -1,
                );

                expect(testSdk.performKeywordSearch("mil")).toEqual(
                    milkKeywordIntercepts,
                );
                expect(fetch).toHaveBeenCalled();
            });

            it("has no results when a search term that doesn't match is provided", () => {
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = testKeywordIntercepts;

                expect(testSdk.performKeywordSearch("cheese")).toEqual([]);
                expect(fetch).toHaveBeenCalled();
            });
        });

        it("intercept events request has an error and logs a message as expected", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.sessionId = "TEST_SESSION_ID";
            testSdk.keywordIntercepts = testKeywordIntercepts;

            testSdk.performKeywordSearch("mil");

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `An error occurred while reporting the keyword intercept "matched" or "not_matched" event.`,
            );
        });
    });

    describe("reportKeywordInterceptTermsPresented()", () => {
        it("is called without session ID being defined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.sessionId = "";

            testSdk.reportKeywordInterceptTermsPresented([]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "AdAdapted JS SDK has not been initialized.",
            );
        });

        it("is called without keyword intercepts being defined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.sessionId = "TEST_SESSION_ID";
            testSdk.keywordIntercepts = undefined;

            testSdk.reportKeywordInterceptTermsPresented([]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "No available keyword intercepts.",
            );
        });

        describe("insufficient term IDs provided", () => {
            it("term IDs not provided", () => {
                const consoleErrorSpy = jest.spyOn(console, "error");
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = testKeywordIntercepts;

                // @ts-ignore
                testSdk.reportKeywordInterceptTermsPresented(null);

                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    "Invalid or empty keyword intercept list of term IDs provided.",
                );
            });

            it("term IDs list provided but empty", () => {
                const consoleErrorSpy = jest.spyOn(console, "error");
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = testKeywordIntercepts;

                testSdk.reportKeywordInterceptTermsPresented([]);

                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    "Invalid or empty keyword intercept list of term IDs provided.",
                );
            });

            it("term IDs provided but no keywords available", () => {
                const consoleErrorSpy = jest.spyOn(console, "error");
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = {
                    terms: [],
                };

                testSdk.reportKeywordInterceptTermsPresented([
                    "milk",
                    "cheese",
                ]);

                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    "Invalid or empty keyword intercept list of term IDs provided.",
                );
            });
        });

        it("intercept events request has an error and logs a message as expected", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.sessionId = "TEST_SESSION_ID";
            testSdk.keywordIntercepts = testKeywordIntercepts;

            testSdk.reportKeywordInterceptTermsPresented(["milk", "cheese"]);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `An error occurred while reporting the keyword intercept "presented" event.`,
            );
        });
    });

    describe("reportKeywordInterceptTermSelected()", () => {
        it("is called without session ID being defined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.sessionId = "";

            testSdk.reportKeywordInterceptTermSelected("");

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "AdAdapted JS SDK has not been initialized.",
            );
        });

        it("is called without keyword intercepts being defined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.sessionId = "TEST_SESSION_ID";
            testSdk.keywordIntercepts = undefined;

            testSdk.reportKeywordInterceptTermSelected("");

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "No available keyword intercepts.",
            );
        });

        describe("insufficient term IDs provided", () => {
            it("term IDs not provided", () => {
                const consoleErrorSpy = jest.spyOn(console, "error");
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = testKeywordIntercepts;

                // @ts-ignore
                testSdk.reportKeywordInterceptTermSelected(null);

                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    "Invalid keyword intercept term ID provided.",
                );
            });

            it("term IDs provided but no keywords available", () => {
                const consoleErrorSpy = jest.spyOn(console, "error");
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = {
                    terms: [],
                };

                testSdk.reportKeywordInterceptTermSelected("milk");

                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    "Invalid keyword intercept term ID provided.",
                );
            });
        });

        it("intercept events request has an error and logs a message as expected", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.sessionId = "TEST_SESSION_ID";
            testSdk.keywordIntercepts = testKeywordIntercepts;

            testSdk.reportKeywordInterceptTermSelected("milk");

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `An error occurred while reporting the keyword intercept "selected" event.`,
            );
        });
    });

    describe("acknowledgeAdded()", () => {
        /**
         * Serves an add-to-list ad into both zones, so two clicks can be left
         * outstanding at the same time.
         */
        const serveAtlAdsToBothZones = () => {
            fetchMock = mockFetch({
                adsByZoneId: {
                    [TEST_ZONE_1_ID]: testAtlAd,
                    [TEST_ZONE_2_ID]: {
                        ...testAtlAd,
                        id: "SECOND_ATL_AD",
                        impression_id: "SECOND_ATL_IMPRESSION",
                    },
                },
            });
        };

        it("logs when nothing is waiting to be acknowledged", () => {
            const consoleErrorSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => {});
            const testSdk = sdk!;

            testSdk.acknowledgeAdded();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `An ATL ad must be selected by the user in order to acknowledge item being added to list.`,
            );

            consoleErrorSpy.mockRestore();
        });

        it("reports the interaction for the ad the user actually clicked", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            fireEvent.click(document.querySelector("#zone1 .clickable-area")!);
            testSdk.acknowledgeAdded();

            await flushPromises();

            const interactions = getReportedAdEvents(fetchMock, "interaction");

            expect(interactions).toHaveLength(1);
            expect(interactions[0].ad_id).toBe(testAtlAd.id);
        });

        it("logs when the interaction request fails", async () => {
            const consoleErrorSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => {});
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fireEvent.click(document.querySelector("#zone1 .clickable-area")!);

            fetchMock = mockFetch({ rejectUrlsContaining: [AD_EVENTS_URL] });
            global.fetch = fetchMock as any;

            testSdk.acknowledgeAdded();

            await flushPromises();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `An error occurred reporting a user "interaction" event.`,
            );

            consoleErrorSpy.mockRestore();
        });

        it("resolves the oldest outstanding click, so a second one is not lost", async () => {
            serveAtlAdsToBothZones();

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            // Both zones are clicked before either is confirmed, which a single
            // shared slot could not represent: the second click overwrote the
            // first, so the first zone's interaction was lost outright and the
            // second acknowledgement had nothing left to resolve.
            fireEvent.click(document.querySelector("#zone1 .clickable-area")!);
            fireEvent.click(document.querySelector("#zone2 .clickable-area")!);

            testSdk.acknowledgeAdded();

            await flushPromises();

            // Oldest first: hosts confirm in the order they were called, so the
            // first confirmation belongs to the first click.
            expect(
                getReportedAdEvents(fetchMock, "interaction").map(
                    (event) => event.ad_id,
                ),
            ).toEqual([testAtlAd.id]);

            testSdk.acknowledgeAdded();

            await flushPromises();

            expect(
                getReportedAdEvents(fetchMock, "interaction").map(
                    (event) => event.ad_id,
                ),
            ).toEqual([testAtlAd.id, "SECOND_ATL_AD"]);
        });
    });

    describe("the add-to-list acknowledgement handle", () => {
        it("reports against its own ad, whatever else has been clicked since", async () => {
            fetchMock = mockFetch({
                adsByZoneId: {
                    [TEST_ZONE_1_ID]: testAtlAd,
                    [TEST_ZONE_2_ID]: {
                        ...testAtlAd,
                        id: "SECOND_ATL_AD",
                        impression_id: "SECOND_ATL_IMPRESSION",
                    },
                },
            });

            const handles: any[] = [];
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onAddItemsTriggered: (_items, adContent) => {
                    handles.push(adContent);
                },
            });
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            fireEvent.click(document.querySelector("#zone1 .clickable-area")!);
            fireEvent.click(document.querySelector("#zone2 .clickable-area")!);

            expect(handles).toHaveLength(2);

            // Confirmed in the opposite order to the clicks, which is the case a
            // host with an async list write can genuinely produce and the case the
            // deprecated no-argument method cannot get right.
            handles[1].acknowledge();
            handles[0].acknowledge();

            await flushPromises();

            const interactions = getReportedAdEvents(fetchMock, "interaction");

            expect(interactions.map((event) => event.ad_id)).toEqual([
                "SECOND_ATL_AD",
                testAtlAd.id,
            ]);
            expect(interactions.map((event) => event.zone_id)).toEqual([
                TEST_ZONE_2_ID,
                TEST_ZONE_1_ID,
            ]);
        });

        it("reports one interaction however many times it is acknowledged", async () => {
            const handles: any[] = [];
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onAddItemsTriggered: (_items, adContent) => {
                    handles.push(adContent);
                },
            });
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            fireEvent.click(document.querySelector("#zone1 .clickable-area")!);

            handles[0].acknowledge();
            handles[0].acknowledge();
            testSdk.acknowledgeAdded();

            await flushPromises();

            expect(getReportedAdEvents(fetchMock, "interaction")).toHaveLength(
                1,
            );
        });

        it("reports nothing when acknowledged after the SDK is unmounted", async () => {
            const handles: any[] = [];
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onAddItemsTriggered: (_items, adContent) => {
                    handles.push(adContent);
                },
            });
            await setZonesOnScreen(true);

            fireEvent.click(document.querySelector("#zone1 .clickable-area")!);

            testSdk.unmount();
            fetchMock.mockClear();

            handles[0].acknowledge();

            await flushPromises();

            expect(getReportedAdEvents(fetchMock, "interaction")).toHaveLength(
                0,
            );
        });
    });

    describe("reportItemsAddedToCart()", () => {
        it("itemNames is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.reportItemsAddedToCart(undefined, testCartId);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Both cart ID and item names list must be provided in order to report adding items to cart.",
            );
        });

        it("itemNames is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsAddedToCart([], testCartId);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Both cart ID and item names list must be provided in order to report adding items to cart.",
            );
        });

        it("cartId is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsAddedToCart(testItemNames, "");

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Both cart ID and item names list must be provided in order to report adding items to cart.",
            );
        });

        it("API request to report adding items to cart fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsAddedToCart(testItemNames, testCartId);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `An error occurred while reporting an item "user_added_to_cart" event.`,
            );
        });

        it("API request to report adding items to cart succeeds", async () => {
            const flushPromises = () => new Promise(setImmediate);
            const testSdk = sdk!;
            testSdk.deviceOs = "android";
            testSdk.advertiserId = "TEST_ADVERTISER_ID";

            testSdk.reportItemsAddedToCart(testItemNames, testCartId);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(fetch).toHaveBeenCalledWith(
                "https://ec.adadapted.com/v/1/android/events",
                expect.objectContaining({
                    body: expect.stringContaining(
                        `"udid":"${testSdk.advertiserId}"`,
                    ),
                }),
            );
        });
    });

    describe("reportItemsDeletedFromCart()", () => {
        it("itemNames is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.reportItemsDeletedFromCart(undefined, testCartId);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Both cart ID and item names list must be provided in order to report deleting items from cart.",
            );
        });

        it("itemNames is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsDeletedFromCart([], testCartId);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Both cart ID and item names list must be provided in order to report deleting items from cart.",
            );
        });

        it("cartId is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsDeletedFromCart(testItemNames, "");

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Both cart ID and item names list must be provided in order to report deleting items from cart.",
            );
        });

        it("API request to report deleting items from cart fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsDeletedFromCart(testItemNames, testCartId);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `An error occurred while reporting an item "user_deleted_from_cart" event.`,
            );
        });

        it("API request to report deleting items from cart succeeds", async () => {
            const flushPromises = () => new Promise(setImmediate);
            const testSdk = sdk!;
            testSdk.deviceOs = "android";
            testSdk.advertiserId = "TEST_ADVERTISER_ID";

            testSdk.reportItemsDeletedFromCart(testItemNames, testCartId);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(fetch).toHaveBeenCalledWith(
                "https://ec.adadapted.com/v/1/android/events",
                expect.objectContaining({
                    body: expect.stringContaining(
                        `"udid":"${testSdk.advertiserId}"`,
                    ),
                }),
            );
        });
    });

    describe("reportItemsAddedToList()", () => {
        it("itemNames is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.reportItemsAddedToList(undefined);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "The item names list must be provided in order to add items to list.",
            );
        });

        it("itemNames is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsAddedToList([]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "The item names list must be provided in order to add items to list.",
            );
        });

        it("API request to report adding items to list fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsAddedToList(testItemNames, testListName);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `An error occurred while reporting an item "user_added_to_list" event.`,
            );
        });

        it("API request to report adding items to list succeeds", async () => {
            const flushPromises = () => new Promise(setImmediate);
            const testSdk = sdk!;
            testSdk.deviceOs = "android";
            testSdk.advertiserId = "TEST_ADVERTISER_ID";

            testSdk.reportItemsAddedToList(testItemNames, testListName);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(fetch).toHaveBeenCalledWith(
                "https://ec.adadapted.com/v/1/android/events",
                expect.objectContaining({
                    body: expect.stringContaining(
                        `"udid":"${testSdk.advertiserId}"`,
                    ),
                }),
            );
        });
    });

    describe("reportItemsDeletedFromList()", () => {
        it("itemNames is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.reportItemsDeletedFromList(undefined);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "The item names list must be provided in order to delete items from list.",
            );
        });

        it("itemNames is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsDeletedFromList([]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "The item names list must be provided in order to delete items from list.",
            );
        });

        it("API request to report deleting items from list fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsDeletedFromList(testItemNames, testListName);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `An error occurred while reporting an item "user_deleted_from_list" event.`,
            );
        });

        it("API request to report deleting items from list succeeds", async () => {
            const flushPromises = () => new Promise(setImmediate);
            const testSdk = sdk!;
            testSdk.deviceOs = "android";
            testSdk.advertiserId = "TEST_ADVERTISER_ID";

            testSdk.reportItemsDeletedFromList(testItemNames, testListName);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(fetch).toHaveBeenCalledWith(
                "https://ec.adadapted.com/v/1/android/events",
                expect.objectContaining({
                    body: expect.stringContaining(
                        `"udid":"${testSdk.advertiserId}"`,
                    ),
                }),
            );
        });
    });

    describe("reportItemsCrossedOffList()", () => {
        it("itemNames is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.reportItemsCrossedOffList(undefined);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "The item names list must be provided in order to cross off items from list.",
            );
        });

        it("itemNames is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsCrossedOffList([]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "The item names list must be provided in order to cross off items from list.",
            );
        });

        it("API request to report deleting items from list fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsCrossedOffList(testItemNames, testListName);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `An error occurred while reporting an item "user_crossed_off_list" event.`,
            );
        });

        it("API request to report deleting items from list succeeds", async () => {
            const flushPromises = () => new Promise(setImmediate);
            const testSdk = sdk!;
            testSdk.deviceOs = "android";
            testSdk.advertiserId = "TEST_ADVERTISER_ID";

            testSdk.reportItemsCrossedOffList(testItemNames, testListName);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(fetch).toHaveBeenCalledWith(
                "https://ec.adadapted.com/v/1/android/events",
                expect.objectContaining({
                    body: expect.stringContaining(
                        `"udid":"${testSdk.advertiserId}"`,
                    ),
                }),
            );
        });
    });

    describe("updatePayloadStatus()", () => {
        const testPayloadStatusList: AdadaptedJsSdk.PayloadStatus[] = [
            {
                payload_id: "TEST_PAYLOAD_1",
                status: "delivered",
            },
            {
                payload_id: "TEST_PAYLOAD_2",
                status: "rejected",
            },
        ];

        it("payloadStatusList is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.updatePayloadStatus(undefined);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "The payload status list must be provided in order to update the payload(s) status.",
            );
        });

        it("payloadStatusList is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.updatePayloadStatus([]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "The payload status list must be provided in order to update the payload(s) status.",
            );
        });

        it("API request to update payload status fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.updatePayloadStatus(testPayloadStatusList);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `An error occurred while updating payload status.`,
            );
        });

        it("API request to update payload status succeeds", async () => {
            const flushPromises = () => new Promise(setImmediate);
            const testSdk = sdk!;
            testSdk.advertiserId = "TEST_ADVERTISER_ID";

            testSdk.updatePayloadStatus(testPayloadStatusList);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(fetch).toHaveBeenCalledWith(
                "https://payload.adadapted.com/v/1/tracking",
                expect.objectContaining({
                    body: expect.stringContaining(
                        `"udid":"${testSdk.advertiserId}"`,
                    ),
                }),
            );
        });
    });

    describe("updateStoreId", () => {
        it("newStoreId is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.updateStoreId(undefined);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "The store ID must be provided in order to update the SDK to use it.",
            );
        });

        it("newStoreId is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.updateStoreId("");

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "The store ID must be provided in order to update the SDK to use it.",
            );
        });

        it("records the new store ID even when there are no mounted zones to refresh", () => {
            const testSdk = sdk!;

            testSdk.updateStoreId(testStoreId);

            expect(testSdk.params?.storeId).toBe(testStoreId);
        });

        it("requests a new ad for every mounted zone using the new store ID", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            testSdk.updateStoreId(testStoreId);

            await flushPromises();

            const adRequests = getAdRequestBodies(fetchMock);

            expect(adRequests).toHaveLength(2);
            expect(adRequests.map((request) => request.zoneId).sort()).toEqual([
                TEST_ZONE_1_ID,
                TEST_ZONE_2_ID,
            ]);

            for (const adRequest of adRequests) {
                expect(adRequest.storeId).toBe(testStoreId);
            }
        });
    });

    describe("unmount()", () => {
        it("clears the zone refresh timers, the observer, and the document listeners", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            expect(
                internals(testSdk).zones[TEST_ZONE_1_ID].refreshTimerId,
            ).toBeDefined();
            expect(
                internals(testSdk).zones[TEST_ZONE_2_ID].refreshTimerId,
            ).toBeDefined();
            expect(internals(testSdk).intersectionObserver).toBeDefined();
            expect(
                internals(testSdk).documentEventAbortController,
            ).toBeDefined();

            testSdk.unmount();

            expect(internals(testSdk).zones).toEqual({});
            expect(internals(testSdk).intersectionObserver).toBeUndefined();
            expect(
                internals(testSdk).documentEventAbortController,
            ).toBeUndefined();
        });

        it("reports impression_end and zone_unmounted for every zone", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            testSdk.unmount();

            await flushPromises();

            expect(
                getReportedAdEvents(fetchMock, "impression_end"),
            ).toHaveLength(2);
            expect(
                getReportedAdEvents(fetchMock, "zone_unmounted"),
            ).toHaveLength(2);
        });

        it("does nothing and does not throw when the SDK was never initialized", () => {
            const testSdk = sdk!;

            expect(internals(testSdk).zones).toEqual({});

            testSdk.unmount();

            expect(internals(testSdk).zones).toEqual({});
            expect(internals(testSdk).intersectionObserver).toBeUndefined();
        });
    });

    describe("getSessionId()", () => {
        it("returns a client generated session ID once initialization has been triggered", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            expect(testSdk.getSessionId()).toMatch(/^JS[A-Z0-9]{32}$/);
        });

        it("is not defined if initilization has not been triggered", () => {
            const testSdk = sdk!;

            expect(testSdk.getSessionId()).toBeUndefined();
        });
    });

    describe("getAvailableKeywordIntercepts()", () => {
        it("returns the keyword terms when keywords are available", () => {
            const testSdk = sdk!;
            testSdk.keywordIntercepts = {
                terms: [
                    {
                        term_id: "TERM_ID_1",
                        term: "term1",
                        replacement: "Term 1",
                        priority: 1,
                    },
                    {
                        term_id: "TERM_ID_2",
                        term: "term2",
                        replacement: "Term 2",
                        priority: 2,
                    },
                ],
            };

            expect(testSdk.getAvailableKeywordIntercepts()).toHaveLength(2);
        });

        it("returns undefined when keywords are not available", () => {
            const testSdk = sdk!;

            expect(testSdk.getAvailableKeywordIntercepts()).toBeUndefined();
        });
    });

    describe("Ad unit interactions", () => {
        it("popover is displayed when ad action type is 'popup'", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            fireEvent.click(document.querySelector("#zone2 .clickable-area")!);

            expect(document.getElementsByClassName("AdPopup")).toHaveLength(1);
        });

        it("popover header uses the fixed title, since the API no longer serves one", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            fireEvent.click(document.querySelector("#zone2 .clickable-area")!);

            expect(
                document.getElementsByClassName("AdPopup__header-title")[0]
                    .textContent,
            ).toBe("Featured");
        });

        it("hands the add-to-list items to the client and defers the interaction event", async () => {
            const onAddItemsTriggered = jest.fn();
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onAddItemsTriggered,
            });
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            fireEvent.click(document.querySelector("#zone1 .clickable-area")!);

            await flushPromises();

            expect(onAddItemsTriggered).toHaveBeenCalledWith(
                testAtlAd.payload.detailed_list_items,
                expect.objectContaining({
                    adId: testAtlAd.id,
                    zoneId: TEST_ZONE_1_ID,
                    acknowledge: expect.any(Function),
                }),
            );

            // Clicks on add-to-list ads are only reported once the client confirms
            // the items were actually added.
            expect(getReportedAdEvents(fetchMock, "interaction")).toHaveLength(
                0,
            );

            testSdk.acknowledgeAdded();

            await flushPromises();

            expect(getReportedAdEvents(fetchMock, "interaction")).toHaveLength(
                1,
            );
        });

        it("rotates the zone on to the next ad after an interaction", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            fireEvent.click(document.querySelector("#zone1 .clickable-area")!);

            await flushPromises();

            const adRequests = getAdRequestBodies(fetchMock);

            expect(adRequests).toHaveLength(1);
            expect(adRequests[0].zoneId).toBe(TEST_ZONE_1_ID);
        });

        it("reports the external content click with the new ad ID field", async () => {
            const onExternalContentAdClicked = jest.fn();
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onExternalContentAdClicked,
            });
            await flushPromises();

            fireEvent.click(document.querySelector("#zone2 .clickable-area")!);

            expect(onExternalContentAdClicked).toHaveBeenCalledWith(
                testPopupAd.id,
            );
        });
    });

    describe("endpoints", () => {
        it("posts ad events to the v1.0.0 route, with no platform segment", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            // Event requests span two hosts: ad events go to the ad server, while
            // SDK events go to the event collector. Compare the parsed host rather
            // than a substring of the URL, so a host name appearing elsewhere in
            // the URL cannot be mistaken for the host being requested.
            const adServerEventUrls = fetchMock.mock.calls
                .map(([url]) => new URL(url as string))
                .filter(
                    (url) =>
                        url.host === "sandbox.adadapted.com" &&
                        url.pathname.endsWith("/events"),
                )
                .map((url) => url.href);

            expect(adServerEventUrls.length).toBeGreaterThan(0);

            // Everything on the ad server is v1.0.0 now. The platform segment is
            // gone from those routes, which matters because deviceOs is hardcoded
            // to "android" and was never true for a web SDK.
            for (const url of adServerEventUrls) {
                expect(url).toBe(
                    "https://sandbox.adadapted.com/v/1.0.0/ad/events",
                );
            }
        });

        it("posts intercept events to the v1.0.0 route", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            testSdk.performKeywordSearch("mil");

            await flushPromises();

            expect(fetchMock).toHaveBeenCalledWith(
                "https://sandbox.adadapted.com" + INTERCEPT_EVENTS_URL,
                expect.objectContaining({ method: "POST" }),
            );
        });

        it("keeps SDK level events on the event collector route, which has no v1.0.0", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            // Probed against the live service: /v/1/events and /v/1.0.0/events both
            // 404 on the event collector, so this stream keeps its platform segment.
            expect(fetchMock).toHaveBeenCalledWith(
                "https://sandec.adadapted.com/v/1/android/events",
                expect.objectContaining({ method: "POST" }),
            );
        });
    });

    describe("event attribution", () => {
        it("reports the served ad's identity on the impression, not just the zone", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            const impressions = getReportedAdEvents(fetchMock, "impression");

            // ad_id and impression_id are what the impression is attributed and
            // billed against, so they are asserted rather than just counted.
            expect(impressions).toHaveLength(2);
            expect(
                impressions.find((event) => event.zone_id === TEST_ZONE_1_ID),
            ).toEqual({
                ad_id: testAtlAd.id,
                zone_id: TEST_ZONE_1_ID,
                impression_id: testAtlAd.impression_id,
                event_type: "impression",
                created_at: expect.any(Number),
            });
            expect(
                impressions.find((event) => event.zone_id === TEST_ZONE_2_ID),
            ).toEqual({
                ad_id: testPopupAd.id,
                zone_id: TEST_ZONE_2_ID,
                impression_id: testPopupAd.impression_id,
                event_type: "impression",
                created_at: expect.any(Number),
            });
        });

        it("reports the same ad identity on impression_end as on the impression", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);
            await setZonesOnScreen(false);

            const ended = getReportedAdEvents(fetchMock, "impression_end").find(
                (event) => event.zone_id === TEST_ZONE_1_ID,
            );

            expect(ended.ad_id).toBe(testAtlAd.id);
            expect(ended.impression_id).toBe(testAtlAd.impression_id);
        });

        it("reports the clicked ad's identity on the interaction", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            document
                .querySelector<HTMLElement>("#zone1 .clickable-area")!
                .click();
            testSdk.acknowledgeAdded();

            await flushPromises();

            const interactions = getReportedAdEvents(fetchMock, "interaction");

            expect(interactions).toHaveLength(1);
            expect(interactions[0].ad_id).toBe(testAtlAd.id);
            expect(interactions[0].impression_id).toBe(testAtlAd.impression_id);
        });

        it("transmits the retargeting decision and the locale, which no longer ride on a session request", async () => {
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                allowRetargeting: false,
                deviceLocale: "en-GB",
            });
            await flushPromises();

            const sdkEventBody = fetchMock.mock.calls
                .filter(([url]) => (url as string).includes(SDK_EVENTS_URL))
                .map(([, init]) => JSON.parse((init as any).body))[0];

            expect(sdkEventBody.allow_retargeting).toBe(0);
            expect(sdkEventBody.locale).toBe("en-GB");
        });

        it("sends the retargeting opt-in as 1", async () => {
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                allowRetargeting: true,
            });
            await flushPromises();

            const sdkEventBody = fetchMock.mock.calls
                .filter(([url]) => (url as string).includes(SDK_EVENTS_URL))
                .map(([, init]) => JSON.parse((init as any).body))[0];

            expect(sdkEventBody.allow_retargeting).toBe(1);
        });
    });

    describe("teardown safety", () => {
        it("drops an ad response that arrives after unmount instead of reviving the zone", async () => {
            // Hold every ad request open so unmount() lands while they are all in
            // flight, and keep all the resolvers so none is left pending.
            const pendingResolvers: Array<() => void> = [];

            fetchMock = jest.fn((url: string) => {
                if (url.includes(AD_RETRIEVE_URL)) {
                    return new Promise((resolve) => {
                        pendingResolvers.push(() =>
                            resolve({
                                ok: true,
                                status: 200,
                                json: () =>
                                    Promise.resolve(buildAdResponse(testAtlAd)),
                            }),
                        );
                    });
                }

                return jsonResponse({});
            }) as FetchMock;

            // @ts-ignore
            global.fetch = fetchMock;

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            const zones = Object.keys(internals(testSdk).zones).map(
                (zoneId) => internals(testSdk).zones[zoneId],
            );

            expect(zones.length).toBe(2);
            expect(pendingResolvers.length).toBe(2);

            zones.forEach((zone) => {
                zone.isIntersecting = true;
            });

            testSdk.unmount();

            fetchMock.mockClear();
            pendingResolvers.forEach((release) => release());

            await flushPromises();
            await flushPromises();

            // Nothing may be rendered, impressed or timed for a zone the client has
            // already discarded, and no follow-up request may go out.
            expect(document.getElementById("zone1")!.innerHTML).toBe("");
            expect(document.getElementById("zone2")!.innerHTML).toBe("");
            expect(getReportedAdEvents(fetchMock, "impression")).toHaveLength(
                0,
            );
            expect(getAdRequestBodies(fetchMock)).toHaveLength(0);

            for (const zone of zones) {
                expect(zone.timerRunning).toBe(false);
                expect(zone.currentAd).toBeUndefined();
            }
        });

        it("removes an open popover and restores body scrolling on unmount", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            document
                .querySelector<HTMLElement>("#zone2 .clickable-area")!
                .click();

            expect(document.getElementsByClassName("AdPopup")).toHaveLength(1);
            expect(document.body.style.overflow).toBe("hidden");

            testSdk.unmount();

            expect(document.getElementsByClassName("AdPopup")).toHaveLength(0);
            expect(document.body.style.overflow).not.toBe("hidden");
        });
    });

    describe("resilience", () => {
        it("keeps serving when a client callback throws", async () => {
            const consoleErrorSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => {});
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onAdRetrieved: () => {
                    throw new Error("client blew up");
                },
            });
            await setZonesOnScreen(true);

            // The client's failure must not cost the zone its refresh timer or its
            // impression, or the zone would sit dead for the life of the page. Both
            // are armed before control passes to client code, and the throw is
            // contained rather than escaping into the SDK.
            expect(internals(testSdk).zones[TEST_ZONE_1_ID].timerRunning).toBe(
                true,
            );
            expect(
                internals(testSdk).zones[TEST_ZONE_1_ID].impressionTracked,
            ).toBe(true);
            expect(
                getReportedAdEvents(fetchMock, "impression").length,
            ).toBeGreaterThan(0);

            // And the zone keeps rotating afterwards rather than stalling. The
            // countdown has to be paused first, because resuming a running timer is
            // correctly a no-op.
            await setZonesOnScreen(false);

            fetchMock.mockClear();
            internals(testSdk).zones[TEST_ZONE_1_ID].adFetchedAt = 0;

            await setZonesOnScreen(true);

            expect(
                getAdRequestBodies(fetchMock).filter(
                    (request) => request.zoneId === TEST_ZONE_1_ID,
                ).length,
            ).toBeGreaterThan(0);

            consoleErrorSpy.mockRestore();
        });

        it("re-points a zone at a replacement container with the same element ID", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            const originalElement = document.getElementById("zone1")!;

            // Stand in for a framework remount: same ID, brand new node.
            const replacement = document.createElement("div");
            replacement.id = "zone1";
            originalElement.replaceWith(replacement);

            getObserver().trigger(originalElement, false);

            await flushPromises();

            // The zone survives and its ad is put back into the new node.
            expect(internals(testSdk).zones[TEST_ZONE_1_ID]).toBeDefined();
            expect(
                internals(testSdk).zones[TEST_ZONE_1_ID].containerElement,
            ).toBe(replacement);
            expect(replacement.querySelector("iframe.ad-frame")).toBeTruthy();
        });

        it("reports one interaction for a double click on the same ad", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            // zone2 carries a popover ad, which reports its interaction on click
            // rather than deferring it, so a duplicate is visible immediately.
            const clickable = document.querySelector<HTMLElement>(
                "#zone2 .clickable-area",
            )!;

            clickable.click();
            clickable.click();

            await flushPromises();

            expect(getReportedAdEvents(fetchMock, "interaction")).toHaveLength(
                1,
            );
            // A second popover would stack on the first, both sharing one element
            // ID, leaving the user unable to dismiss the top one.
            expect(document.getElementsByClassName("AdPopup")).toHaveLength(1);
        });

        it("applies a store change that happened while a request was in flight", async () => {
            // Every initial ad request is held open, so the store change lands while
            // both zones still have a request outstanding.
            const pendingResolvers: Array<() => void> = [];
            let holdRequests = true;

            fetchMock = jest.fn((url: string) => {
                if (url.includes(AD_RETRIEVE_URL)) {
                    if (holdRequests) {
                        return new Promise((resolve) => {
                            pendingResolvers.push(() =>
                                resolve({
                                    ok: true,
                                    status: 200,
                                    json: () =>
                                        Promise.resolve(
                                            buildAdResponse(testAtlAd),
                                        ),
                                }),
                            );
                        });
                    }

                    return jsonResponse(buildAdResponse(testAtlAd));
                }

                return jsonResponse({});
            }) as FetchMock;

            // @ts-ignore
            global.fetch = fetchMock;

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            Object.keys(internals(testSdk).zones).forEach((zoneId) => {
                internals(testSdk).zones[zoneId].isIntersecting = true;
            });

            expect(pendingResolvers.length).toBeGreaterThan(0);

            // Change the store while those requests are still outstanding.
            testSdk.updateStoreId(testStoreId);

            expect(
                getAdRequestBodies(fetchMock).some(
                    (request) => request.storeId === testStoreId,
                ),
            ).toBe(false);

            // Let the outstanding requests settle, which should drain the queued
            // refetch rather than dropping the store change.
            holdRequests = false;
            pendingResolvers.forEach((release) => release());

            await flushPromises();
            await flushPromises();

            expect(
                getAdRequestBodies(fetchMock).filter(
                    (request) => request.storeId === testStoreId,
                ).length,
            ).toBeGreaterThan(0);
        });
    });

    describe("session handling", () => {
        it("generates a session ID in the JS + 32 character format", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            expect(testSdk.getSessionId()).toMatch(/^JS[A-Z0-9]{32}$/);
        });

        it("never calls a session endpoint", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            const sessionCalls = fetchMock.mock.calls.filter(([url]) =>
                (url as string).includes("session"),
            );

            expect(sessionCalls).toHaveLength(0);
        });

        it("reports session events as sdk events, not as user actions", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            const created = getReportedSdkEvents(fetchMock, "SESSION_CREATED");

            expect(created).toHaveLength(1);

            // Reporting tells the SDK's own lifecycle apart from something the
            // user did by this field, so "app" would file a session start as user
            // activity. The native SDKs send "sdk" here.
            expect(created[0].event_source).toBe("sdk");
        });

        it("reports SESSION_CREATED with the new session ID when there is no stored session", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            const created = getReportedSdkEvents(fetchMock, "SESSION_CREATED");

            expect(created).toHaveLength(1);
            expect(created[0].event_params.sessionId).toBe(
                testSdk.getSessionId(),
            );
            expect(
                getReportedSdkEvents(fetchMock, "SESSION_RESUMED"),
            ).toHaveLength(0);
        });

        it("persists the session so a later page load resumes the same ID", async () => {
            await sdk!.initialize(baseTestProps);
            await flushPromises();

            const originalSessionId = sdk!.getSessionId();

            sdk!.unmount();

            // A second SDK instance stands in for a fresh page load.
            const reloadedSdk = createSdk();

            fetchMock.mockClear();

            await reloadedSdk.initialize(baseTestProps);
            await flushPromises();

            expect(reloadedSdk.getSessionId()).toBe(originalSessionId);
            expect(
                getReportedSdkEvents(fetchMock, "SESSION_RESUMED"),
            ).toHaveLength(1);
            expect(
                getReportedSdkEvents(fetchMock, "SESSION_CREATED"),
            ).toHaveLength(0);

            reloadedSdk.unmount();
        });

        it("generates a new session ID once the stored session has been inactive for 30 minutes", async () => {
            await sdk!.initialize(baseTestProps);
            await flushPromises();

            const originalSessionId = sdk!.getSessionId();
            const storageKey = Object.keys(localStorage).find((key) =>
                key.startsWith("aa-session-v3-"),
            )!;
            const storedSession = JSON.parse(localStorage.getItem(storageKey)!);

            // Age the stored session past the 30 minute window.
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    ...storedSession,
                    lastActiveAt: storedSession.lastActiveAt - 31 * 60 * 1000,
                }),
            );

            sdk!.unmount();

            const reloadedSdk = createSdk();

            fetchMock.mockClear();

            await reloadedSdk.initialize(baseTestProps);
            await flushPromises();

            expect(reloadedSdk.getSessionId()).not.toBe(originalSessionId);
            expect(reloadedSdk.getSessionId()).toMatch(/^JS[A-Z0-9]{32}$/);
            expect(
                getReportedSdkEvents(fetchMock, "SESSION_CREATED"),
            ).toHaveLength(1);

            reloadedSdk.unmount();
        });

        it("reports SESSION_RESUMED when the browser tab is re-focused", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            fetchMock.mockClear();

            setDocumentVisibility("hidden");
            setDocumentVisibility("visible");

            await flushPromises();

            expect(
                getReportedSdkEvents(fetchMock, "SESSION_RESUMED"),
            ).toHaveLength(1);
            expect(testSdk.getSessionId()).toMatch(/^JS[A-Z0-9]{32}$/);
        });

        it("keeps the session ID stable across a re-focus", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            const originalSessionId = testSdk.getSessionId();

            setDocumentVisibility("hidden");
            setDocumentVisibility("visible");

            await flushPromises();

            expect(testSdk.getSessionId()).toBe(originalSessionId);
        });
    });

    describe("review regressions", () => {
        it("does not rotate the session while the tab stays visible", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            const originalSessionId = testSdk.getSessionId();

            // Stand in for a tab that has been open and in use for longer than the
            // session window. Nothing refreshed either copy of the stamp, so both go
            // stale together - that is exactly the state the bug produced. Being
            // visible IS activity, so the window must slide and the session survive
            // rather than the visit splitting in two.
            const storageKey = Object.keys(localStorage).find((key) =>
                key.startsWith("aa-session-v3-"),
            )!;
            const storedSession = JSON.parse(localStorage.getItem(storageKey)!);
            const staleTimestamp = Date.now() - 31 * 60 * 1000;

            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    ...storedSession,
                    lastActiveAt: staleTimestamp,
                }),
            );
            internals(testSdk).sessionLastActiveAt = staleTimestamp;
            internals(testSdk).sessionPersistedAt = staleTimestamp;

            fetchMock.mockClear();
            testSdk.reportItemsAddedToList(["Milk"], "My List");

            await flushPromises();

            expect(testSdk.getSessionId()).toBe(originalSessionId);
            expect(
                getReportedSdkEvents(fetchMock, "SESSION_CREATED"),
            ).toHaveLength(0);
        });

        it("does rotate the session once the tab has been hidden past the window", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            const originalSessionId = testSdk.getSessionId();

            setDocumentVisibility("hidden");

            // Age both the in-memory stamp and the stored record, which is what a
            // tab genuinely left hidden for half an hour looks like. Ageing only the
            // in-memory copy would be resolved back to the fresh stored session.
            const storageKey = Object.keys(localStorage).find((key) =>
                key.startsWith("aa-session-v3-"),
            )!;
            const storedSession = JSON.parse(localStorage.getItem(storageKey)!);
            const staleTimestamp = Date.now() - 31 * 60 * 1000;

            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    ...storedSession,
                    lastActiveAt: staleTimestamp,
                }),
            );
            internals(testSdk).sessionLastActiveAt = staleTimestamp;

            fetchMock.mockClear();
            testSdk.reportItemsAddedToList(["Milk"], "My List");

            await flushPromises();

            expect(testSdk.getSessionId()).not.toBe(originalSessionId);
            expect(
                getReportedSdkEvents(fetchMock, "SESSION_CREATED"),
            ).toHaveLength(1);
        });

        it("keys the stored session by API key and environment", async () => {
            await sdk!.initialize(baseTestProps);
            await flushPromises();

            const firstId = sdk!.getSessionId();
            const firstKey = Object.keys(localStorage).find((key) =>
                key.startsWith("aa-session-v3-"),
            )!;

            sdk!.unmount();

            // A different app must not inherit the first app's session.
            const otherSdk = createSdk();

            await otherSdk.initialize({
                ...baseTestProps,
                apiKey: "A_COMPLETELY_DIFFERENT_KEY",
            });
            await flushPromises();

            const secondKey = Object.keys(localStorage).find(
                (key) => key.startsWith("aa-session-v3-") && key !== firstKey,
            );

            expect(secondKey).toBeDefined();
            expect(otherSdk.getSessionId()).not.toBe(firstId);
        });

        it("keys the stored session by environment as well as API key", async () => {
            await sdk!.initialize({ ...baseTestProps, apiEnv: "prod" });
            await flushPromises();

            const prodId = sdk!.getSessionId();
            const prodKey = Object.keys(localStorage).find((key) =>
                key.startsWith("aa-session-v3-"),
            )!;

            sdk!.unmount();

            // Same app, same key, other environment. A dev session resumed against
            // prod would report activity for a session prod never issued.
            const devSdk = createSdk();

            await devSdk.initialize({ ...baseTestProps, apiEnv: "dev" });
            await flushPromises();

            const devKey = Object.keys(localStorage).find(
                (key) => key.startsWith("aa-session-v3-") && key !== prodKey,
            );

            expect(devKey).toBeDefined();
            expect(devSdk.getSessionId()).not.toBe(prodId);

            devSdk.unmount();
        });

        it("does not hand one user's session to the next user on the same browser", async () => {
            await sdk!.initialize({
                ...baseTestProps,
                advertiserId: "FIRST_USER_UDID",
            });
            await flushPromises();

            const firstUserSessionId = sdk!.getSessionId();

            sdk!.unmount();

            // Same app, same browser profile, well inside the session window - a
            // shared device, or one person signing out and someone else signing in.
            // Local storage is shared by everyone who uses the profile, so keying
            // the session on the app alone would hand this user the last one's
            // session and report them both under a single ID.
            const secondUserSdk = createSdk();

            await secondUserSdk.initialize({
                ...baseTestProps,
                advertiserId: "SECOND_USER_UDID",
            });
            await flushPromises();

            expect(secondUserSdk.getSessionId()).not.toBe(firstUserSessionId);
            expect(
                getReportedSdkEvents(fetchMock, "SESSION_CREATED").length,
            ).toBeGreaterThan(0);

            secondUserSdk.unmount();
        });

        it("gives a returning user their own session back", async () => {
            await sdk!.initialize({
                ...baseTestProps,
                advertiserId: "FIRST_USER_UDID",
            });
            await flushPromises();

            const firstUserSessionId = sdk!.getSessionId();

            sdk!.unmount();

            // The other half of the same rule: scoping to the user must not cost a
            // returning user their own session.
            const returningSdk = createSdk();

            await returningSdk.initialize({
                ...baseTestProps,
                advertiserId: "FIRST_USER_UDID",
            });
            await flushPromises();

            expect(returningSdk.getSessionId()).toBe(firstUserSessionId);

            returningSdk.unmount();
        });

        it("keeps the session when only the store changes", async () => {
            await sdk!.initialize({
                ...baseTestProps,
                params: { storeId: "STORE_A" },
            });
            await flushPromises();

            const originalSessionId = sdk!.getSessionId();

            sdk!.unmount();

            // Store and recipe context ride on each ad request rather than on the
            // session, and updateStoreId() changes them without starting a new one.
            // Keying the session on them would split one shopper browsing two
            // stores into two sessions.
            const otherStoreSdk = createSdk();

            await otherStoreSdk.initialize({
                ...baseTestProps,
                params: { storeId: "STORE_B" },
            });
            await flushPromises();

            expect(otherStoreSdk.getSessionId()).toBe(originalSessionId);

            otherStoreSdk.unmount();
        });

        it("clears a session left behind by a version that keyed on the app alone", async () => {
            // The old key hashed the API key by itself; the current one hashes the
            // API key and the advertiser ID together, so it has to be built the
            // same way the SDK builds it rather than derived from the new key.
            const digest = await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(baseTestProps.apiKey),
            );
            const appOnlyKey = `aa-session-v2-dev-${Array.from(
                new Uint8Array(digest),
            )
                .map((byte) => byte.toString(16).padStart(2, "0"))
                .join("")}`;

            // Written by the previous version under the app-only key, so it belongs
            // to whoever used this browser last. It must not survive to be resumed.
            localStorage.setItem(
                appOnlyKey,
                JSON.stringify({
                    sessionId: "JSSTALESESSIONFROMTHELASTUSERAAAA",
                    createdAt: Date.now(),
                    lastActiveAt: Date.now(),
                }),
            );

            await sdk!.initialize(baseTestProps);
            await flushPromises();

            expect(localStorage.getItem(appOnlyKey)).toBeNull();
            expect(sdk!.getSessionId()).not.toBe(
                "JSSTALESESSIONFROMTHELASTUSERAAAA",
            );
        });

        it("hands the popover's own add-to-list an inert handle", async () => {
            // The bridge only runs when the creative has already put an AdAdapted
            // object on the iframe, which jsdom cannot do on its own. Stubbing the
            // contentWindow getter is what makes this path reachable at all.
            const iframeWindow: any = {
                AdAdapted: { addItemToList: () => {} },
            };
            const contentWindowSpy = jest
                .spyOn(HTMLIFrameElement.prototype, "contentWindow", "get")
                .mockReturnValue(iframeWindow);

            try {
                const handles: any[] = [];
                const testSdk = sdk!;

                await testSdk.initialize({
                    ...baseTestProps,
                    onAddItemsTriggered: (_items, adContent) => {
                        handles.push(adContent);
                    },
                });
                await setZonesOnScreen(true);

                // Zone 2 carries a popup ad, so this reports the interaction now and
                // opens the popover.
                fireEvent.click(
                    document.querySelector("#zone2 .clickable-area")!,
                );

                await flushPromises();

                expect(
                    getReportedAdEvents(fetchMock, "interaction"),
                ).toHaveLength(1);

                fetchMock.mockClear();

                // The creative adds an item from inside the popover.
                iframeWindow.AdAdapted.addItemToList(
                    "PAYLOAD_ID",
                    "TRACKING_ID",
                    "Tabasco Original",
                    "",
                    "",
                    "011210000155",
                    "",
                    "",
                    "",
                );

                expect(handles).toHaveLength(1);

                handles[0].acknowledge();

                await flushPromises();

                // Nothing further: opening the popover was the interaction and it
                // was counted then. Reporting again would bill the click twice.
                expect(
                    getReportedAdEvents(fetchMock, "interaction"),
                ).toHaveLength(0);
            } finally {
                contentWindowSpy.mockRestore();
            }
        });

        it("keeps retrying, and stays clickable, after a refresh fails", async () => {
            jest.useFakeTimers({ doNotFake: ["setImmediate"] });

            try {
                const handles: any[] = [];
                const testSdk = sdk!;

                await testSdk.initialize({
                    ...baseTestProps,
                    onAddItemsTriggered: (_items, adContent) => {
                        handles.push(adContent);
                    },
                });
                await setZonesOnScreen(true);

                // The failure has to be in flight before the click, because it is
                // the click's own rotation that must fail. A click sets the guard
                // that stops a second click on the same ad, and a rotation that
                // succeeds clears it again - so a later failure would find the
                // guard already down and prove nothing.
                fetchMock = mockFetch({
                    rejectUrlsContaining: [AD_RETRIEVE_URL],
                });
                global.fetch = fetchMock as any;

                fireEvent.click(
                    document.querySelector("#zone1 .clickable-area")!,
                );

                await flushPromises();

                expect(handles).toHaveLength(1);

                // Still the same ad, not merely "something in the container".
                expect(document.querySelector("#zone1 iframe")).not.toBeNull();

                // A zone that keeps its ad has to keep asking, or it freezes on that
                // ad for the life of the page.
                fetchMock.mockClear();

                jest.advanceTimersByTime(testAtlAd.refresh_time * 1000);

                await flushPromises();

                expect(
                    getAdRequestBodies(fetchMock).filter(
                        (request) => request.zoneId === TEST_ZONE_1_ID,
                    ).length,
                ).toBeGreaterThan(0);

                // And the ad the user can still see has to stay clickable. The guard
                // that stops a double click is normally released when the next ad
                // displays, which never happened here.
                fireEvent.click(
                    document.querySelector("#zone1 .clickable-area")!,
                );

                expect(handles).toHaveLength(2);
            } finally {
                jest.useRealTimers();
            }
        });

        it("does not report a filled zone as unfilled when its refresh fails", async () => {
            jest.useFakeTimers({ doNotFake: ["setImmediate"] });

            try {
                const testSdk = sdk!;

                await testSdk.initialize(baseTestProps);
                await setZonesOnScreen(true);

                fetchMock = mockFetch({
                    rejectUrlsContaining: [AD_RETRIEVE_URL],
                });
                global.fetch = fetchMock as any;

                jest.advanceTimersByTime(testAtlAd.refresh_time * 1000);

                await flushPromises();

                // The zone is still showing an ad. Calling it unfilled would count a
                // zone that is working as one with nothing to show.
                expect(
                    getReportedAdEvents(fetchMock, "zone_unfilled").filter(
                        (event) => event.zone_id === TEST_ZONE_1_ID,
                    ),
                ).toHaveLength(0);
            } finally {
                jest.useRealTimers();
            }
        });

        it("takes a fresh ad when a page comes back from the back forward cache", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            const firstImpressions = getReportedAdEvents(
                fetchMock,
                "impression",
            ).length;

            expect(firstImpressions).toBeGreaterThan(0);

            window.dispatchEvent(
                Object.assign(new Event("pagehide"), { persisted: true }),
            );

            expect(
                getReportedAdEvents(fetchMock, "impression_end").length,
            ).toBeGreaterThan(0);

            fetchMock.mockClear();

            window.dispatchEvent(
                Object.assign(new Event("pageshow"), { persisted: true }),
            );

            await flushPromises();

            // Going away closed the impression on the ad that was showing, and it
            // cannot be counted again under the same impression ID. Leaving it would
            // put an ad back in front of the user that counts for nothing.
            expect(getAdRequestBodies(fetchMock).length).toBeGreaterThan(0);
            expect(
                getReportedAdEvents(fetchMock, "impression").length,
            ).toBeGreaterThan(0);
        });

        it("replaces the session once, even when closing it out reports events", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            const originalSessionId = testSdk.getSessionId();

            // Blurred rather than hidden. Hiding the tab closes every impression on
            // the way out, so by the time the session rotates there is nothing left
            // to report and the re-entrant path is never reached. A blurred page is
            // still visible and still serving, so its impressions are open - and
            // closing them reports events, and reporting an event asks for the
            // session ID, which is where a second rotation can start from inside
            // the first.
            window.dispatchEvent(new Event("blur"));

            const storageKey = Object.keys(localStorage).find((key) =>
                key.startsWith("aa-session-v3-"),
            )!;
            const storedSession = JSON.parse(localStorage.getItem(storageKey)!);
            const staleTimestamp = Date.now() - 31 * 60 * 1000;

            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    ...storedSession,
                    lastActiveAt: staleTimestamp,
                }),
            );
            internals(testSdk).sessionLastActiveAt = staleTimestamp;

            fetchMock.mockClear();
            testSdk.reportItemsAddedToList(["Milk"], "My List");

            await flushPromises();

            expect(testSdk.getSessionId()).not.toBe(originalSessionId);

            // Exactly one replacement, not one per event reported while closing out
            // the old session.
            expect(
                getReportedSdkEvents(fetchMock, "SESSION_CREATED"),
            ).toHaveLength(1);

            // And the impression that belonged to the outgoing session is reported
            // under it, not under the session that replaced it.
            const closings = fetchMock.mock.calls
                .filter(([url]) => (url as string).includes(AD_EVENTS_URL))
                .map(([, init]) => JSON.parse((init as any).body))
                .filter((request) =>
                    request.events.some(
                        (event: any) => event.event_type === "impression_end",
                    ),
                );

            expect(closings.length).toBeGreaterThan(0);

            for (const request of closings) {
                expect(request.session_id).toBe(originalSessionId);
            }
        });

        it("abandons a pending click when the SDK is initialized again", async () => {
            const handles: any[] = [];
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onAddItemsTriggered: (_items, adContent) => {
                    handles.push(adContent);
                },
            });
            await setZonesOnScreen(true);

            fireEvent.click(document.querySelector("#zone1 .clickable-area")!);

            expect(handles).toHaveLength(1);

            await testSdk.initialize({
                ...baseTestProps,
                onAddItemsTriggered: (_items, adContent) => {
                    handles.push(adContent);
                },
            });
            await flushPromises();
            fetchMock.mockClear();

            // The click belonged to the run that has been replaced.
            handles[0].acknowledge();

            await flushPromises();

            expect(getReportedAdEvents(fetchMock, "interaction")).toHaveLength(
                0,
            );
        });

        it("reports the deferred acknowledgement with keepalive", async () => {
            const handles: any[] = [];
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onAddItemsTriggered: (_items, adContent) => {
                    handles.push(adContent);
                },
            });
            await setZonesOnScreen(true);

            fireEvent.click(document.querySelector("#zone1 .clickable-area")!);

            fetchMock.mockClear();

            handles[0].acknowledge();

            await flushPromises();

            const interactionCalls = fetchMock.mock.calls.filter(([, init]) =>
                JSON.parse((init as any).body)?.events?.some(
                    (event: any) => event.event_type === "interaction",
                ),
            );

            expect(interactionCalls.length).toBeGreaterThan(0);

            for (const [, init] of interactionCalls) {
                expect((init as any).keepalive).toBe(true);
            }
        });

        it("drops the oldest pending click once too many go unacknowledged", async () => {
            const consoleWarnSpy = jest
                .spyOn(console, "warn")
                .mockImplementation(() => {});

            fetchMock = mockFetch({
                adsByZoneId: {
                    [TEST_ZONE_1_ID]: testAtlAd,
                    [TEST_ZONE_2_ID]: {
                        ...testAtlAd,
                        id: "SECOND_ATL_AD",
                        impression_id: "SECOND_ATL_IMPRESSION",
                    },
                },
            });

            try {
                const testSdk = sdk!;

                await testSdk.initialize(baseTestProps);
                await setZonesOnScreen(true);

                // The oldest click is zone 1's, and everything after it is zone 2's,
                // so the ad named in the warning says which end of the queue was
                // trimmed.
                fireEvent.click(
                    document.querySelector("#zone1 .clickable-area")!,
                );

                await flushPromises();

                for (let click = 0; click < 25; click++) {
                    fireEvent.click(
                        document.querySelector("#zone2 .clickable-area")!,
                    );

                    await flushPromises();
                }

                expect(consoleWarnSpy).toHaveBeenCalledWith(
                    expect.stringContaining(testAtlAd.id),
                );
            } finally {
                consoleWarnSpy.mockRestore();
            }
        });

        it("measures a report in bytes, not characters, against the keepalive limit", async () => {
            const consoleWarnSpy = jest
                .spyOn(console, "warn")
                .mockImplementation(() => {});
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            fetchMock.mockClear();

            // Comfortably under the limit counted as characters, over it counted as
            // the UTF-8 bytes the browser actually weighs.
            const multiByteItems = Array.from(
                { length: 200 },
                (_, index) => `${"\u4f60".repeat(60)} ${index}`,
            );

            testSdk.reportItemsAddedToList(multiByteItems, "");

            await flushPromises();

            const [, init] = fetchMock.mock.calls.find(([url]) =>
                (url as string).includes(SDK_EVENTS_URL),
            )!;
            const body = (init as any).body as string;
            const keepaliveByteLimit = 48 * 1024;

            // Asserted so the fixture cannot drift into proving nothing: the whole
            // point is a body that is under the limit counted as characters and over
            // it counted as bytes.
            expect(body.length).toBeLessThan(keepaliveByteLimit);
            expect(new TextEncoder().encode(body).length).toBeGreaterThan(
                keepaliveByteLimit,
            );

            expect((init as any).keepalive).toBe(false);

            consoleWarnSpy.mockRestore();
        });

        it("clears the oldest cached session shape too", async () => {
            const digest = await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(baseTestProps.apiKey),
            );
            const appOnlyHash = Array.from(new Uint8Array(digest))
                .map((byte) => byte.toString(16).padStart(2, "0"))
                .join("");

            // The very first shape, whose payload carried server issued zones and
            // ads. It does not parse as a session at all, so it is dead weight in
            // every user's browser until something removes it.
            const originalKey = `aa-session-dev-${appOnlyHash}`;

            localStorage.setItem(originalKey, JSON.stringify({ zones: {} }));

            await sdk!.initialize(baseTestProps);
            await flushPromises();

            expect(localStorage.getItem(originalKey)).toBeNull();
        });

        it("stamps the session on every ad event, not just the ad request", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            const sessionId = testSdk.getSessionId();

            // The session rides on the request envelope rather than the individual
            // event, so it is the envelope that has to carry it.
            const eventRequests = fetchMock.mock.calls
                .filter(([url]) => (url as string).includes(AD_EVENTS_URL))
                .map(([, init]) => JSON.parse((init as any).body));

            expect(eventRequests.length).toBeGreaterThan(0);
            expect(sessionId).toBeTruthy();

            for (const request of eventRequests) {
                expect({
                    events: request.events.length > 0,
                    session_id: request.session_id,
                }).toEqual({ events: true, session_id: sessionId });
            }
        });

        it("keeps the ad on screen when a refresh request fails", async () => {
            jest.useFakeTimers({ doNotFake: ["setImmediate"] });

            try {
                const testSdk = sdk!;

                await testSdk.initialize(baseTestProps);
                await setZonesOnScreen(true);

                const container = document.getElementById("zone1")!;

                expect(container.innerHTML).not.toBe("");

                // Every later request fails. The ad already on the page was paid
                // for and is still perfectly good, so a transient failure must not
                // take it down and leave the slot empty for a whole cycle.
                fetchMock = mockFetch({
                    rejectUrlsContaining: [AD_RETRIEVE_URL],
                });
                global.fetch = fetchMock as any;

                jest.advanceTimersByTime(testAtlAd.refresh_time * 1000);

                await flushPromises();

                expect(container.innerHTML).not.toBe("");
                expect(
                    getReportedAdEvents(fetchMock, "impression_end"),
                ).toHaveLength(0);
            } finally {
                jest.useRealTimers();
            }
        });

        it("reports zone_unfilled again the next time a zone fails to fill", async () => {
            jest.useFakeTimers({ doNotFake: ["setImmediate"] });

            try {
                fetchMock = mockFetch({ adsByZoneId: {} });

                const testSdk = sdk!;

                await testSdk.initialize(baseTestProps);
                await setZonesOnScreen(true);

                const firstRound = getReportedAdEvents(
                    fetchMock,
                    "zone_unfilled",
                ).filter((event) => event.zone_id === TEST_ZONE_1_ID);

                expect(firstRound).toHaveLength(1);

                // A zone that no-fills on every rotation must say so every time,
                // not once for the life of the page.
                jest.advanceTimersByTime(testNoFillAd.refresh_time * 1000);

                await flushPromises();

                expect(
                    getReportedAdEvents(fetchMock, "zone_unfilled").filter(
                        (event) => event.zone_id === TEST_ZONE_1_ID,
                    ),
                ).toHaveLength(2);
            } finally {
                jest.useRealTimers();
            }
        });

        it("reports an interaction for each ad a zone shows, not just its first", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            // Zone 1 carries an add-to-list ad: the click hands the items over and
            // rotates the zone, and the interaction lands once the host confirms.
            fireEvent.click(document.querySelector("#zone1 .clickable-area")!);
            testSdk.acknowledgeAdded();

            await flushPromises();

            expect(getReportedAdEvents(fetchMock, "interaction")).toHaveLength(
                1,
            );

            // The per-ad guard has to re-arm when the replacement ad displays, or
            // the zone goes silent for every ad after its first.
            fireEvent.click(document.querySelector("#zone1 .clickable-area")!);
            testSdk.acknowledgeAdded();

            await flushPromises();

            expect(getReportedAdEvents(fetchMock, "interaction")).toHaveLength(
                2,
            );
        });

        it("refreshes only the zones a recipe context names", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            testSdk.updateRecipeContextId("recipe-7", [TEST_ZONE_1_ID]);

            await flushPromises();

            const refreshed = getAdRequestBodies(fetchMock);

            expect(refreshed.map((request) => request.zoneId)).toEqual([
                TEST_ZONE_1_ID,
            ]);
            expect(refreshed[0].contextId).toBe("recipe-7");
        });

        it("sends the ad interaction with keepalive", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            // A click routinely hands control straight to the host, which navigates
            // away and takes any in flight plain request with it. Zone 2 carries a
            // popup ad, which reports its interaction on the click itself.
            fireEvent.click(document.querySelector("#zone2 .clickable-area")!);

            await flushPromises();

            const interactionCalls = fetchMock.mock.calls.filter(([, init]) =>
                JSON.parse((init as any).body)?.events?.some(
                    (event: any) => event.event_type === "interaction",
                ),
            );

            expect(interactionCalls.length).toBeGreaterThan(0);

            for (const [, init] of interactionCalls) {
                expect((init as any).keepalive).toBe(true);
            }
        });

        it("drops keepalive rather than losing a report too large to send with it", async () => {
            const consoleWarnSpy = jest
                .spyOn(console, "warn")
                .mockImplementation(() => {});
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            fetchMock.mockClear();

            // The browser gives the whole document one 64KB budget for keepalive
            // bodies and rejects outright past it, losing the entire report. Every
            // item becomes its own event object, so a big enough list gets there.
            const manyItems = Array.from(
                { length: 900 },
                (_, index) => `Item number ${index} with a realistic long name`,
            );

            testSdk.reportItemsAddedToList(manyItems, "Bulk reorder");

            await flushPromises();

            const [, init] = fetchMock.mock.calls.find(([url]) =>
                (url as string).includes(SDK_EVENTS_URL),
            )!;

            expect((init as any).keepalive).toBe(false);
            expect(consoleWarnSpy).toHaveBeenCalled();

            consoleWarnSpy.mockRestore();
        });

        it("still sends a normally sized report with keepalive", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            fetchMock.mockClear();

            testSdk.reportItemsAddedToList(["Milk", "Eggs"], "Weekly shop");

            await flushPromises();

            const [, init] = fetchMock.mock.calls.find(([url]) =>
                (url as string).includes(SDK_EVENTS_URL),
            )!;

            expect((init as any).keepalive).toBe(true);
        });

        it("lets the session window elapse while the page is not the user's focus", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            const originalSessionId = testSdk.getSessionId();

            // The tab is still visible, so the zones keep serving by design. Every
            // one of those requests asks for the session, and treating that as
            // activity would slide the window forward forever - a page left on a
            // second monitor could never reach the end of its own session.
            window.dispatchEvent(new Event("blur"));

            const storageKey = Object.keys(localStorage).find((key) =>
                key.startsWith("aa-session-v3-"),
            )!;
            const storedSession = JSON.parse(localStorage.getItem(storageKey)!);
            const staleTimestamp = Date.now() - 31 * 60 * 1000;

            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    ...storedSession,
                    lastActiveAt: staleTimestamp,
                }),
            );
            internals(testSdk).sessionLastActiveAt = staleTimestamp;

            fetchMock.mockClear();
            testSdk.reportItemsAddedToList(["Milk"], "My List");

            await flushPromises();

            expect(testSdk.getSessionId()).not.toBe(originalSessionId);
        });

        it("closes an open impression before the session it belongs to is replaced", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            const originalSessionId = testSdk.getSessionId();

            expect(
                getReportedAdEvents(fetchMock, "impression").length,
            ).toBeGreaterThan(0);

            fetchMock.mockClear();

            // Age the session out and then bring the page back, which is what mints
            // the replacement. The impression opened under the old session has to be
            // closed under it too: the impression ID belongs to the ad, so a pair
            // split across two sessions can never be matched up again, and it cannot
            // simply be reopened under the new one either.
            window.dispatchEvent(new Event("blur"));

            const storageKey = Object.keys(localStorage).find((key) =>
                key.startsWith("aa-session-v3-"),
            )!;
            const storedSession = JSON.parse(localStorage.getItem(storageKey)!);
            const staleTimestamp = Date.now() - 31 * 60 * 1000;

            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    ...storedSession,
                    lastActiveAt: staleTimestamp,
                }),
            );
            internals(testSdk).sessionLastActiveAt = staleTimestamp;

            window.dispatchEvent(new Event("focus"));

            await flushPromises();

            expect(testSdk.getSessionId()).not.toBe(originalSessionId);

            const closings = fetchMock.mock.calls
                .filter(([url]) => (url as string).includes(AD_EVENTS_URL))
                .map(([, init]) => JSON.parse((init as any).body))
                .filter((body) =>
                    body.events.some(
                        (event: any) => event.event_type === "impression_end",
                    ),
                );

            expect(closings.length).toBeGreaterThan(0);

            for (const body of closings) {
                expect(body.session_id).toBe(originalSessionId);
            }
        });

        it("brings the zones back when a page that fired pagehide is shown again", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            // persisted false says the page is going away, and every zone is
            // reported unmounted on the way out. Browsers fire this on pages they
            // then bring back, and without a way back the zones would stay dead for
            // the rest of the page's life.
            window.dispatchEvent(
                Object.assign(new Event("pagehide"), { persisted: false }),
            );

            expect(
                getReportedAdEvents(fetchMock, "zone_unmounted").length,
            ).toBeGreaterThan(0);

            fetchMock.mockClear();

            window.dispatchEvent(
                Object.assign(new Event("pageshow"), { persisted: false }),
            );

            await flushPromises();

            expect(
                getReportedAdEvents(fetchMock, "zone_mounted").length,
            ).toBeGreaterThan(0);
            expect(internals(testSdk).zones[TEST_ZONE_1_ID].mounted).toBe(true);
        });

        it("sends impression_end with keepalive when the tab is hidden", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            // A tab close fires visibilitychange(hidden) before pagehide, so this is
            // the call that actually reports the event. Without keepalive the
            // request dies with the document and the impression is never closed.
            setDocumentVisibility("hidden");

            await flushPromises();

            const impressionEndCalls = fetchMock.mock.calls.filter(
                ([url, init]) =>
                    (url as string).includes(AD_EVENTS_URL) &&
                    (init as any).body.includes("impression_end"),
            );

            expect(impressionEndCalls).toHaveLength(2);

            for (const [, init] of impressionEndCalls) {
                expect((init as any).keepalive).toBe(true);
            }
        });

        it("does not report zones as unmounted when the page enters the back/forward cache", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            const bfCacheEvent = new Event("pagehide") as any;
            Object.defineProperty(bfCacheEvent, "persisted", { value: true });
            window.dispatchEvent(bfCacheEvent);

            await flushPromises();

            // A suspended page can be restored and shown again, so reporting the
            // zones as unmounted here would leave mount/unmount unbalanced.
            expect(
                getReportedAdEvents(fetchMock, "zone_unmounted"),
            ).toHaveLength(0);
            expect(internals(testSdk).zones[TEST_ZONE_1_ID].mounted).toBe(true);
        });

        it("holds the zone_unfilled report until the zone is actually on screen", async () => {
            fetchMock = mockFetch({ adsByZoneId: {} });

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            // The ad request can settle before the observer has reported the zone's
            // starting position, and the report must not be lost to that race.
            expect(
                getReportedAdEvents(fetchMock, "zone_unfilled"),
            ).toHaveLength(0);

            await setZonesOnScreen(true);

            expect(
                getReportedAdEvents(fetchMock, "zone_unfilled"),
            ).toHaveLength(2);
        });

        it("does not impress or rotate zones sitting behind an open popover", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(false);

            // Open the popover from zone2 while zone1 is still off screen.
            document
                .querySelector<HTMLElement>("#zone2 .clickable-area")!
                .click();

            expect(document.getElementsByClassName("AdPopup")).toHaveLength(1);

            fetchMock.mockClear();

            // Scrolling zone1 into view behind the overlay must not count, because
            // the popover covers the entire viewport.
            await setZonesOnScreen(true);

            expect(getReportedAdEvents(fetchMock, "impression")).toHaveLength(
                0,
            );
            expect(internals(testSdk).zones[TEST_ZONE_1_ID].timerRunning).toBe(
                false,
            );
        });

        it("reports client actions with keepalive, but not the calls that need a response", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            // initialize() is what issues the retrieve and pickup calls, and those
            // are half of what this test is about, so they are kept aside before
            // the mock is cleared for the client actions below.
            const initCalls = [...fetchMock.mock.calls];

            fetchMock.mockClear();

            // Every one of these is a user action that is routinely the last thing
            // someone does before closing the tab, and none of them reads its
            // response.
            testSdk.reportItemsAddedToList(["Milk"], "My list");
            testSdk.reportItemsCrossedOffList(["Milk"], "My list");
            testSdk.reportItemsDeletedFromList(["Milk"], "My list");
            testSdk.performKeywordSearch("mil");
            testSdk.reportRecipeLoaded("recipe-1", [TEST_ZONE_1_ID]);

            await flushPromises();

            const reporting = fetchMock.mock.calls.filter(([url]) => {
                const asString = String(url);

                return (
                    asString.includes("/events") ||
                    asString.includes("/v/1/tracking")
                );
            });

            expect(reporting.length).toBeGreaterThan(0);

            for (const [url, init] of reporting) {
                expect({
                    url: String(url),
                    keepalive:
                        (init as { keepalive?: boolean }).keepalive === true,
                }).toEqual({ url: String(url), keepalive: true });
            }

            // The retrieve and pickup calls are deliberately excluded: they exist
            // to deliver a response, which a request the browser is allowed to
            // outlive the document cannot be relied on to return.
            const fetching = initCalls.filter(([url]) => {
                const asString = String(url);

                return (
                    asString.includes("/retrieve") ||
                    asString.includes("/v/1/pickup")
                );
            });

            expect(fetching.length).toBeGreaterThan(0);

            for (const [url, init] of fetching) {
                expect({
                    url: String(url),
                    keepalive:
                        (init as { keepalive?: boolean }).keepalive === true,
                }).toEqual({ url: String(url), keepalive: false });
            }
        });

        it("sends SESSION_BACKGROUNDED with keepalive", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            fetchMock.mockClear();

            // Backgrounding the page is what a tab close looks like first, so this
            // is the last chance to report it. Without keepalive the request is
            // cancelled with the document, exactly as the impression close beside
            // it would be.
            Object.defineProperty(document, "visibilityState", {
                value: "hidden",
                configurable: true,
            });
            document.dispatchEvent(new Event("visibilitychange"));

            await flushPromises();

            const backgrounded = fetchMock.mock.calls.find(([, init]) => {
                const body = (init as { body?: string })?.body;

                return (
                    typeof body === "string" &&
                    body.includes("SESSION_BACKGROUNDED")
                );
            });

            expect(backgrounded).toBeDefined();
            expect(
                (backgrounded![1] as { keepalive?: boolean }).keepalive,
            ).toBe(true);
        });

        it("survives a payload pickup that answers with no JSON body", async () => {
            const onPayloadsAvailable = jest.fn();

            // A 200 with an unparseable body. The parse no longer rejects, so this
            // resolves to null and lands straight in the success handler, where
            // reading a property off it threw a TypeError out of the callback.
            fetchMock = jest.fn((url: string) => {
                if (url.includes("/v/1/pickup")) {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.reject(new Error("not json")),
                    });
                }

                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({}),
                });
            });
            // @ts-ignore
            global.fetch = fetchMock;

            const consoleError = jest
                .spyOn(console, "error")
                .mockImplementation(() => undefined);

            try {
                const testSdk = sdk!;

                await testSdk.initialize({
                    ...baseTestProps,
                    onPayloadsAvailable,
                });

                await flushPromises();

                // A throw here is swallowed and logged by the request layer, so the
                // symptom of the bug is the handler dying silently: the callback
                // never runs and an error is logged instead.
                expect(
                    consoleError.mock.calls.filter(([message]) =>
                        String(message).includes(
                            "error occurred handling the response",
                        ),
                    ),
                ).toHaveLength(0);
                expect(onPayloadsAvailable).toHaveBeenCalledTimes(1);
                expect(onPayloadsAvailable).toHaveBeenCalledWith([]);
            } finally {
                consoleError.mockRestore();
            }
        });

        it("keeps the rest of a pickup batch when one payload has no items", async () => {
            const onPayloadsAvailable = jest.fn();

            fetchMock = mockFetch({
                payloads: [
                    { payload_id: "payload-broken" },
                    {
                        payload_id: "payload-good",
                        detailed_list_items: [
                            {
                                product_title: "Milk",
                                product_brand: "",
                                product_category: "",
                                product_barcode: "",
                                product_discount: "",
                                product_image: "",
                                product_sku: "",
                            },
                        ],
                    },
                ],
            });

            const testSdk = sdk!;

            await testSdk.initialize({ ...baseTestProps, onPayloadsAvailable });
            await flushPromises();

            // One malformed entry used to throw out of the loop, discarding the
            // whole batch and the callback with it.
            expect(onPayloadsAvailable).toHaveBeenCalledTimes(1);

            const delivered = onPayloadsAvailable.mock.calls[0][0] as {
                payload_id: string;
            }[];

            expect(delivered.map((entry) => entry.payload_id)).toContain(
                "payload-good",
            );
        });

        it("does not burn an ad request for a zone covered by the popover", async () => {
            jest.useFakeTimers({ doNotFake: ["setImmediate"] });

            try {
                const testSdk = sdk!;

                await testSdk.initialize(baseTestProps);
                await setZonesOnScreen(true);

                document
                    .querySelector<HTMLElement>("#zone2 .clickable-area")!
                    .click();

                fetchMock.mockClear();

                // Well past zone1's refresh interval, entirely behind the overlay.
                jest.advanceTimersByTime(testAtlAd.refresh_time * 3000);

                await flushPromises();

                // The visibility guard stops the impression being counted but not
                // the request going out: an elapsed countdown still reached
                // loadNextAd and fetched an ad rendered where nobody could see it.
                // A paused countdown never elapses, so nothing is spent.
                expect(
                    getAdRequestBodies(fetchMock).filter(
                        (body) => body.zoneId === TEST_ZONE_1_ID,
                    ),
                ).toHaveLength(0);
            } finally {
                jest.useRealTimers();
            }
        });

        it("wakes every zone when the popover closes, not just the clicked one", async () => {
            jest.useFakeTimers({ doNotFake: ["setImmediate"] });

            try {
                const testSdk = sdk!;

                await testSdk.initialize(baseTestProps);
                await setZonesOnScreen(true);

                // Open the popover from zone2. zone1 is on screen behind it.
                document
                    .querySelector<HTMLElement>("#zone2 .clickable-area")!
                    .click();

                expect(document.getElementsByClassName("AdPopup")).toHaveLength(
                    1,
                );

                // zone1's countdown elapses while it is covered. Its callback
                // clears timerRunning and reaches loadNextAd, which cannot re-arm
                // because the popover guard blocks it.
                jest.advanceTimersByTime(testAtlAd.refresh_time * 1000);

                await flushPromises();

                expect(
                    internals(testSdk).zones[TEST_ZONE_1_ID].timerRunning,
                ).toBe(false);

                fetchMock.mockClear();

                // Closing the popover must bring zone1 back. Before this, only the
                // clicked zone was revived and zone1 stayed frozen for the life of
                // the page: no timer, no impression, and an ad already burned
                // behind the overlay.
                document
                    .querySelector<HTMLElement>(".AdPopup .button-label")!
                    .click();

                await flushPromises();

                expect(
                    internals(testSdk).zones[TEST_ZONE_1_ID].timerRunning,
                ).toBe(true);

                // And it goes on rotating under its own steam.
                jest.advanceTimersByTime(testAtlAd.refresh_time * 1000);

                await flushPromises();

                expect(
                    getAdRequestBodies(fetchMock).filter(
                        (body) => body.zoneId === TEST_ZONE_1_ID,
                    ).length,
                ).toBeGreaterThan(0);
            } finally {
                jest.useRealTimers();
            }
        });

        it("pairs impression and impression_end across several rotations", async () => {
            jest.useFakeTimers({ doNotFake: ["setImmediate"] });

            try {
                fetchMock = mockFetch({
                    adsByZoneId: { [TEST_ZONE_1_ID]: testAtlAd },
                });

                const testSdk = sdk!;

                await testSdk.initialize(baseTestProps);
                await setZonesOnScreen(true);

                fetchMock.mockClear();

                for (let cycle = 0; cycle < 3; cycle++) {
                    jest.advanceTimersByTime(testAtlAd.refresh_time * 1000);

                    await flushPromises();
                }

                const forZoneOne = (eventType: string) =>
                    getReportedAdEvents(fetchMock, eventType).filter(
                        (event) => event.zone_id === TEST_ZONE_1_ID,
                    );

                // Each rotation closes the outgoing ad and opens the incoming one,
                // so the two stay one-to-one however many times the zone cycles.
                expect(forZoneOne("impression_end")).toHaveLength(3);
                expect(forZoneOne("impression")).toHaveLength(3);
            } finally {
                jest.useRealTimers();
            }
        });

        it("fires onAdZonesRefreshed per rotation, but not for a zone's first ad", async () => {
            jest.useFakeTimers({ doNotFake: ["setImmediate"] });

            try {
                const onAdZonesRefreshed = jest.fn();

                fetchMock = mockFetch({
                    adsByZoneId: { [TEST_ZONE_1_ID]: testAtlAd },
                });

                const testSdk = sdk!;

                await testSdk.initialize({
                    ...baseTestProps,
                    zonePlacements: { [TEST_ZONE_1_ID]: "zone1" },
                    onAdZonesRefreshed,
                });
                await setZonesOnScreen(true);

                // The first ad is a first display, not a refresh.
                expect(onAdZonesRefreshed).not.toHaveBeenCalled();

                jest.advanceTimersByTime(testAtlAd.refresh_time * 1000);
                await flushPromises();

                expect(onAdZonesRefreshed).toHaveBeenCalledTimes(1);

                jest.advanceTimersByTime(testAtlAd.refresh_time * 1000);
                await flushPromises();

                expect(onAdZonesRefreshed).toHaveBeenCalledTimes(2);
            } finally {
                jest.useRealTimers();
            }
        });
    });

    describe("insecure context", () => {
        /**
         * Removes crypto.subtle, reproducing any http:// page that is not localhost.
         * getRandomValues stays, because that one is available everywhere.
         */
        const withoutCryptoSubtle = (): (() => void) => {
            const original = (global as any).crypto;

            Object.defineProperty(global, "crypto", {
                configurable: true,
                value: { getRandomValues: original.getRandomValues },
            });

            return () => {
                Object.defineProperty(global, "crypto", {
                    configurable: true,
                    value: original,
                });
            };
        };

        it("initializes, mounts zones and reports events without crypto.subtle", async () => {
            const restore = withoutCryptoSubtle();

            try {
                const testSdk = sdk!;

                // crypto.subtle is secure-context only. Depending on it took the
                // whole SDK down on plain http hosts: initialize() rejected, so
                // there was no session, no listeners and no zones at all.
                await expect(
                    testSdk.initialize(baseTestProps),
                ).resolves.toBeUndefined();

                expect(testSdk.getSessionId()).toMatch(/^JS[A-Z0-9]{32}$/);
                expect(Object.keys(internals(testSdk).zones)).toHaveLength(2);

                await setZonesOnScreen(true);

                expect(
                    getReportedSdkEvents(fetchMock, "SESSION_CREATED"),
                ).toHaveLength(1);
                expect(
                    getReportedAdEvents(fetchMock, "impression"),
                ).toHaveLength(2);
            } finally {
                restore();
            }
        });

        it("still reports the session lifecycle without crypto.subtle", async () => {
            const restore = withoutCryptoSubtle();

            try {
                const testSdk = sdk!;

                await testSdk.initialize(baseTestProps);
                await flushPromises();

                fetchMock.mockClear();

                setDocumentFocus(false);
                await flushPromises();

                expect(
                    getReportedSdkEvents(fetchMock, "SESSION_BACKGROUNDED"),
                ).toHaveLength(1);

                fetchMock.mockClear();
                setDocumentFocus(true);
                await flushPromises();

                expect(
                    getReportedSdkEvents(fetchMock, "SESSION_RESUMED"),
                ).toHaveLength(1);
            } finally {
                restore();
            }
        });

        it("namespaces the fallback storage key so it cannot collide with the hashed one", async () => {
            const restore = withoutCryptoSubtle();

            try {
                await sdk!.initialize(baseTestProps);
                await flushPromises();

                const fallbackKey = Object.keys(localStorage).find((key) =>
                    key.startsWith("aa-session-v3-"),
                )!;

                expect(fallbackKey).toContain("fnv1a");

                // A different API key must still get its own session.
                sdk!.unmount();
                localStorage.clear();

                const otherSdk = createSdk();

                await otherSdk.initialize({
                    ...baseTestProps,
                    apiKey: "A_DIFFERENT_KEY",
                });
                await flushPromises();

                const otherKey = Object.keys(localStorage).find((key) =>
                    key.startsWith("aa-session-v3-"),
                )!;

                expect(otherKey).not.toBe(fallbackKey);
            } finally {
                restore();
            }
        });
    });

    describe("SESSION_BACKGROUNDED", () => {
        it("reports when the tab stops being the shown tab", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            fetchMock.mockClear();

            setDocumentVisibility("hidden");

            await flushPromises();

            const backgrounded = getReportedSdkEvents(
                fetchMock,
                "SESSION_BACKGROUNDED",
            );

            expect(backgrounded).toHaveLength(1);
            expect(backgrounded[0].event_params.sessionId).toBe(
                testSdk.getSessionId(),
            );
        });

        it("reports when the browser loses focus while the tab stays on screen", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            fetchMock.mockClear();

            // The user switched to another application. visibilitychange does not
            // fire for this, so only the focus signal catches it.
            setDocumentFocus(false);

            await flushPromises();

            expect(document.visibilityState).toBe("visible");
            expect(
                getReportedSdkEvents(fetchMock, "SESSION_BACKGROUNDED"),
            ).toHaveLength(1);
        });

        it("does not pause ad serving when only focus is lost", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            setDocumentFocus(false);

            await flushPromises();

            // The tab is still on screen, so the ad is still in front of the user.
            // Ending the impression here would under-count a perfectly visible ad.
            expect(
                getReportedAdEvents(fetchMock, "impression_end"),
            ).toHaveLength(0);
            expect(internals(testSdk).zones[TEST_ZONE_1_ID].timerRunning).toBe(
                true,
            );
        });

        it("reports on a blur event even if document.hasFocus() has not caught up", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            fetchMock.mockClear();

            // Some browsers fire blur before document.hasFocus() flips. Deriving the
            // state from hasFocus() there would drop the transition, so the event is
            // treated as proof on its own. hasFocus deliberately still reports true.
            expect(document.hasFocus()).toBe(true);

            window.dispatchEvent(new Event("blur"));

            await flushPromises();

            expect(
                getReportedSdkEvents(fetchMock, "SESSION_BACKGROUNDED"),
            ).toHaveLength(1);
            expect(internals(testSdk).sessionIsBackgrounded).toBe(true);
        });

        it("reports on a focus event even if document.hasFocus() has not caught up", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            window.dispatchEvent(new Event("blur"));
            await flushPromises();

            fetchMock.mockClear();

            // Still reporting unfocused, yet the focus event alone must foreground.
            Object.defineProperty(document, "hasFocus", {
                configurable: true,
                writable: true,
                value: () => false,
            });

            window.dispatchEvent(new Event("focus"));

            await flushPromises();

            expect(
                getReportedSdkEvents(fetchMock, "SESSION_RESUMED"),
            ).toHaveLength(1);
            expect(internals(testSdk).sessionIsBackgrounded).toBe(false);
        });

        it("does not foreground on a focus event while the tab is still hidden", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            setDocumentVisibility("hidden");
            await flushPromises();

            fetchMock.mockClear();

            window.dispatchEvent(new Event("focus"));

            await flushPromises();

            // Focused but not on screen is still backgrounded.
            expect(
                getReportedSdkEvents(fetchMock, "SESSION_RESUMED"),
            ).toHaveLength(0);
            expect(internals(testSdk).sessionIsBackgrounded).toBe(true);
        });

        it("reports the event once per transition, not once per signal", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            fetchMock.mockClear();

            // Switching tabs raises both a focus change and a visibility change for
            // the same transition, and neither should double report.
            setDocumentFocus(false);
            setDocumentVisibility("hidden");

            await flushPromises();

            expect(
                getReportedSdkEvents(fetchMock, "SESSION_BACKGROUNDED"),
            ).toHaveLength(1);
        });

        it("still pauses ad serving when the tab is hidden after focus was already lost", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            setDocumentFocus(false);

            await flushPromises();
            fetchMock.mockClear();

            // The session is already backgrounded, so no second session event fires,
            // but the zones must still respond to actually becoming hidden.
            setDocumentVisibility("hidden");

            await flushPromises();

            expect(
                getReportedSdkEvents(fetchMock, "SESSION_BACKGROUNDED"),
            ).toHaveLength(0);
            expect(
                getReportedAdEvents(fetchMock, "impression_end"),
            ).toHaveLength(2);
            expect(internals(testSdk).zones[TEST_ZONE_1_ID].timerRunning).toBe(
                false,
            );
        });

        it("pairs with SESSION_RESUMED when the page becomes the focus again", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            fetchMock.mockClear();

            setDocumentFocus(false);
            await flushPromises();

            setDocumentFocus(true);
            await flushPromises();

            expect(
                getReportedSdkEvents(fetchMock, "SESSION_BACKGROUNDED"),
            ).toHaveLength(1);
            expect(
                getReportedSdkEvents(fetchMock, "SESSION_RESUMED"),
            ).toHaveLength(1);
        });

        it("does not report a transition for a page that starts out unfocused", async () => {
            setDocumentFocus(false);

            const testSdk = sdk!;

            fetchMock.mockClear();

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            // Opening a page in a background tab is not a transition, so only the
            // session's own creation event belongs here.
            expect(
                getReportedSdkEvents(fetchMock, "SESSION_BACKGROUNDED"),
            ).toHaveLength(0);
            expect(internals(testSdk).sessionIsBackgrounded).toBe(true);
        });

        it("stamps the session as active when backgrounding, so the window measures from then", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            internals(testSdk).sessionLastActiveAt = 0;

            setDocumentFocus(false);

            await flushPromises();

            // Matches markBackgrounded() in the reference client, which sets the
            // background time before reporting.
            expect(internals(testSdk).sessionLastActiveAt).toBeGreaterThan(0);
        });
    });

    describe("ad serving", () => {
        it("requests exactly one ad per zone from the v1.0.0 endpoint", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            const adCalls = fetchMock.mock.calls.filter(([url]) =>
                (url as string).includes(AD_RETRIEVE_URL),
            );

            expect(adCalls).toHaveLength(2);
            expect(adCalls[0][0]).toBe(
                "https://sandbox.adadapted.com/v/1.0.0/ad/retrieve",
            );
            expect((adCalls[0][1] as any).method).toBe("POST");
            expect((adCalls[0][1] as any).headers["x-api-key"]).toBe(
                baseTestProps.apiKey,
            );
        });

        it("sends the expected request body for a zone", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            const zoneRequest = getAdRequestBodies(fetchMock).find(
                (request) => request.zoneId === TEST_ZONE_1_ID,
            );

            expect(zoneRequest).toEqual({
                sdkId: expect.any(String),
                bundleId: baseTestProps.bundleId,
                userId: baseTestProps.advertiserId,
                zoneId: TEST_ZONE_1_ID,
                storeId: "123",
                contextId: "",
                sessionId: testSdk.getSessionId(),
                extra: "",
            });
        });

        it("only sends the recipe context ID for the zones it applies to", async () => {
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                params: {
                    recipeContextId: "RECIPE_1",
                    recipeContextZoneIds: [TEST_ZONE_2_ID],
                },
            });
            await flushPromises();

            const adRequests = getAdRequestBodies(fetchMock);

            expect(
                adRequests.find((request) => request.zoneId === TEST_ZONE_1_ID)
                    .contextId,
            ).toBe("");
            expect(
                adRequests.find((request) => request.zoneId === TEST_ZONE_2_ID)
                    .contextId,
            ).toBe("RECIPE_1");
        });

        it("renders the returned creative into the client's placement element", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            const iframe = document.querySelector(
                "#zone1 iframe.ad-frame",
            ) as HTMLIFrameElement;

            expect(iframe).toBeTruthy();
            expect(iframe.src).toBe(testAtlAd.creative_url);
        });

        it("reports the zones that did and did not get an ad", async () => {
            // Only zone 1 is served, so zone 2 exercises the no-ad half. Passing
            // this through mockFetch is the point: adsByZoneId is a fetch mock
            // option, and handing it to initialize() instead silently does nothing.
            fetchMock = mockFetch({
                adsByZoneId: { [TEST_ZONE_1_ID]: testAtlAd },
            });

            const onAdRetrieved = jest.fn();
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onAdRetrieved,
            });
            await flushPromises();

            const reported: { [key: string]: boolean } = {};

            for (const [zoneId, hasAd] of onAdRetrieved.mock.calls) {
                reported[zoneId as string] = hasAd as boolean;
            }

            expect(reported).toEqual({
                [TEST_ZONE_1_ID]: true,
                [TEST_ZONE_2_ID]: false,
            });
        });

        it("reports zone_mounted once for every zone, whether it gets an ad or not", async () => {
            fetchMock = mockFetch({ adsByZoneId: {} });

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            expect(getReportedAdEvents(fetchMock, "zone_mounted")).toHaveLength(
                2,
            );
        });

        it("sends no ad ID or impression ID on zone level events", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            const zoneEvents = getReportedAdEvents(fetchMock, "zone_mounted");

            // Without this the loop below has nothing to iterate the moment
            // zone_mounted stops being reported, and the test passes by doing
            // nothing at all.
            expect(zoneEvents.length).toBeGreaterThan(0);

            for (const event of zoneEvents) {
                expect(event.ad_id).toBe("");
                expect(event.impression_id).toBe("");
                expect(event.zone_id).toBeTruthy();
                expect(event).not.toHaveProperty("event_name");
            }
        });

        it("reports zone_unfilled with no_ad when the API has nothing to serve", async () => {
            fetchMock = mockFetch({ adsByZoneId: {} });

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            const unfilled = getReportedAdEvents(fetchMock, "zone_unfilled");

            expect(unfilled).toHaveLength(2);

            for (const event of unfilled) {
                expect(event.event_name).toBe("no_ad");
            }
        });

        it("reports zone_unfilled with request_failed when the ad request errors", async () => {
            fetchMock = mockFetch({
                rejectUrlsContaining: [AD_RETRIEVE_URL],
            });

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            const unfilled = getReportedAdEvents(fetchMock, "zone_unfilled");

            expect(unfilled).toHaveLength(2);

            for (const event of unfilled) {
                expect(event.event_name).toBe("request_failed");
            }
        });

        it("treats a non-2xx ad response as a failed request", async () => {
            fetchMock = mockFetch({
                errorStatusForUrlsContaining: [AD_RETRIEVE_URL],
            });

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            expect(
                getReportedAdEvents(fetchMock, "zone_unfilled").map(
                    (event) => event.event_name,
                ),
            ).toEqual(["request_failed", "request_failed"]);
        });

        it("treats a 200 response carrying success:false as a failed request", async () => {
            // The ad service answers business rejections with HTTP 200 and
            // {success: false, message}, so the status code alone is not enough.
            fetchMock = jest.fn((url: string) => {
                if (url.includes(AD_RETRIEVE_URL)) {
                    return jsonResponse({
                        success: false,
                        message: "ATL and aware ads are disabled for app",
                    });
                }

                return jsonResponse({});
            }) as FetchMock;

            // @ts-ignore
            global.fetch = fetchMock;

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            expect(
                getReportedAdEvents(fetchMock, "zone_unfilled").map(
                    (event) => event.event_name,
                ),
            ).toEqual(["request_failed", "request_failed"]);
            expect(
                internals(testSdk).zones[TEST_ZONE_1_ID].currentAd,
            ).toBeUndefined();
        });

        it("does not report a healthy ad as unfilled when rendering it throws", async () => {
            const consoleErrorSpy = jest
                .spyOn(console, "error")
                .mockImplementation(() => {});

            // Stand in for a rendering bug while placing the ad. Before this was
            // handled separately, the throw travelled the same path as a network
            // failure and the zone reported request_failed for an ad it had.
            Object.defineProperty(
                document.getElementById("zone1")!,
                "innerHTML",
                {
                    configurable: true,
                    get: () => "",
                    set: () => {
                        throw new Error("render blew up");
                    },
                },
            );

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            expect(
                getReportedAdEvents(fetchMock, "zone_unfilled").filter(
                    (event) => event.zone_id === TEST_ZONE_1_ID,
                ),
            ).toHaveLength(0);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "An error occurred handling the response",
                ),
                expect.any(Error),
            );

            consoleErrorSpy.mockRestore();
        });

        it("uses the no-fill backoff refresh time rather than the default", async () => {
            fetchMock = mockFetch({ adsByZoneId: {} });

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            expect(
                internals(testSdk).zones[TEST_ZONE_1_ID].refreshSeconds,
            ).toBe(testNoFillAd.refresh_time);
        });

        it("falls back to 60 seconds when no usable refresh time is served", async () => {
            fetchMock = mockFetch({
                adsByZoneId: {
                    [TEST_ZONE_1_ID]: { ...testAtlAd, refresh_time: 0 },
                },
            });

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            expect(
                internals(testSdk).zones[TEST_ZONE_1_ID].refreshSeconds,
            ).toBe(60);
        });

        it("clamps a refresh time below the 15 second minimum", async () => {
            fetchMock = mockFetch({
                adsByZoneId: {
                    [TEST_ZONE_1_ID]: { ...testAtlAd, refresh_time: 2 },
                },
            });

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            expect(
                internals(testSdk).zones[TEST_ZONE_1_ID].refreshSeconds,
            ).toBe(15);
        });

        it("honors a served refresh time above the minimum", async () => {
            fetchMock = mockFetch({
                adsByZoneId: {
                    [TEST_ZONE_1_ID]: { ...testAtlAd, refresh_time: 90 },
                },
            });

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            expect(
                internals(testSdk).zones[TEST_ZONE_1_ID].refreshSeconds,
            ).toBe(90);
        });
    });

    describe("zone viewability and refresh timing", () => {
        it("does not start the refresh countdown while a zone is off screen", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(false);

            expect(internals(testSdk).zones[TEST_ZONE_1_ID].timerRunning).toBe(
                false,
            );
        });

        it("counts a zone as in view whenever the browser reports it intersecting", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            getObserver().triggerAll(true, { width: 1, height: 1 });

            await flushPromises();

            expect(
                internals(testSdk).zones[TEST_ZONE_1_ID].isIntersecting,
            ).toBe(true);
            expect(getReportedAdEvents(fetchMock, "impression")).toHaveLength(
                2,
            );
        });

        it("counts an edge touch as in view, one pixel earlier than it is painted", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            // Verified against Chrome: a zone whose left edge sits at exactly 723 in
            // a 723px viewport is reported as intersecting with an intersectionRect
            // of 0x0, so nothing is actually painted yet. The SDK deliberately
            // accepts this, because the observer only reports threshold crossings -
            // rejecting the zero area callback means no further callback arrives as
            // the zone scrolls in, and the impression is lost entirely.
            getObserver().triggerAll(true, { width: 0, height: 0 });

            await flushPromises();

            expect(
                internals(testSdk).zones[TEST_ZONE_1_ID].isIntersecting,
            ).toBe(true);
            expect(getReportedAdEvents(fetchMock, "impression")).toHaveLength(
                2,
            );
        });

        it("starts the refresh countdown once a zone scrolls into view", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(false);
            await setZonesOnScreen(true);

            expect(internals(testSdk).zones[TEST_ZONE_1_ID].timerRunning).toBe(
                true,
            );
        });

        it("freezes the remaining countdown when a zone scrolls out of view", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            const zone = internals(testSdk).zones[TEST_ZONE_1_ID];
            const fullRefreshMs = zone.refreshSeconds * 1000;

            // Stand in for time having passed on screen.
            zone.countdownResumedAt = Date.now() - 10000;

            await setZonesOnScreen(false);

            expect(zone.timerRunning).toBe(false);
            expect(zone.msLeftOnRefresh).toBeLessThan(fullRefreshMs);
            expect(zone.msLeftOnRefresh).toBeGreaterThan(0);
        });

        it("does not request a new ad while a zone stays off screen", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(false);

            fetchMock.mockClear();

            // A zone that is off screen must not refresh, no matter how stale its ad.
            internals(testSdk).zones[TEST_ZONE_1_ID].adFetchedAt =
                Date.now() - 600000;

            await setZonesOnScreen(false);

            expect(getAdRequestBodies(fetchMock)).toHaveLength(0);
        });

        it("requests a new ad immediately when a stale zone scrolls back into view", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);
            await setZonesOnScreen(false);

            fetchMock.mockClear();

            // The ad outlived its refresh time while the countdown was frozen.
            internals(testSdk).zones[TEST_ZONE_1_ID].adFetchedAt =
                Date.now() - (testAtlAd.refresh_time * 1000 + 1000);

            await setZonesOnScreen(true);

            const adRequests = getAdRequestBodies(fetchMock);

            expect(
                adRequests.filter(
                    (request) => request.zoneId === TEST_ZONE_1_ID,
                ),
            ).toHaveLength(1);
        });

        it("waits out the remaining time when a fresh zone scrolls back into view", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);
            await setZonesOnScreen(false);

            fetchMock.mockClear();

            // The ad has not been displayed for its full refresh time yet.
            internals(testSdk).zones[TEST_ZONE_1_ID].adFetchedAt =
                Date.now() - 1000;

            await setZonesOnScreen(true);

            expect(getAdRequestBodies(fetchMock)).toHaveLength(0);
            expect(internals(testSdk).zones[TEST_ZONE_1_ID].timerRunning).toBe(
                true,
            );
        });

        it("stops refreshing when the browser tab is hidden and resumes when it returns", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            setDocumentVisibility("hidden");

            expect(internals(testSdk).zones[TEST_ZONE_1_ID].timerRunning).toBe(
                false,
            );

            setDocumentVisibility("visible");

            await flushPromises();

            expect(internals(testSdk).zones[TEST_ZONE_1_ID].timerRunning).toBe(
                true,
            );
        });

        it("unmounts a zone whose container element the client removed", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            document.getElementById("zone1")!.remove();

            await setZonesOnScreen(false);

            expect(internals(testSdk).zones[TEST_ZONE_1_ID]).toBeUndefined();
            expect(
                getReportedAdEvents(fetchMock, "zone_unmounted").map(
                    (event) => event.zone_id,
                ),
            ).toEqual([TEST_ZONE_1_ID]);
        });
    });

    describe("refresh cycle", () => {
        beforeEach(() => {
            // setImmediate is left real so flushPromises still settles the fetch
            // promises while the timer clock is under the test's control.
            jest.useFakeTimers({ doNotFake: ["setImmediate"] });
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it("requests the next ad once the refresh time has elapsed", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            jest.advanceTimersByTime(testAtlAd.refresh_time * 1000);

            await flushPromises();

            expect(
                getAdRequestBodies(fetchMock).filter(
                    (request) => request.zoneId === TEST_ZONE_1_ID,
                ),
            ).toHaveLength(1);
        });

        it("does not request the next ad before the refresh time has elapsed", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            jest.advanceTimersByTime(testAtlAd.refresh_time * 1000 - 1000);

            await flushPromises();

            expect(getAdRequestBodies(fetchMock)).toHaveLength(0);
        });

        it("keeps rotating on each successive refresh time", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            for (let cycle = 0; cycle < 3; cycle++) {
                jest.advanceTimersByTime(testAtlAd.refresh_time * 1000);

                await flushPromises();
            }

            expect(
                getAdRequestBodies(fetchMock).filter(
                    (request) => request.zoneId === TEST_ZONE_1_ID,
                ),
            ).toHaveLength(3);
        });

        it("replaces the rendered creative when the next ad arrives", async () => {
            const secondAd = {
                ...testAtlAd,
                id: "SECOND_AD_ID",
                impression_id: "1::::::SECOND-AA",
                creative_url: "https://example.com/second-creative.html",
            };

            fetchMock = mockFetch({
                adsByZoneId: { [TEST_ZONE_1_ID]: testAtlAd },
            });

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            expect(
                (document.querySelector("#zone1 iframe") as HTMLIFrameElement)
                    .src,
            ).toBe(testAtlAd.creative_url);

            // The next request answers with a different ad.
            fetchMock = mockFetch({
                adsByZoneId: { [TEST_ZONE_1_ID]: secondAd },
            });

            jest.advanceTimersByTime(testAtlAd.refresh_time * 1000);

            await flushPromises();

            expect(
                (document.querySelector("#zone1 iframe") as HTMLIFrameElement)
                    .src,
            ).toBe(secondAd.creative_url);
        });

        it("pairs an impression_end with an impression on every rotation", async () => {
            fetchMock = mockFetch({
                adsByZoneId: { [TEST_ZONE_1_ID]: testAtlAd },
            });

            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            jest.advanceTimersByTime(testAtlAd.refresh_time * 1000);

            await flushPromises();

            const zoneOneEvents = (eventType: string) =>
                getReportedAdEvents(fetchMock, eventType).filter(
                    (event) => event.zone_id === TEST_ZONE_1_ID,
                );

            // The outgoing ad ends its impression and the incoming one starts a new
            // pair, so the two stay one-to-one across rotations.
            expect(zoneOneEvents("impression_end")).toHaveLength(1);
            expect(zoneOneEvents("impression")).toHaveLength(1);
        });

        it("stops rotating a zone that scrolled out of view", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);
            await setZonesOnScreen(false);

            fetchMock.mockClear();

            jest.advanceTimersByTime(testAtlAd.refresh_time * 1000 * 5);

            await flushPromises();

            expect(getAdRequestBodies(fetchMock)).toHaveLength(0);
        });

        it("resumes with only the remaining time after coming back into view", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            // Spend most of the refresh window on screen, then leave the view.
            jest.advanceTimersByTime(50000);

            await setZonesOnScreen(false);

            fetchMock.mockClear();

            await setZonesOnScreen(true);

            // Only the leftover 10 seconds should remain, so this is not yet due.
            jest.advanceTimersByTime(9000);

            await flushPromises();

            expect(getAdRequestBodies(fetchMock)).toHaveLength(0);

            jest.advanceTimersByTime(2000);

            await flushPromises();

            expect(
                getAdRequestBodies(fetchMock).filter(
                    (request) => request.zoneId === TEST_ZONE_1_ID,
                ),
            ).toHaveLength(1);
        });
    });

    describe("impression pairing", () => {
        it("reports an impression only once a zone is on screen", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(false);

            expect(getReportedAdEvents(fetchMock, "impression")).toHaveLength(
                0,
            );

            await setZonesOnScreen(true);

            expect(getReportedAdEvents(fetchMock, "impression")).toHaveLength(
                2,
            );
        });

        it("reports at most one impression per loaded ad", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);
            await setZonesOnScreen(true);
            await setZonesOnScreen(true);

            expect(
                getReportedAdEvents(fetchMock, "impression").filter(
                    (event) => event.zone_id === TEST_ZONE_1_ID,
                ),
            ).toHaveLength(1);
        });

        it("reports impression_end when the zone scrolls out of view", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            await setZonesOnScreen(false);

            expect(
                getReportedAdEvents(fetchMock, "impression_end"),
            ).toHaveLength(2);
        });

        it("reports impression_end at most once per ad", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            await setZonesOnScreen(false);
            await setZonesOnScreen(false);

            setDocumentVisibility("hidden");

            testSdk.unmount();

            await flushPromises();

            expect(
                getReportedAdEvents(fetchMock, "impression_end").filter(
                    (event) => event.zone_id === TEST_ZONE_1_ID,
                ),
            ).toHaveLength(1);
        });

        it("never reports impression_end for an ad that never recorded an impression", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(false);

            testSdk.unmount();

            await flushPromises();

            expect(
                getReportedAdEvents(fetchMock, "impression_end"),
            ).toHaveLength(0);
        });

        it("reports impression_end when the browser tab is hidden", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            setDocumentVisibility("hidden");

            await flushPromises();

            expect(
                getReportedAdEvents(fetchMock, "impression_end"),
            ).toHaveLength(2);
        });

        it("reports impression_end on a keepalive request when the page goes away", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            window.dispatchEvent(new Event("pagehide"));

            await flushPromises();

            const impressionEndCalls = fetchMock.mock.calls.filter(
                ([url, init]) =>
                    (url as string).includes(AD_EVENTS_URL) &&
                    (init as any).body.includes("impression_end"),
            );

            expect(impressionEndCalls).toHaveLength(2);

            for (const [, init] of impressionEndCalls) {
                expect((init as any).keepalive).toBe(true);
            }
        });

        it("reports zone_unmounted when the page goes away", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            window.dispatchEvent(new Event("pagehide"));

            await flushPromises();

            expect(
                getReportedAdEvents(fetchMock, "zone_unmounted"),
            ).toHaveLength(2);
        });

        it("starts a new impression pair when the zone rotates on to the next ad", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            // Rotating the zone closes out the old ad and impresses the new one.
            fireEvent.click(document.querySelector("#zone1 .clickable-area")!);

            await flushPromises();

            expect(
                getReportedAdEvents(fetchMock, "impression_end").filter(
                    (event) => event.zone_id === TEST_ZONE_1_ID,
                ),
            ).toHaveLength(1);
            expect(
                getReportedAdEvents(fetchMock, "impression").filter(
                    (event) => event.zone_id === TEST_ZONE_1_ID,
                ),
            ).toHaveLength(1);
        });
    });

    describe("keyword intercepts", () => {
        it("retrieves intercepts from the v1.0.0 endpoint and unwraps the response", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            expect(fetchMock).toHaveBeenCalledWith(
                "https://sandbox.adadapted.com/v/1.0.0/intercept/retrieve",
                expect.objectContaining({ method: "POST" }),
            );

            // Regression: onSuccess used to be handed a JSON string, which left
            // keywordIntercepts unusable and every search silently empty.
            expect(testSdk.getAvailableKeywordIntercepts()).toHaveLength(
                testKeywordIntercepts.terms.length,
            );
        });

        it("matches a search term using the built-in minimum match length", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await flushPromises();

            expect(testSdk.performKeywordSearch("mi")).toHaveLength(0);
            expect(testSdk.performKeywordSearch("mil")).toHaveLength(
                milkKeywordIntercepts.length,
            );
        });
    });

    describe("payloads", () => {
        it("hands retrieved payloads to the client", async () => {
            const testPayload = {
                payload_id: "PAYLOAD_1",
                detailed_list_items: [
                    {
                        product_title: "Tabasco Original",
                        product_brand: "",
                        product_category: "",
                        product_barcode: "011210000155",
                        product_sku: "",
                        product_discount: "",
                        product_image: "",
                    },
                ],
            };
            const onPayloadsAvailable = jest.fn();

            fetchMock = mockFetch({ payloads: [testPayload] });

            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onPayloadsAvailable,
            });
            await flushPromises();

            // Regression: onSuccess used to be handed a JSON string, so
            // response.payloads was always undefined and no payload ever arrived.
            expect(onPayloadsAvailable).toHaveBeenCalledWith([
                {
                    payload_id: "PAYLOAD_1",
                    detailed_list_items: testPayload.detailed_list_items,
                },
            ]);
        });
    });
});

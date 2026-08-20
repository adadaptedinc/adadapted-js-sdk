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

const selectedATL: AdadaptedJsSdk.Ad = {
    id: "TEST_ATL_AD_ID",
    impression_id: "",
    refresh_time: 999999,
    creative_url: "",
    action_path: "",
    action_type: "c",
    payload: {
        detailed_list_items: [],
    },
    zone_id: TEST_ZONE_1_ID,
};

const testCartId = "TEST_CART_ID";
const testListName = "TEST_LIST_NAME";
const testItemNames = ["ITEM_NAME_1", "ITEM_NAME_2", "ITEM_NAME_3"];
const testStoreId = "TEST_STORE_ID";

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

    beforeEach(() => {
        fetchMock = mockFetch();

        document.body.innerHTML = `
            <div id="zone1"></div>
            <div id="zone2"></div>
        `;

        // Sessions persist across page loads, so without this a session created by
        // one test would be resumed by the next.
        localStorage.clear();

        // setDocumentVisibility defines an own property on the shared jsdom
        // document, so a test that leaves the tab hidden would hide it for every
        // test that follows.
        setDocumentVisibility("visible");

        (global as any).MockIntersectionObserver.reset();

        sdk = new AdadaptedJsSdk();
    });

    afterEach(() => {
        // Tears down the document listeners and observers, so a previous test's SDK
        // can't react to events raised by the next one.
        sdk?.unmount();

        jest.resetAllMocks();
    });

    describe("initialize()", () => {
        it("rejects when apiKey isn't provided", async () => {
            const testSdk = sdk!;

            try {
                await testSdk.initialize({
                    ...baseTestProps,
                    // @ts-ignore
                    apiKey: undefined,
                });
            } catch (message) {
                expect(message).toBe(
                    "API key must be provided for the AdAdapted SDK to be initialized.",
                );
            }
        });

        it("rejects when advertiserId isn't provided", async () => {
            const testSdk = sdk!;

            try {
                await testSdk.initialize({
                    ...baseTestProps,
                    // @ts-ignore
                    advertiserId: undefined,
                });
            } catch (message) {
                expect(message).toBe(
                    "A unique identifier(advertiserId) must be provided for the AdAdapted SDK to be initialized.",
                );
            }
        });

        it("rejects when allowRetargeting isn't provided", async () => {
            const testSdk = sdk!;

            try {
                await testSdk.initialize({
                    ...baseTestProps,
                    // @ts-ignore
                    allowRetargeting: undefined,
                });
            } catch (message) {
                expect(message).toBe(
                    "A user's privacy decision to opt-in or opt-out for ad retargeting(allowRetargeting) must be provided for the AdAdapted SDK to be initialized.",
                );
            }
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

    describe("onAdZonesRefreshed()", () => {
        it("is undefined", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.onAdZonesRefreshed()).toBeUndefined();
        });

        it("is defined", async () => {
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onAdZonesRefreshed: () => {
                    return "defined";
                },
            });

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.onAdZonesRefreshed()).toBe("defined");
        });
    });

    describe("onAddItemsTriggered()", () => {
        it("is undefined", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.onAddItemsTriggered()).toBeUndefined();
        });

        it("is defined", async () => {
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onAddItemsTriggered: () => {
                    return "defined";
                },
            });

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.onAddItemsTriggered()).toBe("defined");
        });
    });

    describe("onExternalContentAdClicked()", () => {
        it("is undefined", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.onExternalContentAdClicked()).toBeUndefined();
        });

        it("is defined", async () => {
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onExternalContentAdClicked: () => {
                    return "defined";
                },
            });

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.onExternalContentAdClicked()).toBe("defined");
        });
    });

    describe("onPayloadsAvailable()", () => {
        it("is undefined", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.onPayloadsAvailable()).toBeUndefined();
        });

        it("is defined", async () => {
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onPayloadsAvailable: () => {
                    return "defined";
                },
            });

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.onPayloadsAvailable()).toBe("defined");
        });
    });

    describe("onAdsRetrieved()", () => {
        it("is undefined", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.onAdsRetrieved()).toBeUndefined();
        });

        it("is defined", async () => {
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onAdsRetrieved: () => {
                    return "defined";
                },
            });

            expect(fetch).toHaveBeenCalled();
            expect(testSdk.onAdsRetrieved()).toBe("defined");
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
        it("lastSelectedATL is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.lastSelectedATL = undefined;

            testSdk.acknowledgeAdded();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `An ATL ad must be selected by the user in order to acknowledge item being added to list.`,
            );
        });

        it("lastSelectedATL is defined but the request fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.lastSelectedATL = selectedATL;

            testSdk.acknowledgeAdded();

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `An error occurred reporting a user "interaction" event.`,
            );
        });

        it("lastSelectedATL is defined and the request succeeds", async () => {
            const flushPromises = () => new Promise(setImmediate);
            const testSdk = sdk!;
            testSdk.lastSelectedATL = selectedATL;
            testSdk.deviceOs = "android";
            testSdk.advertiserId = "TEST_ADVERTISER_ID";

            testSdk.acknowledgeAdded();

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(fetch).toHaveBeenCalledWith(
                "https://ads.adadapted.com/v/1.0.0/ad/events",
                expect.objectContaining({
                    body: expect.stringContaining(
                        `"udid":"${testSdk.advertiserId}"`,
                    ),
                }),
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

            expect(testSdk.params.storeId).toBe(testStoreId);
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

            expect(testSdk.zones[TEST_ZONE_1_ID].refreshTimerId).toBeDefined();
            expect(testSdk.zones[TEST_ZONE_2_ID].refreshTimerId).toBeDefined();
            expect(testSdk.intersectionObserver).toBeDefined();
            expect(testSdk.documentEventAbortController).toBeDefined();

            testSdk.unmount();

            expect(testSdk.zones).toEqual({});
            expect(testSdk.intersectionObserver).toBeUndefined();
            expect(testSdk.documentEventAbortController).toBeUndefined();
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

            expect(testSdk.zones).toEqual({});

            testSdk.unmount();

            expect(testSdk.zones).toEqual({});
            expect(testSdk.intersectionObserver).toBeUndefined();
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
            const reloadedSdk = new AdadaptedJsSdk();

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
                key.startsWith("aa-session-v2-"),
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

            const reloadedSdk = new AdadaptedJsSdk();

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
            const onAdsRetrieved = jest.fn();
            const testSdk = sdk!;

            await testSdk.initialize({
                ...baseTestProps,
                onAdsRetrieved,
                adsByZoneId: undefined,
            } as any);
            await flushPromises();

            expect(onAdsRetrieved).toHaveBeenLastCalledWith({
                [TEST_ZONE_1_ID]: true,
                [TEST_ZONE_2_ID]: true,
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

            for (const event of getReportedAdEvents(
                fetchMock,
                "zone_mounted",
            )) {
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
            expect(testSdk.zones[TEST_ZONE_1_ID].currentAd).toBeUndefined();
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

            expect(testSdk.zones[TEST_ZONE_1_ID].refreshSeconds).toBe(
                testNoFillAd.refresh_time,
            );
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

            expect(testSdk.zones[TEST_ZONE_1_ID].refreshSeconds).toBe(60);
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

            expect(testSdk.zones[TEST_ZONE_1_ID].refreshSeconds).toBe(15);
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

            expect(testSdk.zones[TEST_ZONE_1_ID].refreshSeconds).toBe(90);
        });
    });

    describe("zone viewability and refresh timing", () => {
        it("does not start the refresh countdown while a zone is off screen", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(false);

            expect(testSdk.zones[TEST_ZONE_1_ID].timerRunning).toBe(false);
        });

        it("counts a zone as in view whenever the browser reports it intersecting", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);

            getObserver().triggerAll(true, { width: 1, height: 1 });

            await flushPromises();

            expect(testSdk.zones[TEST_ZONE_1_ID].isIntersecting).toBe(true);
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

            expect(testSdk.zones[TEST_ZONE_1_ID].isIntersecting).toBe(true);
            expect(getReportedAdEvents(fetchMock, "impression")).toHaveLength(
                2,
            );
        });

        it("starts the refresh countdown once a zone scrolls into view", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(false);
            await setZonesOnScreen(true);

            expect(testSdk.zones[TEST_ZONE_1_ID].timerRunning).toBe(true);
        });

        it("freezes the remaining countdown when a zone scrolls out of view", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            const zone = testSdk.zones[TEST_ZONE_1_ID];
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
            testSdk.zones[TEST_ZONE_1_ID].adFetchedAt = Date.now() - 600000;

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
            testSdk.zones[TEST_ZONE_1_ID].adFetchedAt =
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
            testSdk.zones[TEST_ZONE_1_ID].adFetchedAt = Date.now() - 1000;

            await setZonesOnScreen(true);

            expect(getAdRequestBodies(fetchMock)).toHaveLength(0);
            expect(testSdk.zones[TEST_ZONE_1_ID].timerRunning).toBe(true);
        });

        it("stops refreshing when the browser tab is hidden and resumes when it returns", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            setDocumentVisibility("hidden");

            expect(testSdk.zones[TEST_ZONE_1_ID].timerRunning).toBe(false);

            setDocumentVisibility("visible");

            await flushPromises();

            expect(testSdk.zones[TEST_ZONE_1_ID].timerRunning).toBe(true);
        });

        it("unmounts a zone whose container element the client removed", async () => {
            const testSdk = sdk!;

            await testSdk.initialize(baseTestProps);
            await setZonesOnScreen(true);

            fetchMock.mockClear();

            document.getElementById("zone1")!.remove();

            await setZonesOnScreen(false);

            expect(testSdk.zones[TEST_ZONE_1_ID]).toBeUndefined();
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

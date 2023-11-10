import AdadaptedJsSdk, { AdActionType } from "./index";
import { setImmediate } from "timers";

// @ts-ignore
global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({ status: "ok" }),
    }),
);

describe("AdadaptedJsSdk", () => {
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
            "1": "zone1",
            "2": "zone2",
        },
        params: {
            storeId: "123",
        },
    };
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
    const testKeywordIntercepts = {
        min_match_length: 3,
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
    const selectedATL: AdadaptedJsSdk.Ad = {
        ad_id: "",
        impression_id: "",
        type: "",
        refresh_time: 999999,
        creative_url: "",
        tracking_html: "",
        action_path: "",
        action_type: "c",
        hide_after_interaction: false,
        payload: {
            detailed_list_items: [],
        },
        popup: {
            alt_close_btn: "",
            background_color: "",
            hide_banner: false,
            hide_browser_nav: false,
            hide_close_btn: false,
            text_color: "",
            title_text: "",
            type: "",
        },
    };

    let sdk: AdadaptedJsSdk | null = null;

    beforeEach(() => {
        sdk = new AdadaptedJsSdk();
    });

    afterEach(() => {
        // @ts-ignore
        fetch.mockClear();
        sdk = null;
    });

    describe("initialize()", () => {
        test("rejects when apiKey isn't provided", async () => {
            const testSdk = sdk!;

            testSdk
                .initialize({
                    ...baseTestProps,
                    // @ts-ignore
                    apiKey: undefined,
                })
                .catch((message) => {
                    expect(message).toBe(
                        "API key must be provided for the AdAdapted SDK to be initialized.",
                    );
                });
        });

        test("rejects when advertiserId isn't provided", async () => {
            const testSdk = sdk!;

            testSdk
                .initialize({
                    ...baseTestProps,
                    // @ts-ignore
                    advertiserId: undefined,
                })
                .catch((message) => {
                    expect(message).toBe(
                        "A unique identifier(advertiserId) must be provided for the AdAdapted SDK to be initialized.",
                    );
                });
        });

        test("rejects when allowRetargeting isn't provided", async () => {
            const testSdk = sdk!;

            testSdk
                .initialize({
                    ...baseTestProps,
                    // @ts-ignore
                    allowRetargeting: undefined,
                })
                .catch((message) => {
                    expect(message).toBe(
                        "A user's privacy decision to opt-in or opt-out for ad retargeting(allowRetargeting) must be provided for the AdAdapted SDK to be initialized.",
                    );
                });
        });

        test("resolves and sets internal property values as expected", async () => {
            const testSdk = sdk!;

            testSdk.initialize(baseTestProps).then(() => {
                expect(fetch).toHaveBeenCalled();
                expect(testSdk.apiKey).toBe(baseTestProps.apiKey);
                expect(testSdk.advertiserId).toBe(baseTestProps.advertiserId);
                expect(testSdk.allowRetargeting).toBe(
                    baseTestProps.allowRetargeting,
                );
                expect(testSdk.enablePayloads).toBe(
                    baseTestProps.enablePayloads,
                );
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
            test("the correct API URL is set when the dev environment is specified", async () => {
                const testSdk = sdk!;

                testSdk.initialize(baseTestProps).then(() => {
                    expect(fetch).toHaveBeenCalled();
                    expect(testSdk.apiEnv).toBe(
                        "https://sandbox.adadapted.com",
                    );
                });
            });

            test("the correct API URL is set when the prod environment is specified", async () => {
                const testSdk = sdk!;

                testSdk
                    .initialize({
                        ...baseTestProps,
                        apiEnv: "prod",
                    })
                    .then(() => {
                        expect(fetch).toHaveBeenCalled();
                        expect(testSdk.apiEnv).toBe(
                            "https://ads.adadapted.com",
                        );
                    });
            });
        });

        describe("allowRetargeting", () => {
            test("retargeting is allowed", async () => {
                const testSdk = sdk!;

                testSdk.initialize(baseTestProps).then(() => {
                    expect(fetch).toHaveBeenCalled();
                    expect(testSdk.allowRetargeting).toBe(true);
                });
            });

            test("retargeting is not allowed", async () => {
                const testSdk = sdk!;

                testSdk
                    .initialize({
                        ...baseTestProps,
                        allowRetargeting: false,
                    })
                    .then(() => {
                        expect(fetch).toHaveBeenCalled();
                        expect(testSdk.allowRetargeting).toBe(false);
                    });
            });
        });

        describe("enablePayloads", () => {
            test("payloads are enabled", async () => {
                const testSdk = sdk!;

                testSdk.initialize(baseTestProps).then(() => {
                    expect(fetch).toHaveBeenCalled();
                    expect(testSdk.enablePayloads).toBe(true);
                });
            });

            test("payloads are not enabled", async () => {
                const testSdk = sdk!;

                testSdk
                    .initialize({
                        ...baseTestProps,
                        enablePayloads: false,
                    })
                    .then(() => {
                        expect(fetch).toHaveBeenCalled();
                        expect(testSdk.enablePayloads).toBe(false);
                    });
            });
        });

        describe("onAdZonesRefreshed()", () => {
            test("is undefined", async () => {
                const testSdk = sdk!;

                testSdk.initialize(baseTestProps).then(() => {
                    expect(fetch).toHaveBeenCalled();
                    expect(testSdk.onAdZonesRefreshed()).toBeUndefined();
                });
            });

            test("is defined", async () => {
                const testSdk = sdk!;

                testSdk
                    .initialize({
                        ...baseTestProps,
                        onAdZonesRefreshed: () => {
                            return "defined";
                        },
                    })
                    .then(() => {
                        expect(fetch).toHaveBeenCalled();
                        expect(testSdk.onAdZonesRefreshed()).toBe("defined");
                    });
            });
        });

        describe("onAddItemsTriggered()", () => {
            test("is undefined", async () => {
                const testSdk = sdk!;

                testSdk.initialize(baseTestProps).then(() => {
                    expect(fetch).toHaveBeenCalled();
                    expect(testSdk.onAddItemsTriggered()).toBeUndefined();
                });
            });

            test("is defined", async () => {
                const testSdk = sdk!;

                testSdk
                    .initialize({
                        ...baseTestProps,
                        onAddItemsTriggered: () => {
                            return "defined";
                        },
                    })
                    .then(() => {
                        expect(fetch).toHaveBeenCalled();
                        expect(testSdk.onAddItemsTriggered()).toBe("defined");
                    });
            });
        });

        describe("onPayloadsAvailable()", () => {
            test("is undefined", async () => {
                const testSdk = sdk!;

                testSdk.initialize(baseTestProps).then(() => {
                    expect(fetch).toHaveBeenCalled();
                    expect(testSdk.onPayloadsAvailable()).toBeUndefined();
                });
            });

            test("is defined", async () => {
                const testSdk = sdk!;

                testSdk
                    .initialize({
                        ...baseTestProps,
                        onPayloadsAvailable: () => {
                            return "defined";
                        },
                    })
                    .then(() => {
                        expect(fetch).toHaveBeenCalled();
                        expect(testSdk.onPayloadsAvailable()).toBe("defined");
                    });
            });
        });

        describe("onAdsRetrieved()", () => {
            test("is undefined", async () => {
                const testSdk = sdk!;

                testSdk.initialize(baseTestProps).then(() => {
                    expect(fetch).toHaveBeenCalled();
                    expect(testSdk.onAdsRetrieved()).toBeUndefined();
                });
            });

            test("is defined", async () => {
                const testSdk = sdk!;

                testSdk
                    .initialize({
                        ...baseTestProps,
                        onAdsRetrieved: () => {
                            return "defined";
                        },
                    })
                    .then(() => {
                        expect(fetch).toHaveBeenCalled();
                        expect(testSdk.onAdsRetrieved()).toBe("defined");
                    });
            });
        });
    });

    describe("performKeywordSearch()", () => {
        test("is called without session ID being defined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.sessionId = "";

            expect(testSdk.performKeywordSearch("")).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "AdAdapted JS SDK has not been initialized.",
            );
        });

        test("is called without keyword intercepts being defined", () => {
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
            test("search term not provided", () => {
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = testKeywordIntercepts;

                // @ts-ignore
                expect(testSdk.performKeywordSearch(null)).toEqual([]);
            });

            test("search term is provided but is empty string", () => {
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = testKeywordIntercepts;

                // @ts-ignore
                expect(testSdk.performKeywordSearch("")).toEqual([]);
            });

            test("search term is provided but doesn't meet required match length", () => {
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = testKeywordIntercepts;

                // @ts-ignore
                expect(testSdk.performKeywordSearch("ch")).toEqual([]);
            });
        });

        describe("search term is provided and meets the required match length", () => {
            test("has results when a search term that matches is provided", () => {
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

            test("has no results when a search term that doesn't match is provided", () => {
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = testKeywordIntercepts;

                expect(testSdk.performKeywordSearch("cheese")).toEqual([]);
                expect(fetch).toHaveBeenCalled();
            });
        });

        test("intercept events request has an error and logs a message as expected", async () => {
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
            expect(consoleErrorSpy).toBeCalledWith(
                `An error occurred while reporting the keyword intercept "matched" or "not_matched" event.`,
            );
        });
    });

    describe("reportKeywordInterceptTermsPresented()", () => {
        test("is called without session ID being defined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.sessionId = "";

            testSdk.reportKeywordInterceptTermsPresented([]);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "AdAdapted JS SDK has not been initialized.",
            );
        });

        test("is called without keyword intercepts being defined", () => {
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
            test("term IDs not provided", () => {
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

            test("term IDs list provided but empty", () => {
                const consoleErrorSpy = jest.spyOn(console, "error");
                const testSdk = sdk!;
                testSdk.sessionId = "TEST_SESSION_ID";
                testSdk.keywordIntercepts = testKeywordIntercepts;

                testSdk.reportKeywordInterceptTermsPresented([]);

                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    "Invalid or empty keyword intercept list of term IDs provided.",
                );
            });

            test("term IDs provided but no keywords available", () => {
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

        test("intercept events request has an error and logs a message as expected", async () => {
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
            expect(consoleErrorSpy).toBeCalledWith(
                `An error occurred while reporting the keyword intercept "presented" event.`,
            );
        });
    });

    describe("reportKeywordInterceptTermSelected()", () => {
        test("is called without session ID being defined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.sessionId = "";

            testSdk.reportKeywordInterceptTermSelected("");

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "AdAdapted JS SDK has not been initialized.",
            );
        });

        test("is called without keyword intercepts being defined", () => {
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
            test("term IDs not provided", () => {
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

            test("term IDs provided but no keywords available", () => {
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

        test("intercept events request has an error and logs a message as expected", async () => {
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
            expect(consoleErrorSpy).toBeCalledWith(
                `An error occurred while reporting the keyword intercept "selected" event.`,
            );
        });
    });

    describe("acknowledgeAdded()", () => {
        test("lastSelectedATL is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.lastSelectedATL = undefined;

            testSdk.acknowledgeAdded();

            expect(consoleErrorSpy).toBeCalledWith(
                `An ATL ad must be selected by the user in order to acknowledge item being added to list.`,
            );
        });

        test("lastSelectedATL is defined but the request fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;
            testSdk.lastSelectedATL = selectedATL;

            testSdk.acknowledgeAdded();

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toBeCalledWith(
                `An ATL ad must be selected by the user in order to acknowledge item being added to list.`,
            );
        });

        test("lastSelectedATL is defined and the request succeeds", async () => {
            const flushPromises = () => new Promise(setImmediate);
            const testSdk = sdk!;
            testSdk.lastSelectedATL = selectedATL;
            testSdk.deviceOs = "android";
            testSdk.advertiserId = "TEST_ADVERTISER_ID";

            testSdk.acknowledgeAdded();

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(fetch).toHaveBeenCalledWith(
                "https://ads.adadapted.com/v/0.9.5/android/ads/events",
                expect.objectContaining({
                    body: expect.stringContaining(
                        `"udid":"${testSdk.advertiserId}"`,
                    ),
                }),
            );
        });
    });

    describe("reportItemsAddedToCart()", () => {
        const testCartId = "TEST_CART_ID";
        const testItemNames = ["ITEM_NAME_1", "ITEM_NAME_2", "ITEM_NAME_3"];

        test("itemNames is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.reportItemsAddedToCart(undefined, testCartId);

            expect(consoleErrorSpy).toBeCalledWith(
                "Both cart ID and item names list must be provided in order to add items to cart.",
            );
        });

        test("itemNames is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsAddedToCart([], testCartId);

            expect(consoleErrorSpy).toBeCalledWith(
                "Both cart ID and item names list must be provided in order to add items to cart.",
            );
        });

        test("cartId is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsAddedToCart(testItemNames, "");

            expect(consoleErrorSpy).toBeCalledWith(
                "Both cart ID and item names list must be provided in order to add items to cart.",
            );
        });

        test("API request to add items to list fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsAddedToCart(testItemNames, testCartId);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toBeCalledWith(
                `An error occurred while reporting an item "user_added_to_cart\" event.`,
            );
        });

        test("lastSelectedATL is defined and the request succeeds", async () => {
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
});

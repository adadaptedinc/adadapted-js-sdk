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
    const testCartId = "TEST_CART_ID";
    const testListName = "TEST_LIST_NAME";
    const testItemNames = ["ITEM_NAME_1", "ITEM_NAME_2", "ITEM_NAME_3"];
    const testStoreId = "TEST_STORE_ID";

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
        test("itemNames is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.reportItemsAddedToCart(undefined, testCartId);

            expect(consoleErrorSpy).toBeCalledWith(
                "Both cart ID and item names list must be provided in order to report adding items to cart.",
            );
        });

        test("itemNames is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsAddedToCart([], testCartId);

            expect(consoleErrorSpy).toBeCalledWith(
                "Both cart ID and item names list must be provided in order to report adding items to cart.",
            );
        });

        test("cartId is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsAddedToCart(testItemNames, "");

            expect(consoleErrorSpy).toBeCalledWith(
                "Both cart ID and item names list must be provided in order to report adding items to cart.",
            );
        });

        test("API request to report adding items to cart fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsAddedToCart(testItemNames, testCartId);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toBeCalledWith(
                `An error occurred while reporting an item "user_added_to_cart" event.`,
            );
        });

        test("API request to report adding items to cart succeeds", async () => {
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
        test("itemNames is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.reportItemsDeletedFromCart(undefined, testCartId);

            expect(consoleErrorSpy).toBeCalledWith(
                "Both cart ID and item names list must be provided in order to report deleting items from cart.",
            );
        });

        test("itemNames is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsDeletedFromCart([], testCartId);

            expect(consoleErrorSpy).toBeCalledWith(
                "Both cart ID and item names list must be provided in order to report deleting items from cart.",
            );
        });

        test("cartId is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsDeletedFromCart(testItemNames, "");

            expect(consoleErrorSpy).toBeCalledWith(
                "Both cart ID and item names list must be provided in order to report deleting items from cart.",
            );
        });

        test("API request to report deleting items from cart fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsDeletedFromCart(testItemNames, testCartId);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toBeCalledWith(
                `An error occurred while reporting an item "user_deleted_from_cart" event.`,
            );
        });

        test("API request to report deleting items from cart succeeds", async () => {
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
        test("itemNames is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.reportItemsAddedToList(undefined);

            expect(consoleErrorSpy).toBeCalledWith(
                "The item names list must be provided in order to add items to list.",
            );
        });

        test("itemNames is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsAddedToList([]);

            expect(consoleErrorSpy).toBeCalledWith(
                "The item names list must be provided in order to add items to list.",
            );
        });

        test("API request to report adding items to list fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsAddedToList(testItemNames, testListName);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toBeCalledWith(
                `An error occurred while reporting an item "user_added_to_list" event.`,
            );
        });

        test("API request to report adding items to list succeeds", async () => {
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
        test("itemNames is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.reportItemsDeletedFromList(undefined);

            expect(consoleErrorSpy).toBeCalledWith(
                "The item names list must be provided in order to delete items from list.",
            );
        });

        test("itemNames is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsDeletedFromList([]);

            expect(consoleErrorSpy).toBeCalledWith(
                "The item names list must be provided in order to delete items from list.",
            );
        });

        test("API request to report deleting items from list fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsDeletedFromList(testItemNames, testListName);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toBeCalledWith(
                `An error occurred while reporting an item "user_deleted_from_list" event.`,
            );
        });

        test("API request to report deleting items from list succeeds", async () => {
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
        test("itemNames is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.reportItemsCrossedOffList(undefined);

            expect(consoleErrorSpy).toBeCalledWith(
                "The item names list must be provided in order to cross off items from list.",
            );
        });

        test("itemNames is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsCrossedOffList([]);

            expect(consoleErrorSpy).toBeCalledWith(
                "The item names list must be provided in order to cross off items from list.",
            );
        });

        test("API request to report deleting items from list fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.reportItemsCrossedOffList(testItemNames, testListName);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toBeCalledWith(
                `An error occurred while reporting an item "user_crossed_off_list" event.`,
            );
        });

        test("API request to report deleting items from list succeeds", async () => {
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

        test("payloadStatusList is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.updatePayloadStatus(undefined);

            expect(consoleErrorSpy).toBeCalledWith(
                "The payload status list must be provided in order to update the payload(s) status.",
            );
        });

        test("payloadStatusList is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.updatePayloadStatus([]);

            expect(consoleErrorSpy).toBeCalledWith(
                "The payload status list must be provided in order to update the payload(s) status.",
            );
        });

        test("API request to update payload status fails", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.updatePayloadStatus(testPayloadStatusList);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toBeCalledWith(
                `An error occurred while updating payload status.`,
            );
        });

        test("API request to update payload status succeeds", async () => {
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
        test("newStoreId is undefined", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            // @ts-ignore
            testSdk.updateStoreId(undefined);

            expect(consoleErrorSpy).toBeCalledWith(
                "The store ID must be provided in order to update the SDK to use it.",
            );
        });

        test("newStoreId is empty", () => {
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.updateStoreId("");

            expect(consoleErrorSpy).toBeCalledWith(
                "The store ID must be provided in order to update the SDK to use it.",
            );
        });

        test("API request to refresh ad zones after changing the store ID fails while trying to initialize the session", async () => {
            // @ts-ignore
            global.fetch = jest.fn(() => Promise.reject());

            const flushPromises = () => new Promise(setImmediate);
            const consoleErrorSpy = jest.spyOn(console, "error");
            const testSdk = sdk!;

            testSdk.updateStoreId(testStoreId);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(consoleErrorSpy).toBeCalledWith(
                `An error occurred initializing the SDK.`,
            );
        });

        test("API request to refresh ad zones after changing the store ID succeeds while trying to initialize the session", async () => {
            const flushPromises = () => new Promise(setImmediate);
            const testSdk = sdk!;
            testSdk.deviceOs = "android";
            testSdk.advertiserId = "TEST_ADVERTISER_ID";

            testSdk.updateStoreId(testStoreId);

            await flushPromises();

            expect(fetch).toHaveBeenCalled();
            expect(fetch).toHaveBeenCalledWith(
                "https://ads.adadapted.com/v/0.9.5/android/sessions/initialize",
                expect.objectContaining({
                    body: expect.stringContaining(
                        `"udid":"${testSdk.advertiserId}"`,
                    ),
                }),
            );
        });
    });

    describe("unmount()", () => {
        test("", () => {});
    });
});

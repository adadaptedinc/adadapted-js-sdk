const packageJson = require("../package.json");

/**
 * The AdAdapted JS SDK class.
 */
class AdadaptedJsSdk {
    /**
     * @inheritDoc
     */
    constructor() {
        this.apiKey = "";
        this.advertiserId = "";
        this.bundleId = "js_default_bundleID";
        this.bundleVersion = "js_default_bundleVersion";
        this.allowRetargeting = true;
        this.enablePayloads = false;
        this.enableKeywordIntercept = false;
        this.zonePlacements = undefined;
        this.apiEnv = this.#ApiEnv.Prod;
        this.listManagerApiEnv = this.#ListManagerApiEnv.Prod;
        this.payloadApiEnv = this.#PayloadApiEnv.Prod;
        this.deviceOs = undefined;
        this.sessionId = undefined;
        this.sessionLastActiveAt = undefined;
        this.sessionPersistedAt = undefined;
        this.sessionIsBackgrounded = false;
        this.keywordIntercepts = undefined;
        this.keywordInterceptSearchValue = "";
        this.initialBodyOverflowStyle = document.body.style.overflow;
        this.scrollContainerId = undefined;
        this.params = undefined;
        this.deviceLocale = undefined;

        /**
         * Map of {zone ID -> zone state}. Each entry owns its own ad request,
         * refresh countdown, and impression pairing, independent of every other
         * zone. This replaces the previous single list of zones that all shared
         * one global refresh timer.
         */
        this.zones = {};

        this.intersectionObserver = undefined;
        this.documentEventAbortController = undefined;

        /**
         * Triggered when the ad zone has refreshed.
         */
        this.onAdZoneRefreshed = () => {
            // Defaulting to empty method.
        };
        /**
         * Triggered when the add-to-list / add-to-cart action has occurred.
         */
        this.onAddItemsTriggered = () => {
            // Defaulting to empty method.
        };
        /**
         * Triggered when ads that represent external(non-app) content are clicked.
         */
        this.onExternalContentAdClicked = () => {
            // Defaulting to empty method.
        };
        /**
         * Triggered when payloads are available for processing.
         */
        this.onPayloadsAvailable = () => {
            // Defaulting to empty method.
        };
        /**
         * Triggered when ads have been retrieved.
         */
        this.onAdRetrieved = () => {
            // Defaulting to empty method.
        };
    }

    /**
     * Gets the current session ID.
     * NOTE: This is only exposed for developer validation if needed.
     * @returns the current session ID.
     */
    getSessionId() {
        return this.sessionId;
    }

    /**
     * Gets all available keyword intercepts.
     * NOTE: This is only exposed for developer validation if needed.
     * @returns the available keyword intercepts.
     */
    getAvailableKeywordIntercepts() {
        return this.keywordIntercepts &&
            this.keywordIntercepts.terms &&
            this.keywordIntercepts.terms.length
            ? this.keywordIntercepts.terms
            : undefined;
    }

    /**
     * Initializes the session for the AdAdapted API and sets up the SDK.
     * @param {object} props - The props used to initialize the SDK.
     * @returns a Promise of void.
     */
    initialize(props) {
        return new Promise((resolve, reject) => {
            // Verify required fields are provided before attempting to initialize the SDK.
            if (props.apiKey === undefined || props.apiKey === null) {
                reject(
                    "API key must be provided for the AdAdapted SDK to be initialized.",
                );
            } else if (
                props.advertiserId === undefined ||
                props.advertiserId === null
            ) {
                reject(
                    "A unique identifier(advertiserId) must be provided for the AdAdapted SDK to be initialized.",
                );
            } else if (
                props.allowRetargeting === undefined ||
                props.allowRetargeting === null
            ) {
                reject(
                    "A user's privacy decision to opt-in or opt-out for ad retargeting(allowRetargeting) must be provided for the AdAdapted SDK to be initialized.",
                );
            } else {
                // Set the API key.
                this.apiKey = props.apiKey;

                // Set the unique ID.
                this.advertiserId = props.advertiserId;

                // Set the bundle ID (default value used if not provided).
                if (props.bundleId) {
                    this.bundleId = props.bundleId;
                }

                // Set the bundle version (default value used if not provided).
                if (props.bundleVersion) {
                    this.bundleVersion = props.bundleVersion;
                }

                // Set the scroll container element ID.
                if (props.scrollContainerId) {
                    this.scrollContainerId = props.scrollContainerId;
                }

                // Set the additional params to use when interacting with the API.
                this.params = props.params;

                // Set whether the user is allowed to be retargetted by ads.
                this.allowRetargeting = props.allowRetargeting ? true : false;

                // Set whether external payloads are enabled.
                this.enablePayloads = props.enablePayloads ? true : false;

                // Set whether keyword intercepts are enabled.
                this.enableKeywordIntercept = props.enableKeywordIntercept
                    ? true
                    : false;

                // Set the zone placements provided by the client.
                this.zonePlacements = props.zonePlacements;

                // Set the API environments based on the provided override value.
                // If the apiEnv value is not provided, production will be used as default.
                // NOTE: This must normalize to a real value rather than pass props.apiEnv
                //       through, because it is part of the session storage key.
                this.#apiEnvString = props.apiEnv === "dev" ? "dev" : "prod";

                this.deviceLocale = props.deviceLocale;

                if (props.apiEnv === "dev") {
                    this.apiEnv = this.#ApiEnv.Dev;
                    this.payloadApiEnv = this.#PayloadApiEnv.Dev;
                    this.listManagerApiEnv = this.#ListManagerApiEnv.Dev;
                } else {
                    this.apiEnv = this.#ApiEnv.Prod;
                    this.payloadApiEnv = this.#PayloadApiEnv.Prod;
                    this.listManagerApiEnv = this.#ListManagerApiEnv.Prod;
                }

                // If the callback for onAdZoneRefreshed was provided, set it
                // globally for use when the method needs to be triggered.
                if (props.onAdZoneRefreshed) {
                    this.onAdZoneRefreshed = props.onAdZoneRefreshed;
                }

                // If the callback for onAddItemsTriggered was provided, set it
                // globally for use when the method needs to be triggered.
                if (props.onAddItemsTriggered) {
                    this.onAddItemsTriggered = props.onAddItemsTriggered;
                }

                // If the callback for onExternalContentAdClicked was provided, set it
                // globally for use when the method needs to be triggered.
                if (props.onExternalContentAdClicked) {
                    this.onExternalContentAdClicked =
                        props.onExternalContentAdClicked;
                }

                // If the callback for onPayloadsAvailable was provided, set it
                // globally for use when the method needs to be triggered.
                if (props.onPayloadsAvailable) {
                    this.onPayloadsAvailable = props.onPayloadsAvailable;
                }

                // If the callback for onAdRetrieved was provided, set it
                // globally for use when the method needs to be triggered.
                if (props.onAdRetrieved) {
                    this.onAdRetrieved = props.onAdRetrieved;
                }

                this.deviceOs = this.#getOperatingSystem();

                // Start the SDK. There is no session request to make anymore - the
                // session ID is generated client side and persisted to local storage.
                this.#startSdk()
                    .then(() => {
                        resolve();
                    })
                    .catch((errorMessage) => {
                        reject(errorMessage);
                    });
            }
        });
    }

    /**
     * Reports that a recipe has been loaded using the provided context.
     * @param {string} recipeContextId - The recipe context ID that was used for the recipe load.
     * @param {string[]} recipContextZoneIds - All zone IDs used to load ads for the recipe context ID.
     */
    reportRecipeLoaded(recipeContextId, recipContextZoneIds) {
        if (
            recipeContextId &&
            recipContextZoneIds &&
            recipContextZoneIds.length
        ) {
            const finalEventsList = [];
            const currentTs = this.#getCurrentUnixTimestamp();

            for (const zoneId of recipContextZoneIds) {
                finalEventsList.push({
                    event_source:
                        this.deviceOs === this.#DeviceOS.DESKTOP
                            ? this.#ListManagerEventSource.DESKTOP
                            : this.#ListManagerEventSource.APP,
                    event_name: "recipe_context",
                    event_timestamp: currentTs,
                    event_params: {
                        context_id: recipeContextId,
                        zone_id: zoneId,
                    },
                });
            }

            this.#fetchApiRequest({
                method: "POST",
                url: `${this.listManagerApiEnv}/v/1/${this.deviceOs}/events`,
                // Reported and not read: the response is unused, and the user
                // action that triggers it is routinely the last thing they do
                // before closing the tab. Without keepalive that request is
                // cancelled with the document and the signal is lost silently.
                keepalive: true,
                headers: [
                    {
                        name: "accept",
                        value: "application/json",
                    },
                    {
                        name: "x-api-key",
                        value: this.apiKey,
                    },
                ],
                requestPayload: this.#buildSdkEventRequest(finalEventsList),
                onError: () => {
                    console.error(
                        "An error occurred while reporting the recipe load event.",
                    );
                },
            });
        } else {
            console.error(
                "The recipe context ID and zone IDs list must be provided to report that a recipe loaded.",
            );
        }
    }

    /**
     * Searches through available ad keywords based on provided search term.
     * @param {string} searchTerm - The search term used to match against available keyword intercepts.
     * @returns all keyword intercept terms that matched the search term.
     */
    performKeywordSearch(searchTerm) {
        const finalResultListStartsWith = [];
        // const finalResultListContains = [];

        this.keywordInterceptSearchValue = searchTerm;

        if (!this.sessionId) {
            console.error("AdAdapted JS SDK has not been initialized.");
        } else if (!this.keywordIntercepts) {
            console.error("No available keyword intercepts.");
        } else if (
            searchTerm &&
            searchTerm.trim() &&
            searchTerm.trim().length >= this.#MIN_KEYWORD_MATCH_LENGTH
        ) {
            searchTerm = searchTerm.trim();

            const finalEventsList = [];
            const currentTs = this.#getCurrentUnixTimestamp();

            // Search for matching terms.
            for (const termObj of this.keywordIntercepts.terms) {
                if (
                    termObj.term
                        .toLowerCase()
                        .startsWith(searchTerm.toLowerCase())
                ) {
                    // If the term starts with the search term,
                    // add it to the finalResultListStartsWith list.
                    finalResultListStartsWith.push(termObj);
                    finalEventsList.push({
                        term_id: termObj.term_id,
                        search_id: this.keywordIntercepts.search_id,
                        user_input: this.keywordInterceptSearchValue,
                        term: termObj.term,
                        event_type: this.#ReportedEventType.MATCHED,
                        created_at: currentTs,
                    });
                }
            }

            // Sort the final results by priority.
            finalResultListStartsWith.sort((a, b) =>
                a.priority > b.priority ? 1 : -1,
            );
            // finalResultListContains.sort((a, b) =>
            //     a.priority > b.priority ? 1 : -1,
            // );

            // If there are no events to report at this point,
            // we need to report the "not_matched" event.
            if (finalEventsList.length === 0) {
                finalEventsList.push({
                    term_id: "",
                    search_id: "NA",
                    user_input: this.keywordInterceptSearchValue,
                    term: "NA",
                    event_type: this.#ReportedEventType.NOT_MATCHED,
                    created_at: currentTs,
                });
            }

            // Send up the "matched" event for the keyword search for
            // all terms that matched the users search.
            this.#fetchApiRequest({
                method: "POST",
                url: `${this.apiEnv}/v/1.0.0/intercept/events`,
                // Reported and not read: the response is unused, and the user
                // action that triggers it is routinely the last thing they do
                // before closing the tab. Without keepalive that request is
                // cancelled with the document and the signal is lost silently.
                keepalive: true,
                headers: [
                    {
                        name: "accept",
                        value: "application/json",
                    },
                    {
                        name: "x-api-key",
                        value: this.apiKey,
                    },
                ],
                requestPayload: {
                    app_id: this.apiKey,
                    udid: this.advertiserId,
                    session_id: this.#ensureSession(),
                    sdk_version: packageJson.version,
                    events: finalEventsList,
                },
                onError: () => {
                    console.error(
                        `An error occurred while reporting the keyword intercept "${
                            this.#ReportedEventType.MATCHED
                        }" or "${this.#ReportedEventType.NOT_MATCHED}" event.`,
                    );
                },
            });
        }

        // The returned list will keep all terms found by matching the
        // beginning of the term string at the beginning of the list. All
        // terms found that didn't match the beginning of the string, but
        // still contained the search term will be concatenated to the end
        // of the list.
        // return finalResultListStartsWith.concat(finalResultListContains);

        // Only the strings that start with the search term will be returned currently.
        return finalResultListStartsWith;
    }

    /**
     * Client must trigger this method when a Keyword Intercept Term has been "presented" to the user.
     * All terms that satisfy a search don't have to be presented, so only provide term IDs for the
     * terms that ultimately get presented to the user.
     * NOTE: This will ensure that the event is properly recorded and enable accuracy in client reports.
     * @param {string[]} termIds - The keyword intercept term IDs list to trigger the event for.
     */
    reportKeywordInterceptTermsPresented(termIds) {
        const termObjs = [];

        if (termIds) {
            for (const termId of termIds) {
                const termObj = this.#getKeywordInterceptTerm(termId);

                if (termObj) {
                    termObjs.push(termObj);
                }
            }
        }

        if (!this.sessionId) {
            console.error("AdAdapted JS SDK has not been initialized.");
        } else if (!this.keywordIntercepts) {
            console.error("No available keyword intercepts.");
        } else if (!termIds || termIds.length === 0 || termObjs.length === 0) {
            console.error(
                "Invalid or empty keyword intercept list of term IDs provided.",
            );
        } else {
            const termEvents = [];
            const currentTs = this.#getCurrentUnixTimestamp();

            for (const termObj of termObjs) {
                termEvents.push({
                    term_id: termObj.term_id,
                    search_id: this.keywordIntercepts.search_id,
                    user_input: this.keywordInterceptSearchValue,
                    term: termObj.term,
                    event_type: this.#ReportedEventType.PRESENTED,
                    created_at: currentTs,
                });
            }

            this.#fetchApiRequest({
                method: "POST",
                url: `${this.apiEnv}/v/1.0.0/intercept/events`,
                // Reported and not read: the response is unused, and the user
                // action that triggers it is routinely the last thing they do
                // before closing the tab. Without keepalive that request is
                // cancelled with the document and the signal is lost silently.
                keepalive: true,
                headers: [
                    {
                        name: "accept",
                        value: "application/json",
                    },
                    {
                        name: "x-api-key",
                        value: this.apiKey,
                    },
                ],
                requestPayload: {
                    app_id: this.apiKey,
                    udid: this.advertiserId,
                    session_id: this.#ensureSession(),
                    sdk_version: packageJson.version,
                    events: termEvents,
                },
                onError: () => {
                    console.error(
                        `An error occurred while reporting the keyword intercept "${
                            this.#ReportedEventType.PRESENTED
                        }" event.`,
                    );
                },
            });
        }
    }

    /**
     * Client must trigger this method when a Keyword Intercept Term has been "selected" by the user.
     * This will ensure that the event is properly recorded and enable accuracy in client reports.
     * @param {string} termId - The term ID to trigger the event for.
     */
    reportKeywordInterceptTermSelected(termId) {
        const termObj = this.#getKeywordInterceptTerm(termId);

        if (!this.sessionId) {
            console.error("AdAdapted JS SDK has not been initialized.");
        } else if (!this.keywordIntercepts) {
            console.error("No available keyword intercepts.");
        } else if (!termId || !termObj) {
            console.error("Invalid keyword intercept term ID provided.");
        } else {
            this.#fetchApiRequest({
                method: "POST",
                url: `${this.apiEnv}/v/1.0.0/intercept/events`,
                // Reported and not read: the response is unused, and the user
                // action that triggers it is routinely the last thing they do
                // before closing the tab. Without keepalive that request is
                // cancelled with the document and the signal is lost silently.
                keepalive: true,
                headers: [
                    {
                        name: "accept",
                        value: "application/json",
                    },
                    {
                        name: "x-api-key",
                        value: this.apiKey,
                    },
                ],
                requestPayload: {
                    app_id: this.apiKey,
                    udid: this.advertiserId,
                    session_id: this.#ensureSession(),
                    sdk_version: packageJson.version,
                    events: [
                        {
                            term_id: termObj.term_id,
                            search_id: this.keywordIntercepts.search_id,
                            user_input: this.keywordInterceptSearchValue,
                            term: termObj.term,
                            event_type: this.#ReportedEventType.SELECTED,
                            created_at: this.#getCurrentUnixTimestamp(),
                        },
                    ],
                },
                onError: () => {
                    console.error(
                        `An error occurred while reporting the keyword intercept "${
                            this.#ReportedEventType.SELECTED
                        }" event.`,
                    );
                },
            });
        }
    }

    /**
     * Builds the handle handed to the host alongside an "add to list" ad's items,
     * so the acknowledgement can be tied back to the click that produced it.
     *
     * The ad is captured here rather than looked up later because the zone rotates
     * on to its next ad as soon as the click is handled, so by the time the host
     * confirms, the zone is showing something else entirely.
     * @param {object} ad - The ad the items came from.
     * @param {boolean} isAlreadyReported - True if the interaction for this ad has already been reported, so acknowledging must not report a second one.
     * @returns the handle to hand to the client.
     */
    #createAtlContent(ad, isAlreadyReported) {
        const reportedAd = { ...ad };
        const createdInGeneration = this.#atlGeneration;
        let isHandled = isAlreadyReported === true;

        const atlContent = {
            adId: reportedAd.id,
            zoneId: reportedAd.zone_id,
            // Says up front whether confirming this one will do anything. Items
            // added from inside an ad popover arrive here too, and that click was
            // already counted when the popover opened, so there is nothing left to
            // confirm. Without this the host cannot tell the two apart and has no
            // way to know its acknowledgement was a no-op.
            requiresAcknowledgement: !isHandled,
            acknowledge: () => {
                // Guarded so a host that confirms twice reports one interaction,
                // the way AdContent.isHandled does on the native SDKs. The
                // generation check is the same idea across a teardown: the host may
                // still be holding this handle long after the click stopped meaning
                // anything.
                if (isHandled || createdInGeneration !== this.#atlGeneration) {
                    return false;
                }

                isHandled = true;

                this.#forgetPendingAtlClick(atlContent);

                // Sent with keepalive for the same reason the click itself is: this
                // is the deferred half of that click, and the host may well navigate
                // on the back of the same user action.
                this.#triggerReportAdEvent(
                    reportedAd,
                    this.#ReportedEventType.INTERACTION,
                    undefined,
                    true,
                );

                return true;
            },
        };

        // An interaction already counted is not pending anything, so it is not
        // queued - acknowledgeAdded() must never find it and report a duplicate.
        if (!isAlreadyReported) {
            this.#pendingAtlClicks.push(atlContent);

            while (
                this.#pendingAtlClicks.length > this.#MAX_PENDING_ATL_CLICKS
            ) {
                const dropped = this.#pendingAtlClicks.shift();

                console.warn(
                    `The "add to list" click on ad "${dropped.adId}" was never acknowledged and has been dropped.`,
                );
            }
        }

        return atlContent;
    }

    /**
     * Abandons every click still waiting on the host.
     *
     * The generation is bumped rather than the handles being altered, because the
     * host is holding those handles. A confirmation arriving after teardown would
     * otherwise fire a request off the back of an SDK that no longer exists, and
     * one arriving after a second initialize() would report against the session
     * that replaced the one the click belonged to.
     */
    #discardPendingAtlClicks() {
        this.#atlGeneration = this.#atlGeneration + 1;
        this.#pendingAtlClicks = [];
    }

    /**
     * Drops a click from the pending list, however it came to be resolved.
     * @param {object} atlContent - The handle to forget.
     */
    #forgetPendingAtlClick(atlContent) {
        const position = this.#pendingAtlClicks.indexOf(atlContent);

        if (position !== -1) {
            this.#pendingAtlClicks.splice(position, 1);
        }
    }

    /**
     * Confirms that the items from the oldest unacknowledged "add to list" ad click
     * reached the user's list, which is what reports that ad's interaction.
     *
     * DEPRECATED: use the handle passed as the second argument to
     * onAddItemsTriggered instead. This method has no way to say which click is
     * being confirmed, so it resolves the oldest one still outstanding. With zones
     * serving independently a user can click two add to list ads before the first
     * is confirmed, and a host that then confirms them out of order reports each
     * interaction against the wrong ad.
     * @deprecated Call acknowledge() on the handle from onAddItemsTriggered.
     */
    acknowledgeAdded() {
        const oldestPendingClick = this.#pendingAtlClicks[0];

        if (!oldestPendingClick) {
            console.error(
                "An ATL ad must be selected by the user in order to acknowledge item being added to list.",
            );

            return;
        }

        oldestPendingClick.acknowledge();
    }

    /**
     * Client must trigger this method when any items are added to the cart by the user for reports we provide to the client.
     * NOTE: This is an optional method!
     * @param {string[]} itemNames - The items to report.
     * @param {string} cartId - The ID of the cart the items were placed within.
     */
    reportItemsAddedToCart(itemNames, cartId) {
        if (itemNames && itemNames.length && cartId) {
            this.#reportItemsAddedToListOrCart(
                this.#ListManagerType.CART,
                itemNames,
                cartId,
            );
        } else {
            console.error(
                "Both cart ID and item names list must be provided in order to report adding items to cart.",
            );
        }
    }

    /**
     * Client must trigger this method when any items are deleted from the cart by the user for reports we provide to the client.
     * NOTE: This is an optional method!
     * @param {string[]} itemNames - The items to report.
     * @param {string} cartId - The ID of the cart the items were placed within.
     */
    reportItemsDeletedFromCart(itemNames, cartId) {
        if (itemNames && itemNames.length && cartId) {
            this.#reportItemsDeletedFromListOrCart(
                this.#ListManagerType.CART,
                itemNames,
                cartId,
            );
        } else {
            console.error(
                "Both cart ID and item names list must be provided in order to report deleting items from cart.",
            );
        }
    }

    /**
     * Client must trigger this method when any items are added to a list for reports we provide to the client.
     * NOTE: This is an optional method!
     * @param {string[]} itemNames - The items to report.
     * @param {string} listName - (optional) The list to associate the items with, if available.
     */
    reportItemsAddedToList(itemNames, listName) {
        if (itemNames && itemNames.length) {
            this.#reportItemsAddedToListOrCart(
                this.#ListManagerType.LIST,
                itemNames,
                listName,
            );
        } else {
            console.error(
                "The item names list must be provided in order to add items to list.",
            );
        }
    }

    /**
     * Client must trigger this method when any items are deleted from a list for reports we provide to the client.
     * NOTE: This is an optional method!
     * @param {string[]} itemNames - The items to report.
     * @param {string} listName - (optional) The list the items are associated with, if available.
     */
    reportItemsDeletedFromList(itemNames, listName) {
        if (itemNames && itemNames.length) {
            this.#reportItemsDeletedFromListOrCart(
                this.#ListManagerType.LIST,
                itemNames,
                listName,
            );
        } else {
            console.error(
                "The item names list must be provided in order to delete items from list.",
            );
        }
    }

    /**
     * Client must trigger this method when any items are crossed off a list for reports we provide to the client.
     * NOTE: This is an optional method!
     * @param {string[]} itemNames - The items to report.
     * @param {string} listName - (optional) The list the items are associated with, if available.
     */
    reportItemsCrossedOffList(itemNames, listName) {
        if (itemNames && itemNames.length) {
            const requestPayload = this.#getListManagerApiRequestData(
                this.#ListManagerEventName.CROSSED_OFF_LIST,
                itemNames,
                listName,
            );

            this.#fetchApiRequest({
                method: "POST",
                url: `${this.listManagerApiEnv}/v/1/${this.deviceOs}/events`,
                // Reported and not read: the response is unused, and the user
                // action that triggers it is routinely the last thing they do
                // before closing the tab. Without keepalive that request is
                // cancelled with the document and the signal is lost silently.
                keepalive: true,
                headers: [
                    {
                        name: "accept",
                        value: "application/json",
                    },
                    {
                        name: "x-api-key",
                        value: this.apiKey,
                    },
                ],
                requestPayload,
                onError: () => {
                    console.error(
                        `An error occurred while reporting an item "${
                            this.#ListManagerEventName.CROSSED_OFF_LIST
                        }" event.`,
                    );
                },
            });
        } else {
            console.error(
                "The item names list must be provided in order to cross off items from list.",
            );
        }
    }

    /**
     * This method should be triggered when payloads have been delivered or rejected.
     * This method accepts a list of payloads to enable performing this action as a batch operation if desired.
     * @param {Array} payloadStatusList - The list of payload status objects to submit.
     */
    updatePayloadStatus(payloadStatusList) {
        if (payloadStatusList && payloadStatusList.length) {
            // The event timestamp has to be sent as a unix timestamp.
            const currentTsMilliseconds = new Date().getTime();
            const finalPayloadStatusList = [];

            // Make sure each status update contains the current timestamp.
            for (const payloadStatus of payloadStatusList) {
                finalPayloadStatusList.push({
                    ...payloadStatus,
                    event_timestamp: currentTsMilliseconds,
                });
            }

            this.#sendPayloadStatusUpdate(finalPayloadStatusList);
        } else {
            console.error(
                "The payload status list must be provided in order to update the payload(s) status.",
            );
        }
    }

    /**
     * Method that can be triggered to update the Store ID if you are targeting ads by store.
     * NOTE: Use this method when a user has changed their focused on store.
     * @param {string} newStoreId - The new store ID to use going forward.
     */
    updateStoreId(newStoreId) {
        if (newStoreId) {
            // Update the store ID.
            this.params = {
                ...this.params,
                storeId: newStoreId,
            };

            // Refresh every zone so the new store ID takes affect.
            this.#refreshZones();
        } else {
            console.error(
                "The store ID must be provided in order to update the SDK to use it.",
            );
        }
    }

    /**
     * Method that can be triggered to update the Recipe context ID.
     * NOTE: Use this method when a new recipe is being shown.
     * @param {string} newRecipeContextId - The new recipe context ID to use going forward.
     * @param {string[]} newRecipContextZoneIds - The new recipe context zone IDs to use going forward.
     */
    updateRecipeContextId(newRecipeContextId, newRecipContextZoneIds) {
        if (newRecipeContextId) {
            // Update the recipe context ID.
            this.params = {
                ...this.params,
                recipeContextId: newRecipeContextId,
                recipeContextZoneIds: newRecipContextZoneIds,
            };

            // Track the the recipe load.
            this.reportRecipeLoaded(newRecipeContextId, newRecipContextZoneIds);

            // Refresh only the zones the new recipe context applies to, so the
            // context ID takes affect for them.
            this.#refreshZones(newRecipContextZoneIds);
        } else {
            console.error(
                "The recipe context ID must be provided in order to update the SDK to use it.",
            );
        }
    }

    /**
     * Performs all clean up tasks for the SDK. Call this method when you are
     * finished with the SDK to ensure you don't experience memory leaks.
     */
    unmount() {
        // Close out every zone before tearing down the listeners, so the
        // "impression_end" and "zone_unmounted" events still get reported.
        for (const zoneId of Object.keys(this.zones)) {
            this.#unmountZone(this.zones[zoneId]);
        }

        this.zones = {};

        this.#discardPendingAtlClicks();

        // An open popover outlives the SDK otherwise, leaving the host page under a
        // full screen overlay it cannot dismiss and with body scrolling disabled.
        const popoverContainer = document.getElementById(
            "adContentsPopoverContainer",
        );

        if (popoverContainer && popoverContainer.parentNode) {
            popoverContainer.parentNode.removeChild(popoverContainer);
        }

        document.body.style.overflow = this.initialBodyOverflowStyle;

        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = undefined;
        }

        // Removes the visibilitychange and pagehide listeners in one shot.
        if (this.documentEventAbortController) {
            this.documentEventAbortController.abort();
            this.documentEventAbortController = undefined;
        }
    }

    /**
     * Starts the SDK up. Resolves the session, wires up the document level
     * listeners, mounts the ad zones, and kicks off the keyword intercept and
     * payload requests.
     * @returns a Promise of void.
     */
    #startSdk() {
        return Promise.all([
            this.#getHashSHA256(this.apiKey),
            this.#getHashSHA256(`${this.apiKey}::${this.advertiserId}`),
        ]).then(([hashedApiKey, hashedSessionOwner]) => {
            this.#hashedSessionOwner = hashedSessionOwner;

            // Drop any session cached by an older version of the SDK. The oldest
            // payload carried server issued zones and ads and does not parse as the
            // current shape at all; the one after it parses fine but was keyed on
            // the app alone, so it belongs to whoever used this browser last rather
            // than to the user signing in now.
            //
            // Only these two exact keys are removed, never a sweep of everything
            // starting "aa-session-". Another user's current session lives under
            // this same prefix, and clearing it would recreate on a shared device
            // the very problem the owner hash is here to fix.
            try {
                localStorage.removeItem(
                    `aa-session-${this.#apiEnvString}-${hashedApiKey}`,
                );
                localStorage.removeItem(
                    `aa-session-v2-${this.#apiEnvString}-${hashedApiKey}`,
                );
            } catch {
                // Local storage being unavailable must not stop the SDK.
            }

            // Seeded from the page's actual state, so a page that starts out
            // unfocused does not immediately report a transition it never made.
            this.sessionIsBackgrounded = this.#isPageBackgrounded();

            // Generates or resumes the session, reporting the matching event.
            this.#resolveSession();

            this.#listenForDocumentEvents();

            // Mount every zone the client gave a placement for. Each one then
            // requests its own ad, independent of the others.
            this.#mountZones();

            // Get all possible keyword intercept values.
            // We don't need to wait for this to complete
            // prior to resolving initialization of the SDK.
            this.#getKeywordIntercepts();

            // Make the initial call to the Payload data server to see if
            // the user has any outstanding items to be added to list.
            this.#requestPayloadItemData();
        });
    }

    /**
     * Takes a value and hashes it as SHA-256.
     * @param {*} value - The value to hash.
     * @returns a Promise of the hashed value.
     */
    #getHashSHA256(value) {
        // This hash only namespaces the session's local storage key, so it does not
        // need to be cryptographic.
        //
        // crypto.subtle is restricted to secure contexts and is simply absent on an
        // http:// page served from anything other than localhost, which covers a lot
        // of real development and staging hosts. Letting that failure escape took
        // the entire SDK down: initialize() rejected, so no session was created, no
        // document listeners were attached and no ad zone was ever mounted. A
        // non-cryptographic fallback keeps the SDK working there instead.
        try {
            if (
                typeof crypto !== "undefined" &&
                crypto.subtle &&
                typeof crypto.subtle.digest === "function"
            ) {
                const utf8 = new TextEncoder().encode(value);

                return crypto.subtle
                    .digest("SHA-256", utf8)
                    .then((hashBuffer) => {
                        return Array.from(new Uint8Array(hashBuffer))
                            .map((bytes) => bytes.toString(16).padStart(2, "0"))
                            .join("");
                    })
                    .catch(() => this.#getFallbackHash(value));
            }
        } catch {
            // Reading crypto.subtle can itself throw in a hardened environment.
        }

        return Promise.resolve(this.#getFallbackHash(value));
    }

    /**
     * Hashes a value without the Web Crypto API, for contexts where it isn't
     * available. Uses FNV-1a, which is deterministic and spreads well enough to keep
     * one app's stored session from colliding with another's.
     * @param {string} value - The value to hash.
     * @returns the hashed value.
     */
    #getFallbackHash(value) {
        let hash = 0x811c9dc5;

        for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }

        // Prefixed so it can never be mistaken for, or collide with, a SHA-256 key
        // written by the same app in a secure context.
        return `fnv1a${hash.toString(16).padStart(8, "0")}`;
    }

    /**
     * Gets the local storage key the session is persisted under.
     * @returns the local storage key for the session.
     */
    #getSessionStorageKey() {
        return `aa-session-v3-${this.#apiEnvString}-${this.#hashedSessionOwner}`;
    }

    /**
     * Generates a new client side session ID.
     * Format: "JS" followed by 32 characters from [A-Z0-9].
     * @returns the generated session ID.
     */
    #generateSessionId() {
        const characters = this.#SESSION_ID_CHARACTERS;

        // The largest multiple of the alphabet length that fits in a byte. Rejecting
        // anything at or above it keeps every character equally likely, instead of
        // biasing towards the start of the alphabet.
        const rejectAtOrAbove = 256 - (256 % characters.length);

        let sessionId = "";

        while (sessionId.length < this.#SESSION_ID_LENGTH) {
            const randomBytes = crypto.getRandomValues(
                new Uint8Array(this.#SESSION_ID_LENGTH),
            );

            for (const randomByte of randomBytes) {
                if (sessionId.length >= this.#SESSION_ID_LENGTH) {
                    break;
                }

                if (randomByte < rejectAtOrAbove) {
                    sessionId += characters.charAt(
                        randomByte % characters.length,
                    );
                }
            }
        }

        return `${this.#SESSION_ID_PREFIX}${sessionId}`;
    }

    /**
     * Reads the persisted session from local storage.
     * @returns the persisted session, or undefined if there isn't a usable one.
     */
    #loadPersistedSession() {
        try {
            const storedValue = localStorage.getItem(
                this.#getSessionStorageKey(),
            );

            if (!storedValue) {
                return undefined;
            }

            const parsedSession = JSON.parse(storedValue);

            if (
                !parsedSession ||
                !parsedSession.sessionId ||
                typeof parsedSession.sessionId !== "string" ||
                typeof parsedSession.lastActiveAt !== "number"
            ) {
                return undefined;
            }

            return parsedSession;
        } catch {
            // A corrupt or unreadable entry is treated the same as no entry at all.
            return undefined;
        }
    }

    /**
     * Writes the current session to local storage so it survives a page load.
     */
    #persistSession() {
        this.sessionPersistedAt = this.sessionLastActiveAt;

        try {
            localStorage.setItem(
                this.#getSessionStorageKey(),
                JSON.stringify({
                    sessionId: this.sessionId,
                    createdAt: this.#sessionCreatedAt,
                    lastActiveAt: this.sessionLastActiveAt,
                }),
            );
        } catch {
            // Local storage being unavailable or full must not break ad serving.
            // The session then just lives for the life of the page.
        }
    }

    /**
     * Stamps the session as active as of now and persists it. Triggered whenever
     * the tab is about to stop being visible, so the inactivity window gets
     * measured from the last moment the user was actually looking at the page.
     */
    #touchSession(forcePersist) {
        if (!this.sessionId) {
            return;
        }

        const currentTime = Date.now();

        // The in-memory stamp always advances, because it is what decides whether
        // the session has gone stale. Writing it through to local storage is
        // throttled: this runs on every reported event, and the stored copy only
        // has to be fresh enough that reopening the page within the session window
        // resumes the same ID.
        const shouldPersist =
            forcePersist === true ||
            this.sessionPersistedAt === undefined ||
            currentTime - this.sessionPersistedAt >=
                this.#SESSION_TOUCH_PERSIST_MS;

        this.sessionLastActiveAt = currentTime;

        if (shouldPersist) {
            this.#persistSession();
        }
    }

    /**
     * Generates a new session ID, or resumes the persisted one if it hasn't gone
     * stale, and reports the matching session event.
     *
     * The session window is a sliding one. It only expires once the tab has been
     * hidden or closed for the full duration, so a tab being actively used keeps
     * its session ID for as long as it stays in use.
     * @returns true if a new session was created, false if an existing one resumed.
     */
    #resolveSession() {
        const currentTime = Date.now();
        const persistedSession = this.#loadPersistedSession();
        const isNewSession =
            !persistedSession ||
            currentTime - persistedSession.lastActiveAt >=
                this.#SESSION_LIFETIME_MS;

        // An impression left open when the ID changes would report its
        // impression_end under the new session, leaving the old session an
        // impression with no end and the new one an end with no impression. The
        // impression_id is assigned by the API per ad, so the pair cannot simply be
        // reopened under the new session either - that would report the same
        // impression_id twice. Closing it here keeps each pair whole and inside one
        // session; the zone's next ad impresses under the new one.
        if (isNewSession && this.sessionId) {
            this.#closeOpenImpressions();
        }

        if (isNewSession) {
            this.sessionId = this.#generateSessionId();
            this.#sessionCreatedAt = currentTime;
        } else {
            this.sessionId = persistedSession.sessionId;
            this.#sessionCreatedAt = persistedSession.createdAt;
        }

        this.sessionLastActiveAt = currentTime;

        this.#persistSession();

        this.#trackSdkEvent(
            isNewSession
                ? this.#SdkEventName.SESSION_CREATED
                : this.#SdkEventName.SESSION_RESUMED,
            {
                sessionId: this.sessionId,
            },
        );

        return isNewSession;
    }

    /**
     * Makes sure a usable session ID exists before a request that needs one goes
     * out. Generates a new session if the current one has aged out.
     * @returns the current session ID.
     */
    #ensureSession() {
        if (this.#sessionRotating) {
            // Mid-rotation, so the events being reported are the ones closing out
            // the outgoing session and they belong to the ID that is still current.
            return this.sessionId;
        }

        if (!this.#hashedSessionOwner) {
            // Reachable when a client calls a reporting method before initialize()
            // has resolved. Minting a session here would key it on an empty API key
            // and report a session that no configured app owns, so the request is
            // left to go out without one instead.
            return this.sessionId;
        }

        if (!this.sessionId) {
            this.#resolveSession();

            return this.sessionId;
        }

        // A visible page the user is actually on is active by definition, so being
        // used counts as activity and slides the window forward. Without this the
        // window would be measured from initialize() and a tab left open would
        // rotate its session ID part way through a single continuous visit,
        // splitting one visit across two sessions and attributing an ad's
        // impression_end to a session that never saw its impression.
        //
        // The backgrounded check is what stops that becoming a session that never
        // expires. A visible tab the browser is not focused on keeps serving its
        // zones by design, and every one of those requests calls through here, so
        // without it a page left on a second monitor would slide its own window
        // forward indefinitely and the inactivity window would be unreachable.
        if (
            document.visibilityState !== "hidden" &&
            !this.sessionIsBackgrounded
        ) {
            this.#touchSession();

            return this.sessionId;
        }

        // Not the user's focus, so the window is genuinely elapsing. Rotate once it
        // runs out.
        if (
            Date.now() - this.sessionLastActiveAt >=
            this.#SESSION_LIFETIME_MS
        ) {
            this.#resolveSession();
        }

        return this.sessionId;
    }

    /**
     * Wires up the document level listeners used to track whether the ads on the
     * page are actually in front of the user.
     */
    #listenForDocumentEvents() {
        // Abort the existing listeners if they were already set up.
        if (this.documentEventAbortController) {
            this.documentEventAbortController.abort();
        }

        this.documentEventAbortController = new AbortController();

        const listenerOptions = {
            signal: this.documentEventAbortController.signal,
        };

        document.addEventListener(
            "visibilitychange",
            () => {
                // The session transition is settled first, so any event reported by
                // the zone handling below already carries the right session ID.
                this.#updateSessionActivity();

                if (document.visibilityState === "hidden") {
                    this.#onPageHidden();
                } else {
                    this.#onPageVisible();
                }
            },
            listenerOptions,
        );

        // A tab can stop being the user's focus without ever becoming hidden: the
        // browser itself loses focus to another application while the tab stays on
        // screen. visibilitychange does not fire for that, so focus is tracked too.
        // Only the session responds to these, not the ad zones - an ad in a visible
        // tab is still in front of the user even when the browser is not the
        // frontmost app.
        //
        // WHEN TESTING THIS BY HAND: devtools counts as a separate window, so a page
        // with devtools focused already reports document.hasFocus() as false. The
        // session is therefore backgrounded before you start, and because
        // SESSION_BACKGROUNDED only fires on a transition, switching to another app
        // from there reports nothing at all - which looks exactly like the feature
        // being broken. Click on the page itself first, which reports
        // SESSION_RESUMED, and only then switch away.
        window.addEventListener(
            "blur",
            () => {
                this.#updateSessionActivity(true);
            },
            listenerOptions,
        );

        window.addEventListener(
            "focus",
            () => {
                this.#updateSessionActivity(false);
            },
            listenerOptions,
        );

        // A page that fires "pagehide" is not always going away. iOS Safari fires it
        // on pages it later brings back, and every zone was reported unmounted on
        // the way out, so without this they would stay unmounted for the rest of the
        // page's life - no impressions, no refreshes, and no way to recover.
        window.addEventListener(
            "pageshow",
            () => {
                this.#onPageShow();
            },
            listenerOptions,
        );

        // "pagehide" rather than "beforeunload", because iOS Safari does not
        // reliably fire "beforeunload" when a tab is closed.
        window.addEventListener(
            "pagehide",
            (event) => {
                this.#onPageHide(event);
            },
            listenerOptions,
        );
    }

    /**
     * Determines whether the page has stopped being the user's current focus. That
     * happens two ways: the tab stops being the shown tab, or the browser itself
     * stops being the focused application while this tab is the one on screen.
     * @returns true if the page is currently backgrounded.
     */
    #isPageBackgrounded() {
        if (document.visibilityState === "hidden") {
            return true;
        }

        // hasFocus is what catches the browser losing focus to another app, which
        // never raises visibilitychange. Treated as focused when unavailable, so a
        // host without it behaves as it did before rather than reporting the session
        // as permanently backgrounded.
        return typeof document.hasFocus === "function"
            ? !document.hasFocus()
            : false;
    }

    /**
     * Reconciles the session against whether the page is currently the user's focus,
     * reporting an event only when that actually changes. Several signals can report
     * the same transition - switching tabs raises both a visibility change and a
     * focus change - so the events are driven off the tracked state rather than off
     * the individual listeners.
     */
    #updateSessionActivity(backgroundedHint) {
        // A blur or focus event is itself proof of the transition, so the hint it
        // passes is trusted over re-reading document.hasFocus(). Some browsers have
        // not updated hasFocus() yet at the moment the event fires, and deriving the
        // state from it there would drop the transition entirely.
        const isBackgrounded =
            backgroundedHint === undefined
                ? this.#isPageBackgrounded()
                : backgroundedHint || document.visibilityState === "hidden";

        if (isBackgrounded === this.sessionIsBackgrounded) {
            return;
        }

        this.sessionIsBackgrounded = isBackgrounded;

        if (isBackgrounded) {
            this.#onSessionBackgrounded();
        } else {
            this.#onSessionForegrounded();
        }
    }

    /**
     * Triggered when the page stops being the user's focus. Stamps the session as
     * active as of now, which is what the inactivity window is measured from, and
     * reports the event.
     */
    #onSessionBackgrounded() {
        this.#touchSession(true);

        // Sent with keepalive for the same reason the impression close in
        // #onPageHidden is: closing a tab backgrounds the page first, so this is
        // the last chance to report it and a plain request is cancelled when the
        // document goes away.
        this.#trackSdkEvent(
            this.#SdkEventName.SESSION_BACKGROUNDED,
            {
                sessionId: this.sessionId,
            },
            true,
        );
    }

    /**
     * Triggered when the page becomes the user's focus again. Resumes the session,
     * or starts a new one if it was away for longer than the session window.
     */
    #onSessionForegrounded() {
        this.#resolveSession();
    }

    /**
     * Triggered when the browser tab becomes visible again.
     */
    #onPageVisible() {
        for (const zoneId of Object.keys(this.zones)) {
            const zone = this.zones[zoneId];

            this.#flushZoneUnfilled(zone);

            // Resume first, then track. An ad that aged out while the zone was
            // away is replaced by the refetch resuming starts, but that request is
            // asynchronous, so the ad on screen is the same one either way and the
            // impression below belongs to it. It stays open until the replacement
            // actually arrives, which is the ad the user is looking at until then.
            this.#resumeZoneTimer(zone);
            this.#trackImpression(zone);
        }
    }

    /**
     * Triggered when the browser tab is no longer visible. The zones are all still
     * mounted, so no unmount event is reported here.
     */
    #onPageHidden() {
        for (const zoneId of Object.keys(this.zones)) {
            const zone = this.zones[zoneId];

            // Sent with keepalive because a tab close fires this before pagehide,
            // so this is the call that actually reports the event. Without it the
            // request is cancelled when the document goes away and the impression
            // is never closed out.
            this.#endImpression(zone, true);
            this.#pauseZoneTimer(zone);
        }
    }

    /**
     * Triggered when the page is going away. This is the last chance to report the
     * closing events, so they go out on a keepalive request.
     */
    #onPageHide(event) {
        this.#touchSession(true);

        // A page entering the back/forward cache is suspended rather than
        // destroyed, and can be restored and shown again. Reporting the zones as
        // unmounted here would leave the mount/unmount pairs unbalanced: on restore
        // the timers resume and the zones serve ads again, with no second
        // zone_mounted and no way to ever report zone_unmounted again.
        const isEnteringBackForwardCache = event
            ? event.persisted === true
            : false;

        for (const zoneId of Object.keys(this.zones)) {
            const zone = this.zones[zoneId];

            this.#endImpression(zone, true);
            this.#pauseZoneTimer(zone);

            if (!isEnteringBackForwardCache) {
                this.#reportZoneUnmounted(zone, true);
            }
        }
    }

    /**
     * Triggered when a page that had been hidden is shown again, whether it was
     * restored from the back/forward cache or never actually went away.
     */
    #onPageShow() {
        for (const zoneId of Object.keys(this.zones)) {
            const zone = this.zones[zoneId];

            // A zone still marked mounted came back from the back/forward cache,
            // where nothing was reported on the way out. It needs no second
            // zone_mounted, only its timer back.
            if (!zone.mounted) {
                zone.mounted = true;

                this.#triggerReportZoneEvent(
                    zone.zoneId,
                    this.#ReportedEventType.ZONE_MOUNTED,
                );
            }

            // Going away closed the impression on whatever the zone was showing.
            // That ad cannot simply be counted again - the impression ID belongs to
            // the ad, so a second pair under the same ID is not a second impression
            // - and leaving it would put an ad back in front of the user that no
            // longer counts for anything. The zone takes a fresh ad instead.
            if (zone.currentAd && zone.impressionEndTracked) {
                this.#loadNextAd(zone);

                continue;
            }

            this.#resumeZoneTimer(zone);
            this.#trackImpression(zone);
        }
    }

    /**
     * Mounts every ad zone the client provided a placement element for.
     */
    #mountZones() {
        // Tear down anything left over from a previous initialize() call, so the
        // zones and the observer can't be doubled up.
        for (const zoneId of Object.keys(this.zones)) {
            this.#unmountZone(this.zones[zoneId]);
        }

        this.zones = {};

        this.#discardPendingAtlClicks();

        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = undefined;
        }

        if (
            this.zonePlacements === undefined ||
            this.zonePlacements === null ||
            this.#totalProperties(this.zonePlacements) === 0
        ) {
            // Without a zone placement map there is nowhere to put an ad. Clients
            // using only the keyword intercept feature land here.
            return;
        }

        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                this.#onZoneIntersectionChanged(entries);
            },
            {
                root: this.scrollContainerId
                    ? document.getElementById(this.scrollContainerId)
                    : null,
                // A threshold of 0 makes isIntersecting true as soon as any part of
                // the zone is within view, both horizontally and vertically.
                threshold: 0,
            },
        );

        for (const [zoneId, placementElementId] of Object.entries(
            this.zonePlacements,
        )) {
            this.#mountZone(zoneId, placementElementId);
        }
    }

    /**
     * Mounts a single ad zone and requests its first ad.
     * @param {string} zoneId - The ad zone ID.
     * @param {string} placementElementId - The ID of the client element the zone displays within.
     */
    #mountZone(zoneId, placementElementId) {
        const containerElement = document.getElementById(placementElementId);

        if (!containerElement) {
            console.error(
                `No element with the ID "${placementElementId}" was found to display ad zone "${zoneId}" within.`,
            );

            // The zone can't be displayed at all, so record it as having no ad.
            this.#updateAdAvailability(zoneId, false);

            return;
        }

        const zone = {
            zoneId,
            placementElementId,
            containerElement,
            currentAd: undefined,
            portWidth: undefined,
            portHeight: undefined,
            refreshSeconds: this.#DEFAULT_AD_REFRESH_SECONDS,
            // True once a response, filled or not, has come back for this zone.
            loaded: false,
            // Guards against overlapping ad requests for the same zone.
            inFlight: false,
            hasDisplayed: false,
            adFetchedAt: 0,
            msLeftOnRefresh: 0,
            countdownResumedAt: 0,
            refreshTimerId: undefined,
            timerRunning: false,
            isIntersecting: false,
            mounted: true,
            impressionTracked: false,
            impressionEndTracked: false,
            interactionReported: false,
            refetchWhenSettled: false,
            unfilledReported: false,
            pendingUnfilledReason: undefined,
        };

        this.zones[zoneId] = zone;

        // Reported for every zone, whether it ever gets an ad or not.
        this.#triggerReportZoneEvent(
            zoneId,
            this.#ReportedEventType.ZONE_MOUNTED,
        );

        this.intersectionObserver.observe(containerElement);

        // The observer reports the zone's starting position asynchronously, so the
        // first ad is requested here rather than waiting on it.
        this.#fetchAd(zone);
    }

    /**
     * Tears a single ad zone down, reporting the closing events for it.
     * @param {object} zone - The zone state to unmount.
     */
    #unmountZone(zone) {
        if (!zone) {
            return;
        }

        this.#endImpression(zone);
        this.#cancelZoneTimer(zone);

        if (this.intersectionObserver && zone.containerElement) {
            this.intersectionObserver.unobserve(zone.containerElement);
        }

        // Disconnecting the observer does not deliver a final callback, so the
        // cached intersection state is cleared by hand.
        zone.isIntersecting = false;

        this.#reportZoneUnmounted(zone);
    }

    /**
     * Reports the "zone_unmounted" event, at most once per mounted zone.
     * @param {object} zone - The zone state.
     * @param {boolean} useKeepalive - If true, the request is made so it survives the page going away.
     */
    #reportZoneUnmounted(zone, useKeepalive) {
        if (!zone.mounted) {
            return;
        }

        zone.mounted = false;

        this.#triggerReportZoneEvent(
            zone.zoneId,
            this.#ReportedEventType.ZONE_UNMOUNTED,
            undefined,
            useKeepalive,
        );
    }

    /**
     * Triggered when the position of one or more ad zones relative to the viewport
     * has changed.
     * @param {object[]} entries - The intersection entries that changed.
     */
    #onZoneIntersectionChanged(entries) {
        for (const entry of entries) {
            const zone = Object.values(this.zones).find(
                (zoneToCheck) => zoneToCheck.containerElement === entry.target,
            );

            if (!zone) {
                continue;
            }

            // A threshold of 0 makes this true as soon as any part of the zone is
            // within the view, on both axes.
            //
            // NOTE: This is one pixel more generous than it looks. Chrome also
            // reports isIntersecting for a zone whose edge exactly meets the edge of
            // the view, where the intersection has zero area and nothing is painted.
            // Gating on entry.intersectionRect having area was tried and reverted:
            // the observer only reports threshold crossings, so a zone that first
            // arrives as a zero area edge touch gets no further callback as it
            // scrolls further in, and its impression is lost for good. Counting an
            // impression one pixel early is the cheaper mistake.
            zone.isIntersecting = entry.isIntersecting;

            if (!zone.containerElement.isConnected) {
                // The host framework may have swapped the container for a brand new
                // node carrying the same element ID, which a keyed remount, a tab
                // switch or an accordion reopening all do. Re-point at the
                // replacement and carry on, because giving up here would leave the
                // client with an empty container for the life of the page while the
                // availability map still claimed the zone had an ad.
                if (this.#reattachZone(zone)) {
                    continue;
                }

                // The container is genuinely gone. A zone that left the page is
                // showing its ad to nobody, so close it out.
                this.#unmountZone(zone);

                delete this.zones[zone.zoneId];

                continue;
            }

            if (this.#zoneIsOnScreen(zone)) {
                this.#flushZoneUnfilled(zone);

                // Resume first, then track. An ad that aged out while the zone was
                // away is replaced by the refetch resuming starts, but that request is
                // asynchronous, so the ad on screen is the same one either way and the
                // impression below belongs to it. It stays open until the replacement
                // actually arrives, which is the ad the user is looking at until then.
                this.#resumeZoneTimer(zone);
                this.#trackImpression(zone);
            } else {
                this.#endImpression(zone);
                this.#pauseZoneTimer(zone);
            }
        }
    }

    /**
     * Determines whether the full screen ad popover is currently open. While it is,
     * every ad zone on the page is completely covered by it.
     * @returns true if the ad popover is open.
     */
    #isAdPopoverOpen() {
        return document.getElementById("adContentsPopoverContainer") !== null;
    }

    /**
     * Invokes a callback the client supplied, without letting a failure inside it
     * break ad serving. These run in the middle of placing an ad, so an exception
     * escaping one would otherwise leave the zone rendered but with no refresh
     * timer and no impression, for the life of the page.
     * @param {string} callbackName - The name of the client callback to invoke.
     * @param {...any} args - The arguments to pass to the callback.
     */
    #invokeClientCallback(callbackName, ...args) {
        try {
            this[callbackName](...args);
        } catch (err) {
            console.error(
                `An error occurred inside the "${callbackName}" callback.`,
                err,
            );
        }
    }

    /**
     * Re-points a zone at a replacement container element, when the one it was
     * displaying within has been detached but an element with the same ID is back
     * in the document.
     * @param {object} zone - The zone state.
     * @returns true if the zone was successfully re-pointed at a new element.
     */
    #reattachZone(zone) {
        const replacementElement = document.getElementById(
            zone.placementElementId,
        );

        if (
            !replacementElement ||
            replacementElement === zone.containerElement ||
            !this.intersectionObserver
        ) {
            return false;
        }

        this.intersectionObserver.unobserve(zone.containerElement);

        zone.containerElement = replacementElement;

        // The replacement's position is unknown until the observer reports it, so
        // the zone counts as off screen until then. That keeps a remount from
        // recording an impression for an element nobody has measured yet.
        zone.isIntersecting = false;

        this.intersectionObserver.observe(replacementElement);

        // The new node is empty, so the ad the zone is already holding has to be
        // put back into it.
        this.#renderZoneContents(zone);

        return true;
    }

    /**
     * Determines whether an ad zone is actually in front of the user right now.
     * The refresh countdown, the impression events, and the unfilled report all
     * hang off this.
     * @param {object} zone - The zone state.
     * @returns true if the zone is currently on screen.
     */
    #zoneIsOnScreen(zone) {
        return (
            // A zone that has been torn down is not on screen no matter what the
            // last intersection callback said. An ad request already in flight when
            // unmount() ran still resolves, and without this it would re-render the
            // ad, report an impression and arm a fresh timer against a dead zone.
            zone.mounted &&
            zone.isIntersecting &&
            zone.containerElement.isConnected &&
            document.visibilityState !== "hidden" &&
            // The popover covers the whole viewport, so nothing behind it is
            // visible. Without this the zones underneath keep counting impressions
            // and rotating ads that nobody can see, which is what the previous
            // implementation's "don't cycle while a popup is open" rule prevented.
            !this.#isAdPopoverOpen()
        );
    }

    /**
     * Requests a single ad for the given zone.
     * @param {object} zone - The zone state to request an ad for.
     */
    #fetchAd(zone) {
        if (!zone.mounted) {
            return;
        }

        if (zone.inFlight) {
            // A targeting param changed while this zone's request was in flight.
            // Remembering it here means the zone picks up the new store or recipe
            // context as soon as the current request settles, instead of showing
            // the previous one's ad until the next refresh.
            zone.refetchWhenSettled = true;

            return;
        }

        zone.inFlight = true;
        zone.unfilledReported = false;
        zone.pendingUnfilledReason = undefined;

        this.#fetchApiRequest({
            method: "POST",
            url: `${this.apiEnv}/v/1.0.0/ad/retrieve`,
            headers: [
                {
                    name: "accept",
                    value: "application/json",
                },
                {
                    name: "Content-Type",
                    value: "application/json",
                },
                {
                    name: "x-api-key",
                    value: this.apiKey,
                },
            ],
            requestPayload: {
                sdkId: packageJson.version,
                bundleId: this.bundleId,
                userId: this.advertiserId,
                zoneId: zone.zoneId,
                storeId:
                    this.params && this.params.storeId
                        ? this.params.storeId
                        : "",
                contextId: this.#getContextIdForZone(zone.zoneId),
                sessionId: this.#ensureSession(),
                extra: "",
            },
            onSuccess: (response) => {
                zone.inFlight = false;

                this.#handleAdResponse(zone, response);
                this.#fetchQueuedAd(zone);
            },
            onError: () => {
                zone.inFlight = false;

                this.#handleAdRequestFailed(zone);
                this.#fetchQueuedAd(zone);
            },
        });
    }

    /**
     * Issues the refetch that was requested while a zone's request was in flight.
     * @param {object} zone - The zone state.
     */
    #fetchQueuedAd(zone) {
        if (!zone.refetchWhenSettled) {
            return;
        }

        zone.refetchWhenSettled = false;

        this.#loadNextAd(zone);
    }

    /**
     * Gets the recipe context ID that applies to the given zone, if any.
     * @param {string} zoneId - The ad zone ID.
     * @returns the context ID to send for the zone, or an empty string.
     */
    #getContextIdForZone(zoneId) {
        if (!this.params || !this.params.recipeContextId) {
            return "";
        }

        const contextZoneIds = this.params.recipeContextZoneIds;

        // With no zone list provided, the context applies to every zone.
        if (!contextZoneIds || !contextZoneIds.length) {
            return this.params.recipeContextId;
        }

        return contextZoneIds.includes(zoneId)
            ? this.params.recipeContextId
            : "";
    }

    /**
     * Handles a successful ad request response for a zone.
     * @param {object} zone - The zone state.
     * @param {object} response - The parsed API response.
     */
    #handleAdResponse(zone, response) {
        const zoneData = response && response.data ? response.data : undefined;
        const adData = zoneData && zoneData.ad ? zoneData.ad : undefined;

        zone.loaded = true;

        if (zoneData) {
            zone.portWidth = zoneData.port_width;
            zone.portHeight = zoneData.port_height;
        }

        // An ad object with no ID is how the API reports that it had nothing to
        // serve. Its refresh_time is the backoff to wait before asking again.
        if (!adData || !adData.id) {
            this.#reportZoneUnfilled(zone, this.#ZoneUnfilledReason.NO_AD);
            this.#displayAd(
                zone,
                undefined,
                adData ? adData.refresh_time : undefined,
            );

            return;
        }

        this.#displayAd(zone, this.#normalizeAd(adData, zone.zoneId));
    }

    /**
     * Handles a failed ad request for a zone.
     * @param {object} zone - The zone state.
     */
    #handleAdRequestFailed(zone) {
        zone.loaded = true;

        // A zone already showing an ad keeps it. The request that failed was for
        // the ad's replacement, and blanking the zone would take a paying ad off
        // the page over a transient network error and leave the slot empty for a
        // whole cycle.
        if (zone.currentAd) {
            // Not reported as unfilled: the zone is still filled, and still showing
            // the ad the user can see. Saying otherwise would count a zone that is
            // working as one with nothing to show.
            zone.pendingUnfilledReason = undefined;

            // The click guard has to be released even though the ad did not change.
            // It is normally reset by #displayAd, which does not run on this path,
            // and until it is the ad on screen silently ignores every further click
            // - no interaction, no items handed over, and no way for the user to
            // tell the difference from an ad that does nothing.
            zone.interactionReported = false;

            // No timer work here: #loadNextAd arms the countdown before the
            // request goes out, exactly so a failing response cannot leave the zone
            // without one, so the retry is already scheduled.
            return;
        }

        // Nothing to show, which is what "unfilled" means.
        this.#reportZoneUnfilled(zone, this.#ZoneUnfilledReason.REQUEST_FAILED);

        this.#displayAd(zone, undefined, zone.refreshSeconds);
    }

    /**
     * Queues the "zone_unfilled" event for a zone, and reports it if the zone is
     * already known to be on screen.
     *
     * The report is held rather than dropped when the zone isn't on screen yet,
     * because an ad request can finish before the intersection observer has
     * reported the zone's starting position. Dropping it there would lose the
     * unfilled report for any zone whose request loses that race.
     * @param {object} zone - The zone state.
     * @param {string} reason - The reason the zone went unfilled.
     */
    #reportZoneUnfilled(zone, reason) {
        if (zone.unfilledReported) {
            return;
        }

        zone.pendingUnfilledReason = reason;

        this.#flushZoneUnfilled(zone);
    }

    /**
     * Reports a queued "zone_unfilled" event once the zone is on screen. Fires at
     * most once per ad request.
     * @param {object} zone - The zone state.
     */
    #flushZoneUnfilled(zone) {
        if (
            !zone.pendingUnfilledReason ||
            zone.unfilledReported ||
            !this.#zoneIsOnScreen(zone)
        ) {
            return;
        }

        const reason = zone.pendingUnfilledReason;

        zone.unfilledReported = true;
        zone.pendingUnfilledReason = undefined;

        this.#triggerReportZoneEvent(
            zone.zoneId,
            this.#ReportedEventType.ZONE_UNFILLED,
            reason,
        );
    }

    /**
     * Normalizes an ad from the API into the shape the SDK works with.
     * @param {object} adData - The ad data from the API.
     * @param {string} zoneId - The ID of the zone the ad belongs to.
     * @returns the normalized ad.
     */
    #normalizeAd(adData, zoneId) {
        return {
            ...adData,
            // Carried on the ad so every reported event can name its zone without
            // having to parse it back out of the impression ID.
            zone_id: zoneId,
        };
    }

    /**
     * Gets the number of seconds an ad should be displayed for before the next one
     * is requested.
     * @param {number} refreshTimeValue - The refresh_time value served for the ad.
     * @returns the refresh time in seconds.
     */
    #getRefreshSeconds(refreshTimeValue) {
        const refreshTime = Number(refreshTimeValue);

        if (!Number.isFinite(refreshTime) || refreshTime <= 0) {
            return this.#DEFAULT_AD_REFRESH_SECONDS;
        }

        return Math.max(refreshTime, this.#MINIMUM_AD_REFRESH_SECONDS);
    }

    /**
     * Places an ad within its zone, or clears the zone when there is no ad, and
     * arms the refresh countdown.
     * @param {object} zone - The zone state.
     * @param {object} ad - The ad to display, or undefined when there is no ad to show.
     * @param {number} refreshSecondsOverride - (optional) The refresh time to use when there is no ad.
     */
    #displayAd(zone, ad, refreshSecondsOverride) {
        if (!zone.mounted) {
            // The zone was torn down while its ad request was in flight. Dropping
            // the response here keeps unmount() final: no DOM write, no impression
            // and no refresh timer for a zone the client has already discarded.
            return;
        }

        // Each ad gets its own impression pair, so the previous ad is closed out
        // before the tracking flags reset.
        this.#endImpression(zone);

        const wasAlreadyDisplayed = zone.hasDisplayed;

        zone.currentAd = ad;
        zone.refreshSeconds = this.#getRefreshSeconds(
            ad ? ad.refresh_time : refreshSecondsOverride,
        );
        zone.impressionTracked = false;
        zone.impressionEndTracked = false;
        zone.interactionReported = false;
        zone.hasDisplayed = true;

        // Arms the countdown fresh from this ad's refresh time. Done before the
        // render and before any client callback, so that even an unexpected
        // failure further down cannot leave the zone without a refresh timer.
        this.#restartZoneTimer(zone);

        this.#renderZoneContents(zone);
        this.#trackImpression(zone);

        this.#updateAdAvailability(zone.zoneId, ad !== undefined);

        if (wasAlreadyDisplayed) {
            // Call the user defined callback indicating the zone's ad has changed.
            this.#invokeClientCallback("onAdZoneRefreshed", zone.zoneId);
        }
    }

    /**
     * Renders the current contents of a zone into its container element.
     * @param {object} zone - The zone state.
     */
    #renderZoneContents(zone) {
        if (!zone.containerElement || !zone.containerElement.isConnected) {
            return;
        }

        zone.containerElement.innerHTML = "";

        if (zone.currentAd) {
            zone.containerElement.appendChild(
                this.#generateAdZoneContents(zone),
            );
        }
    }

    /**
     * Tells the client whether a zone ended up with an ad to show.
     *
     * Reported one zone at a time, because that is how the ads now arrive: each
     * zone asks for its own ad and hears back on its own schedule. An aggregate
     * across all zones could only be produced by guessing at the ones that had not
     * answered yet, and a zone still waiting is not a zone without an ad.
     * @param {string} zoneId - The ad zone ID.
     * @param {boolean} hasAd - If true, an ad is available for the zone.
     */
    #updateAdAvailability(zoneId, hasAd) {
        this.#invokeClientCallback("onAdRetrieved", zoneId, hasAd);
    }

    /**
     * Immediately requests a new ad for the given zones, discarding whatever they
     * are currently showing. Used when a targeting param changes and the ads on
     * screen are no longer the right ones.
     * @param {string[]} zoneIds - (optional) The zones to refresh. Defaults to every mounted zone.
     */
    #refreshZones(zoneIds) {
        const zoneIdsToRefresh =
            zoneIds && zoneIds.length ? zoneIds : Object.keys(this.zones);

        for (const zoneId of zoneIdsToRefresh) {
            const zone = this.zones[zoneId];

            if (zone) {
                this.#loadNextAd(zone);
            }
        }
    }

    /**
     * Requests the next ad for a zone, replacing the one currently displayed.
     * @param {object} zone - The zone state.
     */
    #loadNextAd(zone) {
        // Arm the countdown before the request goes out, so a slow or failing
        // response can't leave the zone without a timer.
        this.#restartZoneTimer(zone);

        if (zone.inFlight) {
            // A request is already outstanding, and whatever it returns was chosen
            // under the old targeting params. Recording the intent here covers the
            // zone's very first request too, which has not "loaded" yet and would
            // otherwise fall straight through the guard below and lose the change.
            zone.refetchWhenSettled = true;

            return;
        }

        if (!zone.loaded) {
            return;
        }

        // The impression is deliberately left open here. The ad is still on the
        // page until its replacement actually arrives, and #displayAd closes it at
        // that moment. Closing it now would end the impression early on every
        // rotation, and on a refresh that fails the zone keeps the ad it already
        // has - leaving it in front of the user with its impression already closed
        // and no way to reopen it, since the impression ID belongs to the ad.
        this.#fetchAd(zone);
    }

    /**
     * Arms a zone's refresh countdown fresh from its current refresh time.
     * @param {object} zone - The zone state.
     */
    #restartZoneTimer(zone) {
        this.#cancelZoneTimer(zone);

        zone.adFetchedAt = Date.now();
        zone.msLeftOnRefresh = zone.refreshSeconds * 1000;

        this.#startZoneTimer(zone);
    }

    /**
     * Pauses every mounted zone's countdown.
     *
     * Used when the ad popover opens, which covers the whole viewport.
     */
    #pauseAllZoneTimers() {
        for (const zoneId of Object.keys(this.zones)) {
            this.#pauseZoneTimer(this.zones[zoneId]);
        }
    }

    /**
     * Resumes every mounted zone's countdown, optionally leaving one alone.
     *
     * Used when the ad popover closes. The zone whose ad opened the popover is
     * skipped, because the caller rotates it explicitly instead: it held its ad
     * while the user was engaged with it and is owed a fresh one.
     * @param {object} [skipZone] - A zone to leave for the caller to handle.
     */
    #resumeAllZoneTimers(skipZone) {
        for (const zoneId of Object.keys(this.zones)) {
            const zone = this.zones[zoneId];

            if (skipZone && zone === skipZone) {
                continue;
            }

            this.#resumeZoneTimer(zone);
        }
    }

    /**
     * Freezes what is left of a zone's countdown, so a zone that is off screen or
     * sitting in a hidden tab neither refreshes nor fetches.
     * @param {object} zone - The zone state.
     */
    #pauseZoneTimer(zone) {
        if (!zone.timerRunning) {
            return;
        }

        zone.msLeftOnRefresh = Math.max(
            0,
            zone.msLeftOnRefresh - (Date.now() - zone.countdownResumedAt),
        );

        this.#cancelZoneTimer(zone);
    }

    /**
     * Resumes a zone's countdown. An ad that outlived its own refresh time while
     * the countdown was frozen gets replaced immediately, rather than being shown
     * for the leftover time it never spent on screen.
     * @param {object} zone - The zone state.
     */
    #resumeZoneTimer(zone) {
        if (zone.timerRunning || !this.#zoneIsOnScreen(zone)) {
            return;
        }

        if (
            zone.loaded &&
            Date.now() - zone.adFetchedAt >= zone.refreshSeconds * 1000
        ) {
            this.#loadNextAd(zone);
        } else {
            this.#startZoneTimer(zone);
        }
    }

    /**
     * Starts a zone's countdown with whatever time it has left.
     * @param {object} zone - The zone state.
     */
    #startZoneTimer(zone) {
        if (!zone.loaded || zone.timerRunning || !this.#zoneIsOnScreen(zone)) {
            return;
        }

        zone.timerRunning = true;
        zone.countdownResumedAt = Date.now();
        zone.refreshTimerId = setTimeout(() => {
            zone.timerRunning = false;

            this.#loadNextAd(zone);
        }, zone.msLeftOnRefresh);
    }

    /**
     * Cancels a zone's countdown.
     * @param {object} zone - The zone state.
     */
    #cancelZoneTimer(zone) {
        if (zone.refreshTimerId) {
            clearTimeout(zone.refreshTimerId);

            zone.refreshTimerId = undefined;
        }

        zone.timerRunning = false;
    }

    /**
     * Reports the "impression" event for a zone's current ad, at most once per ad.
     * @param {object} zone - The zone state.
     */
    #trackImpression(zone) {
        if (
            !zone.currentAd ||
            zone.impressionTracked ||
            !this.#zoneIsOnScreen(zone)
        ) {
            return;
        }

        zone.impressionTracked = true;

        this.#triggerReportAdEvent(
            zone.currentAd,
            this.#ReportedEventType.IMPRESSION,
        );
    }

    /**
     * Reports the "impression_end" event for a zone's current ad. Only fires once,
     * and only if a real impression was tracked for that ad first.
     * @param {object} zone - The zone state.
     * @param {boolean} useKeepalive - If true, the request is made so it survives the page going away.
     */
    #endImpression(zone, useKeepalive) {
        if (!zone.impressionTracked || zone.impressionEndTracked) {
            return;
        }

        zone.impressionEndTracked = true;

        this.#triggerReportAdEvent(
            zone.currentAd,
            this.#ReportedEventType.IMPRESSION_END,
            undefined,
            useKeepalive,
        );
    }

    /**
     * Closes out every impression still open across all zones, so none of them
     * straddles a change of session ID.
     */
    #closeOpenImpressions() {
        this.#sessionRotating = true;

        try {
            for (const zoneId of Object.keys(this.zones)) {
                this.#endImpression(this.zones[zoneId]);
            }
        } finally {
            this.#sessionRotating = false;
        }
    }

    /**
     * NOTE: There is currently no need for deeplinking support for this SDK.
     *
     * Method that can be triggered when a deeplink or standard URL is recieved
     * by the app to see if there are any payloads to be processed from the URL.
     * NOTE: This method can/will be called by the client when necessary.
     * @param {string} url - The full deeplink or full standard URL.
     */
    // #decodePayloadDeepLink(url) {
    //     const searchStr = "data=";
    //     const dataIndex = url.indexOf(searchStr);

    //     if (dataIndex !== -1) {
    //         const encodedData = url.substr(dataIndex + searchStr.length);
    //         const payloadData = JSON.parse(atob(encodedData));
    //         const payloadId = payloadData["payload_id"];
    //         const itemDataList = payloadData["detailed_list_items"];

    //         if (itemDataList && itemDataList.length > 0) {
    //             const detailedItemList = [];

    //             for (const itemData of itemDataList) {
    //                 detailedItemList.push({
    //                     product_title: itemData["product_title"],
    //                     product_brand: itemData["product_brand"],
    //                     product_category: itemData["product_category"],
    //                     product_barcode: itemData["product_barcode"],
    //                     product_discount: itemData["product_discount"],
    //                     product_image: itemData["product_image"],
    //                     product_sku: itemData["product_sku"],
    //                 });
    //             }

    //             // Send the items to the client, so they can add them to the list.
    //             this.onPayloadsAvailable([
    //                 {
    //                     payload_id: payload.payload_id,
    //                     detailed_list_items: detailedItemList,
    //                 },
    //             ]);
    //         }
    //     }
    // }

    /**
     * Triggers the API request to submit payload status.
     * @param {Array} payloadStatusList - The list of payload status objects to submit.
     */
    #sendPayloadStatusUpdate(payloadStatusList) {
        this.#fetchApiRequest({
            method: "POST",
            url: `${this.payloadApiEnv}/v/1/tracking`,
            // Reported and not read: the response is unused, and the user
            // action that triggers it is routinely the last thing they do
            // before closing the tab. Without keepalive that request is
            // cancelled with the document and the signal is lost silently.
            keepalive: true,
            headers: [
                {
                    name: "Content-Type",
                    value: "application/json",
                },
                {
                    name: "x-api-key",
                    value: this.apiKey,
                },
            ],
            requestPayload: {
                os: window.navigator.userAgent,
                bundle_id: this.bundleId,
                bundle_version: this.bundleVersion,
                sdk_version: packageJson.version,
                udid: this.advertiserId,
                app_id: this.apiKey,
                tracking: payloadStatusList,
            },
            onError: () => {
                console.error(
                    "An error occurred while updating payload status.",
                );
            },
        });
    }

    /**
     * Generates the current contents of an ad zone.
     * @param {object} zone - The zone state, holding the ad to display.
     * @returns the generated ad zone contents.
     */
    #generateAdZoneContents(zone) {
        const displayedAd = zone.currentAd;

        const adZoneContainer = document.createElement("div");
        adZoneContainer.className = "AdZone";
        adZoneContainer.style.position = "relative";
        adZoneContainer.style.width = "100%";
        adZoneContainer.style.height = "100%";
        adZoneContainer.style.cursor = "pointer";

        const adZoneIFrame = document.createElement("iframe");
        adZoneIFrame.className = "ad-frame";
        adZoneIFrame.src = displayedAd.creative_url;
        adZoneIFrame.style.width = "100%";
        adZoneIFrame.style.height = "100%";
        adZoneIFrame.style.border = "none";
        adZoneIFrame.style.backgroundColor = "#ffffff";

        const adZoneClickableArea = document.createElement("div");
        adZoneClickableArea.className = "clickable-area";
        adZoneClickableArea.style.width = "100%";
        adZoneClickableArea.style.height = "100%";
        adZoneClickableArea.style.position = "absolute";
        adZoneClickableArea.style.top = "0";
        adZoneClickableArea.style.left = "0";

        const reportAdIcon = document.createElement("a");
        reportAdIcon.href = `https://feedback.add-it.io/?uid=${btoa(
            this.advertiserId,
        )}&aid=${displayedAd.id}&src=web`;
        reportAdIcon.target = "_blank";
        reportAdIcon.className = "report-ad-icon";
        reportAdIcon.style.position = "absolute";
        reportAdIcon.style.top = "3px";
        reportAdIcon.style.right = "3px";
        reportAdIcon.style.zIndex = 1;
        reportAdIcon.style.cursor = "pointer";
        reportAdIcon.style.fontFamily = "none";
        reportAdIcon.innerHTML = `<svg width="14" height="13" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.40001 4.48767H7.40001V5.48767H6.40001V4.48767Z" fill="#49B9EB"/>
        <path d="M7.40001 6.31677H6.40001V9.73967H7.40001V6.31677Z" fill="#49B9EB"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M7.8012 0.520311C7.40067 -0.173436 6.39933 -0.173437 5.9988 0.52031L0.140969 10.6664C-0.259566 11.3601 0.241102 12.2273 1.04217 12.2273H12.7578C13.5589 12.2273 14.0596 11.3601 13.659 10.6664L7.8012 0.520311ZM6.9 1.95938L1.83784 10.7273H11.9622L6.9 1.95938Z" fill="#49B9EB"/>
        </svg>        
        `;

        /**
         * Triggered when the ad zone clickable area has been clicked.
         * @param {any} event - The click event.
         */
        adZoneClickableArea.onclick = (event) => {
            event.preventDefault();

            this.#onAdZoneSelected(zone);
        };

        adZoneContainer.appendChild(adZoneIFrame);
        adZoneContainer.appendChild(adZoneClickableArea);
        adZoneContainer.appendChild(reportAdIcon);

        return adZoneContainer;
    }

    /**
     * Generates the ad popover.
     * @param {object} currentAd - The ad to display within the popover.
     * @returns the generated ad popover.
     */
    #generateAdPopover(currentAd, zone) {
        const isSafeAreaPaddingRequired = this.#needsSafeAreaPadding();

        let safeAreaHeaderPaddingTop = "0";
        let safeAreaIframeMarginTop = "40px";
        let safeAreaFooterPaddingBottom = "0";
        let adPopupIframeHeight = "calc(100% - 100px)";

        if (isSafeAreaPaddingRequired) {
            safeAreaHeaderPaddingTop = "env(safe-area-inset-top)";
            safeAreaIframeMarginTop = "calc(40px + env(safe-area-inset-top))";
            adPopupIframeHeight =
                "calc(100% - 100px - env(safe-area-inset-top) - env(safe-area-inset-bottom))";
            safeAreaFooterPaddingBottom = "env(safe-area-inset-bottom)";
        }

        const adPopoverContainer = document.createElement("div");
        adPopoverContainer.className = "AdPopup";
        adPopoverContainer.id = "adContentsPopoverContainer";
        adPopoverContainer.style.position = "fixed";
        adPopoverContainer.style.width = "100%";
        adPopoverContainer.style.height = "100%";
        adPopoverContainer.style.top = "0";
        adPopoverContainer.style.left = "0";
        adPopoverContainer.style.backgroundColor = "#f0f0f0";
        adPopoverContainer.style.zIndex = "999999997";

        const adPopoverHeader = document.createElement("div");
        adPopoverHeader.className = "AdPopup__header";
        adPopoverHeader.style.display = "flex";
        adPopoverHeader.style.flexDirection = "row";
        adPopoverHeader.style.width = "100%";
        adPopoverHeader.style.height = "39px";
        adPopoverHeader.style.borderBottom = "1px solid #6c757d";
        adPopoverHeader.style.textTransform = "none";
        adPopoverHeader.style.overflow = "hidden";
        adPopoverHeader.style.whiteSpace = "nowrap";
        adPopoverHeader.style.position = "absolute";
        adPopoverHeader.style.top = "0";
        adPopoverHeader.style.left = "0";
        adPopoverHeader.style.paddingTop = safeAreaHeaderPaddingTop;
        adPopoverHeader.style.zIndex = "999999999";

        const adPopoverHeaderTitle = document.createElement("div");
        adPopoverHeaderTitle.className = "AdPopup__header-title";
        adPopoverHeaderTitle.style.flex = "1 1 auto";
        adPopoverHeaderTitle.style.fontSize = "16px";
        adPopoverHeaderTitle.style.fontWeight = "bold";
        adPopoverHeaderTitle.style.margin = "10px";
        adPopoverHeaderTitle.style.color = "#333333";
        // The API no longer serves a per-ad popup config, so the title is fixed
        // here to match what the other AdAdapted SDKs display.
        adPopoverHeaderTitle.textContent = this.#AD_POPOVER_TITLE;

        const adPopoverHeaderLoadingIndicator = document.createElement("div");
        adPopoverHeaderLoadingIndicator.className =
            "AdPopup__header-loading-indicator";
        adPopoverHeaderLoadingIndicator.style.flex = "0 0 auto";
        adPopoverHeaderLoadingIndicator.style.marginLeft = "20px";
        adPopoverHeaderLoadingIndicator.style.fontSize = "12px";
        adPopoverHeaderLoadingIndicator.style.margin = "10px";
        adPopoverHeaderLoadingIndicator.style.color = "#888888";
        adPopoverHeaderLoadingIndicator.innerText = "Loading...";

        const adPopoverIFrame = document.createElement("iframe");
        adPopoverIFrame.className = "AdPopup__content";
        adPopoverIFrame.id = "AdPopupIframe";
        adPopoverIFrame.src = currentAd.action_path;
        adPopoverIFrame.scrolling = "yes";
        adPopoverIFrame.style.height = "0";
        adPopoverIFrame.style.width = "0";
        adPopoverIFrame.style.maxHeight = adPopupIframeHeight;
        adPopoverIFrame.style.maxWidth = "100%";
        adPopoverIFrame.style.minHeight = adPopupIframeHeight;
        adPopoverIFrame.style.minWidth = "100%";
        adPopoverIFrame.style.backgroundColor = "#ffffff";
        adPopoverIFrame.style.border = "none";
        adPopoverIFrame.style.marginTop = safeAreaIframeMarginTop;
        adPopoverIFrame.style.zIndex = "999999998";
        adPopoverIFrame.style.WebkitOverflowScrolling = "touch";

        /**
         * Triggered when the iFrame has loaded.
         */
        adPopoverIFrame.onload = () => {
            // Remove the loading indicator.
            const loadingIndicator = document.getElementsByClassName(
                "AdPopup__header-loading-indicator",
            )[0];
            // The popover can be closed before its iframe finishes loading.
            if (loadingIndicator && loadingIndicator.parentNode) {
                loadingIndicator.parentNode.removeChild(loadingIndicator);
            }
        };

        const adPopoverFooter = document.createElement("div");
        adPopoverFooter.className = "AdPopup__header";
        adPopoverFooter.style.display = "flex";
        adPopoverFooter.style.justifyContent = "center";
        adPopoverFooter.style.alignItems = "center";
        adPopoverFooter.style.width = "100%";
        adPopoverFooter.style.height = "59px";
        adPopoverFooter.style.borderTop = "1px solid #6c757d";
        adPopoverFooter.style.backgroundColor = "#f0f0f0";
        adPopoverFooter.style.position = "absolute";
        adPopoverFooter.style.bottom = "0";
        adPopoverFooter.style.left = "0";
        adPopoverFooter.style.paddingBottom = safeAreaFooterPaddingBottom;
        adPopoverFooter.style.zIndex = "999999999";

        const adPopoverFooterCloseButton = document.createElement("div");
        adPopoverFooterCloseButton.className = "close-button";
        adPopoverFooterCloseButton.style.display = "flex";
        adPopoverFooterCloseButton.style.justifyContent = "center";
        adPopoverFooterCloseButton.style.alignItems = "center";
        adPopoverFooterCloseButton.style.backgroundColor = "#6c757d";
        adPopoverFooterCloseButton.style.height = "48px";
        adPopoverFooterCloseButton.style.cursor = "pointer";
        adPopoverFooterCloseButton.style.borderRadius = "4px";
        adPopoverFooterCloseButton.style.margin = "5px";

        /**
         * Triggered when the close button is clicked.
         */
        adPopoverFooterCloseButton.onclick = () => {
            const popoverContainer = document.getElementById(
                "adContentsPopoverContainer",
            );

            if (popoverContainer && popoverContainer.parentNode) {
                popoverContainer.parentNode.removeChild(popoverContainer);
            }

            document.body.style.overflow = this.initialBodyOverflowStyle;

            // Resumed after the container is removed, so #zoneIsOnScreen sees an
            // uncovered viewport. The clicked zone is handled separately below.
            this.#resumeAllZoneTimers(zone);

            // The ad was held while the user was engaged with it, so it rotates now
            // rather than being replaced underneath the popover.
            if (zone) {
                this.#loadNextAd(zone);
            }
        };

        const adPopoverFooterCloseButtonLabel = document.createElement("div");
        adPopoverFooterCloseButtonLabel.className = "button-label";
        adPopoverFooterCloseButtonLabel.style.color = "#ffffff";
        adPopoverFooterCloseButtonLabel.style.margin = "10px 80px";
        adPopoverFooterCloseButtonLabel.style.fontSize = "14px";
        adPopoverFooterCloseButtonLabel.innerText = "Close";

        adPopoverHeader.appendChild(adPopoverHeaderTitle);
        adPopoverHeader.appendChild(adPopoverHeaderLoadingIndicator);
        adPopoverFooterCloseButton.appendChild(adPopoverFooterCloseButtonLabel);
        adPopoverFooter.appendChild(adPopoverFooterCloseButton);
        adPopoverContainer.appendChild(adPopoverHeader);
        adPopoverContainer.appendChild(adPopoverIFrame);
        adPopoverContainer.appendChild(adPopoverFooter);

        return adPopoverContainer;
    }

    /**
     * Triggers when the user selects the ad zone.
     * @param {object} zone - The zone state whose ad was selected.
     */
    #onAdZoneSelected(zone) {
        const currentAd = zone.currentAd;

        if (!currentAd) {
            return;
        }

        // The zone keeps showing this ad until its replacement arrives, so the
        // clickable area stays live and a second click would report a second
        // interaction against the same impression and stack a second popover.
        if (zone.interactionReported) {
            return;
        }

        zone.interactionReported = true;

        // Tracks whether the ad's action type mapped to something this SDK can
        // actually do, which is what decides if the ad has been used up.
        let wasHandled = false;

        // Set when the interaction opened the popover, which defers the rotation to
        // the popover's close handler.
        let opensPopover = false;

        if (
            this.#getOperatingSystem() !== this.#DeviceOS.DESKTOP &&
            (currentAd.action_type === this.#AdActionType.POPUP ||
                currentAd.action_type === this.#AdActionType.LINK) &&
            currentAd.action_path
        ) {
            // Mobile only.
            // NOTE: wasHandled stays false so the shared rotation at the end of
            //       this method is skipped. The popover is showing this exact ad,
            //       so it rotates when the popover closes instead.
            opensPopover = true;

            document.body.append(this.#generateAdPopover(currentAd, zone));
            document.body.style.overflow = "hidden";

            // Every zone is now covered, so every countdown stops here and is
            // resumed when the overlay comes down. #zoneIsOnScreen already refuses
            // to arm a timer behind the popover, but a countdown that was already
            // running was never stopped: it elapsed, cleared timerRunning, and ran
            // #loadNextAd, which cannot re-arm and so left the zone with no timer
            // at all. That zone then stayed frozen for the life of the page, its
            // impression uncounted, having already burned a request for an ad
            // rendered behind the overlay. Pausing also stops that request, since
            // a paused countdown never elapses.
            this.#pauseAllZoneTimers();

            const adPopoverIFrameRef = document.getElementById("AdPopupIframe");

            if (
                adPopoverIFrameRef &&
                adPopoverIFrameRef.contentWindow &&
                adPopoverIFrameRef.contentWindow.AdAdapted
            ) {
                // This should replace the AdAdapted.addItemToList callback if it is available to set.
                // NOTE: This is a port of what Brett added a while back and is for mobile only.
                adPopoverIFrameRef.contentWindow.AdAdapted = {
                    addItemToList: (
                        payloadId,
                        trackingId,
                        productTitle,
                        productBrand,
                        productCategory,
                        productBarcode,
                        retailerSku,
                        productDiscount,
                        productImage,
                    ) => {
                        // Routed through the same helper as every other client
                        // callback: this one is invoked from a message handler, so
                        // a host that throws would otherwise take out the rest of
                        // the popover's handling with it.
                        //
                        // The handle is marked already reported. Opening this
                        // popover was itself the interaction and it was reported at
                        // that moment, so acknowledging these items must not report
                        // a second one for the same click. The host still gets a
                        // handle rather than nothing, because it has no way to tell
                        // this path apart from the other one - and before it had
                        // one, acknowledging here resolved whichever unrelated
                        // click happened to be outstanding instead.
                        this.#invokeClientCallback(
                            "onAddItemsTriggered",
                            [
                                {
                                    tracking_id: trackingId,
                                    product_title: productTitle,
                                    product_brand: productBrand,
                                    product_category: productCategory,
                                    product_barcode: productBarcode,
                                    product_sku: retailerSku,
                                    product_discount: productDiscount,
                                    product_image: productImage,
                                },
                            ],
                            this.#createAtlContent(currentAd, true),
                        );
                    },
                };
            }

            // Sent with keepalive because a click is by construction the last
            // thing the user does in the page: the handlers it runs open a new
            // tab or hand control to the host, which routinely navigates away.
            // A plain request is cancelled with the document and the click -
            // the highest value event the SDK reports - is lost silently.
            this.#triggerReportAdEvent(
                currentAd,
                this.#ReportedEventType.INTERACTION,
                undefined,
                true,
            );
        } else if (
            ((this.#getOperatingSystem() === this.#DeviceOS.DESKTOP &&
                (currentAd.action_type === this.#AdActionType.POPUP ||
                    currentAd.action_type === this.#AdActionType.LINK ||
                    currentAd.action_type === this.#AdActionType.EXTERNAL)) ||
                (this.#getOperatingSystem() !== this.#DeviceOS.DESKTOP &&
                    currentAd.action_type === this.#AdActionType.EXTERNAL)) &&
            currentAd.action_path
        ) {
            // Only desktop and mobile external.
            wasHandled = true;

            window.open(currentAd.action_path, "_blank");

            // Sent with keepalive because a click is by construction the last
            // thing the user does in the page: the handlers it runs open a new
            // tab or hand control to the host, which routinely navigates away.
            // A plain request is cancelled with the document and the click -
            // the highest value event the SDK reports - is lost silently.
            this.#triggerReportAdEvent(
                currentAd,
                this.#ReportedEventType.INTERACTION,
                undefined,
                true,
            );

            // NOTE: Circulars will not work in their current state for desktop. Circulars will need
            // to be updated to send an event message up through the iframe and the ad popover will
            // need to be displayed directly in the site displaying the ad. The other approach is to
            // keep the related link for the ad loading in a new tab and to change the circulars to
            // utilize the payload service to send the items to add to cart that way.
        } else if (
            currentAd.action_type === this.#AdActionType.CONTENT &&
            currentAd.payload &&
            currentAd.payload.detailed_list_items
        ) {
            wasHandled = true;

            this.#invokeClientCallback(
                "onAddItemsTriggered",
                currentAd.payload.detailed_list_items,
                this.#createAtlContent(currentAd),
            );
        }

        if (
            currentAd.action_type !== this.#AdActionType.CONTENT &&
            this.onExternalContentAdClicked
        ) {
            this.#invokeClientCallback(
                "onExternalContentAdClicked",
                currentAd.id,
            );
        }

        // Interacting with an ad rotates the zone on to the next one, but only
        // once the interaction actually did something. An action type this SDK does
        // not handle would otherwise silently replace a perfectly good ad.
        if (opensPopover) {
            // Handled, but the rotation belongs to the popover's close handler.
            return;
        }

        if (wasHandled) {
            this.#loadNextAd(zone);
        } else {
            console.error(
                `Unable to handle the action type "${currentAd.action_type}" for ad "${currentAd.id}".`,
            );

            zone.interactionReported = false;
        }
    }

    /**
     * Client must trigger this method when any items are added to a list for reports we provide to the client.
     * @param {string} type - List or cart.
     * @param {string[]} itemNames - The items to report.
     * @param {string} listName - (optional) The list to associate the items with, if available.
     */
    #reportItemsAddedToListOrCart(type, itemNames, listName) {
        const reportedEventType =
            type === this.#ListManagerType.CART
                ? this.#ListManagerEventName.ADDED_TO_CART
                : this.#ListManagerEventName.ADDED_TO_LIST;

        const requestPayload = this.#getListManagerApiRequestData(
            reportedEventType,
            itemNames,
            listName,
        );

        this.#fetchApiRequest({
            method: "POST",
            url: `${this.listManagerApiEnv}/v/1/${this.deviceOs}/events`,
            // Reported and not read: the response is unused, and the user
            // action that triggers it is routinely the last thing they do
            // before closing the tab. Without keepalive that request is
            // cancelled with the document and the signal is lost silently.
            keepalive: true,
            headers: [
                {
                    name: "accept",
                    value: "application/json",
                },
                {
                    name: "x-api-key",
                    value: this.apiKey,
                },
            ],
            requestPayload,
            onError: () => {
                console.error(
                    `An error occurred while reporting an item "${reportedEventType}" event.`,
                );
            },
        });
    }

    /**
     * Client must trigger this method when any items are deleted from a list for reports we provide to the client.
     * @param {string} type - List or cart.
     * @param {string[]} itemNames - The items to report.
     * @param {string} listName - (optional) The list the items are associated with, if available.
     */
    #reportItemsDeletedFromListOrCart(type, itemNames, listName) {
        const reportedEventType =
            type === this.#ListManagerType.CART
                ? this.#ListManagerEventName.DELETED_FROM_CART
                : this.#ListManagerEventName.DELETED_FROM_LIST;

        const requestPayload = this.#getListManagerApiRequestData(
            reportedEventType,
            itemNames,
            listName,
        );

        this.#fetchApiRequest({
            method: "POST",
            url: `${this.listManagerApiEnv}/v/1/${this.deviceOs}/events`,
            // Reported and not read: the response is unused, and the user
            // action that triggers it is routinely the last thing they do
            // before closing the tab. Without keepalive that request is
            // cancelled with the document and the signal is lost silently.
            keepalive: true,
            headers: [
                {
                    name: "accept",
                    value: "application/json",
                },
                {
                    name: "x-api-key",
                    value: this.apiKey,
                },
            ],
            requestPayload,
            onError: () => {
                console.error(
                    `An error occurred while reporting an item "${reportedEventType}" event.`,
                );
            },
        });
    }

    /**
     * Triggered when we need to report an ad event to the API.
     * @param {object} currentAd - The ad to send an event for.
     * @param {string} eventType - The event type for the reported event.
     * @param {string} eventName - (optional) The event name, for event types that require one.
     * @param {boolean} useKeepalive - If true, the request is made so it survives the page going away.
     */
    #triggerReportAdEvent(currentAd, eventType, eventName, useKeepalive) {
        if (!currentAd) {
            return;
        }

        this.#sendAdEvent(
            {
                adId: currentAd.id,
                zoneId: currentAd.zone_id,
                impressionId: currentAd.impression_id,
            },
            eventType,
            eventName,
            useKeepalive,
        );
    }

    /**
     * Triggered when we need to report an ad zone level event to the API. These
     * events describe the zone itself rather than any ad within it, so they carry
     * no ad ID or impression ID.
     * @param {string} zoneId - The ad zone the event is for.
     * @param {string} eventType - The event type for the reported event.
     * @param {string} eventName - (optional) The event name, for event types that require one.
     * @param {boolean} useKeepalive - If true, the request is made so it survives the page going away.
     */
    #triggerReportZoneEvent(zoneId, eventType, eventName, useKeepalive) {
        this.#sendAdEvent(
            {
                adId: "",
                zoneId,
                impressionId: "",
            },
            eventType,
            eventName,
            useKeepalive,
        );
    }

    /**
     * Sends a single ad event to the API.
     * @param {object} eventTarget - What the event is about.
     * @param {string} eventTarget.adId - The ad ID, or an empty string for zone level events.
     * @param {string} eventTarget.zoneId - The ad zone ID.
     * @param {string} eventTarget.impressionId - The impression ID, or an empty string for zone level events.
     * @param {string} eventType - The event type for the reported event.
     * @param {string} eventName - (optional) The event name, for event types that require one.
     * @param {boolean} useKeepalive - If true, the request is made so it survives the page going away.
     */
    #sendAdEvent(eventTarget, eventType, eventName, useKeepalive) {
        const event = {
            ad_id: eventTarget.adId || "",
            zone_id: eventTarget.zoneId || "",
            impression_id: eventTarget.impressionId || "",
            event_type: eventType,
            // The event timestamp has to be sent as a unix timestamp.
            created_at: this.#getCurrentUnixTimestamp(),
        };

        // The API expects event_name to be left off the payload entirely rather
        // than sent as null when there isn't one.
        if (eventName) {
            event.event_name = eventName;
        }

        // Log the taken action/event with the API.
        this.#fetchApiRequest({
            method: "POST",
            url: `${this.apiEnv}/v/1.0.0/ad/events`,
            keepalive: useKeepalive,
            headers: [
                {
                    name: "Content-Type",
                    value: "application/json",
                },
                {
                    name: "x-api-key",
                    value: this.apiKey,
                },
            ],
            requestPayload: {
                app_id: this.apiKey,
                session_id: this.#ensureSession(),
                udid: this.advertiserId,
                sdk_version: packageJson.version,
                events: [event],
            },
            onError: () => {
                console.error(
                    `An error occurred reporting a user "${eventType}" event.`,
                );
            },
        });
    }

    /**
     * Reports an SDK level event, such as a session being created or resumed.
     * @param {string} eventName - The name of the event to report.
     * @param {object} eventParams - The params to report alongside the event.
     * @param {boolean} useKeepalive - If true, the request is made so it survives the page going away.
     */
    #trackSdkEvent(eventName, eventParams, useKeepalive) {
        this.#fetchApiRequest({
            method: "POST",
            url: `${this.listManagerApiEnv}/v/1/${this.deviceOs}/events`,
            keepalive: useKeepalive,
            headers: [
                {
                    name: "accept",
                    value: "application/json",
                },
                {
                    name: "x-api-key",
                    value: this.apiKey,
                },
            ],
            requestPayload: this.#buildSdkEventRequest([
                {
                    // "sdk", not "app" or "desktop": every event routed through
                    // here describes the SDK's own lifecycle, not a user action,
                    // and reporting keys off this to tell the two apart. The
                    // native SDKs send "sdk" for these, and the platform is
                    // already carried by the {os} path segment above.
                    event_source: this.#ListManagerEventSource.SDK,
                    event_name: eventName,
                    event_timestamp: this.#getCurrentUnixTimestamp(),
                    event_params: eventParams || {},
                },
            ]),
            onError: () => {
                console.error(
                    `An error occurred while reporting the "${eventName}" event.`,
                );
            },
        });
    }

    /**
     * Trigger an API request to get all possible keyword intercepts for the session.
     */
    #getKeywordIntercepts() {
        if (this.enableKeywordIntercept) {
            this.#fetchApiRequest({
                method: "POST",
                url: `${this.apiEnv}/v/1.0.0/intercept/retrieve`,
                headers: [
                    {
                        name: "accept",
                        value: "application/json",
                    },
                    {
                        name: "Content-Type",
                        value: "application/json",
                    },
                    {
                        name: "x-api-key",
                        value: this.apiKey,
                    },
                ],
                requestPayload: {
                    sdkId: packageJson.version,
                    bundleId: this.bundleId,
                    userId: this.advertiserId,
                    zoneId: "",
                    sessionId: this.#ensureSession(),
                    extra: "",
                },
                onSuccess: (response) => {
                    this.keywordIntercepts =
                        response && response.data ? response.data : undefined;
                },
                onError: () => {
                    console.error(
                        "An error occurred while retieving keyword intercepts.",
                    );
                },
            });
        }
    }

    /**
     * Gets the Keyword Intercept Term based on the provided term ID.
     * @param {string} termId - The term ID to get the term object for.
     * @returns the term if it was found based on the provided term ID.
     */
    #getKeywordInterceptTerm(termId) {
        let term;

        if (this.keywordIntercepts && termId) {
            for (const termObj of this.keywordIntercepts.terms) {
                if (termObj.term_id === termId) {
                    term = termObj;
                }
            }
        }

        return term;
    }

    /**
     * Requests all available Payload server item data for the user.
     */
    #requestPayloadItemData() {
        if (this.enablePayloads) {
            this.#fetchApiRequest({
                method: "POST",
                url: `${this.payloadApiEnv}/v/1/pickup`,
                headers: [
                    {
                        name: "accept",
                        value: "application/json",
                    },
                    {
                        name: "x-api-key",
                        value: this.apiKey,
                    },
                ],
                requestPayload: {
                    app_id: this.apiKey,
                    session_id: this.#ensureSession(),
                    udid: this.advertiserId,
                },
                onSuccess: (response) => {
                    const finalItemList = [];

                    // response, not just response.payloads: an empty or non-JSON
                    // 200 resolves to null now that the body parse no longer
                    // rejects, and reading a property off it throws out of the
                    // handler. The intercept and ad handlers were both updated for
                    // that; this one was missed.
                    if (response && response.payloads) {
                        for (const payload of response.payloads) {
                            if (
                                finalItemList.find(
                                    (item) =>
                                        item.payload_id === payload.payload_id,
                                )
                            ) {
                                // The payload ID was already placed into the finalItemList array.
                                // Mark this occurrance as a duplicate and skip adding it to finalItemList.
                                this.#sendPayloadStatusUpdate([
                                    {
                                        payload_id: payload.payload_id,
                                        status: "duplicate",
                                        event_timestamp: new Date().getTime(),
                                    },
                                ]);
                            } else {
                                // The payload ID was not found in finalItemList, so add it.
                                const detailedItemList = [];

                                // Hoisted rather than inlined: a payload arriving
                                // without this field would otherwise throw out of
                                // the whole handler, discarding the payloads
                                // already collected in the same batch along with
                                // the callback. The type declares it required, so
                                // this is cheap insurance rather than a known bug.
                                const listItems =
                                    payload.detailed_list_items || [];

                                for (const itemData of listItems) {
                                    detailedItemList.push({
                                        product_title:
                                            itemData["product_title"],
                                        product_brand:
                                            itemData["product_brand"],
                                        product_category:
                                            itemData["product_category"],
                                        product_barcode:
                                            itemData["product_barcode"],
                                        product_discount:
                                            itemData["product_discount"],
                                        product_image:
                                            itemData["product_image"],
                                        product_sku: itemData["product_sku"],
                                    });
                                }

                                finalItemList.push({
                                    payload_id: payload.payload_id,
                                    detailed_list_items: detailedItemList,
                                });
                            }
                        }
                    }

                    // Send the items to the client, so they can add them to the list.
                    this.#invokeClientCallback(
                        "onPayloadsAvailable",
                        finalItemList,
                    );
                },
                onError: () => {
                    console.error(
                        "An error occurred while requesting payload item data.",
                    );
                },
            });
        }
    }

    /**
     * Gets the current unix timestamp.
     * @returns the current unix timestamp.
     */
    #getCurrentUnixTimestamp() {
        return Math.round(new Date().getTime() / 1000);
    }

    /**
     * Gets all data needed to make a List Manager API request.
     * @param {string} eventName - The event name.
     * @param {string[]} itemNames - The items to report.
     * @param {string} listName - (optional) The list associated to the items, if available.
     * @returns the data required for the request.
     */
    #getListManagerApiRequestData(eventName, itemNames, listName) {
        const eventList = [];

        for (const itemName of itemNames) {
            eventList.push({
                event_source:
                    this.deviceOs === this.#DeviceOS.DESKTOP
                        ? this.#ListManagerEventSource.DESKTOP
                        : this.#ListManagerEventSource.APP,
                event_name: eventName,
                event_timestamp: this.#getCurrentUnixTimestamp(),
                event_params: {
                    item_name: itemName,
                    list_name: listName,
                },
            });
        }

        return this.#buildSdkEventRequest(eventList);
    }

    /**
     * Wraps a list of SDK events in the request envelope the events API expects.
     * @param {Array} eventList - The events to send.
     * @returns the data required for the request.
     */
    #buildSdkEventRequest(eventList) {
        return {
            session_id: this.#ensureSession(),
            app_id: this.apiKey,
            udid: this.advertiserId,
            events: eventList,
            sdk_version: packageJson.version,
            bundle_id: this.bundleId,
            bundle_version: this.bundleVersion,
            // The user's retargeting decision and their locale used to travel on
            // the session initialize request. With that request gone this is the
            // only channel left for them, and it is the one the other SDKs already
            // use, so an opt-out is still honoured rather than silently dropped.
            allow_retargeting: this.allowRetargeting ? 1 : 0,
            locale: this.deviceLocale ? this.deviceLocale : "",
        };
    }

    /**
     * Determine the mobile operating system.
     * @returns the operating system
     */
    #getOperatingSystem() {
        // TODO: Need to make the SDK operating system independent so each environment doesn't require its own path.
        // const userAgent = navigator.userAgent || navigator.vendor;

        // if (/iPad|iPhone|iPod/i.test(userAgent) && !window.MSStream) {
        //     return this.#DeviceOS.IOS;
        // } else if (/android/i.test(userAgent)) {
        return this.#DeviceOS.ANDROID;
        // } else {
        //     return this.#DeviceOS.DESKTOP;
        // }
    }

    /**
     * Counts the number of properties in an object.
     * @param {object} obj - The object to count the number of properties from.
     * @returns the total count of properties from the provided object.
     */
    #totalProperties(obj) {
        let count = 0;

        for (const property in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, property)) {
                count++;
            }
        }

        return count;
    }

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
     * @returns a boolean indicating whether or not "safe area" padding is needed.
     */
    #needsSafeAreaPadding() {
        // Wrapping with a "try", because checking if CSS is not undefined still
        // fails when running unit tests for some reason.
        try {
            if (CSS.supports("padding-bottom: env(safe-area-inset-bottom)")) {
                const div = document.createElement("div");

                div.style.paddingBottom = "env(safe-area-inset-bottom)";
                document.body.appendChild(div);

                const calculatedPadding = parseInt(
                    window.getComputedStyle(div).paddingBottom,
                    10,
                );

                document.body.removeChild(div);

                if (calculatedPadding > 0) {
                    return true;
                }
            }
        } catch (err) {
            // Do nothing for now...
        }

        return false;
    }

    // /**
    //  * Handles sending an API request.
    //  * @param {object} settings - All settings to apply to the request.
    //  * @param {string} settings.method - The request method to use (GET, POST, etc.)
    //  * @param {string} settings.url - The URL to use for the request.
    //  * @param {Array} settings.headers - Array of all request header objects.
    //  * @param {object} settings.requestPayload - All data to send on the body of the request.
    //  * @param {Function} settings.onSuccess - The method that triggers upon successful result of the request.
    //  * @param {Function} settings.onError - The method that triggers upon unsuccessful result of the request.
    //  */
    // #sendApiRequest(settings) {
    //     const xhr = new XMLHttpRequest();

    //     /**
    //      * Method triggered upon request response.
    //      */
    //     xhr.onload = () => {
    //         if (xhr.status >= 200 && xhr.status < 300) {
    //             if (settings.onSuccess) {
    //                 settings.onSuccess(JSON.parse(xhr.response));
    //             }
    //         } else {
    //             if (settings.onError) {
    //                 settings.onError();
    //             }
    //         }
    //     };

    //     /**
    //      * Method triggered upon request error.
    //      */
    //     xhr.onerror = () => {
    //         if (settings.onError) {
    //             settings.onError();
    //         }
    //     };

    //     xhr.open(settings.method, settings.url, true);

    //     for (const header of settings.headers) {
    //         xhr.setRequestHeader(header.name, header.value);
    //     }

    //     xhr.send(
    //         settings.requestPayload
    //             ? JSON.stringify(settings.requestPayload)
    //             : undefined,
    //     );
    // }

    /**
     * Decides whether a request can actually be sent with keepalive.
     *
     * The browser gives a document a single 64KB budget for keepalive request
     * bodies, shared across every keepalive request in flight - and shared with
     * whatever sendBeacon the host page's own analytics fire at the same moment.
     * A request that breaches it does not degrade: fetch rejects outright and the
     * whole body is lost. The reports that can grow are the batch ones, which send
     * an event per item and are exactly the reports worth keeping, so an oversized
     * body drops keepalive instead. That request is then only lost if the page
     * really is being torn down, which is the behaviour it had before keepalive.
     * @param {boolean} requested - Whether the caller asked for keepalive.
     * @param {string} bodyData - The serialized request body, if there is one.
     * @returns true if the request should be sent with keepalive.
     */
    #canUseKeepalive(requested, bodyData) {
        if (!requested) {
            return false;
        }

        if (!bodyData) {
            return true;
        }

        // Deliberately well under the 64KB budget. The page's own beacons are drawn
        // from the same allowance, and the count is of bytes rather than characters,
        // so a body of multi byte characters is larger than its length suggests.
        const keepaliveBodyByteLimit = 48 * 1024;
        const bodyByteLength =
            typeof TextEncoder === "function"
                ? new TextEncoder().encode(bodyData).length
                : bodyData.length;

        if (bodyByteLength <= keepaliveBodyByteLimit) {
            return true;
        }

        console.warn(
            `A report of ${bodyByteLength} bytes is too large to be sent with keepalive, so it will be lost if the page closes before it completes.`,
        );

        return false;
    }

    /**
     * Handles sending an API request with the fetch API.
     * @param {object} settings - All settings to apply to the request.
     * @param {string} settings.method - The request method to use (GET, POST, etc.)
     * @param {string} settings.url - The URL to use for the request.
     * @param {Array} settings.headers - Array of all request header objects.
     * @param {object} settings.requestPayload - All data to send on the body of the request.
     * @param {boolean} settings.keepalive - If true, the request is allowed to outlive the page.
     * @param {Function} settings.onSuccess - The method that triggers upon successful result of the request.
     * @param {Function} settings.onError - The method that triggers upon unsuccessful result of the request.
     */
    #fetchApiRequest(settings) {
        let headersData;
        let bodyData;

        /**
         * Reports the request as failed, logging the reason.
         * @param {string} reason - Why the request is considered a failure.
         */
        const onRequestError = (reason) => {
            if (reason) {
                console.error(reason);
            }

            if (settings.onError) {
                settings.onError();
            }
        };

        // Set the headers if needed.
        if (settings.headers) {
            headersData = {};

            for (const header of settings.headers) {
                headersData[header.name] = header.value;
            }
        }

        // Set the body data if needed.
        if (settings.requestPayload) {
            bodyData = JSON.stringify(settings.requestPayload);
        }

        // Trigger the request.
        fetch(settings.url, {
            method: settings.method,
            headers: headersData,
            body: bodyData,
            // Used for the events reported as the page is going away, so the browser
            // is allowed to finish sending them after the page is gone.
            keepalive: this.#canUseKeepalive(settings.keepalive, bodyData),
        })
            .then(async (response) => {
                // Not every endpoint returns a body, and an error page may not be
                // JSON at all, so a failed parse is treated as no data rather than
                // being allowed to reject.
                const dataResponse = await response.json().catch(() => null);

                return { response, dataResponse };
            })
            // Only the network request and the body parse are covered here.
            // Resolving to null keeps a transport failure distinguishable from a
            // response that came back and simply wasn't a success.
            .catch(() => null)
            .then((result) => {
                if (!result) {
                    onRequestError();

                    return;
                }

                const { response, dataResponse } = result;

                if (!response.ok) {
                    // The v1.0.0 endpoints report failures as
                    // {success: false, message}, while the older ones use {detail}.
                    const message =
                        dataResponse &&
                        (dataResponse.message || dataResponse.detail);

                    onRequestError(
                        message ||
                            `Request to ${settings.url} failed with status ${response.status}.`,
                    );

                    return;
                }

                if (dataResponse && dataResponse.detail) {
                    onRequestError(dataResponse.detail);

                    return;
                }

                if (dataResponse && dataResponse.success === false) {
                    onRequestError(
                        dataResponse.message ||
                            `Request to ${settings.url} was unsuccessful.`,
                    );

                    return;
                }

                if (!settings.onSuccess) {
                    return;
                }

                try {
                    settings.onSuccess(dataResponse);
                } catch (err) {
                    // A failure while handling a good response is a bug in the SDK,
                    // not a failed request. Routing it through onError would report
                    // a healthy ad as unfilled and put phantom "request_failed"
                    // events into the client's reports, so it is logged instead.
                    console.error(
                        `An error occurred handling the response from ${settings.url}.`,
                        err,
                    );
                }
            });
    }

    /**
     * How long a session stays alive. This is a sliding window measured from the
     * last time the page was known to be active, so a tab that stays in use keeps
     * its session ID rather than rotating mid-use.
     */
    /**
     * The SHA-256 of the API key and the advertiser ID together, which is what the
     * stored session is keyed on.
     *
     * Both, because a session is one person's visit to one app. The app alone is
     * not enough: local storage is shared across everyone who uses the browser
     * profile, so on a shared device the next person to sign in within the session
     * window would resume the previous person's session and the two of them would
     * report under one session ID. Hashed rather than stored plainly because the
     * advertiser ID identifies a user and a storage key is readable by anything on
     * the origin.
     *
     * Deliberately not keyed on storeId or the recipe context. Those are sent with
     * every ad request rather than carried by the session, and updateStoreId() and
     * updateRecipeContextId() change them without starting a new session - keying
     * on them would fragment one visit into a session per store.
     */
    #hashedSessionOwner;

    /**
     * The API environment as the plain string "prod" or "dev", as opposed to
     * apiEnv, which is the resolved URL. Private: only the stored session key
     * needs it, and two public fields with names this close invite picking the
     * wrong one.
     */
    #apiEnvString = "prod";

    /**
     * When the current session was first created. Private: internal session
     * bookkeeping, and getSessionId() is the supported way to observe a session.
     */
    #sessionCreatedAt;

    /**
     * Add to list clicks the host has been handed but has not yet confirmed
     * reached a list, oldest first.
     *
     * A list rather than a single slot, and a list rather than one entry per zone,
     * because what has to be told apart is the click - with zones serving
     * independently, a user can click one zone's add to list ad and then another's
     * before the host has finished with the first.
     */
    #pendingAtlClicks = [];

    /**
     * How many unconfirmed add to list clicks to keep. A host that never confirms
     * would otherwise grow this list for the life of the page. Far more than any
     * real user gets through before the first confirmation lands.
     */
    #MAX_PENDING_ATL_CLICKS = 25;

    /**
     * Bumped whenever the pending clicks are abandoned, which is what tells a
     * handle the host is still holding that the SDK it belongs to has gone.
     */
    #atlGeneration = 0;

    #SESSION_LIFETIME_MS = 30 * 60 * 1000;

    /**
     * True while a session is being replaced. Closing out the impressions that
     * belong to the outgoing session reports events, and reporting an event asks
     * for the session ID, which would otherwise notice the expired window and
     * start replacing the session again from inside the replacement.
     */
    #sessionRotating = false;

    /**
     * The prefix identifying a session as having come from this SDK.
     */
    #SESSION_ID_PREFIX = "JS";

    /**
     * How often the session's last-active stamp is written through to local
     * storage while the page is being used.
     */
    #SESSION_TOUCH_PERSIST_MS = 60 * 1000;

    /**
     * The number of random characters that follow the session ID prefix.
     */
    #SESSION_ID_LENGTH = 32;

    /**
     * The alphabet a session ID's random characters are drawn from.
     */
    #SESSION_ID_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    /**
     * The shortest search term that will be matched against keyword intercepts.
     */
    #MIN_KEYWORD_MATCH_LENGTH = 3;

    /**
     * How long an ad is displayed for when the API doesn't supply a refresh time.
     */
    #DEFAULT_AD_REFRESH_SECONDS = 60;

    /**
     * The shortest refresh time the SDK will honor, so an unexpectedly small value
     * can't have the SDK requesting ads in a tight loop.
     */
    #MINIMUM_AD_REFRESH_SECONDS = 15;

    /**
     * The title displayed in the header of the ad popover.
     */
    #AD_POPOVER_TITLE = "Featured";

    /**
     * Enum defining the SDK level event names that get reported.
     */
    #SdkEventName = {
        /**
         * A new session ID was generated.
         */
        SESSION_CREATED: "SESSION_CREATED",
        /**
         * An existing session ID was picked back up, because the page was reopened
         * or the browser tab was re-focused within the session window.
         */
        SESSION_RESUMED: "SESSION_RESUMED",
        /**
         * The page stopped being the user's focus, either because the tab is no
         * longer the shown tab or because the browser itself lost focus to another
         * application while this tab was on screen.
         */
        SESSION_BACKGROUNDED: "SESSION_BACKGROUNDED",
    };

    /**
     * Enum defining why an ad zone went unfilled.
     */
    #ZoneUnfilledReason = {
        /**
         * The API answered normally but had no ad to serve.
         */
        NO_AD: "no_ad",
        /**
         * The ad request failed outright and never returned a usable response.
         */
        REQUEST_FAILED: "request_failed",
    };

    /**
     * Enum representing possible List Manager types.
     */
    #ListManagerType = {
        /**
         * List.
         */
        LIST: "list",
        /**
         * Cart.
         */
        CART: "cart",
    };

    /**
     * Enum representing possible device operating systems.
     */
    #DeviceOS = {
        /**
         * Represents the Android operating system.
         */
        ANDROID: "android",
        /**
         * Represents the iOS operating system.
         */
        IOS: "ios",
        /**
         * Represents the desktop (non-mobile).
         */
        DESKTOP: "desktop",
    };

    /**
     * Defines the different API environments.
     */
    #ApiEnv = {
        /**
         * The production API environment.
         */
        Prod: "https://ads.adadapted.com",
        /**
         * The development API environment.
         */
        Dev: "https://sandbox.adadapted.com",
    };

    /**
     * Defines the different API environments for List Manager.
     */
    #ListManagerApiEnv = {
        /**
         * The production API environment.
         */
        Prod: "https://ec.adadapted.com",
        /**
         * The development API environment.
         */
        Dev: "https://sandec.adadapted.com",
    };

    /**
     * Defines the different API environments for the Payload Server.
     */
    #PayloadApiEnv = {
        /**
         * The production API environment.
         */
        Prod: "https://payload.adadapted.com",
        /**
         * The development API environment.
         */
        Dev: "https://sandpayload.adadapted.com",
    };

    /**
     * Enum defining the available ad action types.
     */
    #AdActionType = {
        /**
         * Used for Add To List.
         */
        CONTENT: "c",
        /**
         * Used for opening URLs in an external browser.
         */
        EXTERNAL: "e",
        /**
         * Used for opening URLs in a web view within the app if iOS or Android.
         * Used for opening URLs in a new browser tab if desktop (treated the same as AdActionType.EXTERNAL in this case).
         * Works the same as AdActionType.POPUP.
         */
        LINK: "l",
        /**
         * Used for opening URLs in a web view within the app if iOS or Android.
         * Used for opening URLs in a new browser tab if desktop (treated the same as AdActionType.EXTERNAL in this case).
         * Works the same as AdActionType.LINK.
         */
        POPUP: "p",
        /**
         * Used for opening app store URLs in the app store.
         */
        APP: "a",
        /**
         * ???
         */
        NONE: "n",
    };

    /**
     * Enum defining the different types of events that can be reported.
     */
    #ReportedEventType = {
        /**
         * Occurs when an ad is displayed to the user.
         */
        IMPRESSION: "impression",
        /**
         * Occurs when an ad that was displayed to the user stops being displayed,
         * because it rotated out, went out of view, or the page went away.
         * Reported at most once per ad that recorded an impression.
         */
        IMPRESSION_END: "impression_end",
        /**
         * Occurs when the user interacts with an ad.
         */
        INTERACTION: "interaction",
        /**
         * Occurs when an ad zone is first placed on the page.
         * Reported for every zone, whether it ever receives an ad or not.
         */
        ZONE_MOUNTED: "zone_mounted",
        /**
         * Occurs when an ad zone is removed from the page.
         */
        ZONE_UNMOUNTED: "zone_unmounted",
        /**
         * Occurs when an ad was requested for a zone but none could be displayed.
         * Always accompanied by a {@link #ZoneUnfilledReason} event name.
         */
        ZONE_UNFILLED: "zone_unfilled",
        /**
         * Occurs when the user's search term did not
         * match an available keyword intercept term.
         */
        NOT_MATCHED: "not_matched",
        /**
         * Occurs when the user's search term has matched a keyword intercept term.
         */
        MATCHED: "matched",
        /**
         * Occurs when the user was presented a keyword intercept term.
         */
        PRESENTED: "presented",
        /**
         * Occurs when the user has selected a keyword intercept term.
         */
        SELECTED: "selected",
    };

    /**
     * Enum defining the possible values for a List Manager Event Source.
     */
    #ListManagerEventSource = {
        /**
         * The event was triggered from the app.
         */
        APP: "app",
        /**
         * The event was triggered from desktop.
         */
        DESKTOP: "desktop",
        /**
         * The event describes the SDK's own lifecycle rather than something the
         * user did. Matches SDK_EVENT_TYPE in the Android SDK's EventStrings.
         */
        SDK: "sdk",
    };

    /**
     * Enum defining the possible values for a List Manager Event Name.
     */
    #ListManagerEventName = {
        /**
         * The user added an item to their list.
         */
        ADDED_TO_LIST: "user_added_to_list",
        /**
         * The user crossed off an item from their list.
         */
        CROSSED_OFF_LIST: "user_crossed_off_list",
        /**
         * The user deleted an item from their list.
         */
        DELETED_FROM_LIST: "user_deleted_from_list",
        /**
         * The user added an item to their cart.
         */
        ADDED_TO_CART: "user_added_to_cart",
        /**
         * The user deleted an item from their cart.
         */
        DELETED_FROM_CART: "user_deleted_from_cart",
    };
}

module.exports = AdadaptedJsSdk;

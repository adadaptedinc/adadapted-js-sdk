import packageJson from "../package.json";
/**
 * The AdAdapted JS SDK class.
 */
class AdadaptedJsSdk {
    /**
     * @inheritDoc
     */
    constructor() {
        this.appId = "";
        this.advertiserId = "";
        this.bundleId = "js_default_bundleID";
        this.bundleVersion = "js_default_bundleVersion";
        this.allowRetargeting = true;
        this.zonePlacements = undefined;
        this.apiEnv = this.#ApiEnv.Prod;
        this.listManagerApiEnv = this.#ListManagerApiEnv.Prod;
        this.payloadApiEnv = this.#PayloadApiEnv.Prod;
        this.deviceOs = undefined;
        this.sessionId = undefined;
        this.sessionInfo = undefined;
        this.adZones = undefined;
        this.refreshAdZonesTimer = undefined;
        this.keywordIntercepts = undefined;
        this.keywordInterceptSearchValue = "";
        this.cycleAdTimers = {};
        this.initialBodyOverflowStyle = document.body.style.overflow;

        this.onAdZonesRefreshed = () => {
            // Defaulting to empty method.
        };
        this.onAddToListTriggered = () => {
            // Defaulting to empty method.
        };
        this.onPayloadsAvailable = () => {
            // Defaulting to empty method.
        };
    }

    /**
     * Gets the current session ID.
     * @returns the current session ID.
     */
    getSessionId() {
        return this.sessionId;
    }

    /**
     * Initializes the session for the AdAdapted API and sets up the SDK.
     * @param props - The props used to initialize the SDK.
     * @returns a Promise of void.
     */
    initialize(props) {
        return new Promise((resolve, reject) => {
            // Verify required fields are provided before attempting to initialize the SDK.
            if (props.appId === undefined || props.appId === null) {
                reject(
                    "App ID must be provided for the AdAdapted SDK to be initialized."
                );
            } else if (
                props.advertiserId === undefined ||
                props.advertiserId === null
            ) {
                reject(
                    "A unique identifier(advertiserId) must be provided for the AdAdapted SDK to be initialized."
                );
            } else if (
                props.allowRetargeting === undefined ||
                props.allowRetargeting === null
            ) {
                reject(
                    "A user's privacy decision to opt-in or opt-out for ad retargeting(allowRetargeting) must be provided for the AdAdapted SDK to be initialized."
                );
            } else {
                // Set the app ID.
                this.appId = props.appId;

                // Set the unique ID.
                this.advertiserId = props.advertiserId;

                // Set the bundle ID (default value used if not provided).
                this.bundleId = props.bundleId;

                // Set the bundle version (default value used if not provided).
                this.bundleVersion = props.bundleVersion;

                // Set whether the user is allowed to be retargetted by ads.
                this.allowRetargeting = props.allowRetargeting;

                // Set the zone placements provided by the client.
                this.zonePlacements = props.zonePlacements;

                // Set the API environments based on the provided override value.
                // If the apiEnv value is not provided, production will be used as default.
                if (props.apiEnv === "mock") {
                    this.apiEnv = this.#ApiEnv.Mock;
                    this.payloadApiEnv = this.#PayloadApiEnv.Mock;
                    this.listManagerApiEnv = this.#ListManagerApiEnv.Mock;
                } else if (props.apiEnv === "dev") {
                    this.apiEnv = this.#ApiEnv.Dev;
                    this.payloadApiEnv = this.#PayloadApiEnv.Dev;
                    this.listManagerApiEnv = this.#ListManagerApiEnv.Dev;
                } else {
                    this.apiEnv = this.#ApiEnv.Prod;
                    this.payloadApiEnv = this.#PayloadApiEnv.Prod;
                    this.listManagerApiEnv = this.#ListManagerApiEnv.Prod;
                }

                // If the callback for onAdZonesRefreshed was provided, set it
                // globally for use when the method needs to be triggered.
                if (props.onAdZonesRefreshed) {
                    this.onAdZonesRefreshed = props.onAdZonesRefreshed;
                }

                // If the callback for onAddToListTriggered was provided, set it
                // globally for use when the method needs to be triggered.
                if (props.onAddToListTriggered) {
                    this.onAddToListTriggered = props.onAddToListTriggered;
                }

                // If the callback for onPayloadsAvailable was provided, set it
                // globally for use when the method needs to be triggered.
                if (props.onPayloadsAvailable) {
                    this.onPayloadsAvailable = props.onPayloadsAvailable;
                }

                this.deviceOs = this.#getOperatingSystem();

                // Initialize the session.
                this.#sendApiRequest({
                    method: "POST",
                    url: `${this.apiEnv}/v/0.9.5/${this.deviceOs}/sessions/initialize`,
                    headers: [
                        {
                            name: "accept",
                            value: "*/*",
                        },
                        {
                            name: "Content-Type",
                            value: "application/json",
                        },
                    ],
                    requestPayload: {
                        app_id: this.appId,
                        udid: this.advertiserId,
                        device_udid: this.advertiserId,
                        sdk_version: packageJson.version,
                        device_os: this.deviceOs,
                        bundle_id: this.bundleId,
                        bundle_version: this.bundleVersion,
                        allow_retargeting: this.allowRetargeting,
                    },
                    onSuccess: (response) => {
                        this.sessionId = response.session_id;
                        this.sessionInfo = response;

                        // Render the Ad Zones.
                        this.#renderAdZones(response.zones);

                        // Start the session data refresh timer.
                        this.#onRefreshAdZones();

                        // Get all possible keyword intercept values.
                        // We don't need to wait for this to complete
                        // prior to resolving initialization of the SDK.
                        this.#getKeywordIntercepts();

                        // Make the initial call to the Payload data server to see if
                        // the user has any outstanding items to be added to list.
                        this.requestPayloadItemData();

                        resolve();
                    },
                    onError: () => {
                        reject("An error occurred initializing the SDK.");
                    },
                });
            }
        });
    }

    /**
     * Requests all available Payload server item data for the user.
     *
     * NOTE: If there are payload items available, the onPayloadsAvailable() callback
     * will be triggered and the items will be provided through that method.
     */
    requestPayloadItemData() {
        this.#sendApiRequest({
            method: "POST",
            url: `${this.payloadApiEnv}/v/1/pickup`,
            headers: [
                {
                    name: "accept",
                    value: "application/json",
                },
            ],
            requestPayload: {
                app_id: this.appId,
                session_id: this.sessionId,
                udid: this.advertiserId,
            },
            onSuccess: (response) => {
                const finalItemList = [];

                for (const payload of response.payloads) {
                    const detailedItemList = [];

                    for (const itemData of payload.detailed_list_items) {
                        detailedItemList.push({
                            product_title: itemData["product_title"],
                            product_brand: itemData["product_brand"],
                            product_category: itemData["product_category"],
                            product_barcode: itemData["product_barcode"],
                            product_discount: itemData["product_discount"],
                            product_image: itemData["product_image"],
                            product_sku: itemData["product_sku"],
                        });
                    }

                    finalItemList.push({
                        payload_id: payload.payload_id,
                        detailed_list_items: detailedItemList,
                    });
                }

                // Send the items to the client, so they can add them to the list.
                this.onPayloadsAvailable(finalItemList);
            },
            onError: () => {
                console.error(
                    "An error occurred while requesting payload item data."
                );
            },
        });
    }

    /**
     * Searches through available ad keywords based on provided search term.
     * @param searchTerm - The search term used to match against available keyword intercepts.
     * @returns all keyword intercept terms that matched the search term.
     */
    performKeywordSearch(searchTerm) {
        const finalResultListStartsWith = [];
        const finalResultListContains = [];

        this.keywordInterceptSearchValue = searchTerm;

        if (!this.sessionId) {
            console.error("AdAdapted JS SDK has not been initialized.");
        } else if (!this.keywordIntercepts) {
            console.error("No available keyword intercepts.");
        } else if (
            searchTerm &&
            searchTerm.trim() &&
            searchTerm.trim().length >= this.keywordIntercepts.min_match_length
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
                a.priority > b.priority ? 1 : -1
            );
            finalResultListContains.sort((a, b) =>
                a.priority > b.priority ? 1 : -1
            );

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
            this.#sendApiRequest({
                method: "POST",
                url: `${this.apiEnv}/v/0.9.5/${this.deviceOs}/intercepts/events`,
                headers: [
                    {
                        name: "accept",
                        value: "application/json",
                    },
                ],
                requestPayload: {
                    app_id: this.appId,
                    udid: this.advertiserId,
                    session_id: this.sessionId,
                    sdk_version: packageJson.version,
                    events: finalEventsList,
                },
                onError: () => {
                    console.error(
                        "An error occurred while reporting the keyword intercept event."
                    );
                },
            });
        }

        // The returned list will keep all terms found by matching the
        // beginning of the term string at the beginning of the list. All
        // terms found that didn't match the beginning of the string, but
        // still contained the search term will be concatenated to the end
        // of the list.
        return finalResultListStartsWith.concat(finalResultListContains);
    }

    /**
     * Client must trigger this method when a Keyword Intercept Term has been "selected" by the user.
     * This will ensure that the event is properly recorded and enable accuracy in client reports.
     * @param termId - The term ID to trigger the event for.
     */
    reportKeywordInterceptTermSelected(termId) {}

    /**
     * Client must trigger this method when a Keyword Intercept Term has been "presented" to the user.
     * All terms that satisfy a search don't have to be presented, so only provide term IDs for the
     * terms that ultimately get presented to the user.
     * NOTE: This will ensure that the event is properly recorded and enable accuracy in client reports.
     * @param termIds - The term IDs list to trigger the event for.
     */
    reportKeywordInterceptTermsPresented(termIds) {}

    /**
     * Client must trigger this method when any items are added to a list for reports we provide to the client.
     * @param itemNames - The items to report.
     * @param listName - (optional) The list to associate the items with, if available.
     */
    reportItemsAddedToList(itemNames, listName) {}

    /**
     * Client must trigger this method when any items are crossed off a list for reports we provide to the client.
     * @param itemNames - The items to report.
     * @param listName - (optional) The list the items are associated with, if available.
     */
    reportItemsCrossedOffList(itemNames, listName) {}

    /**
     * Client must trigger this method when any items are deleted from a list for reports we provide to the client.
     * @param itemNames - The items to report.
     * @param listName - (optional) The list the items are associated with, if available.
     */
    reportItemsDeletedFromList(itemNames, listName) {}

    /**
     * Client must trigger this method when any items are deleted from a list for reports we provide to the client.
     * @param payloadId - The payload ID that we want to acknowledge.
     */
    markPayloadContentAcknowledged(payloadId) {}

    /**
     * Client must trigger this method when any items are deleted from a list for reports we provide to the client.
     * @param payloadId - The payload ID that we want to acknowledge.
     */
    markPayloadContentRejected(payloadId) {}

    /**
     * Performs all clean up tasks for the SDK. Call this method when you are
     * finished with the SDK to ensure you don't experience memory leaks.
     */
    unmount() {}

    /**
     * Triggered when session data is initialized or refreshed.
     * Creates a timer based on the session data refresh value.
     */
    #onRefreshAdZones() {
        // Get the amount of time we will wait until a refresh occurs.
        // We are setting a minimum refresh time of 5 minutes, so if a
        // value provided by the API is lower, we don't refresh too often.
        const timerMs =
            this.sessionInfo.polling_interval_ms >= 300000
                ? this.sessionInfo.polling_interval_ms
                : 300000;

        this.refreshAdZonesTimer = setTimeout(() => {
            this.#sendApiRequest({
                method: "GET",
                url: `${this.apiEnv}/v/0.9.5/${this.deviceOs}/ads/retrieve?aid=${this.appId}&sid=${this.sessionId}&uid=${this.advertiserId}`,
                headers: [
                    {
                        name: "accept",
                        value: "application/json",
                    },
                ],
                onSuccess: (response) => {
                    this.sessionInfo = response;

                    // Render the Ad Zones.
                    this.#renderAdZones(response.zones);

                    // Call the user defined callback indicating
                    // the session data has been refreshed.
                    this.onAdZonesRefreshed();

                    // Start the timer again based on the new session data.
                    this.#onRefreshAdZones();
                },
                onError: () => {
                    console.error("An error occurred refreshing the ad zones.");

                    // Start the timer again so we can make another
                    // attempt to refresh the session data.
                    this.#onRefreshAdZones();
                },
            });
        }, timerMs);
    }

    /**
     * Renders or updates the ad zone data.
     * @param adZonesData - All ad zone data needed for the zones.
     */
    #renderAdZones(adZonesData) {
        if (
            this.zonePlacements !== undefined &&
            this.zonePlacements !== null &&
            this.#totalProperties(this.zonePlacements) > 0
        ) {
            // The zone placement map was provided and contained
            // entries, so we can now generate the ad zones.
            this.adZones = this.#generateAdZones(adZonesData);

            for (const adZone of this.adZones) {
                const zonePlacementId = this.zonePlacements[adZone.zoneId];
                const containerElement = document.getElementById(
                    zonePlacementId
                );

                if (zonePlacementId && containerElement) {
                    containerElement.innerHTML = "";
                    containerElement.appendChild(adZone.adZone);

                    this.#initializeAd(adZone.adZoneData);
                }
            }
        }
    }

    /**
     * Creates all Ad Zone Info objects based on provided Ad Zones.
     * @param adZonesData - The object of available zones.
     * @returns the array of Ad Zone Info objects.
     */
    #generateAdZones(adZonesData) {
        const adZoneInfoList = [];

        // We are iterating an object, so we will get the property ID
        // and use that to access the data from the same object.
        for (const adZoneId in adZonesData) {
            if (adZonesData.hasOwnProperty(adZoneId)) {
                // Generates a random number between 0 and (number of available ads - 1).
                const displayedAdIndex = Math.floor(
                    Math.random() * adZonesData[adZoneId].ads.length
                );

                // Create the ad zone and all child elements.
                const adZoneContainer = this.#generateAdZoneContents(
                    adZonesData[adZoneId],
                    displayedAdIndex
                );

                // Push to the ad zone array.
                adZoneInfoList.push({
                    zoneId: adZoneId,
                    adZone: adZoneContainer,
                    adZoneData: adZonesData[adZoneId],
                });
            }
        }

        return adZoneInfoList;
    }

    /**
     * Generates the current contents of an ad zone.
     * @param adZoneData - The ad zone object.
     * @param displayedAdIndex - The index of the ad unit in the ad zone.
     * @returns the generated ad zone contents.
     */
    #generateAdZoneContents(adZoneData, displayedAdIndex) {
        const displayedAd = adZoneData.ads[displayedAdIndex];

        const adZoneContainer = document.createElement("div");
        adZoneContainer.className = "AdZone";
        adZoneContainer.style.position = "relative";
        adZoneContainer.style.width = "100%";
        adZoneContainer.style.height = "100%";
        adZoneContainer.style.cursor = "pointer";
        adZoneContainer.setAttribute("data-displayedAdIndex", displayedAdIndex);

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
        adZoneClickableArea.onclick = (event) => {
            event.preventDefault();

            this.#onAdZoneSelected(adZoneData, displayedAdIndex);
        };

        adZoneContainer.appendChild(adZoneIFrame);
        adZoneContainer.appendChild(adZoneClickableArea);

        return adZoneContainer;
    }

    /**
     * Generates the ad popover.
     * @param currentAd - The ad to display within the popover.
     * @returns the generated ad popover.
     */
    #generateAdPopover(currentAd) {
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
        adPopoverHeaderTitle.innerText = currentAd.popup.title_text;

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
        adPopoverIFrame.onload = () => {
            // Remove the loading indicator.
            const loadingIndicator = document.getElementsByClassName(
                "AdPopup__header-loading-indicator"
            )[0];
            loadingIndicator.parentNode.removeChild(loadingIndicator);
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
        adPopoverFooterCloseButton.onclick = () => {
            const popoverContainer = document.getElementById(
                "adContentsPopoverContainer"
            );
            popoverContainer.parentNode.removeChild(popoverContainer);

            document.body.style.overflow = this.initialBodyOverflowStyle;
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
     * @param adZoneData - The related ad zone data.
     * @param displayedAdIndex - The currently displayed ad index for the ad zone.
     */
    #onAdZoneSelected(adZoneData, displayedAdIndex) {
        const currentAd = adZoneData.ads[displayedAdIndex];

        if (
            this.#getOperatingSystem() !== this.#DeviceOS.DESKTOP &&
            (currentAd.action_type === this.#AdActionType.POPUP ||
                currentAd.action_type === this.#AdActionType.LINK ||
                currentAd.action_type === this.#AdActionType.EXTERNAL) &&
            currentAd.action_path
        ) {
            // Mobile only.
            document.body.append(this.#generateAdPopover(currentAd));
            document.body.style.overflow = "hidden";

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
                        productImage
                    ) => {
                        triggerItemClicked({
                            tracking_id: trackingId,
                            product_title: productTitle,
                            product_brand: productBrand,
                            product_category: productCategory,
                            product_barcode: productBarcode,
                            product_sku: retailerSku,
                            product_discount: productDiscount,
                            product_image: productImage,
                        });
                    },
                };
            }
        } else if (
            this.#getOperatingSystem() === this.#DeviceOS.DESKTOP &&
            (currentAd.action_type === this.#AdActionType.POPUP ||
                currentAd.action_type === this.#AdActionType.LINK ||
                currentAd.action_type === this.#AdActionType.EXTERNAL) &&
            currentAd.action_path
        ) {
            // Only desktop.
            window.open(currentAd.action_path, "_blank");

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
            this.onAddToListTriggered(currentAd.payload.detailed_list_items);
        }

        this.#triggerReportAdEvent(
            currentAd,
            this.#ReportedEventType.INTERACTION
        );

        if (this.cycleAdTimers[adZoneData.id]) {
            clearTimeout(this.cycleAdTimers[adZoneData.id]);
        }

        this.#cycleDisplayedAd(adZoneData, displayedAdIndex);
    }

    /**
     * Triggered when we need to report an ad event to the API.
     * @param currentAd - The ad to send an event for.
     * @param eventType - The event type for the reported event.
     */
    #triggerReportAdEvent(currentAd, eventType) {
        // The event timestamp has to be sent as a unix timestamp.
        const currentTs = Math.round(new Date().getTime() / 1000);

        // Log the taken action/event with the API.
        this.#sendApiRequest({
            method: "POST",
            url: `${this.apiEnv}/v/0.9.5/${this.deviceOs}/ads/events`,
            headers: [
                {
                    name: "Content-Type",
                    value: "application/json",
                },
            ],
            requestPayload: {
                app_id: this.appId,
                session_id: this.sessionId,
                udid: this.advertiserId,
                sdk_version: packageJson.version,
                events: [
                    {
                        ad_id: currentAd.ad_id,
                        impression_id: currentAd.impression_id,
                        event_type: eventType,
                        created_at: currentTs,
                    },
                ],
            },
            onError: () => {
                console.error(
                    `An error occurred reporting a user "${eventType}" event.`
                );
            },
        });
    }

    /**
     * Performs all ad initialization tasks when a new ad is being displayed.
     * @param adZoneData - The ad zone object.
     */
    #initializeAd(adZoneData) {
        const adZoneDisplayedAdIndex = parseInt(
            document
                .getElementById(this.zonePlacements[adZoneData.id])
                .getElementsByClassName("AdZone")[0]
                .getAttribute("data-displayedAdIndex"),
            10
        );

        // Create the new timer based on the new ad index.
        this.#createAdTimer(
            adZoneData,
            adZoneDisplayedAdIndex,
            adZoneData.ads[adZoneDisplayedAdIndex].refresh_time * 1000
        );

        // Trigger an impression event for the ad.
        this.#triggerReportAdEvent(
            adZoneData.ads[adZoneDisplayedAdIndex],
            this.#ReportedEventType.IMPRESSION
        );
    }

    /**
     * Generates a new timer for cycling to the next ad.
     * @param adZoneData - The ad zone object.
     * @param displayedAdIndex - The currently displayed ad index for the ad zone.
     * @param timerLength - The length(in milliseconds) of the timer.
     */
    #createAdTimer(adZoneData, displayedAdIndex, timerLength) {
        this.cycleAdTimers[adZoneData.id] = setTimeout(() => {
            this.#cycleDisplayedAd(adZoneData, displayedAdIndex);
        }, timerLength);
    }

    /**
     * Cycles to the next ad to display in the current available sequence of ads for an ad zone.
     * @param adZoneData - The ad zone object.
     * @param displayedAdIndex - The currently displayed ad index for the ad zone.
     */
    #cycleDisplayedAd(adZoneData, displayedAdIndex) {
        const adContentsPopoverContainer = document.getElementById(
            "adContentsPopoverContainer"
        );

        if (!adContentsPopoverContainer) {
            // An ad popover is not currently displayed, so cycle the ad zone ad.
            // NOTE: This applies to all ad zones, so ads across all ad zones will
            //       not cycle if a popover is currently consuming the screen.
            let nextAdIndex = 0;

            if (displayedAdIndex < adZoneData.ads.length - 1) {
                nextAdIndex = displayedAdIndex + 1;
            }

            this.#updateAdZoneContents(adZoneData, nextAdIndex);
        } else {
            // Create a new timer with a timer length of just 10 seconds.
            // This will allow us to re-check if the popup is still open
            // quicker and handle switching to the next ad sooner instead of
            // just restarting the current timer. We do this, because we must
            // maintain the current ad shown or the popup will cycle to the
            // next ad while the user is actively engaged with it. Then when
            // the user closes the popup, the ad will cycle to the next quickly.
            this.#createAdTimer(adZoneData, displayedAdIndex, 10000);
        }
    }

    /**
     * Updates the contents of the ad zone with the next ad.
     * @param adZoneData - The ad zone data object.
     * @param nextAdIndex - The ad index to display.
     */
    #updateAdZoneContents(adZoneData, nextAdIndex) {
        const displayedAd = adZoneData.ads[nextAdIndex];

        const adZoneContainer = this.#generateAdZoneContents(
            adZoneData,
            nextAdIndex
        );

        for (const adZone of this.adZones) {
            if (adZoneData.id === adZone.zoneId) {
                adZone.adZone = adZoneContainer;

                const zonePlacementId = this.zonePlacements[adZone.zoneId];
                const containerElement = document.getElementById(
                    zonePlacementId
                );

                if (zonePlacementId && containerElement) {
                    containerElement.innerHTML = "";
                    containerElement.appendChild(adZone.adZone);

                    // Initialize the newly displayed ad.
                    this.#initializeAd(adZoneData);
                }

                break;
            }
        }
    }

    /**
     * Trigger an API request to get all possible keyword intercepts for the session.
     */
    #getKeywordIntercepts() {
        this.#sendApiRequest({
            method: "GET",
            url: `${this.apiEnv}/v/0.9.5/${this.deviceOs}/intercepts/retrieve?aid=${this.appId}&sid=${this.sessionId}&uid=${this.advertiserId}`,
            headers: [
                {
                    name: "accept",
                    value: "application/json",
                },
            ],
            onSuccess: (response) => {
                this.keywordIntercepts = response;
            },
            onError: () => {
                console.error(
                    "An error occurred while retieving keyword intercepts."
                );
            },
        });
    }

    /**
     * Gets the Keyword Intercept Term based on the provided term ID.
     * @param termId - The term ID to get the term object for.
     * @returns the term if it was found based on the provided term ID.
     */
    #getKeywordInterceptTerm(termId) {}

    /**
     * Gets the current unix timestamp.
     * @returns the current unix timestamp.
     */
    #getCurrentUnixTimestamp() {
        return Math.round(new Date().getTime() / 1000);
    }

    /**
     * Gets all data needed to make a List Manager API request.
     * @param eventSource - The event source.
     * @param eventName - The event name.
     * @param itemNames - The items to report.
     * @param listName - (optional) The list associated to the items, if available.
     * @returns the data required for the request.
     */
    #getListManagerApiRequestData(
        eventSource,
        eventName,
        itemNames,
        listName
    ) {}

    /**
     * Takes the deep link URL and extracts out the payload items
     * data to send to the client for adding to a user's list.
     * @param event - The event containing URL related info.
     */
    #handleDeepLink(event) {}

    /**
     * Determine the mobile operating system.
     * @returns the operating system
     */
    #getOperatingSystem() {
        const userAgent = navigator.userAgent || navigator.vendor;

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
     * @param obj - The object to count the number of properties from.
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
     *
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
                    10
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

    /**
     * Handles sending an API request.
     * @param {Object} settings - All settings to apply to the request.
     * @param {String} settings.method - The request method to use (GET, POST, etc.)
     * @param {String} settings.url - The URL to use for the request.
     * @param {Array} settings.headers - Array of all request header objects.
     * @param {Object} settings.requestPayload - All data to send on the body of the request.
     * @param {Function} settings.onSuccess - The method that triggers upon successful result of the request.
     * @param {Function} settings.onError - The method that triggers upon unsuccessful result of the request.
     */
    #sendApiRequest(settings) {
        const xhr = new XMLHttpRequest();

        /**
         * Method triggered upon request response.
         */
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                if (settings.onSuccess) {
                    settings.onSuccess(JSON.parse(xhr.response));
                }
            } else {
                if (settings.onError) {
                    settings.onError();
                }
            }
        };

        /**
         * Method triggered upon request error.
         */
        xhr.onerror = () => {
            if (settings.onError) {
                settings.onError();
            }
        };

        xhr.open(settings.method, settings.url, true);

        for (const header of settings.headers) {
            xhr.setRequestHeader(header.name, header.value);
        }

        xhr.send(
            settings.requestPayload
                ? JSON.stringify(settings.requestPayload)
                : undefined
        );
    }

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
        /**
         * Used only for unit testing/mocking data.
         */
        Mock: "MOCK_DATA",
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
        /**
         * Used only for unit testing/mocking data.
         */
        Mock: "MOCK_DATA",
    };

    /**
     * Defines the different API environments for the Payload Server.
     */
    #PayloadApiEnv = {
        /**
         * The production API environment.
         */
        Prod: "https://payload.adadapted.com",
        // Prod: "https://api.payloads.adadapted.com",
        /**
         * The development API environment.
         */
        Dev: "https://sandpayload.adadapted.com",
        // Dev: "https://api.payloads.adadapted.dev",
        /**
         * Used only for unit testing/mocking data.
         */
        Mock: "MOCK_DATA",
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
         * Occurs when the user interacts with an ad.
         */
        INTERACTION: "interaction",
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
}

export default AdadaptedJsSdk;

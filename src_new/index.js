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
        this.adPopupsOpened = {};

        this.onAdZonesRefreshed = () => {
            // Defaulting to empty method.
        };
        this.onAddToListTriggered = () => {
            // Defaulting to empty method.
        };
        this.onOutOfAppPayloadAvailable = () => {
            // Defaulting to empty method.
        };
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

                // If the callback for onOutOfAppPayloadAvailable was provided, set it
                // globally for use when the method needs to be triggered.
                if (props.onOutOfAppPayloadAvailable) {
                    this.onOutOfAppPayloadAvailable =
                        props.onOutOfAppPayloadAvailable;
                }

                this.deviceOs = this.#DeviceOS.ANDROID; // TODO: this.#getOperatingSystem();

                // Initialize the session.
                const xhr = new XMLHttpRequest();

                /**
                 * Method triggered upon request response.
                 */
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const response = JSON.parse(xhr.response);
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
                        this.#getPayloadItemData();

                        resolve();
                    } else {
                        reject("An error occurred initializing the SDK.");
                    }
                };

                /**
                 * Method triggered upon request error.
                 */
                xhr.onerror = () => {
                    reject("An error occurred initializing the SDK.");
                };

                xhr.open(
                    "POST",
                    `${this.apiEnv}/v/0.9.5/${this.deviceOs}/sessions/initialize`,
                    true
                );
                xhr.setRequestHeader("accept", "*/*");
                xhr.setRequestHeader("Content-Type", "application/json");

                xhr.send(
                    JSON.stringify({
                        app_id: this.appId,
                        udid: this.advertiserId,
                        device_udid: this.advertiserId,
                        sdk_version: packageJson.version,
                        device_os: this.deviceOs,
                        bundle_id: this.bundleId,
                        bundle_version: this.bundleVersion,
                        allow_retargeting: this.allowRetargeting,
                    })
                );
            }
        });
    }

    /**
     * Gets the current session ID.
     * @returns the current session ID.
     */
    getSessionId() {
        return this.sessionId;
    }

    /**
     * Searches through available ad keywords based on provided search term.
     * @param searchTerm - The search term used to match against available keyword intercepts.
     * @returns all keyword intercept terms that matched the search term.
     */
    performKeywordSearch(searchTerm) {}

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
    #onRefreshAdZones() {}

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
                    // adZone: (
                    //     <AdZone
                    //         key={adZoneId}
                    //         appId={this.appId}
                    //         sessionId={this.sessionId!}
                    //         udid={this.advertiserId}
                    //         deviceOs={this.deviceOs!}
                    //         apiEnv={this.apiEnv}
                    //         adZoneData={adZones[adZoneId]}
                    //         onAddToListTriggered={(items) => {
                    //             safeInvoke(
                    //                 this.onAddToListTriggered,
                    //                 items
                    //             );
                    //         }}
                    //     />
                    // ),
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

        console.log(adZoneContainer);
        return adZoneContainer;
    }

    /**
     * Triggers when the user selects the ad zone.
     * @param adZoneData - The related ad zone data.
     * @param adIndexShown - The index of the currently displayed ad within the ad zone.
     */
    #onAdZoneSelected(adZoneData, adIndexShown) {
        const currentAd = adZoneData.ads[adIndexShown];

        if (
            this.#getOperatingSystem() !== this.#DeviceOS.DESKTOP &&
            (currentAd.action_type === this.#AdActionType.POPUP ||
                currentAd.action_type === this.#AdActionType.LINK ||
                currentAd.action_type === this.#AdActionType.EXTERNAL) &&
            currentAd.action_path
        ) {
            // Only mobile.
            this.adPopupsOpened[adZoneData.zoneId] = true;

            // TODO: Open the ad in a popover.
        } else if (
            this.#getOperatingSystem() === this.#DeviceOS.DESKTOP &&
            (currentAd.action_type === this.#AdActionType.POPUP ||
                currentAd.action_type === this.#AdActionType.LINK ||
                currentAd.action_type === this.#AdActionType.EXTERNAL) &&
            currentAd.action_path
        ) {
            // Only desktop.
            window.open(currentAd.action_path, "_blank");
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

        this.#cycleDisplayedAd(adZoneData);
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
        const xhr = new XMLHttpRequest();

        /**
         * Method triggered upon request response.
         */
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                // Do nothing upon success.
            } else {
                console.error(
                    `An error occurred reporting a user "${eventType}" event.`
                );
            }
        };

        /**
         * Method triggered upon request error.
         */
        xhr.onerror = () => {
            console.error(
                `An error occurred reporting a user "${eventType}" event.`
            );
        };

        xhr.open(
            "POST",
            `${this.apiEnv}/v/0.9.5/${this.deviceOs}/ads/events`,
            true
        );
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.send(
            JSON.stringify({
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
            })
        );
    }

    /**
     * Performs all ad initialization tasks when a new ad is being displayed.
     * @param adZoneData - The ad zone object.
     */
    #initializeAd(adZoneData) {
        const adZoneDisplayedAdIndex = document
            .getElementById(this.zonePlacements[adZoneData.id])
            .getElementsByClassName("AdZone")[0]
            .getAttribute("data-displayedAdIndex");

        // Create the new timer based on the new ad index.
        this.#createAdTimer(
            adZoneData,
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
     * @param timerLength - The length(in milliseconds) of the timer.
     */
    #createAdTimer(adZoneData, timerLength) {
        this.cycleAdTimers[adZoneData.id] = setTimeout(() => {
            this.#cycleDisplayedAd(adZoneData);
        }, timerLength);
        console.log({ zoneId: adZoneData.id, timerLength: timerLength });
    }

    /**
     * Cycles to the next ad to display in the current available sequence of ads for an ad zone.
     * @param adZoneData - The ad zone object.
     */
    #cycleDisplayedAd(adZoneData) {
        if (!this.adPopupsOpened[adZoneData.id]) {
            const adZoneDisplayedAdIndex = parseInt(
                document
                    .getElementById(this.zonePlacements[adZoneData.id])
                    .getElementsByClassName("AdZone")[0]
                    .getAttribute("data-displayedAdIndex"),
                10
            );
            let nextAdIndex = 0;

            if (adZoneDisplayedAdIndex < adZoneData.ads.length - 1) {
                nextAdIndex = adZoneDisplayedAdIndex + 1;
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
            this.#createAdTimer(adZoneData, 10000);
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
    #getKeywordIntercepts() {}

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
    #getCurrentUnixTimestamp() {}

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
     * Triggered when the state of the app changes.
     * @param state - The current state of the app.
     */
    #handleAppStateChange(state) {}

    /**
     * Gets all available Payload server item data for the user.
     */
    #getPayloadItemData() {}

    /**
     * Determine the mobile operating system.
     * @returns the operating system
     */
    #getOperatingSystem() {
        const userAgent = navigator.userAgent || navigator.vendor;

        if (/iPad|iPhone|iPod/i.test(userAgent) && !window.MSStream) {
            return this.#DeviceOS.IOS;
        } else if (/android/i.test(userAgent)) {
            return this.#DeviceOS.ANDROID;
        } else {
            return this.#DeviceOS.DESKTOP;
        }
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
        /**
         * The development API environment.
         */
        Dev: "https://sandpayload.adadapted.com",
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

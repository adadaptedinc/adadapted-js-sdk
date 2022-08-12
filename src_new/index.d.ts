export = AdadaptedJsSdk;
/**
 * The AdAdapted JS SDK class.
 */
declare class AdadaptedJsSdk {
    appId: string;
    advertiserId: string;
    bundleId: string;
    bundleVersion: string;
    allowRetargeting: boolean;
    zonePlacements: any;
    apiEnv: string;
    listManagerApiEnv: string;
    payloadApiEnv: string;
    deviceOs: any;
    sessionId: any;
    sessionInfo: any;
    adZones: any;
    refreshAdZonesTimer: any;
    keywordIntercepts: any;
    keywordInterceptSearchValue: string;
    onAdZonesRefreshed: () => void;
    onAddToListTriggered: () => void;
    onOutOfAppPayloadAvailable: () => void;
    /**
     * Initializes the session for the AdAdapted API and sets up the SDK.
     * @param props - The props used to initialize the SDK.
     * @returns a Promise of void.
     */
    initialize(props: AdadaptedJsSdk.InitializeProps): Promise<any>;
    /**
     * Gets the current session ID.
     * @returns the current session ID.
     */
    getSessionId(): any;
    /**
     * Creates all Ad Zone Info objects based on provided Ad Zones.
     * @param adZones - The object of available zones.
     * @returns the array of Ad Zone Info objects.
     */
    generateAdZones(adZones: any): void;
    /**
     * Searches through available ad keywords based on provided search term.
     * @param searchTerm - The search term used to match against available keyword intercepts.
     * @returns all keyword intercept terms that matched the search term.
     */
    performKeywordSearch(searchTerm: any): void;
    /**
     * Client must trigger this method when a Keyword Intercept Term has been "selected" by the user.
     * This will ensure that the event is properly recorded and enable accuracy in client reports.
     * @param termId - The term ID to trigger the event for.
     */
    reportKeywordInterceptTermSelected(termId: any): void;
    /**
     * Client must trigger this method when a Keyword Intercept Term has been "presented" to the user.
     * All terms that satisfy a search don't have to be presented, so only provide term IDs for the
     * terms that ultimately get presented to the user.
     * NOTE: This will ensure that the event is properly recorded and enable accuracy in client reports.
     * @param termIds - The term IDs list to trigger the event for.
     */
    reportKeywordInterceptTermsPresented(termIds: any): void;
    /**
     * Client must trigger this method when any items are added to a list for reports we provide to the client.
     * @param itemNames - The items to report.
     * @param listName - (optional) The list to associate the items with, if available.
     */
    reportItemsAddedToList(itemNames: any, listName: any): void;
    /**
     * Client must trigger this method when any items are crossed off a list for reports we provide to the client.
     * @param itemNames - The items to report.
     * @param listName - (optional) The list the items are associated with, if available.
     */
    reportItemsCrossedOffList(itemNames: any, listName: any): void;
    /**
     * Client must trigger this method when any items are deleted from a list for reports we provide to the client.
     * @param itemNames - The items to report.
     * @param listName - (optional) The list the items are associated with, if available.
     */
    reportItemsDeletedFromList(itemNames: any, listName: any): void;
    /**
     * Client must trigger this method when any items are deleted from a list for reports we provide to the client.
     * @param payloadId - The payload ID that we want to acknowledge.
     */
    markPayloadContentAcknowledged(payloadId: any): void;
    /**
     * Client must trigger this method when any items are deleted from a list for reports we provide to the client.
     * @param payloadId - The payload ID that we want to acknowledge.
     */
    markPayloadContentRejected(payloadId: any): void;
    /**
     * Performs all clean up tasks for the SDK. Call this method when you are
     * finished with the SDK to ensure you don't experience memory leaks.
     */
    unmount(): void;
    #private;
}

declare namespace AdadaptedJsSdk {
    /**
     * Interface defining inputs to the SDK initialize() method.
     */
    export interface InitializeProps {
        /**
         * The app ID provided by the client.
         */
        appId: string;
        /**
         * The unique ID used to identify the user. Client must provide this value.
         */
        advertiserId: string;
        /**
         * The unique bundle ID used to identify the user.
         */
        bundleId: string;
        /**
         * The unique bundle version used to identify the user.
         */
        bundleVersion: string;
        /**
         * Allow ad retargeting.
         */
        allowRetargeting: boolean;
        /**
         * A map of {Zone ID -> Element ID}. This map must be provided
         * in order to see ad zones displayed. If the client is only using
         * the Keyword Intercept feature, then this zone placement mapping
         * does not need to be provided.
         *
         * The Zone ID is the ID that is provided by AdAdapted for
         * each ad zone available to the client.
         *
         * The Element ID is the ID of the element the client wants
         * the ad zone displayed in. This ID is determined by the client
         * and the client must provide the container element and any css
         * needed to make their container element display properly.
         */
        zonePlacements?: ZonePlacements;
        /**
         * The API environment.
         * If undefined, defaults to production.
         */
        apiEnv?: "prod" | "dev" | "mock";
        /**
         * Callback that gets triggered when the session/zones/ads data
         * gets refreshed and is now available for reference.
         */
        onAdZonesRefreshed?(): void;
        /**
         * Callback that gets triggered when an "add to list" item/items are clicked.
         * @param items - The array of items to "add to list".
         */
        onAddToListTriggered?(items: DetailedListItem[]): void;
        /**
         * Callback that gets triggered when an "add to list"
         * occurs by means of an "out of app" data payload.
         * @param payloads - All payloads the client must go through.
         */
        onOutOfAppPayloadAvailable?(payloads: OutOfAppDataPayload[]): void;
    }

    /**
     * Interface defining Zone Placements.
     */
    export interface ZonePlacements {
        [key: string]: string;
    }

    /**
     * Interface defining properties of a user's Device.
     */
    export interface DeviceInfo {
        /**
         * The unique device ID.
         */
        udid: string;
        /**
         * The device name.
         */
        deviceName: string;
        /**
         * The operating system name.
         */
        systemName: string;
        /**
         * The operating system version.
         */
        systemVersion: string;
        /**
         * The device model.
         */
        deviceModel: string;
        /**
         * The device screen width.
         */
        deviceWidth: string;
        /**
         * The device screen height.
         */
        deviceHeight: string;
        /**
         * The device screen density.
         */
        deviceScreenDensity: string;
        /**
         * The current device local.
         */
        deviceLocale: string;
        /**
         * The bundle ID.
         */
        bundleId: string;
        /**
         * The bundle version.
         */
        bundleVersion: string;
        /**
         * The current device timezone.
         */
        deviceTimezone: string;
        /**
         * If true, ad tracking is enabled for the device.
         */
        isAdTrackingEnabled: boolean;
    }

    /**
     * Interface defining a wrapper for an {@link AdZone}.
     */
    export interface AdZoneInfo {
        /**
         * The ad zone ID.
         */
        zoneId: string;
        /**
         * The ad zone component.
         */
        adZone: JSX.Element;
    }

    /**
     * Interface defining a keyword search result.
     */
    export interface KeywordSearchResult {
        /**
         * The payload ID associated to the provided list items.
         */
        payload_id: string;
        /**
         * The payload message.
         */
        payload_message?: string;
        /**
         * The payload image.
         */
        payload_image?: string;
        /**
         * The campaign ID.
         */
        campaign_id?: string;
        /**
         * The app ID.
         */
        app_id?: string;
        /**
         * Expiration time in seconds.
         */
        expire_seconds?: number;
        /**
         * The array of list items.
         */
        detailed_list_items: DetailedListItem[];
    }

    /**
     * The definition of a Detailed List Item.
     */
    export interface DetailedListItem {
        /**
         * The barcode of the product.
         */
        product_barcode: string;
        /**
         * The brand of the product.
         */
        product_brand: string;
        /**
         * The category of the product.
         */
        product_category: string;
        /**
         * The discount given for the product.
         */
        product_discount: string;
        /**
         * The image used for display of the product.
         */
        product_image: string;
        /**
         * The SKU of the product.
         */
        product_sku: string;
        /**
         * The name/title of the product.
         */
        product_title: string;
        /**
         * The tracking ID.
         */
        tracking_id?: string;
    }

    /**
     * The definition of an "out of app" data payload.
     */
    export interface OutOfAppDataPayload {
        /**
         * The payload ID associated to the provided list items.
         */
        payload_id: string;
        /**
         * The payload message.
         */
        payload_message?: string;
        /**
         * The payload image.
         */
        payload_image?: string;
        /**
         * The campaign ID.
         */
        campaign_id?: string;
        /**
         * The app ID.
         */
        app_id?: string;
        /**
         * Expiration time in seconds.
         */
        expire_seconds?: number;
        /**
         * The array of list items.
         */
        detailed_list_items: DetailedListItem[];
    }
}
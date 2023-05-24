export = AdadaptedJsSdk;
/**
 * The AdAdapted JS SDK class.
 */
declare class AdadaptedJsSdk {
    apiKey: string;
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
    lastSelectedATL: any;
    refreshAdZonesTimer: any;
    keywordIntercepts: any;
    keywordInterceptSearchValue: string;
    cycleAdTimers: { [key: string]: any };
    initialBodyOverflowStyle: string;
    scrollEventAbortController: any;
    onAdZonesRefreshed: () => void;
    onAddItemsTriggered: () => void;
    onPayloadsAvailable: () => void;
    /**
     * Gets the current session ID.
     * NOTE: This is only exposed for developer validation if needed.
     * @returns the current session ID.
     */
    getSessionId(): string;
    /**
     * Gets all available keyword intercepts.
     * NOTE: This is only exposed for developer validation if needed.
     * @returns the available keyword intercepts.
     */
    getAvailableKeywordIntercepts():
        | AdadaptedJsSdk.KeywordSearchTerm[]
        | undefined;
    /**
     * Initializes the session for the AdAdapted API and sets up the SDK.
     * @param props - The props used to initialize the SDK.
     * @returns a Promise of void.
     */
    initialize(props: AdadaptedJsSdk.InitializeProps): Promise<any>;
    /**
     * Creates all Ad Zone Info objects based on provided Ad Zones.
     * @param adZones - The object of available zones.
     * @returns the array of Ad Zone Info objects.
     */
    generateAdZones(adZones: { [key: number]: AdadaptedJsSdk.Zone }): void;
    /**
     * Searches through available ad keywords based on provided search term.
     * @param searchTerm - The search term used to match against available keyword intercepts.
     * @returns all keyword intercept terms that matched the search term.
     */
    performKeywordSearch(
        searchTerm: string
    ): AdadaptedJsSdk.KeywordSearchTerm[];
    /**
     * Client must trigger this method when a Keyword Intercept Term has been "selected" by the user.
     * This will ensure that the event is properly recorded and enable accuracy in client reports.
     * @param termId - The term ID to trigger the event for.
     */
    reportKeywordInterceptTermSelected(termId: string): void;
    /**
     * Client must trigger this method when a Keyword Intercept Term has been "presented" to the user.
     * All terms that satisfy a search don't have to be presented, so only provide term IDs for the
     * terms that ultimately get presented to the user.
     * NOTE: This will ensure that the event is properly recorded and enable accuracy in client reports.
     * @param termIds - The keyword intercept term IDs list to trigger the event for.
     */
    reportKeywordInterceptTermsPresented(termIds: string[]): void;
    /**
     * Client must trigger this method when items are added to list/cart as a result of a user clicking an ad with a payload.
     * This ensures proper click reporting for add-to-list ads, since clicks are not tracked instantly upon user click of these ad units.
     */
    acknowledgeAdded(): void;
    /**
     * Client must trigger this method when any items are added to the cart by the user for reports we provide to the client.
     * @param {string[]} itemNames - The items to report.
     * @param {string} cartId - The ID of the cart the items were placed within.
     */
    reportItemsAddedToCart(itemNames: string[], listName: string): void;
    /**
     * Client must trigger this method when any items are deleted from the cart by the user for reports we provide to the client.
     * @param {string[]} itemNames - The items to report.
     * @param {string} cartId - The ID of the cart the items were placed within.
     */
    reportItemsDeletedFromCart(itemNames: string[], listName: string): void;
    /**
     * Client must trigger this method when any items are added to a list for reports we provide to the client.
     * @param itemNames - The items to report.
     * @param listName - (optional) The list to associate the items with, if available.
     */
    reportItemsAddedToList(itemNames: string[], listName: string): void;
    /**
     * Client must trigger this method when any items are deleted from a list for reports we provide to the client.
     * @param itemNames - The items to report.
     * @param listName - (optional) The list the items are associated with, if available.
     */
    reportItemsDeletedFromList(itemNames: string[], listName: string): void;
    /**
     * Client must trigger this method when any items are crossed off a list for reports we provide to the client.
     * @param itemNames - The items to report.
     * @param listName - (optional) The list the items are associated with, if available.
     */
    reportItemsCrossedOffList(itemNames: string[], listName: string): void;
    /**
     * This method should be triggered when payloads have been delivered or rejected.
     * This method accepts a list of payloads to enable performing this action as a batch operation if desired.
     * @param payloadStatusList - The list of payload status objects to submit.
     */
    updatePayloadStatus(
        payloadStatusList: AdadaptedJsSdk.PayloadStatus[]
    ): void;
    /**
     * Method that can be triggered to update the Store ID if you are targeting ads by store.
     * NOTE: Use this method when a user has changed their focused on store.
     * @param newStoreId - The new store ID to use going forward.
     */
    updateStoreId(newStoreId: string): void;
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
         * The API key provided by the client.
         * NOTE: Supplied by AdAdapted to the client.
         */
        apiKey: string;
        /**
         * The unique ID used to identify the user. Client must provide this value.
         */
        advertiserId: string;
        /**
         * Allow ad retargeting.
         */
        allowRetargeting: boolean;
        /**
         * The unique bundle ID used to identify the user.
         */
        bundleId?: string;
        /**
         * The unique bundle version used to identify the user.
         */
        bundleVersion?: string;
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
         * Additional params that can be provided when initializing a session.
         */
        params?: InitializeParams;
        /**
         * Callback that gets triggered when the session/zones/ads data
         * gets refreshed and is now available for reference.
         */
        onAdZonesRefreshed?(): void;
        /**
         * Callback that gets triggered when "add to list" or "add to cart" item/items are clicked.
         * @param items - The array of items to add.
         */
        onAddItemsTriggered?(items: DetailedListItem[]): void;
        /**
         * Callback that gets triggered when user's "add to list" payloads have been retrieved.
         * @param payloads - All payloads the client must go through.
         */
        onPayloadsAvailable?(payloads: Payload[]): void;
    }

    /**
     * Interface defining additional params used when initializing a session.
     */
    export interface InitializeParams {
        /**
         * The ID of the store you would like to target ads for.
         */
        storeId: string;
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
     * The definition of a Keyword Search Term.
     */
    export interface KeywordSearchTerm {
        /**
         * The search term ID.
         */
        term_id: string;
        /**
         * The search term to validate a search string against.
         */
        term: string;
        /**
         * The display string a client can use to display in a list.
         */
        replacement: string;
        /**
         * The display priority of this item.
         * Compare this to other {@link KeywordSearchTerm} items to determine
         * the final priority order during display.
         * The lower the number, the higher the priority.
         */
        priority: number;
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
     * The definition of a data payload.
     */
    export interface Payload {
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
     * The definition of a payload status.
     */
    export interface PayloadStatus {
        /**
         * The payload ID.
         */
        payload_id: string;
        /**
         * The status being assigned to the payload.
         */
        status: "delivered" | "rejected";
    }

    /**
     * The definition of a zone.
     */
    export interface Zone {
        /**
         * The zone ID.
         */
        id: string;
        /**
         * ?
         */
        land_height: number;
        /**
         * ?
         */
        land_width: number;
        /**
         * ?
         */
        port_height: number;
        /**
         * ?
         */
        port_width: number;
        /**
         * The available ads.
         */
        ads: Ad[];
    }

    /**
     * The definition of an Ad.
     */
    export interface Ad {
        /**
         * The ad ID.
         */
        ad_id: string;
        /**
         * The impression ID.
         */
        impression_id: string;
        /**
         * The type of ad this is.
         */
        type: string;
        /**
         * How often the ad refreshes? Swaps out for another?
         * Length of time in seconds.
         */
        refresh_time: number;
        /**
         * The URL for the ad image to display.
         */
        creative_url: string;
        /**
         * The tracking pixel to include in the zone view for this ad?
         */
        tracking_html: string;
        /**
         * ?
         */
        action_path: string;
        /**
         * ?
         */
        action_type: AdActionType;
        /**
         * If true, the ad will be hidden after interaction.
         */
        hide_after_interaction: boolean;
        /**
         * ?
         */
        payload: AdPayload;
        /**
         * ?
         */
        popup: AdPopup;
    }

    /**
     * The definition of an Ad Popup.
     */
    export interface AdPopup {
        /**
         * ?
         */
        alt_close_btn: string;
        /**
         * ?
         */
        background_color: string;
        /**
         * ?
         */
        hide_banner: boolean;
        /**
         * ?
         */
        hide_browser_nav: boolean;
        /**
         * ?
         */
        hide_close_btn: boolean;
        /**
         * ?
         */
        text_color: string;
        /**
         * ?
         */
        title_text: string;
        /**
         * ?
         */
        type: string;
    }

    /**
     * The definition of an Ad Payload.
     */
    export interface AdPayload {
        /**
         * ?
         */
        detailed_list_items: DetailedListItem[];
    }

    /**
     * Enum defining the available ad action types.
     */
    export enum AdActionType {
        /**
         * Used for Add To List.
         */
        CONTENT = "c",
        /**
         * Used for opening URLs in an external browser.
         */
        EXTERNAL = "e",
        /**
         * Used for opening URLs in a web view within the app.
         * Works the same as {@link AdActionType.POPUP}.
         * NOTE: This one should probably be deprecated with the new
         *       platform redesign, since its not as obvious what it does.
         */
        LINK = "l",
        /**
         * Used for opening URLs in a web view within the app.
         * Works the same as {@link AdActionType.LINK}.
         */
        POPUP = "p",
        /**
         * Used for opening app store URLs in the app store.
         */
        APP = "a",
        /**
         * ?
         */
        NONE = "n",
    }
}

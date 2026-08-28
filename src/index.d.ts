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
    enablePayloads: boolean;
    enableKeywordIntercept: boolean;
    zonePlacements: any;
    apiEnv: string;
    listManagerApiEnv: string;
    payloadApiEnv: string;
    deviceOs: any;
    sessionId: any;
    lastSelectedATL: any;
    keywordIntercepts: any;
    keywordInterceptSearchValue: string;
    initialBodyOverflowStyle: string;
    scrollContainerId: string | undefined;
    deviceLocale: string | undefined;
    params: { [key: string]: any } | undefined;
    onAdZonesRefreshed: () => void;
    onAddItemsTriggered: (items: AdadaptedJsSdk.DetailedListItem[]) => void;
    onExternalContentAdClicked: (adId: string) => void;
    onPayloadsAvailable: (payloads: AdadaptedJsSdk.Payload[]) => void;
    onAdRetrieved: (zoneId: string, hasAd: boolean) => void;
    /**
     * Gets the current session ID.
     * NOTE: This is only exposed for developer validation if needed.
     * @returns the current session ID.
     */
    getSessionId(): string | undefined;
    /**
     * Gets all available keyword intercepts.
     * NOTE: This is only exposed for developer validation if needed.
     * @returns the available keyword intercepts.
     */
    getAvailableKeywordIntercepts():
        AdadaptedJsSdk.KeywordSearchTerm[] | undefined;
    /**
     * Initializes the session for the AdAdapted API and sets up the SDK.
     * @param props - The props used to initialize the SDK.
     * @returns a Promise of void.
     */
    initialize(props: AdadaptedJsSdk.InitializeProps): Promise<any>;
    /**
     * Reports that a recipe has been loaded using the provided context.
     * @param recipeContextId - The recipe context ID that was used for the recipe load.
     * @param recipContextZoneIds - All zone IDs used to load ads for the recipe context ID.
     */
    reportRecipeLoaded(
        recipeContextId: string,
        recipContextZoneIds: string[],
    ): void;
    /**
     * Searches through available ad keywords based on provided search term.
     * @param searchTerm - The search term used to match against available keyword intercepts.
     * @returns all keyword intercept terms that matched the search term.
     */
    performKeywordSearch(
        searchTerm: string,
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
    reportItemsAddedToList(itemNames: string[], listName?: string): void;
    /**
     * Client must trigger this method when any items are deleted from a list for reports we provide to the client.
     * @param itemNames - The items to report.
     * @param listName - (optional) The list the items are associated with, if available.
     */
    reportItemsDeletedFromList(itemNames: string[], listName?: string): void;
    /**
     * Client must trigger this method when any items are crossed off a list for reports we provide to the client.
     * @param itemNames - The items to report.
     * @param listName - (optional) The list the items are associated with, if available.
     */
    reportItemsCrossedOffList(itemNames: string[], listName?: string): void;
    /**
     * This method should be triggered when payloads have been delivered or rejected.
     * This method accepts a list of payloads to enable performing this action as a batch operation if desired.
     * @param payloadStatusList - The list of payload status objects to submit.
     */
    updatePayloadStatus(
        payloadStatusList: AdadaptedJsSdk.PayloadStatus[],
    ): void;
    /**
     * Method that can be triggered to update the Store ID if you are targeting ads by store.
     * NOTE: Use this method when a user has changed their focused on store.
     * @param newStoreId - The new store ID to use going forward.
     */
    updateStoreId(newStoreId: string): void;
    /**
     * Method that can be triggered to update the Recipe context ID.
     * NOTE: Use this method when a new recipe is being shown.
     * @param {string} newRecipeContextId - The new recipe context ID to use going forward.
     * @param {array} newRecipContextZoneIds - The new recipe context zone IDs to use going forward.
     */
    updateRecipeContextId(
        newRecipeContextId: string,
        newRecipContextZoneIds: string[],
    ): void;
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
         * Enables the ability to retrieve user payloads.
         */
        enablePayloads?: boolean;
        /**
         * Enables the ability to retrieve keyword intercepts.
         */
        enableKeywordIntercept?: boolean;
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
         * The ID of the element the ad zones scroll within, used to decide when a
         * zone is actually in front of the user. If an ID is not provided, zones are
         * measured against the browser viewport.
         *
         * NOTE: When an ID is given, a zone counts as on screen while it is within
         *       that element's visible box, which is not the same question as
         *       whether it is within the viewport. Supply this only for a container
         *       that is itself the scrolling region, and make sure it is an ancestor
         *       of every placement element - a zone outside it is never reported as
         *       visible at all, so it will never record an impression or refresh.
         */
        scrollContainerId?: string;
        /**
         * The API environment.
         * If undefined, defaults to production.
         */
        apiEnv?: "prod" | "dev";
        /**
         * The locale of the device.
         */
        deviceLocale?: string;
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
         * Callback that gets triggered when ads that represent external(non-app) content are clicked.
         * @param adId - The ID of the ad.
         */
        onExternalContentAdClicked?(adId: string): void;
        /**
         * Callback that gets triggered when user's "add to list" payloads have been retrieved.
         * @param payloads - All payloads the client must go through.
         */
        onPayloadsAvailable?(payloads: Payload[]): void;
        /**
         * Callback that gets triggered when a zone's ad request has resolved, told
         * one zone at a time as each answers on its own schedule.
         * @param zoneId - The ad zone the result is for.
         * @param hasAd - True if an ad is available for that zone.
         */
        onAdRetrieved?(zoneId: string, hasAd: boolean): void;
    }

    /**
     * Interface defining additional params used when initializing a session.
     */
    export interface InitializeParams {
        /**
         * The ID of the store you would like to target ads for.
         */
        storeId?: string;
        /**
         * The context ID of the recipe you would like to target ads for.
         */
        recipeContextId?: string;
        /**
         * The zone IDs that the recipe context will be applied to.
         */
        recipeContextZoneIds?: string[];
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
     * The definition of the ad zone data returned for a single ad request.
     */
    export interface Zone {
        /**
         * The ad to display within the zone. An ad with an empty {@link Ad.id} means
         * the API had nothing to serve, and only its refresh_time is meaningful.
         * Optional: a no-fill can also come back with no ad object at all, and the
         * SDK treats both the same way.
         */
        ad?: Ad;
        /**
         * The optimized height of the zone.
         */
        port_height: number;
        /**
         * The optimized width of the zone.
         */
        port_width: number;
    }

    /**
     * The available ad action types.
     * - "c"  add to list
     * - "e"  open a URL in a new tab
     * - "l"  open a URL in an in-page view
     * - "p"  open a URL in an in-page view, same behaviour as "l"
     * - "a"  an app store URL. NOTE: not handled - the SDK logs that it cannot
     *        action the type, reports nothing, and leaves the ad in place.
     * - "n"  no action
     * NOTE: Declared inside this namespace rather than at the top level of the
     *       file, because the `export =` on line 1 cannot coexist with another top
     *       level export - TypeScript rejects that with TS2309 in the consumer's
     *       build, and this repo's own skipLibCheck hides it.
     */
    export type AdActionType = "c" | "e" | "l" | "p" | "a" | "n";

    /**
     * The definition of an Ad.
     */
    export interface Ad {
        /**
         * The ad ID. An empty string means no ad was served.
         */
        id: string;
        /**
         * The impression ID.
         */
        impression_id: string;
        /**
         * How long, in seconds, the ad is displayed for before the SDK requests the
         * next ad for the zone. On a response with no ad, this is the backoff to
         * wait before asking again.
         */
        refresh_time: number;
        /**
         * The URL for the ad creative to display.
         */
        creative_url: string;
        /**
         * The URL the ad navigates to when interacted with. An empty string when the
         * ad's action type doesn't navigate anywhere.
         */
        action_path: string;
        /**
         * What interacting with the ad does.
         */
        action_type: AdActionType;
        /**
         * The items to add to a list or cart, for add-to-list ads.
         */
        /**
         * The items an "add to list" ad carries. Optional: the API does not send it
         * for every ad, and the SDK checks for it before reading it.
         */
        payload?: AdPayload;
        /**
         * The ID of the zone the ad was served for.
         * NOTE: Set by the SDK rather than the API, so every reported event can name
         *       its zone.
         */
        zone_id?: string;
    }

    /**
     * The definition of an Ad Payload.
     */
    export interface AdPayload {
        /**
         * The items to add to the user's list or cart.
         * NOTE: Optional, because the API sends an empty payload object for an ad
         *       that carries no items.
         */
        detailed_list_items?: DetailedListItem[];
    }
}

/**
 * Enum defining the available ad action types.
 */
// export enum AdActionType {
//     /**
//      * Used for Add To List.
//      */
//     CONTENT = "c",
//     /**
//      * Used for opening URLs in an external browser.
//      */
//     EXTERNAL = "e",
//     /**
//      * Used for opening URLs in a web view within the app.
//      * Works the same as {@link AdActionType.POPUP}.
//      * NOTE: This one should probably be deprecated with the new
//      *       platform redesign, since its not as obvious what it does.
//      */
//     LINK = "l",
//     /**
//      * Used for opening URLs in a web view within the app.
//      * Works the same as {@link AdActionType.LINK}.
//      */
//     POPUP = "p",
//     /**
//      * Used for opening app store URLs in the app store.
//      */
//     APP = "a",
//     /**
//      * ?
//      */
//     NONE = "n",
// }

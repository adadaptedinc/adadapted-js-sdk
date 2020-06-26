import * as React from "react";
import * as ReactDOM from "react-dom";
import * as adadaptedApiRequests from "./api/adadaptedApiRequests";
import { adadaptedApiTypes } from "./api/adadaptedApiTypes";
import { AdZone } from "./components/AdZone";
import { safeInvoke, getOperatingSystem, totalProperties } from "./util";
import {
    AdZoneInfo,
    InitializeProps,
    KeywordSearchResult,
    ZonePlacements,
} from "./types";

/**
 * Class that acts as the AdAdapted SDK for JS.
 */
namespace AdadaptedJsSdk {
    /**
     * The main content of the JS SDK.
     */
    export class Sdk {
        /**
         * The client app ID used to send to API endpoints.
         */
        private appId: string = "";
        /**
         * The device UUID used to send to API endpoints.
         */
        private deviceUUID: string = "";
        /**
         * The zone placements used to add the created ad zones to.
         */
        private zonePlacements: ZonePlacements | undefined;
        /**
         * The API environment to use when making API calls.
         */
        private apiEnv: ApiEnv;
        /**
         * The device operating system.
         */
        private deviceOs: DeviceOS | undefined;
        /**
         * The session ID used for the API to properly identify a user.
         */
        private sessionId: string | undefined;
        /**
         * All current Session/Ad info.
         * This info can be refreshed based on the set interval.
         */
        private sessionInfo: adadaptedApiTypes.models.AdSession | undefined;
        /**
         * The available ad zones.
         */
        private adZones: AdZoneInfo[] | undefined;
        /**
         * If provided, triggers when the overall session/zones/ads data is
         * refreshed and available for reference.
         */
        private onAdZonesRefreshed: () => void | undefined;
        /**
         * The current active "setTimeout" reference. This is needed so we
         * can reference this variable and clean up the timer when its no
         * longer needed so memory leaks do not occur.
         */
        private refreshAdZonesTimer: ReturnType<typeof setTimeout> | undefined;
        /**
         * The user input string provided by the client and used to return a
         * result of keyword intercept terms. This will always be the last
         * provided value.
         */
        private keywordInterceptSearchValue: string;
        /**
         * The current available keyword intercepts that can
         * be used when a search is provided by the user.
         */
        private keywordIntercepts:
            | adadaptedApiTypes.models.KeywordIntercepts
            | undefined;
        /**
         * If provided, triggers when an "add to list" item is
         * clicked in an ad zone or in-app popup.
         * @param items - The array of items to "add to list".
         */
        private onAddToListTriggered: (
            items: adadaptedApiTypes.models.DetailedListItem[]
        ) => void | undefined;

        /**
         * Gets the Session ID.
         * @returns the Session ID.
         */
        public getSessionId(): string | undefined {
            return this.sessionId;
        }

        /**
         * Gets the list of available Ad Zones.
         * @returns all available ad zones.
         */
        public getAdZones(): AdZoneInfo[] | undefined {
            return this.adZones;
        }

        /**
         * @inheritDoc
         */
        constructor() {
            this.apiEnv = ApiEnv.Prod;
            this.onAdZonesRefreshed = () => {
                // Defaulting to empty method.
            };
            this.onAddToListTriggered = () => {
                // Defaulting to empty method.
            };
            this.keywordInterceptSearchValue = "";

            this.initialize = this.initialize.bind(this);
            this.unmount = this.unmount.bind(this);
        }

        /**
         * Creates all Ad Zone Info objects based on provided Ad Zones.
         * @param adZones - The object of available zones.
         * @returns the array of Ad Zone Info objects.
         */
        private generateAdZones(adZones: {
            [key: number]: adadaptedApiTypes.models.Zone;
        }): AdZoneInfo[] {
            const adZoneInfoList: AdZoneInfo[] = [];

            for (const adZoneId in adZones) {
                if (adZones.hasOwnProperty(adZoneId)) {
                    adZoneInfoList.push({
                        zoneId: adZones[adZoneId].id,
                        adZone: (
                            <AdZone
                                key={adZoneId}
                                appId={this.appId}
                                sessionId={this.sessionId!}
                                udid={this.deviceUUID}
                                deviceOs={this.deviceOs!}
                                apiEnv={this.apiEnv}
                                adZoneData={adZones[adZoneId]}
                                onAddToListTriggered={(items) => {
                                    safeInvoke(
                                        this.onAddToListTriggered,
                                        items
                                    );
                                }}
                            />
                        ),
                    });
                }
            }

            return adZoneInfoList;
        }

        /**
         * Triggered when session data is initialized or refreshed. Creates
         * a timer based on the session data refresh value.
         */
        private onRefreshAdZones(): void {
            // Get the amount of time we will wait until a refresh occurs.
            // We are setting a minimum refresh time of 5 minutes, so if a
            // value provided by the API is lower, we don't refresh too often.
            const timerMs =
                this.sessionInfo!.polling_interval_ms >= 300000
                    ? this.sessionInfo!.polling_interval_ms
                    : 300000;

            this.refreshAdZonesTimer = setTimeout(() => {
                adadaptedApiRequests
                    .refreshSessionData(
                        {
                            aid: this.appId,
                            sid: this.sessionId!,
                            uid: this.deviceUUID,
                        },
                        this.deviceOs!,
                        this.apiEnv
                    )
                    .then((response) => {
                        this.sessionInfo = response.data;

                        // Render the Ad Zones.
                        this.renderAdZones(response.data.zones);

                        // Call the user defined callback indicating
                        // the session data has been refreshed.
                        this.onAdZonesRefreshed();

                        // Start the timer again based on the new session data.
                        this.onRefreshAdZones();
                    })
                    .catch((err) => {
                        console.error(err);

                        // Start the timer again so we can make another
                        // attempt to refresh the session data.
                        this.onRefreshAdZones();
                    });
            }, timerMs);
        }

        /**
         * Renders or updates the ad zone data.
         * @param adZonesData - All ad zone data needed for the zones.
         */
        private renderAdZones(adZonesData: {
            [key: number]: adadaptedApiTypes.models.Zone;
        }): void {
            if (
                this.zonePlacements !== undefined &&
                this.zonePlacements !== null &&
                totalProperties(this.zonePlacements) > 0
            ) {
                // The zone placement map was provided and contained
                // entries, so we can now generate the ad zones.
                this.adZones = this.generateAdZones(adZonesData);

                for (const adZone of this.adZones) {
                    const zonePlacementId = this.zonePlacements[adZone.zoneId];
                    const containerElement = document.getElementById(
                        zonePlacementId
                    );

                    if (zonePlacementId && containerElement) {
                        ReactDOM.render(adZone.adZone, containerElement);
                    }
                }
            }
        }

        /**
         * Trigger an API request to get all possible
         * keyword intercepts for the session.
         */
        private getKeywordIntercepts(): void {
            adadaptedApiRequests
                .getKeywordIntercepts(
                    {
                        aid: this.appId,
                        sid: this.sessionId!,
                        uid: this.deviceUUID,
                    },
                    this.deviceOs!,
                    this.apiEnv
                )
                .then((response) => {
                    this.keywordIntercepts = response.data;

                    this.performKeywordSearch("mil");
                });
        }

        /**
         * Gets the Keyword Intercept Term based on the provided term ID.
         * @param termId - The term ID to get the term object for.
         * @returns the term if it was found based on the provided term ID.
         */
        private getKeywordInterceptTerm(
            termId: string
        ): adadaptedApiTypes.models.KeywordSearchTerm | undefined {
            let term: adadaptedApiTypes.models.KeywordSearchTerm | undefined;

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
         * Gets the current unix timestamp.
         * @returns the current unix timestamp.
         */
        private getCurrentUnixTimestamp(): number {
            return Math.round(new Date().getTime() / 1000);
        }

        /**
         * Initializes the session for the AdAdapted API and sets up the SDK.
         * @param props - The props used to initialize the SDK.
         * @returns a Promise of void.
         */
        public initialize(props: InitializeProps): Promise<void> {
            return new Promise<void>((resolve, reject) => {
                // Verify required fields are provided before attempting to initialize the SDK.
                if (props.appId === undefined || props.appId === null) {
                    reject(
                        "App ID must be provided for the AdAdapted SDK to be initialized."
                    );
                } else if (
                    props.deviceUUID === undefined ||
                    props.deviceUUID === null
                ) {
                    reject(
                        "Device UUID must be provided for the AdAdapted SDK to be initialized."
                    );
                } else {
                    // Set the app ID.
                    this.appId = props.appId;

                    // Set the device UUID.
                    this.deviceUUID = props.deviceUUID;

                    // Set the zone placements provided by the client.
                    this.zonePlacements = props.zonePlacements;

                    // Set the API environment based on the provided override value.
                    // If the apiEnv value is not provided, production will be used as default.
                    if (props.apiEnv) {
                        this.apiEnv = props.apiEnv;
                    } else {
                        this.apiEnv = ApiEnv.Prod;
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

                    this.deviceOs =
                        getOperatingSystem() === "ios"
                            ? DeviceOS.IOS
                            : DeviceOS.ANDROID;

                    // Pass device info along with API call
                    adadaptedApiRequests
                        .initializeSession(
                            {
                                app_id: this.appId,
                                udid: this.deviceUUID,
                                device_os: this.deviceOs,
                            },
                            this.deviceOs,
                            this.apiEnv
                        )
                        .then((response) => {
                            this.sessionId = response.data.session_id;
                            this.sessionInfo = response.data;

                            // Render the Ad Zones.
                            this.renderAdZones(response.data.zones);

                            // Start the session data refresh timer.
                            this.onRefreshAdZones();

                            // Get all possible keyword intercept values.
                            // We don't need to wait for this to complete
                            // prior to resolving initialization of the SDK.
                            this.getKeywordIntercepts();

                            resolve();
                        })
                        .catch((err) => {
                            reject(err);
                        });
                }
            });
        }

        /**
         * Searches through available ad keywords based on provided search term.
         * @param searchTerm - The search term used to match against
         *      available keyword intercepts.
         * @returns all keyword intercept terms that matched the search term.
         */
        public performKeywordSearch(searchTerm: string): KeywordSearchResult[] {
            const finalResultListStartsWith: KeywordSearchResult[] = [];
            const finalResultListContains: KeywordSearchResult[] = [];

            this.keywordInterceptSearchValue = searchTerm;

            if (!this.sessionId) {
                console.error("AdAdapted SDK has not been initialized.");
            } else if (!this.keywordIntercepts) {
                console.error("No available keyword intercepts.");
            } else if (
                searchTerm &&
                searchTerm.trim() &&
                searchTerm.trim().length >=
                    this.keywordIntercepts.min_match_length
            ) {
                searchTerm = searchTerm.trim();

                const finalEventsList: adadaptedApiTypes.models.ReportedInterceptEvent[] = [];
                const currentTs = this.getCurrentUnixTimestamp();

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
                    } else if (
                        termObj.term
                            .toLowerCase()
                            .indexOf(searchTerm.toLowerCase()) !== -1
                    ) {
                        // If the term din't start with the search term, but
                        // still contains the search term, add it to the
                        // finalResultListContains list.
                        finalResultListContains.push(termObj);
                    }

                    if (
                        termObj.term
                            .toLowerCase()
                            .startsWith(searchTerm.toLowerCase()) ||
                        termObj.term
                            .toLowerCase()
                            .indexOf(searchTerm.toLowerCase()) !== -1
                    ) {
                        // Add the event to the list so we can report the
                        // "matched" event for this term.
                        finalEventsList.push({
                            term_id: termObj.term_id,
                            search_id: this.keywordIntercepts.search_id,
                            user_input: this.keywordInterceptSearchValue,
                            term: termObj.term,
                            event_type:
                                adadaptedApiTypes.models.ReportedEventType
                                    .MATCHED,
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
                        event_type:
                            adadaptedApiTypes.models.ReportedEventType
                                .NOT_MATCHED,
                        created_at: currentTs,
                    });
                }

                // Send up the "matched" event for the keyword search for
                // all terms that matched the users search.
                adadaptedApiRequests
                    .reportInterceptEvent(
                        {
                            app_id: this.appId,
                            udid: this.deviceUUID,
                            session_id: this.sessionId,
                            events: finalEventsList,
                        },
                        this.deviceOs!,
                        this.apiEnv
                    )
                    .then(() => {
                        // Do nothing with the response for now...
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
         * Client must trigger this method when a Keyword Intercept Term has
         * been "selected" by the user.
         * This will ensure that the event is properly recorded and enable
         * accuracy in client reports.
         * @param termId - The term ID to trigger the event for.
         */
        public reportKeywordInterceptTermSelected(termId: string): void {
            const termObj = this.getKeywordInterceptTerm(termId);

            if (!this.sessionId) {
                console.error("AdAdapted SDK has not been initialized.");
            } else if (!this.keywordIntercepts) {
                console.error("No available keyword intercepts.");
            } else if (!termId || !termObj) {
                console.error("Invalid term ID provided.");
            } else {
                adadaptedApiRequests
                    .reportInterceptEvent(
                        {
                            app_id: this.appId,
                            udid: this.deviceUUID,
                            session_id: this.sessionId,
                            events: [
                                {
                                    term_id: termObj.term_id,
                                    search_id: this.keywordIntercepts.search_id,
                                    user_input: this
                                        .keywordInterceptSearchValue,
                                    term: termObj.term,
                                    event_type:
                                        adadaptedApiTypes.models
                                            .ReportedEventType.SELECTED,
                                    created_at: this.getCurrentUnixTimestamp(),
                                },
                            ],
                        },
                        this.deviceOs!,
                        this.apiEnv
                    )
                    .then(() => {
                        // Do nothing with the response for now...
                    });
            }
        }

        /**
         * Client must trigger this method when a Keyword Intercept Term has
         * been "presented" to the user. All terms that satisfy a search don't
         * have to be presented, so only provide term IDs for the terms that
         * ultimately get presented to the user.
         * This will ensure that the event is properly recorded and enable
         * accuracy in client reports.
         * @param termIds - The term IDs list to trigger the event for.
         */
        public reportKeywordInterceptTermsPresented(termIds: string[]): void {
            const termObjs: adadaptedApiTypes.models.KeywordSearchTerm[] = [];

            for (const termId of termIds) {
                const termObj = this.getKeywordInterceptTerm(termId);

                if (termObj) {
                    termObjs.push(termObj);
                }
            }

            if (!this.sessionId) {
                console.error("AdAdapted SDK has not been initialized.");
            } else if (!this.keywordIntercepts) {
                console.error("No available keyword intercepts.");
            } else if (
                !termIds ||
                termIds.length === 0 ||
                termObjs.length === 0
            ) {
                console.error("Invalid or empty terms ID list provided.");
            } else {
                const termEvents: adadaptedApiTypes.models.ReportedInterceptEvent[] = [];
                const currentTs = this.getCurrentUnixTimestamp();

                for (const termObj of termObjs) {
                    termEvents.push({
                        term_id: termObj.term_id,
                        search_id: this.keywordIntercepts.search_id,
                        user_input: this.keywordInterceptSearchValue,
                        term: termObj.term,
                        event_type:
                            adadaptedApiTypes.models.ReportedEventType
                                .PRESENTED,
                        created_at: currentTs,
                    });
                }

                adadaptedApiRequests
                    .reportInterceptEvent(
                        {
                            app_id: this.appId,
                            udid: this.deviceUUID,
                            session_id: this.sessionId,
                            events: termEvents,
                        },
                        this.deviceOs!,
                        this.apiEnv
                    )
                    .then(() => {
                        // Do nothing with the response for now...
                    });
            }
        }

        /**
         * Performs all clean up tasks for the SDK. Call this method when
         * the component that references this SDK will "unmount", otherwise you
         * can experience memory leaks.
         */
        public unmount(): void {
            if (this.refreshAdZonesTimer) {
                clearTimeout(this.refreshAdZonesTimer);
            }
        }
    }

    /**
     * Enum representing possible device operating systems.
     */
    export enum DeviceOS {
        /**
         * Represents the Android operating system.
         */
        ANDROID = "android",
        /**
         * Represents the iOS operating system.
         */
        IOS = "ios",
    }

    /**
     * Enum defining the different API environments.
     */
    export enum ApiEnv {
        /**
         * The production API environment.
         */
        Prod = "https://ads.adadapted.com",
        /**
         * The development API environment.
         */
        Dev = "https://sandbox.adadapted.com",
        /**
         * Used only for unit testing/mocking data.
         */
        Mock = "MOCK_DATA",
    }
}

module.exports = AdadaptedJsSdk;

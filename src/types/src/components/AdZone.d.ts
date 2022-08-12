/**
 * Component for creating an {@link AdZone}.
 * @module
 */
import * as React from "react";
import { DetailedListItem, Zone } from "../api/adadaptedApiTypes";
import { ApiEnv, DeviceOS } from "../types";
/**
 * Props interface for {@link AdZone}.
 */
interface Props {
    /**
     * The app ID.
     */
    appId: string;
    /**
     * The session ID.
     */
    sessionId: string;
    /**
     * The UDID.
     */
    udid: string;
    /**
     * The device OS used for API requests.
     */
    deviceOs: DeviceOS;
    /**
     * The API environment to use when making an API request.
     */
    apiEnv: ApiEnv;
    /**
     * The ad zone data.
     */
    adZoneData: Zone;
    /**
     * Callback that gets triggered when an "add to list" item/items are clicked.
     * @param items - The array of items to "add to list".
     */
    onAddToListTriggered?(items: DetailedListItem[]): void;
}
/**
 * State interface for {@link AdZone}.
 */
interface State {
    /**
     * Tracks the current ad index being shown.
     */
    adIndexShown: number;
    /**
     * If true, the ad popup(if available) is open.
     */
    isAdPopupOpen: boolean;
}
/**
 * Creates the AdZone component.
 */
export declare class AdZone extends React.Component<Props, State> {
    /**
     * Timer used for cycling through ads in the zone
     * based on the ad "refresh time" for each ad.
     */
    private cycleAdTimer;
    /**
     * @inheritDoc
     */
    constructor(props: Props, context?: any);
    /**
     * @inheritDoc
     */
    componentDidMount(): void;
    /**
     * @inheritDoc
     */
    componentWillUnmount(): void;
    /**
     * @inheritDoc
     */
    render(): JSX.Element;
    /**
     * Triggers when the user selects the ad zone.
     */
    private onAdZoneSelected;
    /**
     * Triggered when we need to report an ad event to the API.
     * @param currentAd - The ad to send an event for.
     * @param eventType - The event type for the reported event.
     */
    private triggerReportAdEvent;
    /**
     * Generates a new timer for cycling to the next ad.
     * @param timerLength - The length of time(in milliseconds) to initialize
     *      the timer with.
     */
    private createAdTimer;
    /**
     * Cycles to the next ad to display in the current available sequence of ads.
     */
    private cycleDisplayedAd;
    /**
     * Performs all ad initialization tasks when a new ad is being displayed.
     */
    private initializeAd;
}
export {};

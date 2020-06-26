import * as React from "react";
import { adadaptedApiTypes } from "./api/adadaptedApiTypes";

/**
 * A type that can be null or undefined.
 */
export type nil = null | undefined;

/**
 * A simple pair of typed value and label.
 */
export interface ValueLabelPair<T> {
    /**
     * The value of an item.
     */
    value: T;
    /**
     * The display label for an item.
     */
    label: string;
}

/**
 * Generic interface for a simple object used as a map of type T, keyed by string.
 */
export interface ObjectMap<T = any> {
    [name: string]: T;
}

/**
 * Generic interface for a simple object used as a map of type T, keyed by number.
 */
export interface ObjectMapByNumber<T = any> {
    [name: number]: T;
}

/**
 * Extracts keys of type T that are assignable to string.
 * (omits number and symbol key types).
 */
export type StringKeyOf<T> = Extract<keyof T, string>;

/**
 * Remove types from T that are not assignable to U
 */
export type Filter<T, U> = T extends U ? T : never;

/**
 * Removes null from type T.
 */
export type NonNull<T> = Exclude<T, null>;

/**
 * Removes undefined from type T.
 */
export type NonUndefined<T> = Exclude<T, undefined>;

/**
 * Removes null and undefined from type T.
 */
export type NonNil<T> = Exclude<T, nil>;

/**
 * Utility type that modifies an object type to allow `undefined` on all properties.
 */
export type WithUndefinedProperties<T extends {}> = {
    [P in keyof T]: T[P] | undefined;
};

/**
 * Extracts the type of a React component's props from the React component type T.
 * Usage example-react: type MyComponentProps = ExtractReactPropsType<typeof MyComponent>;
 */
export type ExtractReactPropsType<T> = T extends React.ComponentType<infer P>
    ? P
    : T extends React.Component<infer P>
    ? P
    : never;

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
    /**
     * Represents the Web operating system.
     */
    WEB = "web",
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

/**
 * Interface defining inputs to the {@link Sdk.initialize} method.
 */
export interface InitializeProps {
    /**
     * The app ID provided by the client.
     */
    appId: string;
    /**
     * The UUID for the device. Client must provide this value.
     */
    deviceUUID: string;
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
    apiEnv?: ApiEnv;
    /**
     * Callback that gets triggered when the session/zones/ads data
     * gets refreshed and is now available for reference.
     */
    onAdZonesRefreshed?(): void;
    /**
     * Callback that gets triggered when an "add to list" item/items are clicked.
     * @param items - The array of items to "add to list".
     */
    onAddToListTriggered?(
        items: adadaptedApiTypes.models.DetailedListItem[]
    ): void;
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
 * This is primarily used to export an interface directly from
 * {@link AdadaptedJsSdk} so the interaction with the SDK all be
 * done through this namespace.
 */
export interface KeywordSearchResult
    extends adadaptedApiTypes.models.KeywordSearchTerm {}

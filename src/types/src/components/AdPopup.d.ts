/**
 * Component for creating an {@link AdPopup}.
 * @module
 */
import * as React from "react";
import { Ad, DetailedListItem } from "../api/adadaptedApiTypes";
/**
 * Props interface for {@link AdPopup}.
 */
interface Props {
    /**
     * The add to display in the popup.
     */
    ad: Ad;
    /**
     * Triggered when the popup is closing.
     */
    onClose?(): void;
    /**
     * Triggered when an ad circular item is clicked and
     * the item should be "added to list".
     * @param item - The item to add to list.
     */
    onAddToListItemClicked(item: DetailedListItem): void;
}
/**
 * State interface for {@link AdPopup}.
 */
interface State {
    /**
     * If true, the webview is loading a new page.
     */
    isPageLoading: boolean;
    /**
     * if true, we need to account for "safe area" padding for the device.
     */
    isSafeAreaPaddingRequired: boolean;
}
/**
 * Creates the AdPopup component.
 */
export declare class AdPopup extends React.Component<Props, State> {
    /**
     * The container that the portal gets placed within.
     */
    private readonly adPortalContainer;
    /**
     * @inheritDoc
     */
    constructor(props: Props, context?: any);
    /**
     * @inheritDoc
     */
    componentWillUnmount(): void;
    /**
     * This is responsible for hooking into the circular ad JS and getting the item data.
     */
    componentDidMount(): void;
    /**
     * @inheritDoc
     */
    render(): JSX.Element;
}
export {};

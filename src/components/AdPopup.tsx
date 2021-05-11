/**
 * Component for creating an {@link AdPopup}.
 * @module
 */
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Ad, DetailedListItem } from "../api/adadaptedApiTypes";
import { needsSafeAreaPadding, safeInvoke } from "../util";

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
export class AdPopup extends React.Component<Props, State> {
    /**
     * The container that the portal gets placed within.
     */
    private readonly adPortalContainer: HTMLDivElement;

    /**
     * @inheritDoc
     */
    constructor(props: Props, context?: any) {
        super(props, context);

        this.adPortalContainer = document.createElement("div");
        this.adPortalContainer.id = "adDisplayPortal";

        document.body.append(this.adPortalContainer);
        document.body.style.overflow = "hidden";

        this.state = {
            isPageLoading: true,
            isSafeAreaPaddingRequired: needsSafeAreaPadding(),
        };
    }

    /**
     * @inheritDoc
     */
    public componentWillUnmount(): void {
        document.body.removeChild(this.adPortalContainer);
        document.body.style.overflow = "auto";
    }

    /**
     * @inheritDoc
     */
    public render(): JSX.Element {
        let safeAreaHeaderPaddingTop = "0";
        let safeAreaIframeMarginTop = "40px";
        let safeAreaFooterPaddingBottom = "0";
        let adPopupIframeHeight = "calc(100% - 100px)";

        if (this.state.isSafeAreaPaddingRequired) {
            safeAreaHeaderPaddingTop = "env(safe-area-inset-top)";
            safeAreaIframeMarginTop = "calc(40px + env(safe-area-inset-top))";
            adPopupIframeHeight =
                "calc(100% - 100px - env(safe-area-inset-top) - env(safe-area-inset-bottom))";
            safeAreaFooterPaddingBottom = "env(safe-area-inset-bottom)";
        }

        return ReactDOM.createPortal(
            <div
                className="AdPopup"
                style={{
                    position: "fixed",
                    width: "100%",
                    height: "100%",
                    top: 0,
                    left: 0,
                    backgroundColor: "#f0f0f0",
                    zIndex: 999999997,
                }}
            >
                <div
                    className="AdPopup__header"
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        width: "100%",
                        height: "39px", // height + border bottom = 40px
                        borderBottom: "1px solid #6c757d",
                        textTransform: "none",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        paddingTop: `${safeAreaHeaderPaddingTop}`,
                        zIndex: 999999999,
                    }}
                >
                    <div
                        className="AdPopup__header-title"
                        style={{
                            flex: "1 1 auto",
                            fontSize: "16px",
                            fontWeight: "bold",
                            margin: "10px",
                            color: "#333333",
                        }}
                    >
                        {this.props.ad.popup.title_text}
                    </div>
                    {this.state.isPageLoading ? (
                        <div
                            className="AdPopup__header-loading-indicator"
                            style={{
                                flex: "0 0 auto",
                                marginLeft: "20px",
                                fontSize: "12px",
                                margin: "10px",
                                color: "#888888",
                            }}
                        >
                            Loading...
                        </div>
                    ) : undefined}
                </div>
                <iframe
                    className="AdPopup__content"
                    src={this.props.ad.action_path}
                    scrolling="yes"
                    style={{
                        height: 0,
                        width: 0,
                        maxHeight: `${adPopupIframeHeight}`,
                        maxWidth: "100%",
                        minHeight: `${adPopupIframeHeight}`,
                        minWidth: "100%",
                        backgroundColor: "#ffffff",
                        border: "none",
                        marginTop: `${safeAreaIframeMarginTop}`,
                        zIndex: 999999998,
                        WebkitOverflowScrolling: "touch",
                    }}
                    onLoad={() => {
                        this.setState({
                            isPageLoading: false,
                        });
                    }}
                />
                <div
                    className="AdPopup__footer"
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                        height: "59px", // height + border top = 60px
                        borderTop: "1px solid #6c757d",
                        backgroundColor: "#f0f0f0",
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        paddingBottom: `${safeAreaFooterPaddingBottom}`,
                        zIndex: 999999999,
                    }}
                >
                    <div
                        className="close-button"
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: "#6c757d",
                            height: "48px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            margin: "5px",
                        }}
                        onClick={() => {
                            safeInvoke(this.props.onClose);
                        }}
                    >
                        <div
                            className="button-label"
                            style={{
                                color: "#ffffff",
                                margin: "10px 80px",
                                fontSize: "14px",
                            }}
                        >
                            Close
                        </div>
                    </div>
                </div>
            </div>,
            this.adPortalContainer
        );
    }
}

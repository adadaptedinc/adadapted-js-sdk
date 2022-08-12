/**
 * Defines the {@link App} class.
 * @module
 */
import * as React from "react";
import "./App.scss";
import AdadaptedJsSdk from "@adadapted/js-sdk";

// TODO: FIX THIS. Currently no Typescript definitions are being created due to
//  the way we have to export the AdadaptedJsSdk with "module.exports" rather
//  than just using "export" on the namespace.
// const AdadaptedJsSdk = require("../../node_modules/@adadapted/js-sdk/dist/adadapted-js-sdk.amd");

/**
 * Props interface for {@link App}.
 */
interface Props {}

/**
 * State interface for {@link App}.
 */
interface State {
    /**
     * The color of the react logo.
     */
    reactLogoColor: string;
    /**
     * The session ID.
     */
    sessionId: string | undefined;
    /**
     * The Ad Zone Info list.
     */
    // @ts-ignore
    adZoneInfoList: AdadaptedJsSdk.AdZoneInfo[] | undefined;
    /**
     * The test search term value.
     */
    searchValue: string;
    /**
     * Standard products search result item list.
     */
    standardProductSearchResultItemList: string[];
    /**
     * AdAdapted SDK Keyword Search result item list.
     */
    // @ts-ignore
    aasdkSearchResultItemList: AdadaptedJsSdk.KeywordSearchResult[];
    /**
     * The selected item list.
     */
    selectedItemList: string[];
}

/**
 * Creates the main component for the app.
 */
export class App extends React.Component<Props, State> {
    /**
     * The AdadaptedJsSdk instance.
     */
    // @ts-ignore
    private readonly aaSdk: AdadaptedJsSdk.Sdk;

    /**
     * @inheritDoc
     */
    constructor(props: Props, context?: any) {
        super(props, context);

        // Assign a reference to the SDK.
        this.aaSdk = new AdadaptedJsSdk.Sdk();

        // Initialize the state.
        this.state = {
            reactLogoColor: "#00d8ff",
            sessionId: undefined,
            adZoneInfoList: undefined,
            searchValue: "",
            standardProductSearchResultItemList: [],
            aasdkSearchResultItemList: [],
            selectedItemList: [],
        };
    }

    /**
     * @inheritDoc
     */
    public componentDidMount(): void {
        this.aaSdk
            .initialize({
                appId: "NWVJMTVHZJQ5YZRI",
                apiEnv: AdadaptedJsSdk.ApiEnv.Dev,
                onAdZonesRefreshed: () => {
                    this.setState({
                        sessionId: this.aaSdk.getSessionId(),
                        adZoneInfoList: this.aaSdk.getAdZones(),
                    });
                },
                // @ts-ignore
                onAddToListTriggered: (items) => {
                    // Demonstrate adding all provided items to the
                    // client side list.
                    for (const item of items) {
                        this.selectItem({
                            itemName: item.product_title,
                        });
                    }
                },
            })
            .then(() => {
                this.setState({
                    sessionId: this.aaSdk.getSessionId(),
                    adZoneInfoList: this.aaSdk.getAdZones(),
                });
            })
            // @ts-ignore
            .catch((err) => {
                console.error(err);
            });
    }

    /**
     * @inheritDoc
     */
    public componentWillUnmount(): void {
        // Unmount the SDK.
        if (this.aaSdk) {
            this.aaSdk.unmount();
        }
    }

    /**
     * @inheritDoc
     */
    public render(): JSX.Element {
        return (
            <div className="App">
                <div className="color-picker-container">
                    <div className="color-picker-label">Choose a color for the React logo:&nbsp;&nbsp;</div>
                    <input
                        className="color-picker"
                        type="color"
                        value={this.state.reactLogoColor}
                        onChange={(event) => {
                            this.setState({
                                reactLogoColor: event.target.value,
                            });
                        }}
                    />
                </div>
                <div className="container">
                    <span
                        className="react-logo-loop-1"
                        style={{
                            borderColor: `${this.state.reactLogoColor}`,
                        }}
                    >
                        <span
                            className="react-logo-loop-2"
                            style={{
                                borderColor: `${this.state.reactLogoColor}`,
                            }}
                        />
                        <span
                            className="react-logo-loop-3"
                            style={{
                                borderColor: `${this.state.reactLogoColor}`,
                            }}
                        />
                        <span
                            className="nucleo"
                            style={{
                                backgroundColor: `${this.state.reactLogoColor}`,
                            }}
                        />
                    </span>
                </div>
            </div>
        );
    }

    /**
     * Adds the selected item to the selected item list.
     * @param selectedItem - The item to select.
     */
    private selectItem(selectedItem: SelectedItem): void {
        if (selectedItem.item) {
            // Report up the "selected" event to the AA SDK.
            this.aaSdk.reportKeywordInterceptTermSelected(selectedItem.item.term_id);
        }

        this.setState((prevState) => {
            const finalList = prevState.selectedItemList;

            if (selectedItem.item) {
                finalList.push(selectedItem.item.replacement);
            } else if (selectedItem.itemName) {
                finalList.push(selectedItem.itemName);
            }

            return {
                selectedItemList: finalList,
            };
        });
    }
}

/**
 * Interfaced used to pass in an item to the {@link App.selectItem} method.
 * Only one of the two properties should be provided.
 */
interface SelectedItem {
    /**
     * The object containing a keyword search item.
     */
    // @ts-ignore
    item?: AdadaptedJsSdk.KeywordSearchResult;
    /**
     * A standard product name.
     */
    itemName?: string;
}

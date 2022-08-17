/**
 * Defines the {@link App} functional component.
 * @module
 */
import React, { FC, ReactElement, useState, useEffect } from "react";
import "./App.scss";
import AdadaptedJsSdk from "@adadapted/js-sdk/src_new";
import TextField from "@mui/material/TextField";
import { ShoppingCartOutlined } from "@mui/icons-material";
import { Badge, Button, Drawer, IconButton } from "@mui/material";

/**
 * Interface defining the structure of an item.
 */
interface Item {
    /**
     * The ID of the item.
     */
    id: string;
    /**
     * The item name.
     */
    name: string;
    /**
     * The quantity of the item in the cart.
     */
    quantity: number;
}

/**
 * Interface defining some SDK setup info.
 */
interface SdkDetails {
    /**
     * The API environment to connect to.
     */
    apiEnv: "dev" | "prod";
    /**
     * The ID of the App the SDK connection is for.
     */
    appId: string;
    /**
     * The zone placement mappings array.
     */
    zonePlacements: ZoneDetails[];
}

/**
 * Interface defining the mapping of the zone to the element that houses the zone within the app.
 */
interface ZoneDetails {
    /**
     * The ID of the zone provided by AdAdapted.
     */
    zoneId: string;
    /**
     * The width of the zone.
     */
    width: number;
    /**
     * The height of the zone.
     */
    height: number;
}

/**
 * Demo App.
 * @returns the App component.
 */
export const App: FC = (): ReactElement => {
    const sdkAppDetails: SdkDetails = {
        apiEnv: "dev",
        appId: "NWY0NTM2YZDMMDQ0", // Android Test Sdk
        zonePlacements: [
            {
                zoneId: "101930",
                width: 320,
                height: 100,
            },
        ],
    };

    // const sdkAppDetails: SdkDetails = {
    //     apiEnv: "dev",
    //     appId: "NTGXMTA3ZWJJYWZL", // BigOven - Android
    //     zonePlacements: [
    //         {
    //             zoneId: "100862",
    //             width: 320,
    //             height: 210,
    //         },
    //         {
    //             zoneId: "100863",
    //             width: 160,
    //             height: 300,
    //         },
    //         {
    //             zoneId: "100864",
    //             width: 320,
    //             height: 90,
    //         },
    //     ],
    // };

    // const sdkAppDetails: SdkDetails = {
    //     apiEnv: "prod",
    //     appId: "NWMWZWUYNTJKMDQ1", // Any.do - Android
    //     zonePlacements: [
    //         {
    //             zoneId: "100908",
    //             width: 320,
    //             height: 100,
    //         },
    //         {
    //             zoneId: "100909",
    //             width: 320,
    //             height: 100,
    //         },
    //     ],
    // };

    const sdk = new AdadaptedJsSdk();

    let keywordSearchTimer: ReturnType<typeof setTimeout> | undefined;

    const [jsSdk] = useState(sdk);
    const [keywordSearchResults, setKeywordSearchResults] = useState<AdadaptedJsSdk.KeywordSearchTerm[]>([]);
    const [userListItems, setUserListItems] = useState<Item[]>([]);
    const [userCartItems, setUserCartItems] = useState<Item[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    useEffect(() => {
        const zonePlacements: { [key: string]: string } = {};

        for (let x = 0; x < sdkAppDetails.zonePlacements.length; x++) {
            zonePlacements[sdkAppDetails.zonePlacements[x].zoneId] = `zone${x + 1}`;
        }

        jsSdk
            .initialize({
                appId: sdkAppDetails.appId,
                advertiserId: "JS_SDK_TEST_USER_UDID",
                allowRetargeting: true,
                bundleId: "JS_SDK_TEST_APP",
                bundleVersion: "1.0.0",
                apiEnv: sdkAppDetails.apiEnv,
                zonePlacements,
                onAddToListTriggered: (items) => {
                    console.log("Items to Add", items);
                },
                onPayloadsAvailable: (payloads) => {
                    console.log("Available Payloads", payloads);
                },
            })
            .then(() => {
                console.log("SDK Session ID:", jsSdk.getSessionId());
            })
            .catch((err) => {
                console.error(err);
            });
    }, []);

    useEffect(() => {
        if (keywordSearchResults.length) {
            const termIds: string[] = [];

            for (const result of keywordSearchResults) {
                termIds.push(result.term_id);
            }

            jsSdk.reportKeywordInterceptTermsPresented(termIds);
        }
    }, [keywordSearchResults]);

    /**
     * Handles getting the total count of items in the cart.
     */
    const getCartItemCount = (): number => {
        let itemCount = 0;

        for (const item of userCartItems) {
            itemCount += item.quantity;
        }

        return itemCount;
    };

    // Returned JSX.
    return (
        <div className="App">
            <div className="page-header">
                <div className="site-title">AdAdapted JS Test App</div>
                <div className="cart-icon-container">
                    <IconButton
                        onClick={() => {
                            setIsCartOpen(true);
                        }}
                    >
                        <Badge badgeContent={getCartItemCount()} color="primary">
                            <ShoppingCartOutlined className="cart-icon" />
                        </Badge>
                    </IconButton>
                </div>
            </div>
            <div className="page-body">
                <div className="main-view">
                    <div className="keyword-intercept-search">
                        <TextField
                            className="item-search-input"
                            label="Item Search"
                            variant="outlined"
                            onChange={(event) => {
                                clearTimeout(keywordSearchTimer);

                                keywordSearchTimer = setTimeout(() => {
                                    setKeywordSearchResults(jsSdk.performKeywordSearch(event.target.value));
                                }, 1000);
                            }}
                        />
                        <div className="keyword-search-results">
                            {keywordSearchResults.map((keywordResult, idx) => {
                                return (
                                    <div key={`keyword-search-result-${idx}`}>
                                        <div className="item-name">{keywordResult.replacement}</div>
                                        <div className="item-options">
                                            <Button
                                                className="add-to-cart-button"
                                                onClick={() => {
                                                    setUserCartItems((prevUserCartItems) => {
                                                        const finalCartItems: Item[] = [];
                                                        let itemFound = false;

                                                        for (const cartItem of prevUserCartItems) {
                                                            if (cartItem.id === keywordResult.term_id) {
                                                                finalCartItems.push({
                                                                    ...cartItem,
                                                                    quantity: cartItem.quantity + 1,
                                                                });

                                                                itemFound = true;
                                                            } else {
                                                                finalCartItems.push(cartItem);
                                                            }
                                                        }

                                                        if (!itemFound) {
                                                            finalCartItems.push({
                                                                id: keywordResult.term_id,
                                                                name: keywordResult.replacement,
                                                                quantity: 1,
                                                            });
                                                        }

                                                        jsSdk.reportKeywordInterceptTermSelected(keywordResult.term_id);

                                                        return finalCartItems;
                                                    });
                                                }}
                                            >
                                                Add to Cart
                                            </Button>
                                            <Button
                                                className="add-to-list-button"
                                                onClick={() => {
                                                    setUserListItems((prevUserListItems) => {
                                                        const finalListItems: Item[] = [];
                                                        let itemFound = false;

                                                        for (const listItem of prevUserListItems) {
                                                            if (listItem.id === keywordResult.term_id) {
                                                                finalListItems.push({
                                                                    ...listItem,
                                                                    quantity: listItem.quantity + 1,
                                                                });

                                                                itemFound = true;
                                                            } else {
                                                                finalListItems.push(listItem);
                                                            }
                                                        }

                                                        if (!itemFound) {
                                                            finalListItems.push({
                                                                id: keywordResult.term_id,
                                                                name: keywordResult.replacement,
                                                                quantity: 1,
                                                            });
                                                        }

                                                        jsSdk.reportKeywordInterceptTermSelected(keywordResult.term_id);

                                                        return finalListItems;
                                                    });
                                                }}
                                            >
                                                Add to List
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="user-list">
                        {userListItems.map((listItem, idx) => {
                            return (
                                <div key={`user-list-${idx}`}>
                                    <div>{listItem.id}</div>
                                    <div>{listItem.name}</div>
                                    <div>{listItem.quantity}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="ad-units">
                    {sdkAppDetails.zonePlacements.map((zone, idx) => {
                        return (
                            <div
                                key={`zone-placement-${idx}`}
                                id={`zone${idx + 1}`}
                                className="ad-zone"
                                style={{ width: `${zone.width}px`, height: `${zone.height}px` }}
                            />
                        );
                    })}
                </div>
                <Drawer
                    anchor={"right"}
                    open={isCartOpen}
                    onClose={() => {
                        setIsCartOpen(false);
                    }}
                >
                    <div className="user-cart">
                        {userCartItems.map((cartItem, idx) => {
                            return (
                                <div key={`user-cart-${idx}`}>
                                    <div>{cartItem.id}</div>
                                    <div>{cartItem.name}</div>
                                    <div>{cartItem.quantity}</div>
                                </div>
                            );
                        })}
                    </div>
                </Drawer>
            </div>
        </div>
    );
};

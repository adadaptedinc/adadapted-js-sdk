/**
 * Defines the {@link App} functional component.
 * @module
 */
import React, { FC, ReactElement, useState, useEffect } from "react";
import "./App.scss";
import AdadaptedJsSdk from "@adadapted/js-sdk/src_new";
import TextField from "@mui/material/TextField";
import {
    ShoppingCartOutlined,
    RemoveCircleOutline,
    CheckCircleOutline,
    DeleteSweepOutlined,
} from "@mui/icons-material";
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
    /**
     * If true, the item is crossed off the list.
     */
    isCrossedOff?: boolean;
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

    /**
     * Handles crossing an item off the user's shopping list.
     * @param idx - The index of the item in the list.
     */
    const crossItemOffList = (idx: number) => {
        jsSdk.reportItemsCrossedOffList([userListItems[idx].name], "Shopping List");

        setUserListItems((prevUserListItems) => {
            const updatedUserListItems = [...prevUserListItems];

            updatedUserListItems[idx].isCrossedOff = true;

            return updatedUserListItems;
        });
    };

    /**
     * Handles removing an item from the user's shopping list.
     * @param idx - The index of the item in the list.
     */
    const removeItemFromList = (idx: number) => {
        jsSdk.reportItemsDeletedFromList([userListItems[idx].name], "Shopping List");

        setUserListItems((prevUserListItems) => {
            let updatedUserListItems = [...prevUserListItems];

            updatedUserListItems.splice(idx, 1);

            return updatedUserListItems;
        });
    };

    /**
     * Handles removing all items from the user's shopping list.
     */
    const removeAllItemsFromList = () => {
        const itemNames: string[] = [];

        for (const listItem of userListItems) {
            itemNames.push(listItem.name);
        }

        jsSdk.reportItemsDeletedFromList(itemNames, "Shopping List");

        setUserListItems([]);
    };

    /**
     * Handles removing an item from the user's cart.
     * @param idx - The index of the item in the cart.
     */
    const removeItemFromCart = (idx: number) => {
        jsSdk.reportItemsDeletedFromList([userCartItems[idx].name], "Cart");

        setUserCartItems((prevUserCartItems) => {
            let updatedUserCartItems = [...prevUserCartItems];

            updatedUserCartItems.splice(idx, 1);

            return updatedUserCartItems;
        });
    };

    /**
     * Handles removing all items from the user's cart.
     */
    const removeAllItemsFromCart = () => {
        const itemNames: string[] = [];

        for (const cartItem of userCartItems) {
            itemNames.push(cartItem.name);
        }

        jsSdk.reportItemsDeletedFromList(itemNames, "Cart");

        setUserCartItems([]);
    };

    // Returned JSX.
    return (
        <div className="App">
            <div className="page-header">
                <div className="site-title-container">
                    <div className="aa-logo">
                        <svg viewBox="0 0 122 153" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect
                                y="139.752"
                                width="110.774"
                                height="26.3061"
                                transform="rotate(-61.58 0 139.752)"
                                fill="#9DD0EC"
                            />
                            <rect
                                x="69.2412"
                                y="42.4009"
                                width="110.691"
                                height="26.3061"
                                transform="rotate(61.5811 69.2412 42.4009)"
                                fill="#9DD0EC"
                            />
                            <path d="M60.96 27L72.6513 48.75H49.2686L60.96 27Z" fill="#9DD0EC" />
                            <rect
                                y="112.752"
                                width="110.774"
                                height="26.3061"
                                transform="rotate(-61.58 0 112.752)"
                                fill="#9DD0EC"
                            />
                            <rect
                                x="69.2412"
                                y="15.4008"
                                width="110.691"
                                height="26.3061"
                                transform="rotate(61.5811 69.2412 15.4008)"
                                fill="#9DD0EC"
                            />
                            <path d="M60.96 0L72.6513 21.75H49.2686L60.96 0Z" fill="#9DD0EC" />
                            <rect
                                x="72.5605"
                                y="48.5435"
                                width="79.9689"
                                height="13.4582"
                                transform="rotate(61.5811 72.5605 48.5435)"
                                fill="#177DB4"
                            />
                            <rect
                                x="11.2998"
                                y="118.87"
                                width="79.5821"
                                height="13.4582"
                                transform="rotate(-61.58 11.2998 118.87)"
                                fill="#177DB4"
                            />
                            <path d="M60.9447 26.04L76.0785 55.2525H45.8109L60.9447 26.04Z" fill="#177DB4" />
                        </svg>
                    </div>
                    <div className="site-title-text">Javascript SDK Test App</div>
                </div>
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
                <div className="search-view">
                    <div className="keyword-intercept-search">
                        <TextField
                            className="item-search-input"
                            label="Item Search"
                            variant="outlined"
                            onChange={(event) => {
                                clearTimeout(keywordSearchTimer);

                                keywordSearchTimer = setTimeout(() => {
                                    setKeywordSearchResults(jsSdk.performKeywordSearch(event.target.value));
                                }, 300);
                            }}
                        />
                        <div className="keyword-search-results">
                            {keywordSearchResults.map((keywordResult, idx) => {
                                return (
                                    <div key={`keyword-search-result-${idx}`} className="keyword-search-result">
                                        <div className="item-name">{keywordResult.replacement}</div>
                                        <div className="item-options">
                                            <Button
                                                className="add-to-cart-button"
                                                variant="contained"
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
                                                        jsSdk.reportItemsAddedToList(
                                                            [keywordResult.replacement],
                                                            "Shopping Cart"
                                                        );

                                                        return finalCartItems;
                                                    });
                                                }}
                                            >
                                                Add to Cart
                                            </Button>
                                            <Button
                                                className="add-to-list-button"
                                                variant="contained"
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
                                                                isCrossedOff: false,
                                                            });
                                                        }

                                                        jsSdk.reportKeywordInterceptTermSelected(keywordResult.term_id);
                                                        jsSdk.reportItemsAddedToList(
                                                            [keywordResult.replacement],
                                                            "Shopping List"
                                                        );

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
                </div>
                <div className="view-gutter" />
                <div className="list-view">
                    <div className="list-header">
                        <div className="list-name">My Shopping List</div>
                        <div></div>
                    </div>
                    <div className="user-list">
                        {userListItems.map((listItem, idx) => {
                            return (
                                <div
                                    key={`user-list-${idx}`}
                                    className={`user-list-item ${listItem.isCrossedOff ? "item-crossed-off" : ""}`}
                                >
                                    <div className="crossed-off-line" />
                                    <div className="item-id">{listItem.id}</div>
                                    <div className="item-name">{listItem.name}</div>
                                    <div className="item-quantity">{listItem.quantity}</div>
                                    <div className="item-actions">
                                        <IconButton
                                            className="complete-item-icon"
                                            onClick={() => {
                                                if (!listItem.isCrossedOff) {
                                                    crossItemOffList(idx);
                                                }
                                            }}
                                        >
                                            <CheckCircleOutline />
                                        </IconButton>
                                        <IconButton
                                            className="remove-item-icon"
                                            onClick={() => {
                                                removeItemFromList(idx);
                                            }}
                                        >
                                            <RemoveCircleOutline />
                                        </IconButton>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="view-gutter" />
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
                    className="UserCartDrawer"
                    anchor={"right"}
                    open={isCartOpen}
                    onClose={() => {
                        setIsCartOpen(false);
                    }}
                >
                    <div className="user-cart">
                        <div className="cart-header">
                            <div className="cart-logo">
                                <Badge badgeContent={getCartItemCount()} color="primary">
                                    <ShoppingCartOutlined className="cart-icon" />
                                </Badge>
                            </div>
                            <div className="cart-name">My Cart</div>
                            <div>
                                <IconButton
                                    className="remove-all-items-icon"
                                    onClick={() => {
                                        removeAllItemsFromCart();
                                    }}
                                >
                                    <DeleteSweepOutlined />
                                </IconButton>
                            </div>
                        </div>
                        {userCartItems.map((cartItem, idx) => {
                            return (
                                <div
                                    key={`user-cart-${idx}`}
                                    className={`user-list-item ${cartItem.isCrossedOff ? "item-crossed-off" : ""}`}
                                >
                                    <div className="crossed-off-line" />
                                    <div className="item-id">{cartItem.id}</div>
                                    <div className="item-name">{cartItem.name}</div>
                                    <div className="item-quantity">{cartItem.quantity}</div>
                                    <div className="item-actions">
                                        <IconButton
                                            className="remove-item-icon"
                                            onClick={() => {
                                                removeItemFromCart(idx);
                                            }}
                                        >
                                            <RemoveCircleOutline />
                                        </IconButton>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Drawer>
            </div>
        </div>
    );
};

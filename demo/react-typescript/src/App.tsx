/**
 * Defines the {@link App} functional component.
 * @module
 */
import React, { FC, ReactElement, useState, useEffect } from "react";
import "./App.scss";
/**
 * IMPORTANT:
 * You must create a symlink to this package to run this locally.
 * To do this, do the following:
 *      - Navigate to the root folder "adadapted-js-sdk" in the command line.
 *      - Run the following command:
 *          - npm link
 *      - Navigate to the root folder of the demo project "adadapted-js-sdk/demo/react-typescript"
 *      - Run the following command:
 *          - npm link @adadapted/js-sdk
 * After performing the steps above, a simlink will be
 * created so you can import the SDK into the demo project.
 * https://docs.npmjs.com/cli/v10/commands/npm-link
 */
import AdadaptedJsSdk from "@adadapted/js-sdk/src";
import TextField from "@mui/material/TextField";
import {
    ShoppingCartOutlined,
    AddShoppingCartOutlined,
    PlaylistAddOutlined,
    RemoveCircleOutline,
    CheckCircleOutline,
    DeleteSweepOutlined,
    InfoOutlined,
} from "@mui/icons-material";
import {
    Badge,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Drawer,
    IconButton,
    InputAdornment,
    Tooltip,
} from "@mui/material";

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
     * The API key the SDK connection is for.
     */
    apiKey: string;
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
 * Interface defining an item that can be added to a list or cart.
 */
interface AddToListOrCartItem {
    /**
     * The ID of the item/product.
     */
    id: string;
    /**
     * The item/product name.
     */
    name: string;
    /**
     * If true, this item is a product supplied by the AdAdapted API.
     */
    aaProduct?: boolean;
}

/**
 * Interface representing all search results when the user enters an item search.
 */
interface SearchResults {
    /**
     * The result of the keyword intercept search.
     */
    keywordResult: AdadaptedJsSdk.KeywordSearchTerm[];
    /**
     * The result of the item search.
     */
    itemResult: AddToListOrCartItem[];
}

/**
 * All test items that are not provided by AdAdapted's API.
 */
const TEST_PRODUCTS: AddToListOrCartItem[] = [
    {
        id: "meijer-1",
        name: "Meijer Shredded Cheddar Cheese",
    },
    {
        id: "kroger-1",
        name: "Kroger Shredded Cheddar Cheese",
    },
    {
        id: "kraft-1",
        name: "Kraft Block Cheddar Cheese",
    },
    {
        id: "tillamook-1",
        name: "Tillamook Block Sharp Cheddar Cheese",
    },
    {
        id: "folgers-1",
        name: "Folgers Classic Roast",
    },
    {
        id: "caribou-1",
        name: "Caribou Coffee Medium Roast",
    },
    {
        id: "dunkin-1",
        name: "Dunkin' Medium Roast Coffee",
    },
    {
        id: "coke-1",
        name: "Coka-Cola",
    },
    {
        id: "coke-2",
        name: "Diet Coke",
    },
    {
        id: "coke-3",
        name: "Cherry Coke",
    },
    {
        id: "glisten-1",
        name: "Glisten Garbage Disposer",
    },
    {
        id: "lemishine-1",
        name: "Lemi Shine Disposal Cleaner",
    },
    {
        id: "lysol-1",
        name: "Lysol Kitchen Cleaner",
    },
    {
        id: "windex-1",
        name: "Windex Glass Cleaner",
    },
    {
        id: "meijer-2",
        name: "Meijer Whole Milk",
    },
    {
        id: "horizon-1",
        name: "Horizon Organic Whole Milk",
    },
    {
        id: "prairiefarms-1",
        name: "Prairie Farms 2% Milk",
    },
    {
        id: "fairlife-3",
        name: "Fairlife 2% Milk",
    },
    {
        id: "clorox-3",
        name: "Clorox Toilet Bowl Cleaner",
    },
    {
        id: "aquafina-1",
        name: "Aquafina Water 20 oz.",
    },
];

/**
 * Demo App.
 * @returns the App component.
 */
export const App: FC = (): ReactElement => {
    const sdkAppDetails: SdkDetails = {
        apiEnv: "dev",
        apiKey: "",
        zonePlacements: [
            {
                zoneId: "102110",
                width: -1,
                height: 100,
            },
            {
                zoneId: "110002",
                width: -1,
                height: 100,
            },
        ],
    };

    const sdk = new AdadaptedJsSdk();

    let keywordSearchTimer: number | undefined;

    const [jsSdk] = useState(sdk);
    const [itemSearchResults, setItemSearchResults] = useState<SearchResults>({
        keywordResult: [],
        itemResult: [],
    });
    const [userListItems, setUserListItems] = useState<Item[]>([]);
    const [userCartItems, setUserCartItems] = useState<Item[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [pendingAtlItems, setPendingAtlItems] = useState<AdadaptedJsSdk.DetailedListItem[] | undefined>(undefined);
    const [availableKeywordIntercepts, setAvailableKeywordIntercepts] = useState<
        AdadaptedJsSdk.KeywordSearchTerm[] | undefined
    >(undefined);

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
        jsSdk.reportItemsDeletedFromCart([userCartItems[idx].name], "Cart");

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

        jsSdk.reportItemsDeletedFromCart(itemNames, "Cart");

        setUserCartItems([]);
    };

    /**
     * Adds the provided items to the list.
     * @param itemList - The item list to add to the list.
     * @param keywordTermId - If provided, the selected term ID will be reported.
     */
    const addItemsToList = (itemList: AddToListOrCartItem[], keywordTermId?: string): void => {
        setUserListItems((prevUserListItems) => {
            const finalListItems = [...prevUserListItems];
            const itemNameReportList: string[] = [];

            for (const item of itemList) {
                let itemFound = false;

                for (const listItem of finalListItems) {
                    if (listItem.id === item.id && listItem.name === item.name) {
                        listItem.quantity = listItem.quantity + 1;

                        itemFound = true;

                        break;
                    }
                }

                if (!itemFound) {
                    finalListItems.push({
                        id: item.id,
                        name: item.name,
                        quantity: 1,
                        isCrossedOff: false,
                    });
                }

                if (item.aaProduct) {
                    itemNameReportList.push(item.name);
                }
            }

            if (keywordTermId) {
                jsSdk.reportKeywordInterceptTermSelected(keywordTermId);
            }

            if (itemNameReportList.length) {
                jsSdk.acknowledgeAdded();
                jsSdk.reportItemsAddedToList(itemNameReportList, "Shopping List");
            }

            return finalListItems;
        });
    };

    /**
     * Adds the provided items to the cart.
     * @param itemList - The item list to add to the cart.
     * @param keywordTermId - If provided, the selected term ID will be reported.
     */
    const addItemsToCart = (itemList: AddToListOrCartItem[], keywordTermId?: string): void => {
        setUserCartItems((prevUserCartItems) => {
            const finalCartItems = [...prevUserCartItems];
            const itemNameReportList: string[] = [];

            for (const item of itemList) {
                let itemFound = false;

                for (const cartItem of finalCartItems) {
                    if (cartItem.id === item.id && cartItem.name === item.name) {
                        cartItem.quantity = cartItem.quantity + 1;

                        itemFound = true;

                        break;
                    }
                }

                if (!itemFound) {
                    finalCartItems.push({
                        id: item.id,
                        name: item.name,
                        quantity: 1,
                    });
                }

                if (item.aaProduct) {
                    itemNameReportList.push(item.name);
                }
            }

            if (keywordTermId) {
                jsSdk.reportKeywordInterceptTermSelected(keywordTermId);
            }

            if (itemNameReportList.length) {
                jsSdk.acknowledgeAdded();
                jsSdk.reportItemsAddedToCart(itemNameReportList, "Shopping Cart");
            }

            return finalCartItems;
        });
    };

    /**
     * Performs the item search based on user input.
     * @param searchTerm - The search term to apply.
     * @returns the list of all items that satisfy the search.
     */
    const performItemSearch = (searchTerm: string): AddToListOrCartItem[] => {
        const finalList: AddToListOrCartItem[] = [];

        if (searchTerm) {
            for (const item of TEST_PRODUCTS) {
                if (item.name.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1) {
                    // Item found.
                    finalList.push(item);
                }
            }
        }

        return finalList;
    };

    /**
     * Get the available keywords, if any.
     * @returns all available keywords comma separated.
     */
    const getAvailableUniqueKeywordsString = (): string => {
        let finalString = "No Keywords Available";

        if (availableKeywordIntercepts) {
            const keywords = availableKeywordIntercepts.map((keyword) => {
                return keyword.term.toLowerCase();
            });

            finalString = [...new Set(keywords)].join(", ");
        }

        return finalString;
    };

    useEffect(() => {
        const zonePlacements: { [key: string]: string } = {};

        for (let x = 0; x < sdkAppDetails.zonePlacements.length; x++) {
            zonePlacements[sdkAppDetails.zonePlacements[x].zoneId] = `zone${x + 1}`;
        }

        jsSdk
            .initialize({
                apiKey: sdkAppDetails.apiKey,
                advertiserId: "JS_SDK_TEST_USER_UDID",
                allowRetargeting: true,
                enablePayloads: true,
                enableKeywordIntercept: true,
                apiEnv: sdkAppDetails.apiEnv,
                zonePlacements,
                params: {
                    // storeId: "230",
                    recipeContextId: "1167",
                    recipeContextZoneIds: ["102133", "102134"],
                },
                onAddItemsTriggered: (items) => {
                    setPendingAtlItems(items);
                },
                onPayloadsAvailable: (payloads) => {
                    const payloadItems: AdadaptedJsSdk.DetailedListItem[] = [];

                    for (const payload of payloads) {
                        payloadItems.push(...payload.detailed_list_items);
                    }

                    setPendingAtlItems(payloadItems);
                },
                onAdsRetrieved: (adZoneAdAvailabilityMap) => {
                    console.log({ adZoneAdAvailabilityMap });
                },
            })
            .then(() => {
                console.log("SDK Session ID:", jsSdk.getSessionId());

                setTimeout(() => {
                    const availableKeywordIntercepts = jsSdk.getAvailableKeywordIntercepts();

                    console.log("Available Keyword Intercepts:", availableKeywordIntercepts);

                    setAvailableKeywordIntercepts(availableKeywordIntercepts);
                }, 2000);
            })
            .catch((err) => {
                console.error(err);
            });
    }, []);

    useEffect(() => {
        if (itemSearchResults.keywordResult.length) {
            const termIds: string[] = [];

            for (const result of itemSearchResults.keywordResult) {
                termIds.push(result.term_id);
            }

            jsSdk.reportKeywordInterceptTermsPresented(termIds);
        }
    }, [itemSearchResults.keywordResult]);

    useEffect(() => {
        if (pendingAtlItems) {
            setPendingAtlItems(undefined);
        }
    }, [userListItems, userCartItems]);

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
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Tooltip
                                            title={
                                                availableKeywordIntercepts
                                                    ? `Available Keywords: ${getAvailableUniqueKeywordsString()}`
                                                    : ""
                                            }
                                            placement="bottom"
                                        >
                                            <InfoOutlined />
                                        </Tooltip>
                                    </InputAdornment>
                                ),
                            }}
                            onChange={(event) => {
                                clearTimeout(keywordSearchTimer);

                                keywordSearchTimer = window.setTimeout(() => {
                                    setItemSearchResults({
                                        keywordResult: jsSdk.performKeywordSearch(event.target.value),
                                        itemResult: performItemSearch(event.target.value),
                                    });
                                }, 300);
                            }}
                        />
                        <div className="keyword-search-results">
                            {itemSearchResults.keywordResult.map((keywordResult, idx) => {
                                return (
                                    <div key={`keyword-search-result-${idx}`} className="keyword-search-result">
                                        <div className="item-name">
                                            <div className="ad-badge">AD</div>
                                            {keywordResult.replacement}
                                        </div>
                                        <div className="item-options">
                                            <Button
                                                className="add-to-cart-button"
                                                variant="contained"
                                                onClick={() => {
                                                    addItemsToCart(
                                                        [
                                                            {
                                                                id: keywordResult.term_id,
                                                                name: keywordResult.replacement,
                                                                aaProduct: true,
                                                            },
                                                        ],
                                                        keywordResult.term_id
                                                    );
                                                }}
                                            >
                                                <Tooltip title="Add to Cart" placement="bottom">
                                                    <AddShoppingCartOutlined className="add-to-cart-icon" />
                                                </Tooltip>
                                            </Button>
                                            <Button
                                                className="add-to-list-button"
                                                variant="contained"
                                                onClick={() => {
                                                    addItemsToList(
                                                        [
                                                            {
                                                                id: keywordResult.term_id,
                                                                name: keywordResult.replacement,
                                                                aaProduct: true,
                                                            },
                                                        ],
                                                        keywordResult.term_id
                                                    );
                                                }}
                                            >
                                                <Tooltip title="Add to List" placement="bottom">
                                                    <PlaylistAddOutlined className="add-to-list-icon" />
                                                </Tooltip>
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                            {itemSearchResults.itemResult.map((itemResult, idx) => {
                                return (
                                    <div key={`keyword-search-result-${idx}`} className="keyword-search-result">
                                        <div className="item-name">{itemResult.name}</div>
                                        <div className="item-options">
                                            <Button
                                                className="add-to-cart-button"
                                                variant="contained"
                                                onClick={() => {
                                                    addItemsToCart([itemResult]);
                                                }}
                                            >
                                                <Tooltip title="Add to Cart" placement="bottom">
                                                    <AddShoppingCartOutlined className="add-to-cart-icon" />
                                                </Tooltip>
                                            </Button>
                                            <Button
                                                className="add-to-list-button"
                                                variant="contained"
                                                onClick={() => {
                                                    addItemsToList([itemResult]);
                                                }}
                                            >
                                                <Tooltip title="Add to List" placement="bottom">
                                                    <PlaylistAddOutlined className="add-to-list-icon" />
                                                </Tooltip>
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
                        <div className="header-actions">
                            <IconButton
                                className="remove-all-items-from-list-icon"
                                disabled={userListItems.length === 0}
                                onClick={() => {
                                    removeAllItemsFromList();
                                }}
                            >
                                <DeleteSweepOutlined />
                            </IconButton>
                        </div>
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
                <Dialog
                    className="pending-atl-items-dialog"
                    open={!!pendingAtlItems && pendingAtlItems.length > 0}
                    disableEscapeKeyDown={true}
                >
                    <DialogTitle>Where would you like your items to go?</DialogTitle>
                    <DialogContent>
                        {pendingAtlItems?.map((item, idx) => {
                            return (
                                <div key={`pending-atl-item-${idx}`} className="pending-item-row">
                                    <div className="pending-item-id">{item.product_barcode}</div>
                                    <div className="pending-item-name">{item.product_title}</div>
                                </div>
                            );
                        })}
                    </DialogContent>
                    <DialogActions>
                        <Button
                            className="dialog-add-to-cart-button"
                            variant="contained"
                            onClick={() => {
                                const finalItems: AddToListOrCartItem[] = [];

                                if (pendingAtlItems) {
                                    for (const item of pendingAtlItems) {
                                        finalItems.push({
                                            id: item.product_barcode,
                                            name: item.product_title,
                                            aaProduct: true,
                                        });
                                    }
                                }

                                addItemsToCart(finalItems);
                            }}
                        >
                            My Cart
                        </Button>
                        <Button
                            className="dialog-add-to-list-button"
                            variant="contained"
                            onClick={() => {
                                const finalItems: AddToListOrCartItem[] = [];

                                if (pendingAtlItems) {
                                    for (const item of pendingAtlItems) {
                                        finalItems.push({
                                            id: item.product_barcode,
                                            name: item.product_title,
                                            aaProduct: true,
                                        });
                                    }
                                }

                                addItemsToList(finalItems);
                            }}
                        >
                            My Shopping List
                        </Button>
                    </DialogActions>
                </Dialog>
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
                                    className="remove-all-items-from-cart-icon"
                                    disabled={userCartItems.length === 0}
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

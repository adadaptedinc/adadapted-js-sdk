# AdAdapted JS SDK

The AdAdapted Javascript SDK.

[[_TOC_]]

## Features

-   Ad zone creation
-   In-app ad display popup
-   In-list add suggestion based on available keywords
-   Event tracking enabling reporting
-   Supported ad types:
    -   Add to list (reports a product to add to a list)
    -   Popup external link (opens in-app within popup view)

## Installation

```
npm install --save @adadapted/js-sdk
```

## Usage

### Embedded <script\/> Approach

The following approach uses an embedded script tag to import/include the `adadapted-js-sdk.window.js` file. The following examples are in the context of a [Cordova](https://cordova.apache.org/) app, but can be easily adapted to any project that needs to use this approach.

**STEP 1:**

This approach involves copying the built javascript file from the `node_modules` folder and placing it directly in your project.

Copy the following file:

`node_modules/@adadapted/js-sdk/dist/adadapted-js-sdk.window.js`

and place it into a designated folder within your project like so:

![Example: js/lib/adadapted-js-sdk.window.js](images/README-img-1.png)

**NOTE:** _The file in the image above can be placed at any location._

**STEP 2:**

Next, place the following `<script/>` tag in your `index.html`(_or whatever your entry HTML file name is_):

```html
<script type="text/javascript" src="js/lib/adadapted-js-sdk.window.js"></script>
```

**STEP 3:**

Now that the AdAdapted SDK is available for reference, you need to create a reference to the SDK for your use. You can do this by defining a variable in your `app.js` file within your app definition as follows:

```javascript
const app = {
    /**
     * The AdadaptedJsSdk instance.
     */
    aaSdk: {},

    // ...

    onDeviceReady: function() {
        // Assign a reference to the SDK.
        this.aaSdk = new window.AdadaptedJsSdk.Sdk();

        // ...
    }

    // ...
};

app.initialize();
```

The above code defines an `aaSdk` property on your `app` object. Then, once the device is ready, assigns it the reference to the AdAdapted SDK.

**STEP 4:**

After the `aaSdk` property has been assigned, you can then call the `.initialize()` method on it. This will initialize a valid SDK session with the configuration you provide. 

```javascript
this.aaSdk.initialize({
    appId: "YOUR_APP_ID_HERE",
    deviceUUID: "THE_DEVICE_UUID_HERE",
    apiEnv: AdadaptedJsSdk.ApiEnv.Prod,
    zonePlacements: {
        "12345": "testZoneId1",
        "12346": "testZoneId2"
    },
    onAdZonesRefreshed: () => {
        // ...
    },
    onAddToListTriggered: (items) => {
        // ...
    },
})
.then(() => {
    // ...
})
.catch((err) => {
    console.error(err);
});
```

The `.initialize()` method is a promise and will resolve in the `.then()` callback once finished. If you provide an invalid configuration to the `.initialize()` method, the promise will resolve to the `.catch()` callback and report the initialization error.


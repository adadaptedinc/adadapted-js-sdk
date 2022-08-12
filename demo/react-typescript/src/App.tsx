/**
 * Defines the {@link App} functional component.
 * @module
 */
import * as React from "react";
import "./App.scss";
import AdadaptedJsSdk from "@adadapted/js-sdk/src_new";

/**
 * Demo App.
 * @returns the App component.
 */
export const App: React.FC = (): React.ReactElement => {
    const sdk = new AdadaptedJsSdk();

    const [jsSdk] = React.useState(sdk);

    React.useEffect(() => {
        jsSdk
            .initialize({
                appId: "NWY0NTM2YZDMMDQ0",
                // appId: "NTGXMTA3ZWJJYWZL",
                advertiserId: "JS_SDK_TEST_USER_UDID",
                allowRetargeting: true,
                bundleId: "JS_SDK_TEST_APP",
                bundleVersion: "1.0.0",
                apiEnv: "dev",
                zonePlacements: {
                    "101930": "zone1",
                    // "100862": "zone1",
                    // "100863": "zone2",
                    // "100864": "zone3",
                    // "100896": "zone4",
                    // "100897": "zone5",
                },
            })
            .then(() => {
                console.log("SDK Session ID:", jsSdk.getSessionId());
            })
            .catch((err) => {
                console.error(err);
            });
    }, []);

    // Returned JSX.
    return (
        <div className="App">
            <div id="zone1" style={{ border: "1px", width: "320px", height: "100px" }} />
            <div id="zone2" style={{ border: "1px", width: "320px", height: "100px" }} />
            <div id="zone3" style={{ border: "1px", width: "320px", height: "100px" }} />
            <div id="zone4" style={{ border: "1px", width: "320px", height: "100px" }} />
            <div id="zone5" style={{ border: "1px", width: "320px", height: "100px" }} />
        </div>
    );
};

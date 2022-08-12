# HTML / Javascript Demo

## Running the Demo App

1. You need a local HTTP server to run the demo app. <a href="https://www.python.org/downloads/" target="_blank">Install the latest Python</a> to quickly be able to run a local server.
2. Once Python is installed, run the following command in your terminal at the root of the `aa-payload-service-sdk/demo/html-javascript` directory:

```bash
   python3 -m http.server
```

3. You can then open the following in a new browser window: http://localhost:8000/app.html

## Testing the SDK

There are two ways you can test the SDK. You can reference a local build of the SDK or you can reference the current build of the SDK that exists on AdAdapted's CDN.

### Local Build Testing

You will need to make sure the `adadapted-payload-service-sdk.js` file exists at the root of the `demo/html-javascript` directory. To do this, do the following:

1. From your terminal, navigate to the `aa-payload-service-sdk/package` directory.
2. Run the following:

```bash
npm run build
```

3. A new folder will be generated in the `aa-payload-service-sdk/package` directory called `dist` and will contain the file called `adadapted-payload-service-sdk.js`.
4. Move the newly generated `adadapted-payload-service-sdk.js` file to the root of the `aa-payload-service-sdk/demo/html-javascript` directory.

NOTE: Anytime you make an update to the `aa-payload-service-sdk/package/src/index.js` file, you will need to repeat the steps above to rebuild the SDK and update it to run locally.

### Current Build Testing (CDN)

If you would like to test the current build that exists on the CDN, do the following:

1. Open the `aa-payload-service-sdk/demo/html-javascript/app.html` file.
2. Change the `src` value of

```javascript
<script src="./adadapted-payload-service-sdk.js" onload="onPayloadSdkAvailable()"></script>
```

to be one of the following:

1. <b>PRODUCTION:</b> https://storage.googleapis.com/payloads-javascript-sdk-prod/v0.1.1/adadapted-payload-service-sdk.js
   <br/><span style="color: crimson">NOTE: Make sure to point to the version folder you want to run.</span>
2. <b>DEVELOPMENT:</b> https://storage.googleapis.com/payloads-javascript-sdk-dev/adadapted-payload-service-sdk.js

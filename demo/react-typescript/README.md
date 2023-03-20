# React / Typescript Demo

## Running the Demo App

From the root of the `aa-payload-service-sdk/demo/react-typescript` directory, you can run the following to start the dev server and run the demo app:

```bash
    npm run start-dev-server
```

## Testing the SDK

You can test the SDK from this demo app in one of two ways:

### Local Build Testing

This approach will allow you to locally test changes to the SDK as you make changes to the SDK files.

1. In your terminal, navigate to the `aa-payload-service-sdk` directory. You must be in the same directory as the `package.json` file.

2. Make sure there are no files already installed in `node_modules` that relate to the `@adadapted/payload-service-sdk` package. This is necessary when switching between testing approaches (works for both `link` and `npm install` approaches). Run the following to ensure this:

```bash
    npm uninstall @adadapted/payload-service-sdk
```

3. Run the following command to enable linking the SDK to the react-typescript demo:

```bash
    npm link
```

4. Now navigate to the `aa-payload-service-sdk/demo/react-typescript` directory where the `package.json file is located. Run the following command to complete the `link` between the SDK files and the react-typescript demo app:

```bash
    npm link @adadapted/payload-service-sdk
```

5. You can now use the SDK package as if it was just NPM installed.

### Current Build Testing (NPM)

If you would like to test the current build that exists on NPM, do the following:

1. Open your terminal and navigate to the `aa-payload-service-sdk/demo/react-typescript` directory.

2. Make sure there are no files already installed in `node_modules` that relate to the `@adadapted/payload-service-sdk` package. This is necessary when switching between testing approaches (works for both `link` and `npm install` approaches). Run the following to ensure this:

```bash
    npm uninstall @adadapted/payload-service-sdk
```

3. Run the following command:

```bash
    npm install @adadapted/payload-service-sdk
```

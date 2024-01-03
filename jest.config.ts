import type { Config } from "jest";

export default async (): Promise<Config> => {
    return {
        verbose: true,
        maxWorkers: 1,
        testEnvironment: "jsdom",
        testEnvironmentOptions: {
            url: "http://localhost",
        },
        setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
        transform: {
            "^.+\\.[j|t]sx?$": "ts-jest",
        },
        testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
        moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
        modulePaths: ["<rootDir>/node_modules"],
        moduleNameMapper: {
            "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
                "<rootDir>/__mocks__/fileMock.js",
            "\\.(s?css)$": "<rootDir>/__mocks__/styleMock.js",
            "^src/(.*)$": "<rootDir>/src/$1",
        },
        collectCoverage: false,
        coverageDirectory: "coverage",
        collectCoverageFrom: [
            "src/**/*.{js,jsx,ts,tsx}",
            "!src/api/**/*.*",
            "!src/**/*.d.ts",
            "!src/index.tsx",
        ],
        testTimeout: 20000,
        coverageThreshold: {
            global: {
                branches: 5,
                functions: 5,
                lines: 5,
                statements: 5,
            },
        },
    };
};

/**
 * Contains all API request mocks for the Rewards API.
 */
import { AxiosResponse } from "axios";
import {
    InitializeSessionResponse,
    KeywordInterceptsResponse,
    RefreshSessionDataResponse,
    ReportAdEventResponse,
    ReportInterceptEventResponse,
    RetrievePayloadItemDataResponse,
} from "./adadaptedApiTypes";
/**
 * Mocks the API call for initializing a session.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export declare function initializeSession(): Promise<
    AxiosResponse<InitializeSessionResponse>
>;
/**
 * Mocks the API call for refreshing session data.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export declare function refreshSessionData(): Promise<
    AxiosResponse<RefreshSessionDataResponse>
>;
/**
 * Mocks the API call for reporting an ad event.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export declare function reportAdEvent(): Promise<
    AxiosResponse<ReportAdEventResponse>
>;
/**
 * Mocks the API call for getting keyword intercepts.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export declare function getKeywordIntercepts(): Promise<
    AxiosResponse<KeywordInterceptsResponse>
>;
/**
 * Mocks the API call for reporting an ad event.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export declare function reportInterceptEvent(): Promise<
    AxiosResponse<ReportInterceptEventResponse>
>;
/**
 * Mocks the API call for reporting List Manager events.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export declare function reportListManagerEvents(): Promise<AxiosResponse<void>>;
/**
 * Mocks the API call for reporting Payload content status.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export declare function reportPayloadContentStatus(): Promise<
    AxiosResponse<void>
>;
/**
 * Mocks the API call for reporting Payload content status.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export declare function retrievePayloadContent(): Promise<
    AxiosResponse<RetrievePayloadItemDataResponse>
>;

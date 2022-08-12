/**
 * API requests focused around Settings.
 */
import {
    InitializeSessionRequest,
    InitializeSessionResponse,
    KeywordInterceptsRequest,
    KeywordInterceptsResponse,
    RefreshSessionDataRequest,
    RefreshSessionDataResponse,
    ReportAdEventRequest,
    ReportAdEventResponse,
    ReportInterceptEventRequest,
    ReportInterceptEventResponse,
    ReportListManagerDataRequest,
    ReportPayloadDataRequest,
    RetrievePayloadItemDataRequest,
    RetrievePayloadItemDataResponse,
} from "./adadaptedApiTypes";
import { AxiosResponse } from "axios";
import { ApiEnv, DeviceOS, ListManagerApiEnv, PayloadApiEnv } from "../types";
/**
 * Makes an API request to initialize the session for the AdAdapted API.
 * @param requestData - The data to be sent with the request.
 * @param deviceOS - The operating system being ran on the device.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export declare function initializeSession(
    requestData: InitializeSessionRequest,
    deviceOS: DeviceOS,
    apiEnv: ApiEnv
): Promise<AxiosResponse<InitializeSessionResponse>>;
/**
 * Makes an API request to refresh the session data.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param deviceOS - The operating system being ran on the device.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export declare function refreshSessionData(
    requestData: RefreshSessionDataRequest,
    deviceOS: DeviceOS,
    apiEnv: ApiEnv
): Promise<AxiosResponse<RefreshSessionDataResponse>>;
/**
 * Makes an API request to report an ad event that has occurred.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param deviceOS - The operating system being ran on the device.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export declare function reportAdEvent(
    requestData: ReportAdEventRequest,
    deviceOS: DeviceOS,
    apiEnv: ApiEnv
): Promise<AxiosResponse<ReportAdEventResponse>>;
/**
 * Makes an API request to get all possible keyword intercepts for the session.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param deviceOS - The operating system being ran on the device.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export declare function getKeywordIntercepts(
    requestData: KeywordInterceptsRequest,
    deviceOS: DeviceOS,
    apiEnv: ApiEnv
): Promise<AxiosResponse<KeywordInterceptsResponse>>;
/**
 * Makes an API request to report an intercept event that has occurred.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param deviceOS - The operating system being ran on the device.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export declare function reportInterceptEvent(
    requestData: ReportInterceptEventRequest,
    deviceOS: DeviceOS,
    apiEnv: ApiEnv
): Promise<AxiosResponse<ReportInterceptEventResponse>>;
/**
 * Makes an API request to report List Manager events.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param deviceOS - The operating system being ran on the device.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export declare function reportListManagerEvents(
    requestData: ReportListManagerDataRequest,
    deviceOS: DeviceOS,
    apiEnv: ListManagerApiEnv
): Promise<AxiosResponse<void>>;
/**
 * Makes an API request to report the results of the
 * "out of app" add to list payload received.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export declare function reportPayloadContentStatus(
    requestData: ReportPayloadDataRequest,
    apiEnv: PayloadApiEnv
): Promise<AxiosResponse<void>>;
/**
 * Makes an API request to get all outstanding add to list payloads for a given user.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export declare function retrievePayloadContent(
    requestData: RetrievePayloadItemDataRequest,
    apiEnv: PayloadApiEnv
): Promise<AxiosResponse<RetrievePayloadItemDataResponse>>;

/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ModerationData } from '../models/ModerationData';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ModerationService {
    /**
     * Get moderation data (blocking of users)
     * @param email
     * @param userid
     * @returns ModerationData Ok
     * @throws ApiError
     */
    public static getModeration(
        email?: string,
        userid?: number,
    ): CancelablePromise<Array<ModerationData>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/moderation',
            query: {
                'email': email,
                'userid': userid,
            },
        });
    }
    /**
     * Post moderation data (blocking of users)
     * customUntil is optional and should be in ISO format. Default value is +60 days.
     * @param requestBody
     * @returns any Ok
     * @throws ApiError
     */
    public static addModerationData(
        requestBody: {
            customUntil?: string;
            reason: string;
            username: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/moderation',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Unblock the user. The entries will not be deleted, but the until date will be set to now.
     * Sets all moderation elements of a user that are not expired to expire now.
     * @param requestBody
     * @returns any Ok
     * @throws ApiError
     */
    public static deleteModerationData(
        requestBody: {
            username: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/moderation',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}

/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DevService {
    /**
     * Get capture
     * @param gameId
     * @returns string Ok
     * @throws ApiError
     */
    public static retrieveCapturedGame(
        gameId: number,
    ): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/retrieveCapture',
            query: {
                'gameID': gameId,
            },
        });
    }
    /**
     * @param type
     * @returns any Ok
     * @throws ApiError
     */
    public static getEmailsFromUsersForNews(
        type: 'news' | 'tournamentNews',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/getEmailsFromUsersForNews',
            query: {
                'type': type,
            },
        });
    }
}

import axios from 'axios';
import logger from '../helpers/logger'

let token: Promise<string> | null = null;

export async function getToken(): Promise<string> {
    if (token != null) { return token; }

    await requestTokenFromPaypal()
    if (token === null) { throw new Error('Cannot return null as a token') }
    return token;
}

// https://developer.paypal.com/docs/api/get-an-access-token-curl/
// CHECK FOR 401 or expires in
export async function requestTokenFromPaypal(): Promise<void> {
    if (process.env.paypal_Client_ID == null || process.env.paypal_Secret == null) {
        logger.error('Environment variables paypal_Client_ID and paypal_Secret required but missing')
        token = null
        return
    }

    try {
        logger.info('Request new Token from PayPal')
        token = new Promise(resolve => {
            const config = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'Accept-Language': 'en_US',
                },
                auth: {
                    'username': process.env.paypal_Client_ID ?? '',
                    'password': process.env.paypal_Secret ?? ''
                },
            }

            axios.post(`https://api-m.${process.env.NODE_ENV === 'production' ? '' : 'sandbox.'}paypal.com/v1/oauth2/token?grant_type=client_credentials`, {}, config)
                .then((res) => {
                    if (res.data?.access_token === null) {
                        throw new Error('Acess Token not contained in PayPal Response')
                    }

                    resolve(res.data.access_token)
                })
        });
    } catch (err) {
        logger.error('Error in Paypal Token Generation', err)
        token = null
    }
}

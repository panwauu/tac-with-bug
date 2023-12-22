import axios from 'axios'
import { ok, err, Result } from 'neverthrow'
import type pg from 'pg'
import { getEmailNotificationSettings } from '../services/settings.js'
import { sendSubscriptionPaymentReminder } from '../communicationUtils/email.js'
import logger from '../helpers/logger.js'
import { getUser } from '../services/user.js'
import { getToken, requestTokenFromPaypal } from './paypalToken.js'

interface Subscription {
  id: number | null
  userid: number | null
  subscriptionid: string | null
  status: 'running' | 'cancelled' | 'expiring' | null
  validuntil: string | null
}

function SQLusernameOrID(usernameORuserID: number | string) {
  return typeof usernameORuserID === 'string' ? 'username' : 'id'
}

export interface SubscriptionDetails extends Subscription {
  freelicense: boolean
}

export function getInvalidSubscriptionDetails(): SubscriptionDetails {
  return {
    id: null,
    userid: null,
    subscriptionid: null,
    status: null,
    validuntil: null,
    freelicense: false,
  }
}

export async function getNSubscriptions(sqlClient: pg.Pool) {
  return sqlClient.query('SELECT COUNT(*) as count FROM users WHERE currentsubscription IS NOT NULL;').then((res) => {
    return res.rows[0].count as number
  })
}

async function getDBSubscription(sqlClient: pg.Pool, usernameORuserID: number | string): Promise<SubscriptionDetails> {
  const query = `SELECT users.freelicense, subscriptions.id, subscriptions.userid, subscriptions.subscriptionid, subscriptions.status, subscriptions.validuntil FROM users
    LEFT JOIN subscriptions ON (users.currentsubscription = subscriptions.id) WHERE users.${SQLusernameOrID(usernameORuserID)} = $1
    UNION
    SELECT freelicense, NULL as id, NULL as userid, NULL as subscriptionid, NULL as status, NULL as validuntil FROM users 
    WHERE ${SQLusernameOrID(usernameORuserID)}=$1 AND currentsubscription IS NULL;`

  return sqlClient.query(query, [usernameORuserID]).then((res) => {
    return res.rows[0]
  })
}

type GetPaypalSubscriptionDetailsError = 'COULD_NOT_GET_PAYPAL_SUBSCRIPTION_DETAILS'
async function getPaypalSubscriptionDetails(subscriptionID: string): Promise<Result<any, GetPaypalSubscriptionDetailsError>> {
  const retryAttempts = 2

  let res
  for (let n = 0; n < retryAttempts; n++) {
    const token = await getToken()

    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'Accept-Language': 'en_US',
        Authorization: `Bearer ${token}`,
      },
    }

    try {
      res = await axios.get(`https://api-m.${process.env.NODE_ENV === 'production' ? '' : 'sandbox.'}paypal.com/v1/billing/subscriptions/${subscriptionID}`, config)

      if (res.status !== 401) {
        break
      } else {
        requestTokenFromPaypal()
      }
    } catch (err) {
      requestTokenFromPaypal()
    }
  }

  return res?.status !== 200 ? err('COULD_NOT_GET_PAYPAL_SUBSCRIPTION_DETAILS') : ok(res.data)
}

type CancelPaypalSubscriptionError = 'PAYPAL_CANCELLATION_FAILED'
async function cancelPaypalSubscription(subscriptionID: string): Promise<Result<null, CancelPaypalSubscriptionError>> {
  const token = await getToken()

  const config = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Language': 'en_US',
      Authorization: `Bearer ${token}`,
    },
  }

  const res = await axios.post(
    `https://api-m.${process.env.NODE_ENV === 'production' ? '' : 'sandbox.'}paypal.com/v1/billing/subscriptions/${subscriptionID}/cancel`,
    { reason: 'User cancelled Subscription - User hat Abonnement gekündigt' },
    config
  )

  return res.status !== 204 ? err('PAYPAL_CANCELLATION_FAILED') : ok(null)
}

export type IsSubscribedError = GetSubscriptionError
export async function isSubscribed(sqlClient: pg.Pool, usernameORuserID: number | string, checkPaypalFlag = true): Promise<Result<boolean, IsSubscribedError>> {
  const subscription = await getSubscription(sqlClient, usernameORuserID, checkPaypalFlag)
  if (subscription.isErr()) {
    return err(subscription.error)
  }
  return ok(subscription.value.freelicense || subscription.value.status === 'running' || subscription.value.status === 'expiring')
}

export type GetSubscriptionError = 'COULD_NOT_UPDATE_SUBSCRIPTION' | GetPaypalSubscriptionDetailsError
export async function getSubscription(sqlClient: pg.Pool, usernameORuserID: number | string, checkPaypalFlag = true): Promise<Result<SubscriptionDetails, GetSubscriptionError>> {
  const subscription = await getDBSubscription(sqlClient, usernameORuserID)
  if (!checkPaypalFlag) {
    return ok(subscription)
  }

  if (subscription.subscriptionid === null) {
    return ok(subscription)
  }

  const paypalRes = await getPaypalSubscriptionDetails(subscription.subscriptionid)
  if (paypalRes.isErr()) {
    return err(paypalRes.error)
  }

  const active = paypalRes.value.status === 'ACTIVE'
  const validuntilpassed = new Date(subscription.validuntil as string) < new Date()

  if (active && validuntilpassed) {
    subscription.validuntil = paypalRes.value.billing_info.next_billing_time
  } else if (!active && validuntilpassed) {
    subscription.status = 'cancelled'
    await sqlClient.query(`UPDATE users SET currentsubscription=NULL WHERE ${SQLusernameOrID(usernameORuserID)}=$1`, [usernameORuserID])
  } else if (!active && !validuntilpassed) {
    subscription.status = 'expiring'
  }

  const dbRes = await sqlClient.query('UPDATE subscriptions SET status=$2, validuntil=$3 WHERE id=$1;', [subscription.id, subscription.status, subscription.validuntil])
  if (dbRes.rowCount !== 1) {
    return err('COULD_NOT_UPDATE_SUBSCRIPTION')
  }

  return ok(subscription)
}

export type CancelSubscriptionError = 'SUBSCRIPTION_DOES_NOT_EXIST' | CancelPaypalSubscriptionError
export async function cancelSubscription(sqlClient: pg.Pool, userID: number): Promise<Result<null, CancelSubscriptionError>> {
  const subscription = await getDBSubscription(sqlClient, userID)

  if (subscription.subscriptionid === null) {
    return err('SUBSCRIPTION_DOES_NOT_EXIST')
  }

  const cancelRes = await cancelPaypalSubscription(subscription.subscriptionid)
  return cancelRes.isErr() ? err(cancelRes.error) : ok(null)
}

export type NewSubscriptionError =
  | 'SUBSCRIPTION_ALREADY_IN_DB'
  | 'USER_ALREADY_HAS_SUBSCRIPTION'
  | 'NEW_SUBSCRIPTION_NOT_ACTIVE_IN_PAYPAL'
  | 'INVALID_PLAN_ID'
  | GetPaypalSubscriptionDetailsError
export async function newSubscription(sqlClient: pg.Pool, userID: number, subscriptionID: string): Promise<Result<null, NewSubscriptionError>> {
  const res = await sqlClient.query('SELECT * FROM subscriptions WHERE subscriptionid = $1;', [subscriptionID])
  if (res.rowCount != null && res.rowCount > 0) {
    return err('SUBSCRIPTION_ALREADY_IN_DB')
  }

  const priorSubscription = await getDBSubscription(sqlClient, userID)
  if (priorSubscription.status === 'running') {
    return err('USER_ALREADY_HAS_SUBSCRIPTION')
  }

  const paypalRes = await getPaypalSubscriptionDetails(subscriptionID)
  if (paypalRes.isErr()) {
    return err(paypalRes.error)
  }

  if (paypalRes.value.status !== 'ACTIVE') {
    return err('NEW_SUBSCRIPTION_NOT_ACTIVE_IN_PAYPAL')
  }

  const planIDs = [process.env['PAYPAL_PLAN_ID_MONTHLY'], process.env['PAYPAL_PLAN_ID_QUATERLY'], process.env['PAYPAL_PLAN_ID_YEARLY']]
  if (!planIDs.includes(paypalRes.value.plan_id)) {
    return err('INVALID_PLAN_ID')
  }

  const subscription: Subscription = await sqlClient
    .query("INSERT INTO subscriptions (userid, subscriptionid, status, validuntil) VALUES ($1, $2, 'running', $3) RETURNING *;", [
      userID,
      subscriptionID,
      paypalRes.value.billing_info.next_billing_time,
    ])
    .then((res) => {
      return res.rows[0]
    })

  await sqlClient.query('UPDATE users SET currentsubscription=$1 WHERE id=$2;', [subscription.id, userID])
  return ok(null)
}

export async function updateSubscriptions(sqlClient: pg.Pool) {
  /* Update all passed subscriptions */
  const res = await sqlClient.query<{ userid: number }>(`SELECT userid FROM subscriptions WHERE status='running' AND validuntil < current_timestamp;`)
  for (const entry of res.rows) {
    const subscription = await getSubscription(sqlClient, entry.userid, true)
    if (subscription.isErr()) {
      logger.error(subscription.error)
      continue
    }
    logger.info(`User with id ${subscription.value.userid} has now status ${subscription.value.status} until ${subscription.value.validuntil}`)
  }

  /* Thank users for upcomming subscription */
  const tomorrowRes = await sqlClient.query<{ userid: number }>(`SELECT userid FROM subscriptions WHERE validuntil::date = DATE 'tomorrow';`)
  for (const entry of tomorrowRes.rows) {
    const user = await getUser(sqlClient, { id: entry.userid })
    if (user.isErr()) {
      logger.error(user.error)
      continue
    }

    const subscription = await getSubscription(sqlClient, entry.userid, true)
    if (subscription.isErr()) {
      logger.error(subscription.error)
      continue
    }

    if (subscription.value.validuntil == null || !isTomorrow(new Date(subscription.value.validuntil))) {
      logger.info(`Update subscription: User with id ${subscription.value.userid} has now status ${subscription.value.status} until ${subscription.value.validuntil}`)
      continue
    }

    if (subscription.value.status === 'running') {
      const settings = await getEmailNotificationSettings(sqlClient, user.value.id)
      if (settings.isOk() && settings.value.sponsoring) {
        await sendSubscriptionPaymentReminder({ user: user.value })
      }
    }
  }
}

function isTomorrow(date: Date) {
  const tomorrow = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)
  const dayAfterTomorrow = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 2)
  return date.getTime() > tomorrow.getTime() && date.getTime() < dayAfterTomorrow.getTime()
}

import { err, ok, Result } from 'neverthrow';
import type pg from 'pg';

export function expectChangesInDatabase(res: pg.QueryResult<any>) {
    if (res.rowCount === 0) { throw new Error('NO_CHANGE_TO_DATABASE_ERROR') }
}

export function expectOneChangeInDatabase(res: pg.QueryResult<any>) {
    if (res.rowCount === 0) { throw new Error('NO_CHANGE_TO_DATABASE_ERROR') }
    if (res.rowCount > 1) { throw new Error('MORE_THAN_ONE_CHANGE_TO_DATABASE_ERROR') }
}

export type noDatabaseChangeError = 'NO_CHANGE_TO_DATABASE'
export type notOneDatabaseChangeError = 'NONE_OR_MORE_THAN_ONE_CHANGES_TO_DATABASE'

export function expectChangesToDatabase(res: pg.QueryResult<any>): Result<null, noDatabaseChangeError> {
    if (res.rowCount === 0) { return err('NO_CHANGE_TO_DATABASE') }
    return ok(null)
}

export function expectOneChangeToDatabase(res: pg.QueryResult<any>): Result<null, notOneDatabaseChangeError> {
    if (res.rowCount === 0 || res.rowCount > 1) { return err('NONE_OR_MORE_THAN_ONE_CHANGES_TO_DATABASE') }
    return ok(null)
}

import { ok, err, Result } from 'neverthrow';
import type pg from 'pg';
import { expectOneChangeToDatabase, notOneDatabaseChangeError } from '../dbUtils/dbHelpers';

let tutorialLevels: number[] = []

export async function loadTutorialLevels(pgPool: pg.Pool) {
    const progess = await getDefaultTutorialProgress(pgPool)
    tutorialLevels = progess.map((e) => e.length)
}

type validateTutorialIDAndStepError = 'TUTORIAL_ID_NOT_VALID' | 'TUTORIAL_STEP_NOT_VALID'
async function validateTutorialIDAndStep(tutorialID: number, tutorialStep: number): Promise<Result<null, validateTutorialIDAndStepError>> {
    if (!Number.isInteger(tutorialID) || tutorialID < 0 || tutorialID >= tutorialLevels.length) { return err('TUTORIAL_ID_NOT_VALID') }
    if (!Number.isInteger(tutorialStep) || tutorialStep < 0 || tutorialStep >= tutorialLevels[tutorialID]) { return err('TUTORIAL_STEP_NOT_VALID') }
    return ok(null)
}

export async function getDefaultTutorialProgress(pgPool: pg.Pool): Promise<boolean[][]> {
    const dbRes = await pgPool.query<{ tutorial: string }>('SELECT to_jsonb(column_default) as tutorial FROM information_schema.columns WHERE table_schema = \'public\' AND table_name = \'users\' AND column_name = \'tutorial\';')
    if (dbRes.rowCount !== 1) { throw new Error('Tutorial progress default value could not be queried') }
    return JSON.parse(dbRes.rows[0].tutorial.substring(1, dbRes.rows[0].tutorial.length - 8))
}

export async function getTutorialProgress(pgPool: pg.Pool, userID: number): Promise<Result<boolean[][], 'USER_NOT_FOUND'>> {
    const dbRes = await pgPool.query<{ tutorial: boolean[][] }>('SELECT tutorial FROM users WHERE id = $1;', [userID])

    if (dbRes.rowCount !== 1) { return err('USER_NOT_FOUND') }
    const tutorial = dbRes.rows[0].tutorial

    if (dbRes.rows[0].tutorial.flat().some((e) => typeof e !== 'boolean')) {
        await resetTutorialsCompletely(pgPool, userID)
        return err('USER_NOT_FOUND')
    }

    return ok(tutorial)
}

export async function resetTutorialProgress(pgPool: pg.Pool, userID: number, tutorialID: number) {
    const validationRes = await validateTutorialIDAndStep(tutorialID, 0)
    if (validationRes.isErr()) { return err(validationRes.error) }

    const newProgressRow = JSON.stringify(Array(tutorialLevels[tutorialID]).fill(false))
    const dbRes = await pgPool.query<{ tutorial: boolean[][] }>('UPDATE users SET tutorial = jsonb_set(tutorial, ARRAY[$2::text], $3) WHERE id = $1 RETURNING *;', [userID, tutorialID, newProgressRow])
    const dbChange = expectOneChangeToDatabase(dbRes)
    if (dbChange.isErr()) { return err(dbChange.error) }

    return ok(dbRes.rows[0].tutorial)
}

export async function resetTutorialsCompletely(pgPool: pg.Pool, userID: number) {
    const dbRes = await pgPool.query('UPDATE users SET tutorial = DEFAULT WHERE id = $1;', [userID])
    return expectOneChangeToDatabase(dbRes)
}

type setTutorialProgressError = validateTutorialIDAndStepError | notOneDatabaseChangeError
export async function setTutorialProgress(pgPool: pg.Pool, userID: number, tutorialID: number, tutorialStep: number, done: boolean): Promise<Result<boolean[][], setTutorialProgressError>> {
    const validationRes = await validateTutorialIDAndStep(tutorialID, tutorialStep)
    if (validationRes.isErr()) { return err(validationRes.error) }

    const dbRes = await pgPool.query<{ tutorial: boolean[][] }>('UPDATE users SET tutorial = jsonb_set(tutorial, ARRAY[$2::text,$3::text], $4) WHERE id = $1 RETURNING *;', [userID, tutorialID, tutorialStep, done])
    const dbChange = expectOneChangeToDatabase(dbRes)
    if (dbChange.isErr()) { return err(dbChange.error) }

    return ok(dbRes.rows[0].tutorial)
}

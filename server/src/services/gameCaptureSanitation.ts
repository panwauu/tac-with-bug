import type pg from 'pg';
import { cloneDeep } from 'lodash';
import { capturedType } from './capture';
import logger from '../helpers/logger';
import { repeatGame } from '../helpers/captureCompare';

export async function sanitizeGameCapture(pgPool: pg.Pool, gameID: number, checkOnlyLastLine?: boolean) {
    const res = await pgPool.query<{ id: number, game: capturedType[] }>('SELECT id, game FROM savegames WHERE id = $1;', [gameID])
    if (res.rows.length === 0) { return }
    const game = res.rows[0].game

    const changed = correctDealCards(game, checkOnlyLastLine)
        || removeDuplicateRows(game, checkOnlyLastLine)
        || correctTauschen(game, checkOnlyLastLine)
        || correctNarr(game, checkOnlyLastLine)

    if (changed) {
        await pgPool.query('UPDATE savegames SET game = $2 WHERE id = $1;', [gameID, JSON.stringify(game)])
        logger.info(`Changed Captured Game ${gameID}`)
    }
    return changed
}

function removeLinesFromGameCapture(game: capturedType[], linesToRemove: number[]) {
    [...new Set(linesToRemove)].sort((a, b) => b - a).forEach((i) => game.splice(i, 1))
}

function removeDuplicateRows(game: capturedType[], checkOnlyLastLine?: boolean): boolean {
    const linesToRemove: number[] = []
    const iStart = checkOnlyLastLine ? Math.max(0, game.length - 2) : 0
    for (let i = iStart; i < game.length - 1; i++) {
        if (JSON.stringify(game[i]) === JSON.stringify(game[i + 1])) { linesToRemove.push(i) }
    }
    if (linesToRemove.length > 0) { removeLinesFromGameCapture(game, linesToRemove) }
    return linesToRemove.length > 0
}

function correctTauschen(game: capturedType[], checkOnlyLastLine?: boolean): boolean {
    let linesToRemove: number[] = []
    const iStart = checkOnlyLastLine ? Math.max(1, game.length - 10) : 0
    for (let i = iStart; i < game.length; i++) {
        if (game[i].action?.[2] === 'tauschen' && game[i - 1].action?.[2] !== 'tauschen') {
            const tauschenPlayers: number[][] = [[], [], [], [], [], []]
            for (let iInner = i; iInner < game.length; iInner++) {
                if (game[iInner].action?.[2] !== 'tauschen') { break }
                tauschenPlayers[game[iInner].action[0] as number].push(iInner)
            }

            for (const indices of tauschenPlayers) {
                if (indices.length > 1) { linesToRemove = linesToRemove.concat(indices.sort().reverse().filter((_, i) => i > 0)) }
            }
        }
    }
    if (linesToRemove.length > 0) { removeLinesFromGameCapture(game, linesToRemove) }
    return linesToRemove.length > 0
}

function correctNarr(game: capturedType[], checkOnlyLastLine?: boolean): boolean {
    let linesToRemove: number[] = []

    const iStart = checkOnlyLastLine ? Math.max(1, game.length - 10) : 0
    for (let i = iStart; i < game.length; i++) {
        if (game[i].action?.[2] !== 'narr' || game[i - 1].action?.[2] === 'narr') { continue }

        const firstNarrLine = i;
        let lastNarrLine = i;
        const narrPlayers: number[][] = [[], [], [], [], [], []]
        for (let iInner = firstNarrLine; iInner < game.length; iInner++) {
            if (game[iInner].action?.[2] !== 'narr') { break }
            lastNarrLine = iInner
            narrPlayers[game[iInner].action[0] as number].push(iInner)
        }

        const playerCardsBeforeNarr = game[firstNarrLine - 1].cards.players
        for (const [playerIndex, indices] of narrPlayers.entries()) {
            if (playerCardsBeforeNarr[playerIndex]?.length === 0 && indices.length > 0) {
                linesToRemove = linesToRemove.concat(indices)
            } else if (indices.length > 1) {
                linesToRemove = linesToRemove.concat(indices.sort((a, b) => b - a).filter((_, i) => i > 0))
            }
        }

        if (linesToRemove.length > 0) {
            const cardsAfterNarr = cloneDeep(game[lastNarrLine].cards)
            const narrIndicesAfterRemove = [...Array(lastNarrLine - firstNarrLine + 1).keys()].map((x) => x + firstNarrLine).filter((x) => !linesToRemove.includes(x))
            const lastNarrIndexAfterRemove = Math.max(...narrIndicesAfterRemove)
            game[lastNarrIndexAfterRemove].cards = cardsAfterNarr
        }
    }

    if (linesToRemove.length > 0) { removeLinesFromGameCapture(game, linesToRemove) }
    return linesToRemove.length > 0
}

function correctDealCards(game: capturedType[], checkOnlyLastLine?: boolean): boolean {
    let swappedLines = false
    const iStart = checkOnlyLastLine ? Math.max(0, game.length - 2) : 0
    for (let i = iStart; i < game.length - 1; i++) {
        if (game[i].action === 'dealCards' && game[i + 1].action?.[2] !== 'tauschen') {
            [game[i], game[i + 1]] = [game[i + 1], game[i]]
            swappedLines = true
        }
    }
    return swappedLines
}

export async function removeInvalidCapturedMoves(pgPool: pg.Pool, gameID: number) {
    const res = await pgPool.query('SELECT id, game FROM savegames WHERE id = $1;', [gameID])
    if (res.rowCount === 0) { return }

    const game: capturedType[] = res.rows[0].game
    const result = repeatGame(game)

    const lineToRemoveWithFollowing = result.equal ? null : result.line
    if (lineToRemoveWithFollowing != null) {
        await pgPool.query('UPDATE savegames SET game = $2 WHERE id = $1;', [gameID, JSON.stringify(game.filter((_, i) => i < lineToRemoveWithFollowing))])
        console.log(`Changed Game ${gameID}: Removed ${lineToRemoveWithFollowing} to ${game.length - 1}`)
    }
}

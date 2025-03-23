from typing import Any, Literal, TypedDict, Optional
from gymnasium import spaces
from pettingzoo import AECEnv
import requests
import numpy as np

MAX_POSSIBLE_ACTIONS = 50


def get_initial_state(n_players: int, n_teams: int, meister: bool, coop: bool) -> Any:
    params = {
        "nPlayers": n_players,
        "nTeams": n_teams,
        "meister": meister,
        "coop": coop,
    }
    request = requests.get("http://localhost:3000/new", params=params)
    return request.json()


def perform_move(state: Any, current_player: int, move: Any) -> Any:
    json = {
        "data": state,
        "player": current_player,
        "move": move,
    }
    request = requests.post("http://localhost:3000/apply-action", json=json)
    return request.json()


class AiData(TypedDict):
    nPlayers: int
    teams: list[list[int]]
    coop: bool
    meisterVersion: bool
    gamePlayer: int

    balls: Any
    priorBalls: Any

    teufelFlag: bool

    tradeFlag: bool
    tradedCard: Optional[Any]
    tradeDirection: int
    hadOneOrThirteen: list[bool]

    narrTradedCards: Optional[list[Any]]

    cardsWithMoves: list[Any]
    discardPile: list[Any]
    previouslyUsedCards: list[Any]

    dealingPlayer: int

    activePlayer: int
    sevenChosenPlayer: Optional[int]


class AgentData(TypedDict):
    data: AiData
    moves: list[Any]


class CurrentState(TypedDict):
    additionalInformation: Any
    game: Any
    agentData: list[AgentData]


test: AiData = {
    "nPlayers": 4,
    "teams": [[0, 2], [1, 3]],
    "coop": False,
    "meisterVersion": True,
    "gamePlayer": 0,
    "balls": [
        {"state": "locked", "player": 0, "position": 81},
        {"state": "locked", "player": 0, "position": 83},
        {"state": "valid", "player": 0, "position": 76},
        {"state": "locked", "player": 0, "position": 82},
        {"state": "house", "player": 1, "position": 5},
        {"state": "house", "player": 1, "position": 4},
        {"state": "house", "player": 1, "position": 6},
        {"state": "locked", "player": 1, "position": 87},
        {"state": "house", "player": 2, "position": 10},
        {"state": "locked", "player": 2, "position": 91},
        {"state": "locked", "player": 2, "position": 90},
        {"state": "house", "player": 2, "position": 8},
        {"state": "valid", "player": 3, "position": 73},
        {"state": "house", "player": 3, "position": 12},
        {"state": "locked", "player": 3, "position": 94},
        {"state": "locked", "player": 3, "position": 95},
    ],
    "priorBalls": [
        {"state": "locked", "player": 0, "position": 81},
        {"state": "locked", "player": 0, "position": 83},
        {"state": "valid", "player": 0, "position": 76},
        {"state": "locked", "player": 0, "position": 82},
        {"state": "house", "player": 1, "position": 5},
        {"state": "house", "player": 1, "position": 4},
        {"state": "house", "player": 1, "position": 6},
        {"state": "locked", "player": 1, "position": 87},
        {"state": "house", "player": 2, "position": 10},
        {"state": "locked", "player": 2, "position": 91},
        {"state": "locked", "player": 2, "position": 90},
        {"state": "house", "player": 2, "position": 8},
        {"state": "valid", "player": 3, "position": 73},
        {"state": "house", "player": 3, "position": 12},
        {"state": "locked", "player": 3, "position": 94},
        {"state": "locked", "player": 3, "position": 95},
    ],
    "teufelFlag": False,
    "tradeFlag": True,
    "tradedCard": None,
    "tradeDirection": 1,
    "hadOneOrThirteen": [True, True, False, True],
    "narrTradedCards": None,
    "cardsWithMoves": [
        {"title": "6", "possible": True, "ballActions": {}, "textAction": "tauschen"},
        {"title": "9", "possible": True, "ballActions": {}, "textAction": "tauschen"},
        {"title": "5", "possible": True, "ballActions": {}, "textAction": "tauschen"},
        {"title": "1", "possible": True, "ballActions": {}, "textAction": "tauschen"},
        {"title": "1", "possible": True, "ballActions": {}, "textAction": "tauschen"},
    ],
    "discardPile": [],
    "previouslyUsedCards": ["8", "3", "2", "7", "5", "5", "1", "1", "3", "5", "4", "8", "9", "10", "7", "trickser", "12", "10", "2", "12"],
    "dealingPlayer": 1,
    "activePlayer": 1,
    "sevenChosenPlayer": None,
}

test_moves = [[0, 0, 1, 83], [0, 0, 2, 44], [0, 3, 2, 47], [0, 4, 2, 45]]

testtest = {
    "discardPile": [],
    "previouslyUsedCards": ["8", "3", "2", "7", "5", "5", "1", "1", "3", "5", "4", "8", "9", "10", "7", "trickser", "12", "10", "2", "12"],
}

testtesttest = {
    "additionalInformation": {
        "hadOneOrThirteen": [True, True, True, True],
        "tradedCards": ["1", None, None, None],
        "narrTradedCards": [None, None, None, None],
        "previouslyUsedCards": [],
    },
    "game": {
        "nPlayers": 4,
        "coop": False,
        "priorBalls": [
            {"state": "house", "player": 0, "position": 0},
            {"state": "house", "player": 0, "position": 1},
            {"state": "house", "player": 0, "position": 2},
            {"state": "house", "player": 0, "position": 3},
            {"state": "house", "player": 1, "position": 4},
            {"state": "house", "player": 1, "position": 5},
            {"state": "house", "player": 1, "position": 6},
            {"state": "house", "player": 1, "position": 7},
            {"state": "house", "player": 2, "position": 8},
            {"state": "house", "player": 2, "position": 9},
            {"state": "house", "player": 2, "position": 10},
            {"state": "house", "player": 2, "position": 11},
            {"state": "house", "player": 3, "position": 12},
            {"state": "house", "player": 3, "position": 13},
            {"state": "house", "player": 3, "position": 14},
            {"state": "house", "player": 3, "position": 15},
        ],
        "aussetzenFlag": False,
        "teufelFlag": False,
        "tradeFlag": True,
        "tradedCards": ["1", None, None, None],
        "tradeDirection": -1,
        "narrFlag": [False, False, False, False],
        "narrTradedCards": [None, None, None, None],
        "balls": [
            {"state": "house", "player": 0, "position": 0},
            {"state": "house", "player": 0, "position": 1},
            {"state": "house", "player": 0, "position": 2},
            {"state": "house", "player": 0, "position": 3},
            {"state": "house", "player": 1, "position": 4},
            {"state": "house", "player": 1, "position": 5},
            {"state": "house", "player": 1, "position": 6},
            {"state": "house", "player": 1, "position": 7},
            {"state": "house", "player": 2, "position": 8},
            {"state": "house", "player": 2, "position": 9},
            {"state": "house", "player": 2, "position": 10},
            {"state": "house", "player": 2, "position": 11},
            {"state": "house", "player": 3, "position": 12},
            {"state": "house", "player": 3, "position": 13},
            {"state": "house", "player": 3, "position": 14},
            {"state": "house", "player": 3, "position": 15},
        ],
        "cards": {
            "dealingPlayer": 2,
            "discardPlayer": 0,
            "discardedFlag": False,
            "deck": [
                "12",
                "8",
                "5",
                "1",
                "13",
                "trickser",
                "1",
                "4",
                "tac",
                "8",
                "13",
                "13",
                "12",
                "8",
                "trickser",
                "12",
                "3",
                "12",
                "6",
                "4",
                "10",
                "12",
                "1",
                "4",
                "1",
                "1",
                "8",
                "2",
                "9",
                "1",
                "3",
                "2",
                "6",
                "6",
                "3",
                "9",
                "3",
                "tac",
                "3",
                "5",
                "13",
                "5",
                "7",
                "7",
                "6",
                "2",
                "4",
                "trickser",
                "trickser",
                "engel",
                "2",
                "5",
                "8",
                "2",
                "1",
                "1",
                "6",
                "4",
                "4",
                "10",
                "7",
                "4",
                "12",
                "9",
                "trickser",
                "3",
                "7",
                "trickser",
                "8",
                "9",
                "10",
                "narr",
                "2",
                "trickser",
                "5",
                "7",
                "6",
                "8",
                "7",
                "9",
                "5",
                "krieger",
                "10",
                "10",
            ],
            "discardPile": [],
            "players": [["7", "7", "tac", "teufel"], ["12", "5", "13", "13", "9"], ["10", "6", "9", "10", "13"], ["2", "13", "3", "13", "tac"]],
            "meisterVersion": True,
            "hadOneOrThirteen": [True, True, True, True],
            "previouslyPlayedCards": [],
        },
        "teams": [[0, 2], [1, 3]],
        "cardsWithMoves": [],
        "activePlayer": 2,
        "sevenChosenPlayer": None,
        "gameEnded": False,
        "winningTeams": [False, False],
        "statistic": [
            {
                "cards": {
                    "1": [0, 0, 1],
                    "4": [0, 0, 0],
                    "7": [0, 0, 0],
                    "8": [0, 0, 0],
                    "13": [0, 0, 0],
                    "total": [0, 0, 1],
                    "trickser": [0, 0, 0],
                    "tac": [0, 0, 0],
                    "engel": [0, 0, 0],
                    "teufel": [0, 0, 0],
                    "krieger": [0, 0, 0],
                    "narr": [0, 0, 0],
                },
                "actions": {
                    "nMoves": 1,
                    "nBallsLost": 0,
                    "nBallsKickedEnemy": 0,
                    "nBallsKickedOwnTeam": 0,
                    "nBallsKickedSelf": 0,
                    "timePlayed": 0,
                    "nAbgeworfen": 0,
                    "nAussetzen": 0,
                },
            },
            {
                "cards": {
                    "1": [0, 0, 0],
                    "4": [0, 0, 0],
                    "7": [0, 0, 0],
                    "8": [0, 0, 0],
                    "13": [0, 0, 0],
                    "total": [0, 0, 0],
                    "trickser": [0, 0, 0],
                    "tac": [0, 0, 0],
                    "engel": [0, 0, 0],
                    "teufel": [0, 0, 0],
                    "krieger": [0, 0, 0],
                    "narr": [0, 0, 0],
                },
                "actions": {
                    "nMoves": 0,
                    "nBallsLost": 0,
                    "nBallsKickedEnemy": 0,
                    "nBallsKickedOwnTeam": 0,
                    "nBallsKickedSelf": 0,
                    "timePlayed": 0,
                    "nAbgeworfen": 0,
                    "nAussetzen": 0,
                },
            },
            {
                "cards": {
                    "1": [0, 0, 0],
                    "4": [0, 0, 0],
                    "7": [0, 0, 0],
                    "8": [0, 0, 0],
                    "13": [0, 0, 0],
                    "total": [0, 0, 0],
                    "trickser": [0, 0, 0],
                    "tac": [0, 0, 0],
                    "engel": [0, 0, 0],
                    "teufel": [0, 0, 0],
                    "krieger": [0, 0, 0],
                    "narr": [0, 0, 0],
                },
                "actions": {
                    "nMoves": 0,
                    "nBallsLost": 0,
                    "nBallsKickedEnemy": 0,
                    "nBallsKickedOwnTeam": 0,
                    "nBallsKickedSelf": 0,
                    "timePlayed": 0,
                    "nAbgeworfen": 0,
                    "nAussetzen": 0,
                },
            },
            {
                "cards": {
                    "1": [0, 0, 0],
                    "4": [0, 0, 0],
                    "7": [0, 0, 0],
                    "8": [0, 0, 0],
                    "13": [0, 0, 0],
                    "total": [0, 0, 0],
                    "trickser": [0, 0, 0],
                    "tac": [0, 0, 0],
                    "engel": [0, 0, 0],
                    "teufel": [0, 0, 0],
                    "krieger": [0, 0, 0],
                    "narr": [0, 0, 0],
                },
                "actions": {
                    "nMoves": 0,
                    "nBallsLost": 0,
                    "nBallsKickedEnemy": 0,
                    "nBallsKickedOwnTeam": 0,
                    "nBallsKickedSelf": 0,
                    "timePlayed": 0,
                    "nAbgeworfen": 0,
                    "nAussetzen": 0,
                },
            },
        ],
        "substitutedPlayerIndices": [],
    },
    "agentData": [
        {
            "data": {
                "nPlayers": 4,
                "teams": [[0, 2], [1, 3]],
                "coop": False,
                "meisterVersion": True,
                "gamePlayer": 0,
                "balls": [
                    {"state": "house", "player": 0, "position": 0},
                    {"state": "house", "player": 0, "position": 1},
                    {"state": "house", "player": 0, "position": 2},
                    {"state": "house", "player": 0, "position": 3},
                    {"state": "house", "player": 1, "position": 4},
                    {"state": "house", "player": 1, "position": 5},
                    {"state": "house", "player": 1, "position": 6},
                    {"state": "house", "player": 1, "position": 7},
                    {"state": "house", "player": 2, "position": 8},
                    {"state": "house", "player": 2, "position": 9},
                    {"state": "house", "player": 2, "position": 10},
                    {"state": "house", "player": 2, "position": 11},
                    {"state": "house", "player": 3, "position": 12},
                    {"state": "house", "player": 3, "position": 13},
                    {"state": "house", "player": 3, "position": 14},
                    {"state": "house", "player": 3, "position": 15},
                ],
                "priorBalls": [
                    {"state": "house", "player": 0, "position": 0},
                    {"state": "house", "player": 0, "position": 1},
                    {"state": "house", "player": 0, "position": 2},
                    {"state": "house", "player": 0, "position": 3},
                    {"state": "house", "player": 1, "position": 4},
                    {"state": "house", "player": 1, "position": 5},
                    {"state": "house", "player": 1, "position": 6},
                    {"state": "house", "player": 1, "position": 7},
                    {"state": "house", "player": 2, "position": 8},
                    {"state": "house", "player": 2, "position": 9},
                    {"state": "house", "player": 2, "position": 10},
                    {"state": "house", "player": 2, "position": 11},
                    {"state": "house", "player": 3, "position": 12},
                    {"state": "house", "player": 3, "position": 13},
                    {"state": "house", "player": 3, "position": 14},
                    {"state": "house", "player": 3, "position": 15},
                ],
                "teufelFlag": False,
                "tradeFlag": True,
                "tradedCard": "1",
                "tradeDirection": -1,
                "hadOneOrThirteen": [True, True, True, True],
                "narrTradedCards": None,
                "cardsWithMoves": [
                    {"title": "7", "possible": False, "ballActions": {}, "textAction": ""},
                    {"title": "7", "possible": False, "ballActions": {}, "textAction": ""},
                    {"title": "tac", "possible": False, "ballActions": {}, "textAction": ""},
                    {"title": "teufel", "possible": False, "ballActions": {}, "textAction": ""},
                ],
                "discardPile": [],
                "previouslyUsedCards": [],
                "dealingPlayer": 2,
                "activePlayer": 2,
                "sevenChosenPlayer": None,
            },
            "moves": [],
        },
        {
            "data": {
                "nPlayers": 4,
                "teams": [[0, 2], [1, 3]],
                "coop": False,
                "meisterVersion": True,
                "gamePlayer": 0,
                "balls": [
                    {"state": "house", "player": 0, "position": 0},
                    {"state": "house", "player": 0, "position": 1},
                    {"state": "house", "player": 0, "position": 2},
                    {"state": "house", "player": 0, "position": 3},
                    {"state": "house", "player": 1, "position": 4},
                    {"state": "house", "player": 1, "position": 5},
                    {"state": "house", "player": 1, "position": 6},
                    {"state": "house", "player": 1, "position": 7},
                    {"state": "house", "player": 2, "position": 8},
                    {"state": "house", "player": 2, "position": 9},
                    {"state": "house", "player": 2, "position": 10},
                    {"state": "house", "player": 2, "position": 11},
                    {"state": "house", "player": 3, "position": 12},
                    {"state": "house", "player": 3, "position": 13},
                    {"state": "house", "player": 3, "position": 14},
                    {"state": "house", "player": 3, "position": 15},
                ],
                "priorBalls": [
                    {"state": "house", "player": 0, "position": 0},
                    {"state": "house", "player": 0, "position": 1},
                    {"state": "house", "player": 0, "position": 2},
                    {"state": "house", "player": 0, "position": 3},
                    {"state": "house", "player": 1, "position": 4},
                    {"state": "house", "player": 1, "position": 5},
                    {"state": "house", "player": 1, "position": 6},
                    {"state": "house", "player": 1, "position": 7},
                    {"state": "house", "player": 2, "position": 8},
                    {"state": "house", "player": 2, "position": 9},
                    {"state": "house", "player": 2, "position": 10},
                    {"state": "house", "player": 2, "position": 11},
                    {"state": "house", "player": 3, "position": 12},
                    {"state": "house", "player": 3, "position": 13},
                    {"state": "house", "player": 3, "position": 14},
                    {"state": "house", "player": 3, "position": 15},
                ],
                "teufelFlag": False,
                "tradeFlag": True,
                "tradedCard": None,
                "tradeDirection": -1,
                "hadOneOrThirteen": [True, True, True, True],
                "narrTradedCards": None,
                "cardsWithMoves": [
                    {"title": "12", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                    {"title": "5", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                    {"title": "13", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                    {"title": "13", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                    {"title": "9", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                ],
                "discardPile": [],
                "previouslyUsedCards": [],
                "dealingPlayer": 1,
                "activePlayer": 1,
                "sevenChosenPlayer": None,
            },
            "moves": [[0, 0, "tauschen"], [0, 1, "tauschen"], [0, 2, "tauschen"], [0, 3, "tauschen"], [0, 4, "tauschen"]],
        },
        {
            "data": {
                "nPlayers": 4,
                "teams": [[0, 2], [1, 3]],
                "coop": False,
                "meisterVersion": True,
                "gamePlayer": 0,
                "balls": [
                    {"state": "house", "player": 0, "position": 0},
                    {"state": "house", "player": 0, "position": 1},
                    {"state": "house", "player": 0, "position": 2},
                    {"state": "house", "player": 0, "position": 3},
                    {"state": "house", "player": 1, "position": 4},
                    {"state": "house", "player": 1, "position": 5},
                    {"state": "house", "player": 1, "position": 6},
                    {"state": "house", "player": 1, "position": 7},
                    {"state": "house", "player": 2, "position": 8},
                    {"state": "house", "player": 2, "position": 9},
                    {"state": "house", "player": 2, "position": 10},
                    {"state": "house", "player": 2, "position": 11},
                    {"state": "house", "player": 3, "position": 12},
                    {"state": "house", "player": 3, "position": 13},
                    {"state": "house", "player": 3, "position": 14},
                    {"state": "house", "player": 3, "position": 15},
                ],
                "priorBalls": [
                    {"state": "house", "player": 0, "position": 0},
                    {"state": "house", "player": 0, "position": 1},
                    {"state": "house", "player": 0, "position": 2},
                    {"state": "house", "player": 0, "position": 3},
                    {"state": "house", "player": 1, "position": 4},
                    {"state": "house", "player": 1, "position": 5},
                    {"state": "house", "player": 1, "position": 6},
                    {"state": "house", "player": 1, "position": 7},
                    {"state": "house", "player": 2, "position": 8},
                    {"state": "house", "player": 2, "position": 9},
                    {"state": "house", "player": 2, "position": 10},
                    {"state": "house", "player": 2, "position": 11},
                    {"state": "house", "player": 3, "position": 12},
                    {"state": "house", "player": 3, "position": 13},
                    {"state": "house", "player": 3, "position": 14},
                    {"state": "house", "player": 3, "position": 15},
                ],
                "teufelFlag": False,
                "tradeFlag": True,
                "tradedCard": None,
                "tradeDirection": -1,
                "hadOneOrThirteen": [True, True, True, True],
                "narrTradedCards": None,
                "cardsWithMoves": [
                    {"title": "10", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                    {"title": "6", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                    {"title": "9", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                    {"title": "10", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                    {"title": "13", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                ],
                "discardPile": [],
                "previouslyUsedCards": [],
                "dealingPlayer": 0,
                "activePlayer": 0,
                "sevenChosenPlayer": None,
            },
            "moves": [[0, 0, "tauschen"], [0, 1, "tauschen"], [0, 2, "tauschen"], [0, 3, "tauschen"], [0, 4, "tauschen"]],
        },
        {
            "data": {
                "nPlayers": 4,
                "teams": [[0, 2], [1, 3]],
                "coop": False,
                "meisterVersion": True,
                "gamePlayer": 0,
                "balls": [
                    {"state": "house", "player": 0, "position": 0},
                    {"state": "house", "player": 0, "position": 1},
                    {"state": "house", "player": 0, "position": 2},
                    {"state": "house", "player": 0, "position": 3},
                    {"state": "house", "player": 1, "position": 4},
                    {"state": "house", "player": 1, "position": 5},
                    {"state": "house", "player": 1, "position": 6},
                    {"state": "house", "player": 1, "position": 7},
                    {"state": "house", "player": 2, "position": 8},
                    {"state": "house", "player": 2, "position": 9},
                    {"state": "house", "player": 2, "position": 10},
                    {"state": "house", "player": 2, "position": 11},
                    {"state": "house", "player": 3, "position": 12},
                    {"state": "house", "player": 3, "position": 13},
                    {"state": "house", "player": 3, "position": 14},
                    {"state": "house", "player": 3, "position": 15},
                ],
                "priorBalls": [
                    {"state": "house", "player": 0, "position": 0},
                    {"state": "house", "player": 0, "position": 1},
                    {"state": "house", "player": 0, "position": 2},
                    {"state": "house", "player": 0, "position": 3},
                    {"state": "house", "player": 1, "position": 4},
                    {"state": "house", "player": 1, "position": 5},
                    {"state": "house", "player": 1, "position": 6},
                    {"state": "house", "player": 1, "position": 7},
                    {"state": "house", "player": 2, "position": 8},
                    {"state": "house", "player": 2, "position": 9},
                    {"state": "house", "player": 2, "position": 10},
                    {"state": "house", "player": 2, "position": 11},
                    {"state": "house", "player": 3, "position": 12},
                    {"state": "house", "player": 3, "position": 13},
                    {"state": "house", "player": 3, "position": 14},
                    {"state": "house", "player": 3, "position": 15},
                ],
                "teufelFlag": False,
                "tradeFlag": True,
                "tradedCard": None,
                "tradeDirection": -1,
                "hadOneOrThirteen": [True, True, True, True],
                "narrTradedCards": None,
                "cardsWithMoves": [
                    {"title": "2", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                    {"title": "13", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                    {"title": "3", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                    {"title": "13", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                    {"title": "tac", "possible": True, "ballActions": {}, "textAction": "tauschen"},
                ],
                "discardPile": [],
                "previouslyUsedCards": [],
                "dealingPlayer": 3,
                "activePlayer": 3,
                "sevenChosenPlayer": None,
            },
            "moves": [[0, 0, "tauschen"], [0, 1, "tauschen"], [0, 2, "tauschen"], [0, 3, "tauschen"], [0, 4, "tauschen"]],
        },
    ],
}

N_PLAYERS = 6
N_BALL_POSITIONS = 114
N_BALLS = 24

N_BALL_STATES = 5
balls_state_to_int_mapping = {"house": 0, "invalid": 1, "valid": 2, "goal": 3, "locked": 4}

N_CARD_NAMES = 36
card_to_int_mapping = {
    "1": 0,
    "2": 1,
    "3": 2,
    "4": 3,
    "5": 4,
    "6": 5,
    "7": 6,
    "8": 7,
    "9": 8,
    "10": 9,
    "12": 10,
    "13": 11,
    "trickser": 12,
    "tac": 13,
    "teufel": 14,
    "engel": 15,
    "narr": 16,
    "krieger": 17,
    "7-1": 18,
    "7-2": 19,
    "7-3": 20,
    "7-4": 21,
    "7-5": 22,
    "7-6": 23,
    "tac-1": 24,
    "tac-2": 25,
    "tac-3": 26,
    "tac-4": 27,
    "tac-5": 28,
    "tac-6": 29,
    "teufel-1": 30,
    "teufel-2": 31,
    "teufel-3": 32,
    "teufel-4": 33,
    "teufel-5": 34,
    "teufel-6": 35,
}

text_action_to_int_mapping = {"tauschen": 0, "narr": 1, "aussetzen": 2, "beenden": 3, "abwerfen": 4, "teufel": 5}
N_TEXT_ACTIONS = len(text_action_to_int_mapping)


def map_move_for_observation(move: list[Any]):
    return np.array([move[1], move[2], move[3], -1] if len(move) == 4 else [move[1], -1, -1, text_action_to_int_mapping[move[2]]], dtype=np.int8)


observation_space = spaces.Dict(
    {
        "basic": spaces.Dict(
            {
                "nPlayers": spaces.Box(low=4, high=6, shape=(1,), dtype=np.int8),
                "nTeams": spaces.Box(low=1, high=3, shape=(1,), dtype=np.int8),
                "meister": spaces.Discrete(2),
                "coop": spaces.Discrete(2),
                "player_to_team": spaces.Box(low=-1, high=2, shape=(N_PLAYERS,), dtype=np.int8),
            }
        ),
        "state": spaces.Dict(
            {
                "gamePlayer": spaces.Discrete(N_PLAYERS),
                "activePlayer": spaces.Discrete(N_PLAYERS),
                "dealingPlayer": spaces.Discrete(N_PLAYERS),
                "sevenChosenPlayer": spaces.Discrete(N_PLAYERS + 1, start=-1),
                "teufelFlag": spaces.Discrete(2),
                "tradeFlag": spaces.Discrete(2),
                "tradeDirection": spaces.Discrete(3, start=-1),
                "hadOneOrThirteen": spaces.Box(low=0, high=1, shape=(N_PLAYERS,), dtype=np.int8),
                "tradedCard": spaces.Discrete(N_CARD_NAMES + 1, start=-1),
                "narrTradedCards": spaces.Box(low=-1, high=N_CARD_NAMES, shape=(N_PLAYERS,), dtype=np.int8),
                "cards": spaces.Box(low=-1, high=N_CARD_NAMES, shape=(N_PLAYERS,), dtype=np.int8),
                "balls": spaces.Tuple(
                    tuple(
                        spaces.Dict(
                            {
                                "state": spaces.Discrete(N_BALL_STATES + 1, start=-1),
                                "player": spaces.Discrete(N_PLAYERS + 1, start=-1),
                                "position": spaces.Discrete(N_BALL_POSITIONS + 1, start=-1),
                            }
                        )
                        for _ in range(N_PLAYERS * 4)
                    )
                ),
                "priorBalls": spaces.Tuple(
                    tuple(
                        spaces.Dict(
                            {
                                "state": spaces.Discrete(N_BALL_STATES + 1, start=-1),
                                "player": spaces.Discrete(N_PLAYERS + 1, start=-1),
                                "position": spaces.Discrete(N_BALL_POSITIONS + 1, start=-1),
                            }
                        )
                        for _ in range(N_PLAYERS * 4)
                    )
                ),
            }
        ),
        # move: [cardIndex, ballIndex, newBallPosition, textAction]
        "moves": spaces.Box(
            low=np.tile(np.array([-1, -1, -1, -1], dtype=np.int8), (MAX_POSSIBLE_ACTIONS, 1)),
            high=np.tile(np.array([6, N_BALLS, N_BALL_POSITIONS, N_TEXT_ACTIONS], dtype=np.int8), (MAX_POSSIBLE_ACTIONS, 1)),
            shape=(MAX_POSSIBLE_ACTIONS, 4),
            dtype=np.int8,
        ),
    }
)
observation_space = spaces.Box(0, 1, (1,), np.int8)


def create_observation_space(data: AiData, moves: list[Any]):
    return np.zeros(1, np.int8)
    return {
        "basic": {
            "nPlayers": np.asarray([data["nPlayers"]], dtype=np.int8),
            "nTeams": np.asarray([len(data["teams"])], dtype=np.int8),
            "meister": data["meisterVersion"],
            "coop": data["coop"],
            "player_to_team": np.asarray(
                [-1 if i >= data["nPlayers"] else 0 if i in data["teams"][0] else 1 if i in data["teams"][1] else 2 for i in range(6)],
                dtype=np.int8,
            ),
        },
        "state": {
            "gamePlayer": data["gamePlayer"],
            "activePlayer": data["activePlayer"],
            "dealingPlayer": data["dealingPlayer"],
            "sevenChosenPlayer": data["sevenChosenPlayer"] if data["sevenChosenPlayer"] is not None else -1,
            "teufelFlag": data["teufelFlag"],
            "tradeFlag": data["tradeFlag"],
            "tradeDirection": data["tradeDirection"],
            "hadOneOrThirteen": np.asarray(data["hadOneOrThirteen"] + [0] * (N_PLAYERS - len(data["hadOneOrThirteen"])), dtype=np.int8),
            "tradedCard": card_to_int_mapping[data["tradedCard"]] if data["tradedCard"] is not None else -1,
            "narrTradedCards": np.asarray(
                [card_to_int_mapping[card] if card is not None else -1 for card in data["narrTradedCards"]]
                + [-1] * (N_PLAYERS - len(data["narrTradedCards"] or [])),
                dtype=np.int8,
            )
            if data["narrTradedCards"] is not None
            else np.asarray([-1] * N_PLAYERS, np.int8),
            "cards": np.asarray(
                [card_to_int_mapping[card["title"]] for card in data["cardsWithMoves"]] + [-1] * (N_PLAYERS - len(data["cardsWithMoves"])),
                dtype=np.int8,
            ),
            "balls": tuple(
                [
                    {
                        "state": balls_state_to_int_mapping[ball["state"]],
                        "player": ball["player"],
                        "position": ball["position"],
                    }
                    for ball in data["balls"]
                ]
                + [
                    {
                        "state": -1,
                        "player": -1,
                        "position": -1,
                    }
                ]
                * (N_PLAYERS * 4 - len(data["balls"]))
            ),
            "priorBalls": tuple(
                [
                    {
                        "state": balls_state_to_int_mapping[ball["state"]],
                        "player": ball["player"],
                        "position": ball["position"],
                    }
                    for ball in data["priorBalls"]
                ]
                + [
                    {
                        "state": -1,
                        "player": -1,
                        "position": -1,
                    }
                ]
                * (N_PLAYERS * 4 - len(data["balls"]))
            ),
        },
        "moves": np.array(
            [map_move_for_observation(move) for move in moves[0:MAX_POSSIBLE_ACTIONS]]
            + [np.array([-1, -1, -1, -1], dtype=np.int8)] * (MAX_POSSIBLE_ACTIONS - len(moves))
        ),
    }


print(observation_space.contains(create_observation_space(test, test_moves)))
print(observation_space.contains(create_observation_space(testtesttest["agentData"][0]["data"], testtesttest["agentData"][0]["moves"])))
print(observation_space.contains(create_observation_space(testtesttest["agentData"][1]["data"], testtesttest["agentData"][1]["moves"])))
print(observation_space.contains(create_observation_space(testtesttest["agentData"][2]["data"], testtesttest["agentData"][2]["moves"])))
print(observation_space.contains(create_observation_space(testtesttest["agentData"][3]["data"], testtesttest["agentData"][3]["moves"])))


class TacEnv(AECEnv[str, Any, Any]):
    n_players: Literal[4, 6]
    n_teams: Literal[2, 3]
    meister: bool
    coop: bool
    current_state: CurrentState

    metadata = {"render.modes": [], "name": "tac-with-bug"}

    def __init__(self, render_mode=None):
        super().__init__()
        self.render_mode = render_mode
        self.possible_agents = [f"player_{r}" for r in range(6)]
        self.observation_spaces = {
            agent: spaces.Dict(
                {
                    "observation": observation_space,
                    "action_mask": spaces.Box(low=0, high=1, shape=(MAX_POSSIBLE_ACTIONS,), dtype=np.int8),
                }
            )
            for agent in self.possible_agents
        }
        self.action_spaces = {agent: spaces.Discrete(MAX_POSSIBLE_ACTIONS) for agent in self.possible_agents}

    # Observation space should be defined here.
    def observation_space(self, agent):
        return self.observation_spaces[agent]

    # Action space should be defined here.
    def action_space(self, agent):
        return self.action_spaces[agent]

    def render(self):
        pass

    def close(self):
        pass

    def reset(self, seed=None, options=None):
        """
        Reset needs to initialize the following attributes
        - agents
        - rewards
        - _cumulative_rewards
        - terminations
        - truncations
        - infos
        - agent_selection
        And must set up the environment so that render(), step(), and observe()
        can be called without issues.
        Here it sets up the state dictionary which is used by step() and the observations dictionary which is used by step() and observe()
        """
        self.n_players = options.get("n_players", 4) if options else 4
        self.n_teams = options.get("n_teams", 2) if options else 2
        self.meister = options.get("meister", True) if options else True
        self.coop = options.get("coop", False) if options else False

        self.current_state = get_initial_state(self.n_players, self.n_teams, self.meister, self.coop)

        self.agents = self.possible_agents[0 : self.n_players]
        self.rewards = {agent: 0 for agent in self.agents}
        self._cumulative_rewards = {agent: 0 for agent in self.agents}
        self.terminations = {agent: False for agent in self.agents}
        self.truncations = {agent: False for agent in self.agents}
        self.infos = {agent: {} for agent in self.agents}
        self.num_moves = 0

        self.agent_selection = self.agents[self._get_next_player()]

    def step(self, action: int):
        # Somehow step is called once more after termination to clear up the environment
        if self.terminations[self.agent_selection] or self.truncations[self.agent_selection]:
            self._was_dead_step(action)
            return

        # Check if the action is valid
        if action is None and not any(self.terminations.values()):
            raise ValueError("Action is None but not all agents have terminated.")

        # Get player index of the current agent
        player_index = self._get_player_index_from_agent_selection()

        # Get the action from the current agent, if not valid choose the first action
        action_out_of_bounds = action >= len(self.current_state["agentData"][player_index]["moves"])
        chosen_action = (
            self.current_state["agentData"][player_index]["moves"][action]
            if not action_out_of_bounds
            else self.current_state["agentData"][player_index]["moves"][0]
        )

        # Perform the move and get the new state
        new_state = perform_move(
            self.current_state,
            player_index,
            chosen_action,
        )

        # Calculate the reward and check if the game is done, if invalid move -100 reward
        rewards, done = self._calculate_reward(self.current_state, new_state, action_out_of_bounds)
        self.rewards = rewards
        self._cumulative_rewards[self.agent_selection] = 0.0
        self._accumulate_rewards()

        # Update the state
        self.current_state = new_state
        self.num_moves += 1

        # Next player or termination
        if done:
            self.terminations = {agent: True for agent in self.agents}
        else:
            self.agent_selection = self.agents[self._get_next_player()]

    def _get_next_player(self):
        next_player_index = next(
            (i for i in range(len(self.agents)) if len(self.current_state["agentData"][i]["moves"]) > 0),
            None,
        )
        if next_player_index is None:
            raise ValueError("No valid player with possible moves found.")
        return next_player_index

    def _get_player_index_from_agent_selection(self):
        """get the index of the current player in the agents list"""
        return self.agents.index(self.agent_selection)

    def _get_player_index_from_agent(self, agent: str):
        """get the index of the current player in the agents list"""
        return self.agents.index(agent)

    def _calculate_reward(self, prev_state, new_state, out_of_bounds_move: bool) -> tuple[dict[str, float], bool]:
        # Custom reward logic based on your rules
        done = False
        if new_state["game"]["gameEnded"]:
            done = True

        player_index = self._get_player_index_from_agent_selection()
        players_in_my_team = (
            [team for team in self.current_state["game"]["teams"] if player_index in team][0] if not self.coop else range(self.n_players)
        )
        rewards_array: list[float] = [0.0 for _ in range(self.n_players)]

        # If the move was not valid
        if out_of_bounds_move:
            rewards_array[player_index] = -10.0
            rewards = {self.agents[i]: rewards_array[i] for i in range(self.n_players)}
            return rewards, done

        # If the game is done
        if done:
            rewards_array = [100.0 if i in players_in_my_team else -100.0 for i in rewards_array]
            rewards = {self.agents[i]: rewards_array[i] for i in range(self.n_players)}
            return rewards, done

        # Ball in house
        new_own_ball_in_house = False
        for i in range(len(new_state["game"]["balls"])):
            if (
                new_state["game"]["balls"][i]["player"] in players_in_my_team
                and new_state["game"]["balls"][i]["state"] in ("locked", "goal")
                and prev_state["game"]["balls"][i]["state"] not in ("locked", "goal")
            ):
                new_own_ball_in_house = True
        if new_own_ball_in_house:
            rewards_array = [5.0 if i in players_in_my_team else 0.0 for i in rewards_array]
            rewards = {self.agents[i]: rewards_array[i] for i in range(self.n_players)}
            return rewards, done

        # If killed enemy ball
        killed_enemy_ball = False
        for i in range(len(new_state["game"]["balls"])):
            if (
                new_state["game"]["balls"][i]["player"] not in players_in_my_team
                and new_state["game"]["balls"][i]["state"] in ("house")
                and prev_state["game"]["balls"][i]["state"] not in ("house")
            ):
                killed_enemy_ball = True
        if killed_enemy_ball:
            rewards_array = [2.0 if i in players_in_my_team else -2.0 for i in rewards_array]
            rewards = {self.agents[i]: rewards_array[i] for i in range(self.n_players)}
            return rewards, done

        rewards = {self.agents[i]: rewards_array[i] for i in range(self.n_players)}
        return rewards, done

    def _get_observation(self, player_index):
        return create_observation_space(self.current_state["agentData"][player_index]["data"], self.current_state["agentData"][player_index]["moves"])

    def _get_action_mask(self, player_index):
        """Mask all invalid actions"""
        mask = np.zeros(MAX_POSSIBLE_ACTIONS, dtype=np.int8)
        mask[: len(self.current_state["agentData"][player_index]["moves"])] = 1
        return mask

    def observe(self, agent):
        """Combine observation and action mask"""
        return {
            "observation": self._get_observation(self._get_player_index_from_agent(agent)),
            "action_mask": self._get_action_mask(self._get_player_index_from_agent(agent)),
        }

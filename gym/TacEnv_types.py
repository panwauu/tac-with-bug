from typing import Any, TypedDict, Optional


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

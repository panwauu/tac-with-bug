import numpy as np
from tac_env_types import AiData


def get_card_count(nPlayers, meisterVersion):
    """
    Returns the card count for the given number of players and whether it's a Meister version.
    The card count is adjusted based on the number of players and the version of the game.
    """

    card_count = {
        "1": 9,
        "2": 7,
        "3": 7,
        "4": 7,
        "5": 7,
        "6": 7,
        "7": 8,
        "8": 7,
        "9": 7,
        "10": 7,
        "12": 7,
        "13": 9,
        "trickser": 7,
        "tac": 4,
        "krieger": 1,
        "engel": 1,
        "teufel": 1,
        "narr": 1,
    }

    if nPlayers == 6 and meisterVersion:
        card_count["12"] -= 2
    elif nPlayers == 6 and not meisterVersion:
        card_count["12"] -= 2
        card_count["9"] -= 1
        card_count["10"] -= 1

    if not meisterVersion:
        card_count["krieger"] = 0
        card_count["narr"] = 0
        card_count["teufel"] = 0
        card_count["engel"] = 0

    return card_count


def get_card_probablities(data: AiData):
    """
    Returns the probablities of each card being in the next deals or in the other players hands
    """

    card_count = get_card_count(data["nPlayers"], data["meisterVersion"])

    for card in data["previouslyUsedCards"]:
        card_count[card] -= 1
    for card in data["discardPile"]:
        card_count[card] -= 1
    for card in data["cardsWithMoves"]:
        if card["title"] in card_count:
            card_count[card["title"]] -= 1

    remaining_cards = sum(card_count.values())
    return np.array(list(card_count.values()), dtype=np.float32) / (remaining_cards if remaining_cards > 0 else 1)

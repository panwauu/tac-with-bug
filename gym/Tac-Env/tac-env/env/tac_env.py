from tac_env_types import AiData, CurrentState
from typing import Any, Literal
from pettingzoo import AECEnv
from pettingzoo.utils import wrappers
import numpy as np
from gymnasium import spaces, logger
from card_probability_utils import get_card_probablities
import httpx
import json

MAX_POSSIBLE_ACTIONS = 50


N_PLAYERS = 6
N_BALL_POSITIONS = 114
N_BALLS = 24

balls_state_to_int_mapping = {"house": 0, "invalid": 1, "valid": 2, "goal": 3, "locked": 4}
N_BALL_STATES = len(balls_state_to_int_mapping)

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
N_CARD_NAMES = len(card_to_int_mapping)

text_action_to_int_mapping = {"tauschen": 0, "narr": 1, "aussetzen": 2, "beenden": 3, "abwerfen": 4, "teufel": 5}
N_TEXT_ACTIONS = len(text_action_to_int_mapping)


def map_move_for_observation(move: list[Any]):
    return np.array([move[1], move[2], move[3], -1] if len(move) == 4 else [move[1], -1, -1, text_action_to_int_mapping[move[2]]], dtype=np.int8)


observation_space = spaces.Dict(
    {
        "nPlayers": spaces.Box(low=4, high=6, shape=(1,), dtype=np.int8),
        "nTeams": spaces.Box(low=1, high=3, shape=(1,), dtype=np.int8),
        "meister": spaces.Discrete(2),
        "coop": spaces.Discrete(2),
        "player_to_team": spaces.Box(low=-1, high=2, shape=(N_PLAYERS,), dtype=np.int8),
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
        "balls": spaces.Box(
            low=np.tile(np.array([-1, -1, -1], dtype=np.int8), (N_PLAYERS * 4, 1)),
            high=np.tile(np.array([N_BALL_STATES, N_PLAYERS, N_BALL_POSITIONS], dtype=np.int8), (N_PLAYERS * 4, 1)),
            shape=(N_PLAYERS * 4, 3),
            dtype=np.int8,
        ),
        "priorBalls": spaces.Box(
            low=np.tile(np.array([-1, -1, -1], dtype=np.int8), (N_PLAYERS * 4, 1)),
            high=np.tile(np.array([N_BALL_STATES, N_PLAYERS, N_BALL_POSITIONS], dtype=np.int8), (N_PLAYERS * 4, 1)),
            shape=(N_PLAYERS * 4, 3),
            dtype=np.int8,
        ),
        # move: [cardIndex, ballIndex, newBallPosition, textAction]
        "moves": spaces.Box(
            low=np.tile(np.array([-1, -1, -1, -1], dtype=np.int8), (MAX_POSSIBLE_ACTIONS, 1)),
            high=np.tile(np.array([6, N_BALLS, N_BALL_POSITIONS, N_TEXT_ACTIONS], dtype=np.int8), (MAX_POSSIBLE_ACTIONS, 1)),
            shape=(MAX_POSSIBLE_ACTIONS, 4),
            dtype=np.int8,
        ),
        "cardProbabilities": spaces.Box(
            low=0,
            high=1,
            shape=(18,),
            dtype=np.float32,
        ),
    }
)


def create_observation_space(data: AiData, moves: list[Any]):
    return {
        "nPlayers": np.asarray([data["nPlayers"]], dtype=np.int8),
        "nTeams": np.asarray([len(data["teams"])], dtype=np.int8),
        "meister": 1 if data["meisterVersion"] else 0,
        "coop": 1 if data["coop"] else 0,
        "player_to_team": np.asarray(
            [-1 if i >= data["nPlayers"] else 0 if i in data["teams"][0] else 1 if i in data["teams"][1] else 2 for i in range(6)],
            dtype=np.int8,
        ),
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
        "balls": np.array(
            [
                np.array(
                    [
                        balls_state_to_int_mapping[ball["state"]],
                        ball["player"],
                        ball["position"],
                    ],
                    dtype=np.int8,
                )
                for ball in data["balls"]
            ]
            + [np.array([-1, -1, -1], dtype=np.int8)] * (N_PLAYERS * 4 - len(data["balls"])),
            dtype=np.int8,
        ),
        "priorBalls": np.array(
            [
                np.array(
                    [
                        balls_state_to_int_mapping[ball["state"]],
                        ball["player"],
                        ball["position"],
                    ],
                    dtype=np.int8,
                )
                for ball in data["priorBalls"]
            ]
            + [np.array([-1, -1, -1], dtype=np.int8)] * (N_PLAYERS * 4 - len(data["priorBalls"])),
            dtype=np.int8,
        ),
        "moves": np.array(
            [map_move_for_observation(move) for move in moves[0:MAX_POSSIBLE_ACTIONS]]
            + [np.array([-1, -1, -1, -1], dtype=np.int8)] * (MAX_POSSIBLE_ACTIONS - len(moves))
        ),
        "cardProbabilities": get_card_probablities(data),
    }


class raw_env(AECEnv[str, Any, Any]):
    n_players: Literal[4, 6]
    n_teams: Literal[2, 3]
    meister: bool
    coop: bool

    client: httpx.Client
    client_base_path: str

    current_state: CurrentState

    metadata = {"render_modes": ["human"], "name": "tac-with-bug"}

    def __init__(self, render_mode=None, uds_path: str | None = None, http_path: str | None = None):
        """
        Communication with the ts server needs to be done via a socket or http
        - uds_path: path to the socket
        - http_path: path to the http server
        - both are None: http://localhost:3000
        """
        super().__init__()
        self.render_mode = render_mode
        self.possible_agents = [f"player_{r}" for r in range(6)]
        self.observation_spaces = {
            agent: spaces.Dict(
                {
                    "observation": spaces.Box(low=-np.inf, high=np.inf, shape=(spaces.flatdim(observation_space),), dtype=np.int8),
                    "action_mask": spaces.Box(low=0, high=1, shape=(MAX_POSSIBLE_ACTIONS,), dtype=np.int8),
                }
            )
            for agent in self.possible_agents
        }
        self.action_spaces = {agent: spaces.Discrete(MAX_POSSIBLE_ACTIONS) for agent in self.possible_agents}

        http_path = "http://localhost:3000"

        if uds_path is not None:
            self.client = httpx.Client(transport=httpx.HTTPTransport(uds=uds_path))
            self.client_base_path = "http://localhost"
        elif http_path is not None:
            self.client = httpx.Client()
            self.client_base_path = http_path
        else:
            self.client = httpx.Client()
            self.client_base_path = "http://localhost:3000"

    # Observation space should be defined here.
    def observation_space(self, agent):
        return self.observation_spaces[agent]

    # Action space should be defined here.
    def action_space(self, agent):
        return self.action_spaces[agent]

    def render(self):
        if self.render_mode is None:
            logger.warn("You are calling render method without specifying any render mode.")
            return

        print(json.dumps(self.current_state, indent=4))

    def close(self):
        if hasattr(self, "client") and self.client is not None:
            self.client.close()

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

        self.current_state = self.get_initial_state(self.n_players, self.n_teams, self.meister, self.coop)

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
        new_state = self.perform_move(
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
            "observation": np.array(
                spaces.flatten(observation_space, self._get_observation(self._get_player_index_from_agent(agent))), dtype=np.int8
            ),
            "action_mask": self._get_action_mask(self._get_player_index_from_agent(agent)),
        }

    def get_initial_state(self, n_players: int, n_teams: int, meister: bool, coop: bool) -> Any:
        params = {
            "nPlayers": n_players,
            "nTeams": n_teams,
            "meister": meister,
            "coop": coop,
        }
        request = self.client.get(f"{self.client_base_path}/new", params=params)
        return request.json()

    def perform_move(self, state: Any, current_player: int, move: Any) -> Any:
        json = {
            "data": state,
            "player": current_player,
            "move": move,
        }
        request = self.client.post(f"{self.client_base_path}/apply-action", json=json)
        return request.json()


def env(render_mode=None):
    """
    The env function often wraps the environment in wrappers by default.
    You can find full documentation for these methods
    elsewhere in the developer documentation.
    """
    internal_render_mode = render_mode
    env = raw_env(render_mode=internal_render_mode)
    # This wrapper is only for environments which print results to the terminal
    if render_mode == "ansi":
        env = wrappers.CaptureStdoutWrapper(env)
    # this wrapper helps error handling for discrete action spaces
    env = wrappers.AssertOutOfBoundsWrapper(env)
    # Provides a wide vareity of helpful user errors
    # Strongly recommended
    env = wrappers.OrderEnforcingWrapper(env)
    return env

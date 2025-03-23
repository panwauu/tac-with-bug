from typing import Any, Literal, TypedDict, Optional
import gymnasium as gym
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
            agent: gym.spaces.Dict(
                {
                    "observation": gym.spaces.Box(low=0, high=1, shape=(1,), dtype=np.int8),
                    "action_mask": gym.spaces.Box(low=0, high=1, shape=(MAX_POSSIBLE_ACTIONS,), dtype=np.int8),
                }
            )
            for agent in self.possible_agents
        }
        self.action_spaces = {agent: gym.spaces.Discrete(MAX_POSSIBLE_ACTIONS) for agent in self.possible_agents}

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
        print(new_state)

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
        # TODO
        return np.zeros(1, dtype=np.int8)

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

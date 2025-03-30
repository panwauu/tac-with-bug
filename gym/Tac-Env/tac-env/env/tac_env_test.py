import unittest
from pettingzoo.test import api_test, performance_benchmark, render_test
import tac_env
import json


class TestTacEnv(unittest.TestCase):
    def test_pettingzoo_api_test(self):
        api_test(tac_env.env(), num_cycles=1000, verbose_progress=True)

    def test_pettingzoo_performance_benchmark(self):
        performance_benchmark(tac_env.env())

    def test_pettingzoo_render_test(self):
        render_test(tac_env.env)  # type: ignore

    def test_create_observation_space(self):
        with open("sample_data.json") as f:
            test = json.load(f)
            assert tac_env.observation_space.contains(tac_env.create_observation_space(test["data"], test["moves"]))

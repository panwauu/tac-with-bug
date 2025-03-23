import unittest
from pettingzoo.test import api_test, performance_benchmark
from TacEnv import TacEnv, observation_space, create_observation_space
import json


class TestTacEnv(unittest.TestCase):
    def test_pettingzoo_api_test(self):
        env = TacEnv()
        api_test(env, num_cycles=1000, verbose_progress=True)

    def test_pettingzoo_performance_benchmark(self):
        env = TacEnv()
        performance_benchmark(env)

    def test_create_observation_space(self):
        with open("gym/sample_data.json") as f:
            test = json.load(f)
            assert observation_space.contains(create_observation_space(test["data"], test["moves"]))

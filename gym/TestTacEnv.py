from pettingzoo.test import api_test, performance_benchmark
from TacEnv import TacEnv

env = TacEnv()
api_test(env, num_cycles=1000, verbose_progress=True)
performance_benchmark(env)

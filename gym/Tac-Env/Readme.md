# Definitions

## State space

The number of states can be approximated by ~10^41. Therefore, the space is huge and cannot be solved exactly.

## Action space

An analysis of the action space in a sample of 3 games led to the following statistical data:

- Number of states monitored: 970
- Average number of actions: 4,626804124
- Median number of actions: 4
- Variance in actions: 4,250526962
- Minimum number of action: 1
- Maximum number of actions: 39
- Lower quantile: 2
- Upper quantile: 5

## Game Stats

- With the hardcoded bot "Futuro" a game takes around `250 turns` (With better bots this could be faster because of better moves or longer because of more destructive behavior)
- In the performance benchmark we achieve around `450 turns per second`. This means around `0.55s per game`

## Setup

For the environment to run, we need the tac gym server in the background as the tac engine is written in `ts`. The interaction uses HTTP requests to communicate with the engine.

```bash
cd server
npm install
npm run tsc
npm run start:gym
```

Then we can execute the env, e.g. the tests

```bash
cd gym
# You probably want to initialize a venv here
# python -m venv .venv
# source .venv/bin/activate
pip install -r requirements.txt

cd Tac-Env/tac-env/env
python -m unittest discover -p "*_test.py"
```

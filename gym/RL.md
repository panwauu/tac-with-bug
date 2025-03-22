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

## Setup

For the environment to run, we need the tac gym server in the background

```bash
cd server
npm install
npm run tsc
npm run start:gym
```

Then we can execute the env, e.g. the test suite

```bash
cd gym
pip install -r requirements.txt
python TestTacEnv.py
```

# 26 November 2026 — The World in One Day (v4)

[![make.fun · news-image-20261126](https://make.fun/badge/news-image-20261126.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![rank](https://make.fun/badge/news-image-20261126/forwilson1-glitch/news-image-20261126-v2/rank.svg)](https://make.fun/bounty/news-image-20261126/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![reward](https://make.fun/badge/news-image-20261126/forwilson1-glitch/news-image-20261126-v2/reward.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)

One image summing up the world news of **Thursday 26 November 2026**, built for the
[make.fun bounty news-image-20261126](https://make.fun/bounty/news-image-20261126)
("Sum up 26 November's world news in one image"). This is the v4 rebuild, drawn
from the full day's news to replace the earlier v3 entry.

Owner: [forwilson1-glitch](https://github.com/forwilson1-glitch)

## The five stories

1. **Bomb cyclone slams the US East Coast (headline).** A Thanksgiving
   nor'easter pushes storm surges past Hurricane Sandy's levels — Cape May
   9.4 ft, Wachapreague 9.9 ft — with gusts to 75 mph. The 100th Macy's
   Thanksgiving Day Parade is postponed for the first time ever, moved to
   Saturday 28 November at 8:30 ET.
2. **Chess title tied (Geneva, sport).** Gukesh vs Sindarov, Game 3 of the
   World Chess Championship, ends in a 60-move draw — 1.5–1.5 after three
   games. Gukesh plays the Berlin Defence, Rio de Janeiro Variation;
   Sindarov makes move 40 with six seconds to spare.
3. **Europa League, Matchday 5 (sport).** Ten-man Bournemouth beat Celta
   2–1 to stay perfect (5 wins from 5); Milan come back from 0–2 down to
   win 4–2 at Olympiacos; Plzen thrash Benfica 4–0; Juventus beat Omonia 4–1.
4. **Constitution Day (India).** India marks 77 years since its Constitution
   was adopted on 26 November 1949.
5. **UK net migration (United Kingdom).** ONS figures published on the day
   put net migration at 77,000 in the year to June 2026 — the lowest in
   nearly 30 years, down from 204,000.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only, no network) draws `entry.png` from
scratch with a hand-built 5×7 bitmap font and a hand-written PNG encoder.
Running it twice produces byte-identical output.

## Files

- `entry.png` — the image, 1024×1024 PNG
- `main.ts` — the entry program
- `LICENSE` — MIT
- `package.json` — minimal package metadata
- `.makefun/owner.json` — claim file naming the payout wallet

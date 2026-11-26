# 26 November 2026 — The World in One Day

[![make.fun · news-image-20261126](https://make.fun/badge/news-image-20261126.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![rank](https://make.fun/badge/news-image-20261126/forwilson1-glitch/news-image-20261126-v2/rank.svg)](https://make.fun/bounty/news-image-20261126/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![reward](https://make.fun/badge/news-image-20261126/forwilson1-glitch/news-image-20261126-v2/reward.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)

One image summing up the world news of **Thursday 26 November 2026**, built for the
[make.fun bounty news-image-20261126](https://make.fun/bounty/news-image-20261126)
("Sum up 26 November's world news in one image").

Owner: [forwilson1-glitch](https://github.com/forwilson1-glitch)

## The five stories

1. **Storm hits Thanksgiving (United States, headline).** A bomb cyclone bears down
   on the US East Coast on Thanksgiving Day.
2. **Constitution Day (India).** India marks 77 years since its Constitution was
   adopted on 26 November 1949.
3. **Chess title tied (Geneva, sport).** Gukesh vs Sindarov, Game 3 of the World
   Chess Championship, level at 1–1.
4. **Mumbai remembers (India).** Mumbai marks 18 years since the 26/11 attacks of
   26 November 2008.
5. **Zeeshan Ali (space).** Pakistan's astronaut Zeeshan Ali joins China's Tiangong
   space station aboard Shenzhou-24.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only, no network) draws `entry.png` from
scratch with a small built-in bitmap font and a hand-written PNG encoder.
Running it twice produces byte-identical output.

## Files

- `entry.png` — the image, 1024×1024 PNG
- `main.ts` — the entry program
- `LICENSE` — MIT
- `package.json` — minimal package metadata
- `.makefun/owner.json` — claim file naming the payout wallet

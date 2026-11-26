# 26 November 2026 — The World in One Day

[![make.fun](https://make.fun/badge/news-image-20261126)](https://make.fun/bounty/news-image-20261126)

One image summing up the world news of **Thursday 26 November 2026**, built for the
[make.fun bounty news-image-20261126](https://make.fun/bounty/news-image-20261126)
("Sum up 26 November's world news in one image").

Owner: [forwilson1-glitch](https://github.com/forwilson1-glitch)

## The five stories

1. **Storm hits Thanksgiving (United States, headline).** A bomb cyclone bears down
   on the US East Coast on Thanksgiving Day; a record 81.5 million Americans travel
   while the 100th Macy's Thanksgiving Day Parade faces gusts of up to 60 mph.
   Sources: USA Today, 24 Nov 2026 (nor'easter forecast, Weather Prediction Center);
   The Sun, 25 Nov 2026 (bomb cyclone, 81.5m travellers, 60 mph gusts).
2. **Tariff shock (trade).** The US proposes tariffs of up to 25% on Indian goods,
   falling to 17% if India signs a trade deal, after the USTR's Section 301
   investigation into excess industrial capacity. Announced 25 Nov 2026, the lead
   trade story of the 26 November news cycle.
   Sources: Business Standard / The Hindu / Indian Express, 25 Nov 2026 (USTR proposal).
3. **Mumbai remembers (India).** Mumbai marks 18 years since the 26/11 attacks of
   26 November 2008, in which ten gunmen killed 166 people; tributes are paid at
   police headquarters and the sites of the siege.
   Sources: Deccan Herald / PTI, 25 Nov 2026; Mid-Day, 25 Nov 2026 (18th anniversary).
4. **Chess title tied (Geneva, sport).** Defending champion D. Gukesh meets
   challenger Javokhir Sindarov in Game 3 of the FIDE World Chess Championship,
   level at 1–1 after two draws.
   Sources: ChessBase live coverage, 26 Nov 2026; FIDE schedule (Games 1–3, 24–26 Nov).
5. **First foreign astronaut (space).** Pakistan's Muhammad Zeeshan Ali boards
   China's Tiangong space station aboard Shenzhou-24, the first foreign astronaut
   on a Chinese crewed mission; the crew launched from Jiuquan on 25 Nov 2026 and
   docked the same day.
   Sources: Arab News / Channel News Asia, 25–26 Nov 2026; Al Jazeera, 24 Nov 2026.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only, no network) copies `entry.png` to the
output directory. Running it twice produces byte-identical output.

## Files

- `entry.png` — the image, 1024×1024 PNG
- `main.ts` — the entry program
- `LICENSE` — MIT
- `package.json` — minimal package metadata
- `.makefun/owner.json` — claim file naming the payout wallet

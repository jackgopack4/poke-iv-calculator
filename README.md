# Gen 5 IV Calculator

Offline Pokémon IV calculator for Black, White, Black 2, and White 2. Works as a Progressive Web App — install it once and use it forever with no internet required.

**Live:** https://jackgopack4.github.io/poke-iv-calculator

## Features

- Full Gen 5 national Pokédex (649 species)
- Multi-level narrowing — enter stats at multiple levels to intersect possibilities
- IV range display with clickable tooltip showing all candidate IVs
- "Next useful level" hint per stat — tells you the lowest level where entering stats would narrow the IV set further
- Nature and Characteristic modifiers
- Hidden Power type filter (parity-based, verified against Marriland's calculator)
- EV support for partially-trained Pokémon, with carry-over when adding a new level row
- Pokémon Black/White dark theme

## Usage

1. Pick the species
2. Set the nature (visible on the summary screen in-game)
3. Enter the level and all six stats as shown on the in-game stat screen
4. Results appear instantly — click any "N possible" count to see the full IV list
5. Add more rows at higher levels to narrow the possibilities further

**Modifiers (all optional):**
- *Characteristic* — shown in-game on the summary screen, strongly constrains one stat
- *Hidden Power type* — check with the NPC in Mistralton City
- *EV toggle* — enable if your Pokémon has gained EVs from battles

## Install as PWA

- **iPhone/iPad:** Safari → Share → *Add to Home Screen*
- **Android:** Chrome → menu → *Add to Home Screen*
- **Desktop:** address bar install icon in Chrome/Edge

## Development

Single-file architecture — no build step, no dependencies.

| File | Purpose |
|---|---|
| `index.html` | All CSS and markup |
| `app.js` | IV math, UI logic, service worker registration |
| `pokemon-data.js` | Base stats for all 649 Gen 5 Pokémon |
| `sw.js` | Service worker (cache-first offline strategy) |
| `sort_options.js` | One-time script to alphabetize `<optgroup>` options |
| `test_vs_marriland.js` | Integration tests against Marriland's live API |
| `test_ev_carryover.js` | Unit tests for EV carry-over behavior |

```sh
# Run tests (requires internet for Marriland API tests)
node test_vs_marriland.js
node test_ev_carryover.js
```

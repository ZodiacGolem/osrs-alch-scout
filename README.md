# Alch Scout — OSRS F2P High Alchemy Profit Checker

Find the top five profitable **free-to-play** items to high alch in Old School RuneScape using current Grand Exchange trading data.

## GitHub repository description

**Live OSRS F2P High Alchemy profit checker — find the top 5 alch items using GE prices, rune costs, trade volume, buy limits, and your GP budget.**

## Features

- Free-to-play items only **by default** (optional members toggle)
- Current instant-buy prices, 1-hour averages, and hourly buy volume
- High Alchemy values and Grand Exchange buy limits
- Nature rune cost included, with optional fire rune cost
- Adjustable budget, price cushion, minimum trading volume, and price freshness
- Rank the top five by profit per alch, estimated total batch profit, or ROI
- Automatic refresh every minute while the page is visible
- Mobile-friendly, no sign-in, no backend, no paid hosting

## How profit is estimated

- **Buy estimate** = `ceil(max(latest instant-buy price, 1-hour average instant-buy price) + cushion)`
- **Rune cost** = `nature rune instant-buy price + (5 × fire rune instant-buy price if no fire staff)`
- **Profit per alch** = `item high-alch value − buy estimate − rune cost`
- **Estimated batch quantity** = `min(GE 4-hour buy limit, floor(budget / (buy estimate + rune cost)))`
- **Batch profit** = `profit per alch × estimated batch quantity`

The batch count is deliberately conservative: it assumes you have enough GP to purchase all items and runes upfront. In practice, alching returns coins after each cast, so you may be able to cycle that cash. Item GE limits are per four-hour window and are **not** per-hour trade volumes.

This checker uses the latest **instant-buy** trade (the API's `high` field), not the latest instant-sell (`low`), as a practical proxy for buying without a long wait. Prices are not guaranteed sell offers or real-time order-book quotes; GE orders may not fill at those prices. The hourly trade count is useful as a rough liquidity filter, not a guarantee.

## Data and attribution

Market data: [OSRS Wiki real-time prices API](https://oldschool.runescape.wiki/w/RuneScape:Real-time_Prices) (`/api/v2/osrs/mapping`, `/latest`, `/1h`). Requests are made client-side in your browser, so there is no API key or server. The browser sets its own User-Agent, which JavaScript cannot override. Avoid aggressive refreshing; the app refreshes once a minute when visible.

This project is not affiliated with, endorsed by, or associated with Jagex Ltd.

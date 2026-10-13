# 🥭 Mamey Planner

*[Leer en español](README.es.md)*

A **free, ad-free, no-artificial-limits** nutrition and body recomposition app — built so anyone, regardless of budget, can build better eating habits and work toward their physical goal.

**Open source.** Live site: https://mameyplanner.hjmg.mx

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-ffdd00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/surohsusej)

## Why "Mamey"?

In Mexico, "mamey" (the fruit, also called zapote) is also slang for someone muscular, strong, built — "está bien mamey" is a common, affectionate way to describe someone jacked. Hence the name: an app that helps you build that physique, with a mascot that literally "grows" with you as you stay consistent.

## Mission

Help people build better eating habits and reach their body recomposition or physical goals, removing the cost, complexity and advertising barriers that commercial nutrition apps impose.

## Vision

Be the most complete free, open-source alternative to apps like Foodvisor, Cal AI or MyFitnessPal — available on any device, backed by an open and verified nutrition database, with no payment or ads required to access full functionality.

## Objective

- **Short term:** stable v1 as a web app, usable on any browser/device.
- **Medium term:** keep growing as an **open-source** project so anyone can use, audit or improve it. *(Already done — see below.)*
- **Long term:** native apps (iOS/Android) with HealthKit/Health Connect integration.

## Philosophy

- **Free means free.** No "3 scans a day, then pay." Everything the app offers, it offers in full.
- **No ads**, ever.
- **Open, verified data** — Open Food Facts/USDA nutrition database, not uncontrolled crowdsourcing.
- **Privacy first** — if you use AI for photos, you bring your own API key (BYOK); your data never passes through a provider you didn't choose yourself.
- **Real cross-platform** — web now, native later, nobody left out based on what OS they use.

## Features

- Log food by **search**, **voice**, **barcode**, **AI photo** (your choice of provider) or **recipe URL import**.
- Custom foods when something isn't in the database.
- Automatic calorie/macro targets based on your goal (cut, bulk, recomposition, maintain) using real TDEE (Mifflin-St Jeor).
- Weight, body fat % and waist tracking, with a progress chart.
- Habit streaks to reinforce consistency.
- Dashboard with day-by-day navigation (not just "today").
- Micronutrients (fiber, sugar, sodium, vitamins, minerals) when the data source reports them.
- Account recovery without relying on an email server (one-time recovery code).
- Full export of your own data, any time.
- Step-by-step guided onboarding for people who know nothing about nutrition or tech.
- **AI assistant**: generates a full meal plan based on your goal, and a nutrition chat that knows your goal and what you've eaten today (uses your own API key).
- Push reminders at a random time of day (Duolingo-style) if you haven't logged anything yet.
- Installable as an app (PWA) on any device.

## Project status

🚧 **Actively developed**, but already open source. Runs as a web app (Docker). No optimized production build or automated tests yet — see Roadmap.

## Security

`docker-compose.yml` + `backend/.env.example` show which secrets the backend needs (`JWT_SECRET`, `AI_KEY_ENCRYPTION_SECRET`, and a `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` pair for push notifications). Copy `backend/.env.example` to `backend/.env` and fill in your own values — **never commit `.env`**. Generate secrets with `openssl rand -hex 32`, and the VAPID pair with `npx web-push generate-vapid-keys`.

## Running it locally

Requires Docker.

```bash
git clone https://github.com/horusglez/mamey-planner.git
cd mamey-planner
cp backend/.env.example backend/.env   # then fill in the values, see Security above
docker-compose up -d --build
```

- Web: http://localhost:3100
- API: http://localhost:4100/api

## Tech stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Nutrition data:** Open Food Facts (free, open API)
- **Photo AI (optional):** Anthropic Claude / OpenAI / Google Gemini — user's choice, with their own API key
- **Infrastructure:** Docker Compose

## Roadmap

- [ ] Production build (currently runs in dev mode)
- [ ] Native apps (iOS/Android) with HealthKit / Health Connect
- [ ] Automated tests

## License

MIT — see [LICENSE](LICENSE). Use it, modify it, whatever you want.

## Contributing

Issues and pull requests are welcome at [github.com/horusglez/mamey-planner](https://github.com/horusglez/mamey-planner).

## Support this project

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-ffdd00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/surohsusej)

Mamey Planner is free and always will be. If it's useful to you, you can [buy me a coffee](https://buymeacoffee.com/surohsusej) — completely optional, never required for any feature.

*Mamey Planner es gratis y siempre lo será. Si te es útil, puedes [invitarme un café](https://buymeacoffee.com/surohsusej) — totalmente opcional, nunca requerido para ninguna función.*

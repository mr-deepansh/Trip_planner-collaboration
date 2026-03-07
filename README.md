<div align="center">

# 🌍 Collaborative Trip Planning Platform

![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF.svg?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC.svg?logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20+-brightgreen.svg?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5+-purple.svg?logo=express&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg?logo=javascript&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?logo=postgresql&logoColor=white)
![Sequelize](https://img.shields.io/badge/Sequelize-6-52B0E7.svg?logo=sequelize&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Authentication-black.svg?logo=jsonwebtokens&logoColor=white)
![Nodemailer](https://img.shields.io/badge/Nodemailer-Email-44A6D8.svg?logo=nodemailer&logoColor=white)
![Winston](https://img.shields.io/badge/Winston-Logging-6B5A8A.svg)
![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![ESLint](https://img.shields.io/badge/Code%20Style-ESLint-4B32C3.svg?logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Formatter-Prettier-F7B93E.svg?logo=prettier&logoColor=black)
![Husky](https://img.shields.io/badge/Husky-Git_Hooks-A60000.svg?logo=husky&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-Validation-3E67B1.svg?logo=zod&logoColor=white)
![Security](https://img.shields.io/badge/Security-Enterprise_Grade-crimson.svg)
![License](https://img.shields.io/badge/License-MIT-gold.svg)

A complete, production-ready system for collaborative itinerary planning. Users can organize trips, add daily activities, define roles and access permissions, and collaborate seamlessly in real-time.

</div>

---

## 🎯 Project Goal & Vision

Planning a group trip is historically painful—involving scattered spreadsheets, endless messaging threads, duplicated bookings, and budget confusion.

**The Collaborative Trip Planning Platform** was engineered to solve this fragmentation. Our goal is to provide a single, centralized workspace where friends, families, and organizations can seamlessly lay out itineraries, assign logistical roles, manage daily activities, and finalize their travel plans in real time. 

By prioritizing a **Clean UI**, **Role-Based Security**, and **Real-Time Data Integrity**, this platform evolves trip planning from a chore into an exciting, collaborative experience.

---

## 👥 Target Audience & Use Cases

This platform is designed to scale from simple weekend getaways to complex corporate retreats:

1. **Friends & Family Vacations**: Easily track who is booking the hotel, coordinate arrival flights, and vote on daily sightseeing activities without getting lost in group chats.
2. **Corporate Offsites & Retreats**: Event coordinators can assign "Viewer" roles to attendees so they can see the schedule, while designating "Editors" to department heads managing specific breakouts.
3. **Backpacking & Multi-City Tours**: Utilize the **Smart Itinerary Builder** to auto-generate chronological days across different timezones, preventing logistical overlap.
4. **Travel Agents**: Professionals can curate visually stunning, detailed itineraries and share read-only access with their clients.

---

## ✨ Enterprise-Grade Features

### 🛡️ Advanced Security & Authentication
- **OAuth 2.0 Integration**: Secure, frictionless social logins via Google & GitHub APIs.
- **Stateless JWTs & HTTP-Only Cookies**: Ironclad session management guaranteeing protection against XSS and CSRF attacks.
- **Role-Based Access Control (RBAC)**: Fine-grained permission system featuring modular `Owner`, `Editor`, and `Viewer` hierarchies to protect itinerary integrity.
- **Strict Payload Validation**: Real-time request sanitization and schema generation powered natively by **Zod**.
- **Cryptographic Password Recovery**: Highly secure, time-limited, single-use email token dispatch system utilizing hashed variables and Nodemailer SMTP.

### 🗺️ Dynamic Trip Management & Itinerary Building
- **Smart Itinerary Engine**: Automatically generates sequential, chronological data structures (`Day 1`, `Day 2`) based on the user's chosen start and end dates.
- **Rich Activity Modules**: Deep entity support for classifying events via distinct cards (Flights, Hotels, Sightseeing, Food, Custom).
- **Relational Integrity**: Modeled with deeply nested SQL bounds (PostgreSQL/Sequelize) to safely cascade deletions (e.g., deleting a Trip automatically purges its Days and Activities).
- **Collaborative Workspace**: Add members via email lookup, seamlessly elevating their access tier within the trip dashboard.

### ⚙️ Core Architecture Decisions
- **Decoupled Monolith**: Controllers, Middlewares, Utilities, and Routes are cleanly isolated, paving the way for infinite horizontal scalability or future microservice separation.
- **Global Error Handling Pipeline**: Centralized exception interception preventing Node.js loop failures. Automatically sanitizes raw database errors before relaying user-friendly messages to the client.
- **ES6 Standardized**: Transitioned from legacy CommonJS to modern standard `import/export` syntax across the entire backend ecosystem.

---

## 📁 Monorepo Structure

The application is cleanly segmented into dedicated environments:

- **`/frontend`**: React + Vite + Tailwind CSS v4 + React Router Dom + Context API for state management + Lucide React for crisp SVG iconography.
- **`/backend`**: Node.js + Express.js + Sequelize ORM (PostgreSQL) + Winston Logger + Zod for runtime schema validation.

---

## 🛠️ Rapid Setup (Local Development)

### 1. Database Initialization
Ensure PostgreSQL is running locally on port `5432`. Create an empty database corresponding to your `.env` connection string (e.g., `trip_planner`).

### 2. Backend Boot
Open your terminal and execute:
```bash
cd backend
npm install
# Note: Sequelize automatically synchronizes schemas on boot. No manual migrations needed!
npm run dev
```
*The server will mount via Nodemon on `http://localhost:8000`.*

### 3. Frontend Boot
Open an adjacent terminal and execute:
```bash
cd frontend
npm install
npm run dev
```
*The Vite engine is hot-reloaded and live at `http://localhost:5173`.*

---

## 🌐 Production Deployment Flow

### 1. Provision Hosted Database
Deploy a managed PostgreSQL instance (e.g., **Supabase**, **Neon**, **Render Postgres**). Update the backend `DATABASE_URL` environment variable.

### 2. Backend (Render / Heroku)
- Push your code to GitHub.
- Add your secret `.env` variables (`JWT_SECRET`, `GOOGLE_CLIENT_ID`, `EMAIL_PASS`, etc.) to the hosting platform.
- Build Command: `npm install`
- Start Command: `npm start` (or PM2 execution if utilized).

### 3. Frontend (Vercel / Netlify)
- Attach the GitHub repository.
- Build Command: `npm run build`
- Output Directory: `dist`
- Crucial: Assign the Environment Variable `VITE_API_URL` to point strictly to your live Backend domain string.

---

## 🤝 Contributing & Operations

We welcome contributions from the community! From reporting bugs to submitting complex pull requests, your input helps shape the future of this platform.

### 🐛 Reporting Issues
If you encounter a bug or have a feature request, please open an Issue on our GitHub repository: `[GitHub Repository Link Here]`

When submitting an issue, please adhere to these terms:
- Provide a clear, descriptive title.
- Include step-by-step reproduction instructions for bugs.
- List your environment details (Node version, OS, Browser).
- Include terminal logs or screenshots if applicable.

### 🔀 Pull Request Terms
To ensure the integrity of the codebase, all PRs must follow these rules before merging via `git push`:
1. **Fork & Branch:** Always work on a standalone feature branch (`git checkout -b feature/your-feature-name`).
2. **Linting & Formatting:** Your code must pass all ESLint and Prettier rules. Run `npm run lint` and `npm run format` locally.
3. **Commit Standards:** Use clear, conventional commit messages.
4. **Testing:** Ensure any existing features are not broken by your changes.
5. **Submit a PR:** Open a Pull Request against the `main` branch. Provide a detailed summary of your changes in the PR description.

> **Repository URL:** [https://github.com/mr-deepansh/Trip_planner-Application](https://github.com/mr-deepansh/Trip_planner-Application) *(Update this placeholder with the final repo link if needed)*

---

## ⚖️ License & Legal

### License
This project is licensed under the permissive MIT License. See the complete, legally-binding `LICENSE` document located in the root directory for full terms and conditions.

### Trademarks
All third-party names, logos, product and service names, designs, and slogans utilized within this software or documentation (e.g., Google, GitHub, PostgreSQL) are the trademarks of their respective owners. Any use of such marks by this project is for identification and demonstrative purposes only and does not imply endorsement, affiliation, or sponsorship.

The specific "Collaborative Trip Planning Platform" architecture, name, and associated custom branding elements are the intellectual property of the authors. You may not use these custom marks in any commercial context that might cause consumer confusion or disparage the original project without explicit written consent.

### Disclaimer
This software architecture is provided "as is". While enterprise-grade security practices (like Zod validation and HTTP-Only cookies) have been implemented, the maintainers assume no legal responsibility for data loss, service interruptions, or security breaches resulting from the deployment of this codebase in a live production environment. Organizations deploying this system are legally responsible for conducting their own independent security audits, penetration testing, and GDPR/CCPA compliance checks.

---

<div align="center">
  <p>Built with ❤️ for rapid, collaborative coordination.</p>
</div>

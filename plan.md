# Car management tool

This is an online tool to manage info about one or more personal cars. Main features are:

- keeping detail info about the car (make and model, vin number, oil type, engine type etc)
- keeping track of fuel uplifts including prices. This also gives insight into mileage and fuel prices
- keeping track of defects
- keeping track of maintenance actions, i.e. repairs and check-ups (APK in the Netherlands)

# Tech stack

The tech stack is Node.js based, written in TypeScript. A separate front and back-end, with a connection to a MySQL database for storing the data. The front-end will be React and the back-end based on Express and Prisma as ORM for the MySQL database.

## Repository layout

npm workspaces monorepo:

- `frontend/` — React + Vite, React Router, TanStack Query
- `backend/` — Express + Prisma
- `shared/` — Zod schemas and types, used for request validation in the back-end and form validation in the front-end

## Local development

A docker-compose.yml spins up a local MySQL instance. Front and back-end run locally via npm scripts, with the Vite dev server proxying `/api` to the back-end.

## Deployment

Separate Dockerfiles for front and back-end, for now manually built and pushed.

- Front-end container: nginx serving the static build, and reverse proxying `/api` to the back-end container. This keeps everything on one origin (no CORS, simple cookies).
- Back-end container: runs `prisma migrate deploy` on startup, then starts the server.

Database backups are handled outside this project.

## Authentication

Single user, no user management. Credentials come from environment variables (username + bcrypt password hash). After login a long-lived (e.g. 90 days) httpOnly session cookie is set, so there is no need to log in again at the fuel pump. The login endpoint is rate limited.

# Database structure

General conventions:

- camelCase naming
- dates stored as `@db.Date` (no time component, avoids timezone shifts)
- money and volumes as `Decimal`, never float
- all tables have `createdAt` and `updatedAt`
- child records are deleted when their car is deleted (cascade)

## Car

- id: int, autoincrement
- name: string (insightful name to the user)
- make: string
- model: string
- licensePlate: string, unique
- vin: string
- firstRegistration: date (datum eerste toelating)
- ownedSince: date
- apkDueDate: date
- notes: text

## CarSpec

Flexible key/value specs per car, so new specs can be added without schema changes.

- id: int, autoincrement
- carId: int --> foreign key of car
- key: string (e.g. "Fuel type", "Engine", "Oil type", "Tire size")
- value: string
- sortOrder: int
- unique on (carId, key)

The UI suggests common keys for new cars, but any key can be added.

## FuelUplift

- id: int, autoincrement
- carId: int --> foreign key of car
- date: date
- odo: int
- volume: Decimal(6,2) (liters)
- totalPrice: Decimal(8,2) (total amount paid, in euros)
- fullTank: boolean, default true
- missedPrevious: boolean, default false (a previous uplift was not recorded)
- notes: text, optional

Derived, not stored:

- price per liter = totalPrice / volume
- consumption (L/100km and km/L), calculated only between two full-tank uplifts, summing the volume of any partial uplifts in between. A `missedPrevious` uplift breaks the chain.

## Defect

- id: int, autoincrement
- carId: int --> foreign key of car
- title: string
- description: text
- startDate: date
- startOdo: int
- fixedDate: date, optional
- fixedOdo: int, optional
- fixedActionId: int --> foreign key of maintenanceAction, optional (one action can fix multiple defects)

A defect is open while fixedDate is empty.

## MaintenanceAction

- id: int, autoincrement
- carId: int --> foreign key of car
- type: enum (APK, SERVICE, REPAIR, TIRES, OTHER)
- title: string
- date: date
- odo: int
- garage: string, optional
- notes: text
- cost: Decimal(8,2)

When an APK action is saved, the user is prompted to update the car's apkDueDate.

# Layout and other considerations

The layout should be simple and clean. Tabs:

- **Details** — car info and specs
- **Fuel** — fuel uplifts, consumption and price insights
- **Maintenance** — combines defects and maintenance actions in two panes (stacked on phone)

A car is selected once in the navigation (no need to reselect it in every tab). The selection is remembered in localStorage.

On desktop the navigation is a top navbar. On phone it is a bottom tab bar with the car selector at the top, plus a floating "+ Fuel" button.

The views must be optimized for both pc and smart phone (iPhone). Especially the form to enter a fuel uplift must be very easily accessible and well optimized for phone:

- the app is a PWA (manifest + icons) so it can be added to the iPhone home screen and opens full screen
- date defaults to today, car defaults to the selected car
- the last known odo reading is shown as a reference
- numeric fields use `inputmode="decimal"` / `inputmode="numeric"` and accept both decimal comma and decimal point
- price per liter and consumption are shown live while typing

# Future ideas

- service reminders based on next due date / odo
- attachments (photos of receipts and invoices)

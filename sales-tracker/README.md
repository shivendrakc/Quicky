# Sales Order Logger

A local, browser-based sales order tracker that replaces the shop's Excel
sales tracker. Runs entirely on the store's local network — no internet
dependency, no cloud services, no login. One computer runs the server;
every other device on the same WiFi opens it in a browser.

## First-time setup (on the host computer)

1. Install [Node.js](https://nodejs.org/) (v20 or newer) if it isn't already.
2. Open a terminal in this `sales-tracker` folder and run:
   ```
   npm install
   npm run build
   ```

## Running it day-to-day

Double-click `start.bat`, or run `npm run start` from this folder. Leave
that window open — it's the server. The first time it runs, Windows may ask
to allow Node.js through the firewall — click **Allow**.

The app is now available at `http://localhost:4000` on the host computer.

### Letting other devices on WiFi connect

1. On the host computer, open Command Prompt and run `ipconfig`.
2. Find the "IPv4 Address" under your WiFi/Ethernet adapter (looks like
   `192.168.x.x`).
3. On any other device connected to the same store WiFi, open a browser and
   go to `http://<that address>:4000` (e.g. `http://192.168.1.42:4000`).
4. Bookmark it on each device so staff don't need to re-type it.

## Development

```
npm install
npm run dev
```

This runs the API server on port 3001 and the Vite client dev server on
port 5174 (with hot reload), proxying `/api` requests between them.

## Data

All data lives in a local SQLite file at `server/data/sales.db`. This file
is never committed to git and never leaves the host computer.

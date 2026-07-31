/**
 * Release notes shown in the About tab. Newest first. Add a new entry to the
 * top of `RELEASE_NOTES` whenever the version is bumped.
 *
 * Keep entries concise — they're meant to be skim-readable from a wall display,
 * not the full git log. A `sections` array makes it easy to group by theme
 * (New / Improved / Fixed) without inventing a Markdown renderer.
 */

export interface ReleaseSection {
  title: string
  items: string[]
}

export interface ReleaseNote {
  version: string
  date: string // YYYY-MM-DD
  sections: ReleaseSection[]
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '0.2.1',
    date: '2026-07-31',
    sections: [
      {
        title: 'New',
        items: [
          'Choose which Ring cameras appear on the Home Automation screen — tick them in Settings → System → Ring Cameras. New cameras show automatically until you change the selection, and doorbell alerts still work for every camera whether it is displayed or not'
        ]
      }
    ]
  },
  {
    version: '0.2.0',
    date: '2026-07-31',
    sections: [
      {
        title: 'New',
        items: [
          'Home Assistant integration — connect your HA server (Settings → System) and your sensors and controls appear on the Home Automation screen',
          'Live updates over a WebSocket connection: readings refresh the instant they change in Home Assistant, no polling',
          'Tap-to-toggle tiles for lights, switches and fans; sensor tiles pick their own icon and units automatically',
          'Entity picker — search everything Home Assistant knows about and choose exactly what appears on the wall',
          'Automatic reconnection, so the wall panel can boot before the Home Assistant box and simply find it when it comes up'
        ]
      },
      {
        title: 'Security',
        items: [
          'Saved credentials (Home Assistant, Ring and Google) are now encrypted using the operating system keystore rather than stored as plain text — existing logins are upgraded automatically, no need to sign in again'
        ]
      },
      {
        title: 'Fixed',
        items: [
          'Notifications were appearing behind open settings windows, so actions like saving or testing a connection looked like they did nothing',
          'Connection settings now explain what’s missing instead of silently doing nothing when a field is blank, and show the result inline'
        ]
      }
    ]
  },
  {
    version: '0.1.9',
    date: '2026-06-16',
    sections: [
      {
        title: 'New',
        items: [
          'HomeSync app icon — replaces the default Electron icon on the window, taskbar, and installer',
          'Overlapping calendar events now split into side-by-side columns instead of stacking on top of each other'
        ]
      },
      {
        title: 'Improved',
        items: [
          'Finer widget resize grid — tiles now snap in smaller increments for more precise sizing (existing layouts are kept at their current size)',
          'The dashboard layout no longer shifts when the window is minimised and restored',
          'Ring sign-in reworked: the 2FA step no longer hangs after entering the code, camera-fetch errors are surfaced, and there’s a new refresh-cameras button'
        ]
      }
    ]
  },
  {
    version: '0.1.8',
    date: '2026-06-09',
    sections: [
      {
        title: 'Improved',
        items: [
          'Header redesigned for the portrait wall display — the clock sits centred above the navigation tabs, so the tabs no longer overlap it',
          'Tighter spacing — halved the gap between widgets and the screen edges, and between stacked widgets, reclaiming wasted space',
          'Follow-up to the v0.1.7 padding fix: dialled the now-active padding back to sensible amounts across the header and layout'
        ]
      },
      {
        title: 'Fixed',
        items: [
          'News ticker “LIVE” badge no longer overlaps the scrolling headline — it now sits on its own line beneath the text'
        ]
      }
    ]
  },
  {
    version: '0.1.7',
    date: '2026-06-09',
    sections: [
      {
        title: 'New',
        items: [
          'Ring integration — connect your Ring account (Settings → System) to show live camera views on the Home Automation screen',
          'Doorbell takeover — when the Ring doorbell is pressed, the live feed pops up over whatever’s on screen (even the dim clock) and wakes the display',
          'Optional motion alerts — opt in to also pop the live feed on motion, not just doorbell presses'
        ]
      },
      {
        title: 'Improved',
        items: [
          'Big visual polish: fixed an app-wide issue where text sat too close to rounded corners and panel edges — padding now renders correctly everywhere (calendar, weather, bins, the footer), and touch targets are a little larger',
          'Today is now highlighted with a glowing ring in the month view',
          'The calendar auto-advances to the new day at midnight, so an always-on display never shows yesterday',
          'To-do items now show how many days they’ve been on the list (turning amber once over a week old)',
          'News ticker “LIVE” badge moved to the bottom-centre so it no longer overlaps the first headline'
        ]
      },
      {
        title: 'Fixed',
        items: [
          'Calendar reminders now survive an app restart — they won’t re-fire or go missing'
        ]
      }
    ]
  },
  {
    version: '0.1.6',
    date: '2026-05-13',
    sections: [
      {
        title: 'New',
        items: [
          'Top-level screen tabs: Family Hub, Whiteboard, Home Automation',
          'Whiteboard screen — full-screen drawing with pen/eraser tools, six-colour palette, size slider, undo, and draggable coloured sticky notes',
          'Event reminders — pick a reminder offset on any event (5 min, 15 min, 1 hour, 1 day…); banners pop at the top of the screen when due',
          'Long-press / right-click a widget to open a context menu with Settings, Refresh, Duplicate, Remove — no need to enter edit mode for quick changes',
          'Layout presets — save the current dashboard as a named preset (e.g. Morning, Weekend), switch with one tap from the header',
          'Edit lock — optional 4-digit PIN that gates entering edit mode, useful for stopping kids rearranging the wall',
          'Dev / Health tab in App Settings — version, updater status, last backup, query cache stats, copy-debug-info button'
        ]
      },
      {
        title: 'Improved',
        items: [
          'Widget header bars (name, icon, action buttons) now hide when the layout is locked — cleaner ambient look',
          'Auto-backup before every applied update — snapshot lands in your backup folder so you can roll back if a release misbehaves',
          'Release notes now appear in the About tab so you can see what changed without leaving the app',
          'Tabs in App Settings spaced more clearly with dividers'
        ]
      },
      {
        title: 'Fixed',
        items: [
          'Modals (Save Layout, Add Event etc.) now portal to the document body so a transformed ancestor can no longer trap them in the corner',
          'Sticky-note dragging on the whiteboard no longer "freezes" when moved quickly — pointer capture now stays with the drag handle',
          'PIN setup flow: the "confirm PIN" step is now interactive after the first entry (no longer stuck showing the previous digits)',
          'Keyboard-shortcut help text correctly reads Shift + ? instead of just ?'
        ]
      }
    ]
  },
  {
    version: '0.1.5',
    date: '2026-05-13',
    sections: [
      {
        title: 'New',
        items: [
          'Google Calendar sync — connect family Google accounts and their events appear on the day planner. Per-account colours, per-calendar enable/disable, multi-day and recurring events supported. Refreshes every 10 minutes',
          'Settings → System → Google Calendar for managing connected accounts and choosing which calendars to sync'
        ]
      },
      {
        title: 'Public-repo safety',
        items: [
          'OAuth credentials moved out of source code into .env.local (gitignored), injected at build time via Vite',
          '.env.example committed so contributors can set up their own credentials',
          '.gitignore extended to cover all .env.*.local variants and the release/ artifacts folder'
        ]
      }
    ]
  },
  {
    version: '0.1.4',
    date: '2026-05-13',
    sections: [
      {
        title: 'New widgets',
        items: [
          'To-do list widget with auto-delete for completed items (1 hour / 6 hours / 1 day / 1 week / never)',
          'News ticker — scrolling headlines from BBC News, The Guardian, Sky News, and GB News with configurable scroll speed'
        ]
      },
      {
        title: 'Weather',
        items: [
          'Air quality and pollen via Open-Meteo (free, no key) — European AQI, PM2.5, PM10, dominant pollen',
          'Redesigned current-conditions layout — larger temperature, two-column stat grid, everything visible without tooltips'
        ]
      },
      {
        title: 'Display & ambient',
        items: [
          'Auto-dim after inactivity, fades to a drifting clock; tap to wake',
          'Photo frame mode — rotate through images from a chosen folder while dimmed',
          'Burn-in protection — sub-pixel screen shift to stop static UI marking the display',
          'Screen wake-lock so Windows doesn’t sleep the display'
        ]
      },
      {
        title: 'Settings & reliability',
        items: [
          'Tabbed App Settings (General / Display / System / About)',
          'Backup and restore (manual + scheduled to a chosen folder)',
          'Per-widget refresh button (in edit mode) for data-driven widgets',
          'Widget error boundaries — one crashing widget no longer breaks the dashboard',
          'Delete-widget confirmation dialog'
        ]
      },
      {
        title: 'Bug fixes',
        items: [
          'Multi-day events now correctly spread across every day in the selected range',
          'Version display in the status bar tracks package.json automatically'
        ]
      }
    ]
  }
]

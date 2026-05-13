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

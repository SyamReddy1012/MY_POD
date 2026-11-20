# MY POD — Modern Offline Music Player

A complete Android offline music player inspired by the classic Apple iPod, reimagined with a modern, futuristic premium aesthetic.

Built with **React Native**, **Expo (SDK 58)**, **TypeScript**, **Expo Audio (expo-av)**, **Expo Document Picker**, and **Expo SQLite**.

---

## Features

### 1. Iconic Click Wheel Interaction
- **Rotational Gestures**: Continuous circular finger tracing around the wheel calculates touch angles in real-time.
  - **Clockwise**: Navigates down through menus / skips items, or increases volume in Volume mode.
  - **Counter-Clockwise**: Navigates up through menus, or decreases volume.
- **Center Button**: Selects menu items, plays songs, or toggles Play/Pause in Now Playing.
- **Quadrant Touch Zones**:
  - **MENU**: Moves back up the folder/menu hierarchy, or toggles between Library and Now Playing.
  - **|<< (Previous)**: Restarts current song or jumps to previous song.
  - **>>| (Next)**: Skips to next song in queue.
  - **>|| (Play/Pause)**: Toggles playback state immediately.
- **Tactile Haptic Feedback**: Light haptic ticks on rotational notches and medium impacts on button presses (`expo-haptics`).
- **Configurable Sensitivity**: Low, Medium, and High sensitivity settings.

### 2. Nostalgic Yet Futuristic Hardware Aesthetic
- **Four Metallic & Matte Themes**:
  1. **Classic Silver**: Polished anodized aluminum body, glass bezel, iconic white wheel.
  2. **Space Graphite**: Dark titanium/gunmetal finish with deep slate wheel.
  3. **Stealth Matte Black**: Obsidian chassis with high-contrast amber accents.
  4. **U2 Special Edition**: Jet black brushed body with vibrant red wheel and chrome center button.
- **Iconic Split Layout**: Upper high-resolution display with classic iPod status bar (battery, play state, title); lower half houses the ergonomic circular click wheel.
- **Vinyl / Album Art Animation**: Smooth continuous spinning vinyl record animation with groove reflections and center spindle label during playback.

### 3. Truly Offline Architecture
- **Zero Cloud / Zero Login**: No account required, no tracking, 100% offline-first.
- **Persistent Local Database (`expo-sqlite`)**:
  - Full catalog of imported songs, titles, artists, albums, formats, and durations.
  - Persistent custom playlists and favorite songs.
  - Play counts and listening history.
- **Supported Formats**: MP3, WAV, M4A, FLAC, AAC, OGG.
- **Local Settings (`@react-native-async-storage/async-storage`)**: Preserves user theme, haptics, sensitivity, and wheel action mode.

### 4. Robust Audio Engine & Background Playback
- Powered by `expo-av` with Android audio ducking and interruption handling.
- **Android Background Execution**: Configured via `staysActiveInBackground: true` and Android foreground service permissions (`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`).
- Full queue management with randomized Fisher-Yates shuffle and Repeat (Off, Repeat All, Repeat One).

---

## Project Structure

```
my-pod/
├── assets/                       # Icons, adaptive icons, and splash
├── src/
│   ├── components/
│   │   ├── ArtworkCover.tsx      # Album art & rotating vinyl record disc
│   │   ├── ChassisContainer.tsx  # Handheld hardware enclosure with screen & wheel
│   │   ├── ClickWheel.tsx        # Rotational touch gesture click wheel & buttons
│   │   ├── HeaderBar.tsx         # iPod status bar (battery, play indicator, title)
│   │   └── TrackProgressBar.tsx  # Scrub bar with elapsed & remaining timers
│   ├── context/
│   │   └── MusicPlayerContext.tsx# Centralized state provider connecting Audio, SQLite & Wheel
│   ├── screens/
│   │   ├── GroupingListScreen.tsx# Reusable screen for Albums & Artists
│   │   ├── LibraryScreen.tsx     # Classic iPod hierarchical menu with highlight bar
│   │   ├── NowPlayingScreen.tsx  # Now Playing screen with album art, info & controls
│   │   ├── PlaylistsScreen.tsx   # Playlist creation, listing, and management
│   │   ├── SettingsScreen.tsx    # Themes, wheel haptics, sensitivity & storage info
│   │   └── SongListScreen.tsx    # Song list with index numbers and playback indicator
│   ├── services/
│   │   ├── audioService.ts       # Audio player engine (queue, repeat, shuffle, background)
│   │   ├── databaseService.ts    # SQLite engine for persistent tracks, playlists, favorites
│   │   ├── fileImportService.ts  # Document picker with metadata parsing & file probe
│   │   └── storageService.ts     # User settings persistence
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   └── utils/
│       ├── formatters.ts         # Time, file size & track title clean formatting
│       ├── haptics.ts            # Tactile feedback helpers
│       └── theme.ts              # Theme color definitions
├── app.json                      # Expo config with Android permissions & plugins
├── App.tsx                       # Root application entry
├── package.json
└── tsconfig.json
```

---

## How to Run on a Physical Android Device

### Option 1: Expo Go (Quickest Testing)
1. Install **Expo Go** from the Google Play Store on your Android device.
2. Ensure your computer and your Android device are connected to the **same Wi-Fi network**.
3. In your terminal inside the `my-pod` directory, run:
   ```bash
   npx expo start
   ```
4. Scan the QR code displayed in the terminal using the Expo Go app (or camera).
5. The application will bundle and launch directly on your device.

> **Tip for Local Music Import**: In the app's main menu, select **"Import Music Files"**. The Android document picker will open. Select your local audio files (MP3, WAV, FLAC, M4A) and they will instantly load into your offline library and SQLite database.

### Option 2: Standalone Android APK (Full Background Playback & Lock-Screen Service)
To test complete background playback services and lock screen notifications on Android:
1. Generate the native Android project:
   ```bash
   npx expo prebuild
   ```
2. Build and run directly on your connected Android device via USB:
   ```bash
   npx expo run:android
   ```
3. Or build an installable APK using EAS:
   ```bash
   npx eas build -p android --profile preview
   ```
4. On your Android phone, under **Settings > Apps > MY POD > Battery**, select **"Unrestricted"** to prevent Android Doze mode from sleeping background audio when the screen is turned off.

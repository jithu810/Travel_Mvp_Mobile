# Phone session

Used by the workspace `travel-phone-session` skill: connect the user's Android phone and load the
Journey Creator Mobile dev client so a change can be seen on the real device.

Run it once per conversation, only for an authorized mobile task, and again if a later adb/Metro
command fails or the phone moves to another session/laptop. It changes no tracked files; Metro
creates its git-ignored `.expo/` folder in this repo.

Who runs it: the Lead or `mobile-dev`. `tester` and `reviewer` need the Lead's explicit
reassignment before running adb or Metro.

Wireless adb and Metro need local network access. If a sandbox blocks adb or kills a background
process, ask the user to approve running those commands outside it — no other workarounds.

## Port and phone ownership
Claude Code uses Metro / reverse port **8082** (`http://localhost:8082`). Use 8082 consistently in the
status script, Metro start, reverse mapping and launch URL. Optional `PHONE_SERIAL` selects an
already-connected device; an unavailable selection reports `DEVICE=none` instead of using another phone.

ADB wireless connection/pairing ports are assigned by Android and change; they are not Metro ports.
Use the values shown on the phone and pair each laptop separately. Never use 8081/8082 as
wireless-debugging ports.

One phone/dev client shows one session at a time. Before launching, tapping, reloading or capturing
evidence, make sure this session owns the phone. If another session or laptop is testing, or ownership
is unknown, agree a handoff with the user first and keep doing local checks meanwhile. Never close the
other session, overwrite its reverse mapping, run `adb reverse --remove-all`, or kill all Node/adb
processes; remove only a mapping this session created. A reverse-list match alone doesn't prove which
laptop owns it — check the running process and the visible UI.

Never accept Expo's automatic alternate-port prompt: investigate an occupied 8082 and reuse only a
server confirmed to serve this checkout.

## 1. Check the current state
From this repo root, run the status script with Git Bash (plain `bash` from PowerShell may start WSL,
which can't see the Windows adb or Metro):
- Git Bash / macOS / Linux: `bash scripts/phone-session-check.sh 8082`
- PowerShell: `& "$env:ProgramFiles\Git\bin\bash.exe" scripts/phone-session-check.sh 8082`

It changes no files and prints `METRO_PORT`, `ADB=<path>|none`, `MOBILE_REPO=<path>|none`,
`DEVICE=<serial>|none`, `DEVICE_COUNT`, `REVERSE=ok|missing`, `APP_FOCUS=yes|no`,
`METRO=ipv4|ipv6-only|down`. Use the printed `ADB` path (`C:/...` form works in PowerShell too) and
`-s <serial>` for every adb command below.
- **ADB=none:** ask where the Android SDK platform-tools are, or to set `ANDROID_HOME`. Don't install.
- **DEVICE_COUNT > 1:** the phone often appears twice (IP:port and an `adb-...` mDNS name); the script
  picks the IP:port. If a different device is connected too, ask which to use.

## 2. Fix only what is missing
- **DEVICE=none:** ask for the IP:port on the phone's Wireless debugging screen, then
  `adb connect <ip:port>`. If it fails with "failed to connect" although the port is reachable, this
  computer needs pairing: ask for the "Pair device with pairing code" IP:port and code, run
  `adb pair <ip:port> <code>`, then connect again (once per computer). Never guess ports; never enter
  the phone's lock PIN.
- **REVERSE=missing:** `adb -s <serial> reverse tcp:8082 tcp:8082`
- **METRO=down:** in this repo start Metro as a long-running background process:
  - bash: `NODE_OPTIONS=--dns-result-order=ipv4first npx expo start --dev-client --localhost --port 8082`
  - PowerShell: `$env:NODE_OPTIONS = "--dns-result-order=ipv4first"; npx expo start --dev-client --localhost --port 8082`

  Wait until `curl.exe -s http://127.0.0.1:8082/status` (`curl` in bash) returns
  `packager-status:running`. The NODE_OPTIONS setting is required: otherwise Metro may listen only on
  IPv6 `[::1]` and the IPv4 adb tunnel can't reach it (Connect fails silently). Don't set `CI=1` (it
  turns off fast refresh). If a background process can't stay alive, ask the user to run the command
  in their own terminal.
- **METRO=ipv6-only:** Metro was started without the IPv4 option. Tell the user, stop that process
  (only if this conversation started it; otherwise ask) and restart it as above.
- **APP_FOCUS=no**, wrong URL, or after restarting Metro (only once you own the phone):

      adb -s <serial> shell am start -a android.intent.action.VIEW -d "journeycreator://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8082" com.sree8100.journeycreatormobile

  Screen locked (`isKeyguardShowing=true` in `adb -s <serial> shell dumpsys window`) → ask the user to
  unlock. App not installed (`adb -s <serial> shell pm path com.sree8100.journeycreatormobile` prints
  nothing) → a development build is needed; building/installing one needs separate approval.

## 3. Confirm
Take a screenshot on the phone and pull it into the session scratchpad (never into a repo). This works
in every shell, unlike redirecting `exec-out`, which PowerShell 5.1 corrupts:

    adb -s <serial> shell screencap -p /sdcard/phone-session-8082.png
    adb -s <serial> pull /sdcard/phone-session-8082.png <scratch-dir>/screen.png
    adb -s <serial> shell rm /sdcard/phone-session-8082.png

Look at the image. Report in one or two lines: owner, laptop, device, port, checkout, Metro running,
and which screen is showing. `APP_FOCUS=yes` alone doesn't confirm the right bundle/port. Then
continue the task, using the same screenshot steps to check changes.

## Notes
- The dev client uses the real backend. Looking, scrolling and navigating are fine. Any tap that
  saves, creates, edits, deletes or uploads writes to the live Supabase project — get the user's
  explicit approval for that action first.
- Physical-device screenshots are device evidence; mocks and exports are not.
- Don't upgrade Expo packages because Metro suggests it.
- Never read `.env` files. Metro printing variable names is fine; never print values.

#!/usr/bin/env bash
# Ad scene: privacy. Face ID is answered here, between the Maestro parts, since a flow
# can't reach the simulator's biometrics. Needs SIM and MAESTRO (record.sh sets both).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
pause() { python3 -c "import time; time.sleep($1)"; }
face_match() { xcrun simctl spawn "$SIM" notifyutil -p com.apple.BiometricKit_Sim.pearl.match; }

xcrun simctl spawn "$SIM" notifyutil -s com.apple.BiometricKit.enrollmentChanged '1'
xcrun simctl spawn "$SIM" notifyutil -p com.apple.BiometricKit.enrollmentChanged

"$MAESTRO" --device "$SIM" test "$HERE/rec-privacidad-1.yaml"
pause 1.5
face_match
pause 1.5
"$MAESTRO" --device "$SIM" test "$HERE/rec-privacidad-2.yaml"
pause 1
# Reopen: the app asks for Face ID before showing anything.
xcrun simctl terminate "$SIM" com.sotico91.rumi
xcrun simctl launch "$SIM" com.sotico91.rumi >/dev/null
pause 4
face_match
pause 1.5
"$MAESTRO" --device "$SIM" test "$HERE/rec-privacidad-3.yaml"

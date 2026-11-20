@echo off
echo =======================================================
echo          MY POD - Standalone Android APK Builder
echo =======================================================
echo.
echo Step 1: Checking EAS CLI...
call npx eas-cli --version
echo.
echo Step 2: Logging into your Expo account...
echo (If you do not have an Expo account, sign up free at https://expo.dev/signup)
echo.
call npx eas-cli login
echo.
echo Step 3: Triggering Cloud APK Build...
echo.
call npx eas-cli build -p android --profile preview
echo.
echo =======================================================
echo When the build finishes, EAS will provide a direct
echo download link to your installable 'my-pod.apk'!
echo =======================================================
pause

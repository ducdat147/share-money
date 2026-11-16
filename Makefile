build-apk:
	@echo "Building APK..."
	npx expo prebuild --platform android
	cd android && ./gradlew assembleRelease
	@echo "APK build completed"
	@echo "APK in android/app/build/outputs/apk/release/app-release.apk"

install-apk:
	@echo "Installing APK on connected device..."
	adb install -r "android/app/build/outputs/apk/release/app-release.apk"

run:
	npx expo start -c

debug:
	npx expo run:android --device

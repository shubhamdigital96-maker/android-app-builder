# Proguard rules for H2O Reminder (com.appzyro.h2oreminder)

# Keep Google Play Services and AdMob classes
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.ads.** { *; }

# Keep AndroidX & Kotlin Metadata
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WorkManager
-keep class androidx.work.** { *; }

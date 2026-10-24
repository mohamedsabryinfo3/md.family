# MD.Family Android — ProGuard rules
# Capacitor ships consumer rules; we add minimal app-side rules here.

# Keep Capacitor bridge classes (reflection)
-keep class com.getcapacitor.** { *; }
-keep class family.md.sabry.** { *; }

# Keep WebView JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Kotlin metadata
-keepattributes *Annotation*, InnerClasses
-dontwarn javax.annotation.**

# Consumer ProGuard/R8 rules — automatically applied to any app that depends
# on the OpenFCM AAR. Keeps the public API and serialization models intact.

# Keep the public facade and its callbacks (accessed reflectively by hosts / Java).
-keep public class com.openfcm.sdk.OpenFCM { public *; }
-keep public class com.openfcm.sdk.OpenFCMConfig { public *; }
-keep public interface com.openfcm.sdk.** { *; }

# Keep the Firebase messaging service (instantiated by the framework by name).
-keep class com.openfcm.sdk.messaging.OpenFCMFirebaseMessagingService { *; }

# kotlinx.serialization — keep generated serializers for our @Serializable models.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class com.openfcm.sdk.api.** {
    *** Companion;
}
-keepclasseswithmembers class com.openfcm.sdk.api.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.openfcm.sdk.api.**$$serializer { *; }

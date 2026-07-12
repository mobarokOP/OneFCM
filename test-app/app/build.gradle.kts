plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    // No google-services plugin: the OpenFCM SDK initializes Firebase at runtime.
}

android {
    namespace = "com.example.openfcmtest"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.openfcmtest"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    // OpenFCM SDK (pulls in Firebase Messaging transitively; no google-services.json needed)
    implementation("com.github.mobarokOP:OpenFCM:3.0.0")

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
}

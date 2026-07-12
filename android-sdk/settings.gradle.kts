pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "OpenFCM"

include(":openfcm")

// The sample app requires a real google-services.json and is only for local dev.
// Skip it on JitPack (which sets VERSION) so publishing the library never needs it.
if (System.getenv("VERSION") == null) {
    include(":sample")
}

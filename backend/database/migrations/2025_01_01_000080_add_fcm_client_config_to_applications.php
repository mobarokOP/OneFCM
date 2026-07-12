<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Per-app Firebase client config, auto-derived from the uploaded service
// account via the Firebase Management API (OneSignal-style onboarding).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->json('fcm_client_config')->nullable()->after('fcm_service_account');
            $table->text('fcm_sync_error')->nullable()->after('fcm_client_config');
            $table->timestamp('fcm_synced_at')->nullable()->after('fcm_sync_error');
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropColumn(['fcm_client_config', 'fcm_sync_error', 'fcm_synced_at']);
        });
    }
};

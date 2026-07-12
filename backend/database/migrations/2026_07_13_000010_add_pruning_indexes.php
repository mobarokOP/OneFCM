<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Range-scan indexes so the daily openfcm:prune-history sweep never
// full-scans the two largest tables.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_logs', function (Blueprint $table) {
            $table->index('created_at');
        });

        Schema::table('notification_targets', function (Blueprint $table) {
            $table->index('created_at');
        });

        Schema::table('analytics_events', function (Blueprint $table) {
            $table->index('occurred_at');
        });
    }

    public function down(): void
    {
        Schema::table('delivery_logs', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });

        Schema::table('notification_targets', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });

        Schema::table('analytics_events', function (Blueprint $table) {
            $table->dropIndex(['occurred_at']);
        });
    }
};

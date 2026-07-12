<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AdminUser;
use App\Models\AnalyticsEvent;
use App\Models\Application;
use App\Models\DeliveryLog;
use App\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class RetentionPruneTest extends TestCase
{
    use RefreshDatabase;

    private function makeApp(): array
    {
        $account = Account::create(['name' => 'Test']);
        $admin = AdminUser::create([
            'account_id' => $account->id,
            'name' => 'Owner',
            'email' => 'owner@test.dev',
            'password' => 'password',
            'role' => 'owner',
        ]);
        $token = $admin->createToken('t')->plainTextToken;

        $app = Application::create([
            'account_id' => $account->id,
            'name' => 'App',
            'status' => 'active',
        ]);

        return [$token, $app];
    }

    private function makeNotification(Application $app, string $status, Carbon $createdAt): Notification
    {
        $n = $app->notifications()->create([
            'body' => "Push ({$status})",
            'audience' => ['type' => 'all'],
            'status' => $status,
        ]);
        $n->forceFill(['created_at' => $createdAt])->save();

        return $n->refresh();
    }

    public function test_keeps_only_last_n_finished_notifications_per_app(): void
    {
        config(['openfcm.retention.notifications_per_app' => 5]);

        [, $app] = $this->makeApp();

        $old = collect(range(1, 4))->map(fn (int $i) => $this->makeNotification($app, 'sent', now()->subDays(30 + $i)));
        $fresh = collect(range(1, 5))->map(fn (int $i) => $this->makeNotification($app, 'sent', now()->subHours($i)));

        // In-flight and pending work must never be pruned, and doesn't use up the quota.
        $draft = $this->makeNotification($app, 'draft', now()->subDays(400));
        $scheduled = $this->makeNotification($app, 'scheduled', now()->subDays(400));

        // Logs cascade away with their pruned parent.
        DeliveryLog::create([
            'notification_id' => $old->first()->id,
            'status' => 'sent',
            'attempted_at' => now(),
        ]);

        $this->artisan('openfcm:prune-history')->assertSuccessful();

        $fresh->each(fn (Notification $n) => $this->assertDatabaseHas('notifications', ['id' => $n->id]));
        $old->each(fn (Notification $n) => $this->assertDatabaseMissing('notifications', ['id' => $n->id]));
        $this->assertDatabaseHas('notifications', ['id' => $draft->id]);
        $this->assertDatabaseHas('notifications', ['id' => $scheduled->id]);
        $this->assertDatabaseMissing('delivery_logs', ['notification_id' => $old->first()->id]);
    }

    public function test_prunes_old_delivery_logs_and_analytics_events(): void
    {
        config([
            'openfcm.retention.notifications_per_app' => 30,
            'openfcm.retention.delivery_log_days' => 30,
            'openfcm.retention.analytics_days' => 90,
        ]);

        [, $app] = $this->makeApp();
        $n = $this->makeNotification($app, 'sent', now()->subDays(2));

        $oldLog = DeliveryLog::create(['notification_id' => $n->id, 'status' => 'sent', 'attempted_at' => now()->subDays(45)]);
        $oldLog->forceFill(['created_at' => now()->subDays(45)])->save();
        $freshLog = DeliveryLog::create(['notification_id' => $n->id, 'status' => 'sent', 'attempted_at' => now()]);

        $oldEvent = AnalyticsEvent::create(['application_id' => $app->id, 'type' => 'delivered', 'occurred_at' => now()->subDays(120)]);
        $freshEvent = AnalyticsEvent::create(['application_id' => $app->id, 'type' => 'delivered', 'occurred_at' => now()->subDays(10)]);

        $this->artisan('openfcm:prune-history')->assertSuccessful();

        $this->assertDatabaseMissing('delivery_logs', ['id' => $oldLog->id]);
        $this->assertDatabaseHas('delivery_logs', ['id' => $freshLog->id]);
        $this->assertDatabaseMissing('analytics_events', ['id' => $oldEvent->id]);
        $this->assertDatabaseHas('analytics_events', ['id' => $freshEvent->id]);

        // The parent notification (and its aggregate counters) survives.
        $this->assertDatabaseHas('notifications', ['id' => $n->id]);
    }

    public function test_zero_disables_pruning(): void
    {
        config([
            'openfcm.retention.notifications_per_app' => 0,
            'openfcm.retention.delivery_log_days' => 0,
            'openfcm.retention.analytics_days' => 0,
        ]);

        [, $app] = $this->makeApp();
        $n = $this->makeNotification($app, 'sent', now()->subDays(500));
        $log = DeliveryLog::create(['notification_id' => $n->id, 'status' => 'sent', 'attempted_at' => now()->subDays(500)]);
        $log->forceFill(['created_at' => now()->subDays(500)])->save();

        $this->artisan('openfcm:prune-history')->assertSuccessful();

        $this->assertDatabaseHas('notifications', ['id' => $n->id]);
        $this->assertDatabaseHas('delivery_logs', ['id' => $log->id]);
    }

    public function test_notifications_index_exposes_retention_meta(): void
    {
        config(['openfcm.retention.notifications_per_app' => 30]);

        [$token, $app] = $this->makeApp();
        $this->makeNotification($app, 'sent', now());

        $this->withToken($token)
            ->getJson("/v1/apps/{$app->id}/notifications")
            ->assertOk()
            ->assertJsonPath('meta.retention.notifications_per_app', 30);
    }
}

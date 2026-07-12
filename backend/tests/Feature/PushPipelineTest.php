<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AdminUser;
use App\Models\Application;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PushPipelineTest extends TestCase
{
    use RefreshDatabase;

    private function actingAdmin(): array
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

    public function test_full_flow_register_send_and_deliver(): void
    {
        [$token, $app] = $this->actingAdmin();

        // SDK registers a device (App ID auth, no secret).
        $reg = $this->postJson('/v1/devices/register', [
            'app_id' => $app->id,
            'fcm_token' => 'tok_'.uniqid(),
            'external_id' => 'u1',
            'country' => 'BD',
            'os_version' => '15',
        ])->assertCreated();

        $deviceId = $reg->json('data.device_id');
        $this->assertNotEmpty($deviceId);

        // Dashboard composes + sends to everyone (queue is sync in tests).
        $send = $this->withToken($token)
            ->postJson('/v1/notifications', [
                'app_id' => $app->id,
                'title' => 'Hi',
                'body' => 'Test push',
                'audience' => ['type' => 'all'],
            ])->assertCreated();

        $this->assertSame('queued', $send->json('data.status'));
        $this->assertSame(1, $send->json('data.estimated_recipients'));

        $notificationId = $send->json('data.id');

        // After sync delivery the notification is sent + logged.
        $detail = $this->withToken($token)
            ->withHeader('X-OpenFCM-App', $app->id)
            ->getJson("/v1/notifications/{$notificationId}")
            ->assertOk();

        $this->assertSame('sent', $detail->json('data.status'));
        $this->assertSame(1, $detail->json('data.stats.delivered'));

        $this->assertDatabaseHas('delivery_logs', [
            'notification_id' => $notificationId,
            'status' => 'sent',
        ]);
    }

    public function test_send_requires_auth(): void
    {
        [, $app] = $this->actingAdmin();

        $this->postJson('/v1/notifications', [
            'app_id' => $app->id,
            'body' => 'x',
            'audience' => ['type' => 'all'],
        ])->assertUnauthorized();
    }
}

<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AdminUser;
use App\Services\GoogleIdTokenVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.google.client_id' => 'test-client.apps.googleusercontent.com']);
    }

    private function claims(array $overrides = []): array
    {
        return array_merge([
            'iss' => 'https://accounts.google.com',
            'sub' => 'google-sub-123',
            'email' => 'jane@gmail.com',
            'email_verified' => true,
            'name' => 'Jane Doe',
            'picture' => 'https://lh3.googleusercontent.com/a/photo.jpg',
        ], $overrides);
    }

    private function mockVerifier(?array $claims): void
    {
        $this->mock(GoogleIdTokenVerifier::class, function ($mock) use ($claims) {
            $mock->shouldReceive('verify')->once()->andReturn($claims);
        });
    }

    public function test_first_google_sign_in_creates_account_and_user(): void
    {
        $this->mockVerifier($this->claims());

        $this->postJson('/v1/auth/google', ['credential' => 'fake-id-token'])
            ->assertStatus(201)
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'email', 'account']]])
            ->assertJsonPath('data.user.email', 'jane@gmail.com')
            ->assertJsonPath('data.user.google_id', 'google-sub-123');

        $this->assertSame(1, Account::count());
        $this->assertSame("Jane Doe's Team", Account::first()->name);

        $user = AdminUser::where('email', 'jane@gmail.com')->first();
        $this->assertNull($user->password);
        $this->assertSame('owner', $user->role);
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame('https://lh3.googleusercontent.com/a/photo.jpg', $user->avatar_url);
    }

    public function test_google_sign_in_links_to_existing_email_without_new_account(): void
    {
        $account = Account::create(['name' => 'Existing']);
        $user = AdminUser::create([
            'account_id' => $account->id,
            'name' => 'Jane',
            'email' => 'jane@gmail.com',
            'password' => 'password123',
            'role' => 'owner',
        ]);

        $this->mockVerifier($this->claims());

        $this->postJson('/v1/auth/google', ['credential' => 'fake-id-token'])
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id);

        $this->assertSame(1, Account::count());
        $this->assertSame('google-sub-123', $user->refresh()->google_id);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_repeat_google_sign_in_matches_by_google_id(): void
    {
        $account = Account::create(['name' => 'Existing']);
        $user = AdminUser::create([
            'account_id' => $account->id,
            'name' => 'Jane',
            'email' => 'old-address@gmail.com',
            'password' => null,
            'role' => 'owner',
            'google_id' => 'google-sub-123',
        ]);

        $this->mockVerifier($this->claims());

        $this->postJson('/v1/auth/google', ['credential' => 'fake-id-token'])
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonStructure(['data' => ['token']]);

        $this->assertSame(1, AdminUser::count());
    }

    public function test_unverifiable_token_is_rejected(): void
    {
        $this->mockVerifier(null);

        $this->postJson('/v1/auth/google', ['credential' => 'bad-token'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_error')
            ->assertJsonPath('error.details.credential.0', 'Google sign-in could not be verified. Please try again.');

        $this->assertSame(0, AdminUser::count());
    }

    public function test_unverified_google_email_is_rejected(): void
    {
        $this->mockVerifier($this->claims(['email_verified' => false]));

        $this->postJson('/v1/auth/google', ['credential' => 'fake-id-token'])
            ->assertStatus(422)
            ->assertJsonPath('error.details.credential.0', 'Your Google account email is not verified.');

        $this->assertSame(0, AdminUser::count());
    }

    public function test_returns_503_when_client_id_is_not_configured(): void
    {
        config(['services.google.client_id' => null]);

        $this->mock(GoogleIdTokenVerifier::class, function ($mock) {
            $mock->shouldNotReceive('verify');
        });

        $this->postJson('/v1/auth/google', ['credential' => 'fake-id-token'])
            ->assertStatus(503)
            ->assertJsonPath('error.message', 'Google sign-in is not configured on this server.');
    }

    public function test_password_login_on_google_only_account_gives_friendly_error(): void
    {
        $account = Account::create(['name' => 'Existing']);
        AdminUser::create([
            'account_id' => $account->id,
            'name' => 'Jane',
            'email' => 'jane@gmail.com',
            'password' => null,
            'role' => 'owner',
            'google_id' => 'google-sub-123',
        ]);

        $this->postJson('/v1/auth/login', ['email' => 'jane@gmail.com', 'password' => 'whatever123'])
            ->assertStatus(422)
            ->assertJsonPath('error.details.email.0', 'This account uses Google sign-in. Use "Continue with Google" instead.');
    }
}

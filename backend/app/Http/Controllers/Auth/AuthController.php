<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AdminUser;
use App\Models\AuditLog;
use App\Services\GoogleIdTokenVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'unique:admin_users,email'],
            'password' => ['required', 'string', 'min:8'],
            'account_name' => ['nullable', 'string', 'max:120'],
        ]);

        $user = DB::transaction(function () use ($data) {
            $account = Account::create(['name' => $data['account_name'] ?? $data['name']."'s Team"]);

            return AdminUser::create([
                'account_id' => $account->id,
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => 'owner',
            ]);
        });

        return $this->tokenResponse($user, 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = AdminUser::where('email', $data['email'])->first();

        // Google-only accounts have no local password to check against.
        if ($user && $user->password === null) {
            throw ValidationException::withMessages([
                'email' => ['This account uses Google sign-in. Use "Continue with Google" instead.'],
            ]);
        }

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        AuditLog::record('auth.login', $user);

        return $this->tokenResponse($user);
    }

    public function google(Request $request, GoogleIdTokenVerifier $verifier): JsonResponse
    {
        $data = $request->validate([
            'credential' => ['required', 'string'],
        ]);

        if (empty(config('services.google.client_id'))) {
            abort(503, 'Google sign-in is not configured on this server.');
        }

        $claims = $verifier->verify($data['credential']);

        if ($claims === null || empty($claims['sub']) || empty($claims['email'])) {
            throw ValidationException::withMessages([
                'credential' => ['Google sign-in could not be verified. Please try again.'],
            ]);
        }

        if (! filter_var($claims['email_verified'] ?? false, FILTER_VALIDATE_BOOL)) {
            throw ValidationException::withMessages([
                'credential' => ['Your Google account email is not verified.'],
            ]);
        }

        [$user, $created] = DB::transaction(function () use ($claims) {
            $user = AdminUser::where('google_id', $claims['sub'])->first()
                ?? AdminUser::where('email', $claims['email'])->first();

            if ($user) {
                // Link the Google identity to the (possibly password-based) account.
                $user->google_id = $claims['sub'];
                $user->avatar_url = $claims['picture'] ?? $user->avatar_url;
                $user->email_verified_at ??= now();
                $user->save();

                return [$user, false];
            }

            $account = Account::create(['name' => ($claims['name'] ?? 'My')."'s Team"]);

            $user = new AdminUser([
                'account_id' => $account->id,
                'name' => $claims['name'] ?? explode('@', $claims['email'])[0],
                'email' => $claims['email'],
                'google_id' => $claims['sub'],
                'avatar_url' => $claims['picture'] ?? null,
                'role' => 'owner',
                'password' => null,
            ]);
            $user->email_verified_at = now(); // Google already verified it (not mass-assignable).
            $user->save();

            return [$user, true];
        });

        AuditLog::record('auth.google_login', $user);

        return $this->tokenResponse($user, $created ? 201 : 200);
    }

    public function me(Request $request): JsonResponse
    {
        return $this->item(['user' => $request->user()->load('account')]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }

    private function tokenResponse(AdminUser $user, int $status = 200): JsonResponse
    {
        $token = $user->createToken('dashboard')->plainTextToken;

        return $this->item([
            'token' => $token,
            'user' => $user->load('account'),
        ], $status);
    }
}

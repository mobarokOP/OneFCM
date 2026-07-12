<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Application extends Model
{
    use HasUuids;

    protected $fillable = [
        'account_id', 'name', 'package_name', 'fcm_project_id',
        'fcm_service_account', 'fcm_client_config', 'fcm_sync_error',
        'fcm_synced_at', 'status', 'rate_limit',
    ];

    protected $hidden = ['fcm_service_account'];

    protected function casts(): array
    {
        return [
            // Service account JSON is encrypted at rest.
            'fcm_service_account' => 'encrypted',
            'fcm_client_config' => 'array',
            'fcm_synced_at' => 'datetime',
            'rate_limit' => 'integer',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class);
    }

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function topics(): HasMany
    {
        return $this->hasMany(Topic::class);
    }

    public function segments(): HasMany
    {
        return $this->hasMany(Segment::class);
    }

    public function fcmServiceAccountArray(): ?array
    {
        if (! $this->fcm_service_account) {
            return null;
        }

        return json_decode($this->fcm_service_account, true);
    }
}

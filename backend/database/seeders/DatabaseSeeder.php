<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\AdminUser;
use App\Models\Application;
use App\Models\Device;
use App\Models\Tag;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $account = Account::create(['name' => 'Acme Team', 'plan' => 'pro']);

        AdminUser::create([
            'account_id' => $account->id,
            'name' => 'Demo Owner',
            'email' => 'demo@openfcm.test',
            'password' => 'password',
            'role' => 'owner',
        ]);

        $app = Application::create([
            'account_id' => $account->id,
            'name' => 'Acme Reader',
            'package_name' => 'com.acme.reader',
            'fcm_project_id' => null, // no service account => simulated delivery
            'status' => 'active',
            'rate_limit' => 5000,
        ]);

        $topicUpdates = Topic::create(['application_id' => $app->id, 'name' => 'updates']);
        $topicAll = Topic::create(['application_id' => $app->id, 'name' => 'all']);
        $tagPremium = Tag::create(['application_id' => $app->id, 'key' => 'premium']);
        $tagLang = Tag::create(['application_id' => $app->id, 'key' => 'language']);

        $countries = ['BD', 'US', 'IN', 'GB'];
        $osVersions = ['13', '14', '15'];

        foreach (range(1, 40) as $i) {
            $external = "user_{$i}";
            $user = User::create([
                'application_id' => $app->id,
                'external_id' => $external,
                'last_seen_at' => now()->subMinutes(random_int(0, 5000)),
            ]);

            $device = Device::create([
                'application_id' => $app->id,
                'user_id' => $user->id,
                'external_id' => $external,
                'fcm_token' => 'demo_token_'.Str::random(48),
                'platform' => 'android',
                'app_version' => '1.'.random_int(0, 9).'.0',
                'os_version' => $osVersions[array_rand($osVersions)],
                'language' => ['bn', 'en', 'hi'][array_rand(['bn', 'en', 'hi'])],
                'country' => $countries[array_rand($countries)],
                'timezone' => 'Asia/Dhaka',
                'notification_permission' => true,
                'active' => true,
                'last_active_at' => now()->subMinutes(random_int(0, 3000)),
            ]);

            if ($i % 3 === 0) {
                $device->tags()->attach($tagPremium->id, ['value' => 'true']);
            }
            $device->tags()->attach($tagLang->id, ['value' => $device->language]);

            $device->topics()->attach($topicAll->id);
            if ($i % 2 === 0) {
                $device->topics()->attach($topicUpdates->id);
            }
        }

        $this->command->info('Seeded: login demo@openfcm.test / password  (app: '.$app->id.')');
    }
}

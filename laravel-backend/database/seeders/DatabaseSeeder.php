<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            MasterDataSeeder::class,
            SubscriptionPlansSeeder::class,
            DemoUserSeeder::class,
            DemoCensusSeeder::class,
            DemoAdmissionsSeeder::class,
            DemoCarePlansSeeder::class,
            DemoMedicationsSeeder::class,
            DemoFacilityProfileSeeder::class,
            DemoAmenitiesSeeder::class,
            DemoArticlesSeeder::class,
            StateLicenseCategoriesSeeder::class,
            DataSourceSchemasSeeder::class,
            DemoMonetizationSeeder::class,
            DemoExpandedUsersSeeder::class,
        ]);
    }
}

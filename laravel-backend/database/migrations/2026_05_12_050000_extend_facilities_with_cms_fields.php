<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            // CMS Certification Number — federal unique ID for SNFs (6 digits).
            $table->string('cms_certification_number', 10)->nullable()->unique()->after('id');
            $table->string('ownership_type', 60)->nullable()->after('type');
            $table->string('county', 80)->nullable()->after('zip');
            $table->decimal('latitude', 10, 6)->nullable()->after('county');
            $table->decimal('longitude', 10, 6)->nullable()->after('latitude');
            $table->decimal('average_residents_per_day', 6, 1)->nullable()->after('total_beds');
            $table->string('data_source', 20)->default('manual')->after('is_active'); // manual | cms_pdc
            $table->timestamp('cms_synced_at')->nullable()->after('data_source');

            $table->index('state');
            $table->index('city');
        });
    }

    public function down(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->dropColumn([
                'cms_certification_number',
                'ownership_type',
                'county',
                'latitude',
                'longitude',
                'average_residents_per_day',
                'data_source',
                'cms_synced_at',
            ]);
        });
    }
};

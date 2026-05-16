<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Canonical reference table for per-state senior care licensure
 * categories. The CSV / OSM ingest pipeline reads from this to
 * translate a state's raw license_category string ("RCFE", "Type B
 * Assisted Living", "PCH", "ACH — Family Care Home", etc.) into
 * CarePath's canonical 8 facility types, plus a license_subtype
 * bucket where the state's classification carries meaningful acuity
 * information (TX type_a/type_b, FL ecc/lns/lmh, NY alr/ealr/snalr).
 *
 * Seeded from documented research per state (see
 * StateLicenseCategoriesSeeder for source URLs). SuperAdmin can
 * extend or correct via the Licensing reference page.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('state_license_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Lookup keys.
            $table->string('state', 2)->index();              // 'CA', 'FL', etc.
            $table->string('source_term', 191);               // raw string from the state file
            $table->string('source_term_normalized', 191)->index(); // lowercase + collapsed whitespace

            // Translation outcome.
            $table->string('canonical_type', 32)->nullable(); // 'snf', 'assisted_living', ...
            $table->string('license_subtype', 64)->nullable(); // 'type_a', 'ecc', 'rcfe', ...
            $table->boolean('rejected')->default(false);
            $table->string('rejection_reason', 191)->nullable(); // why this category isn't senior placement

            // Client eligibility — who the facility can/must accept.
            // Each population is a short code (general_seniors,
            // idd_adults, memory_care_residents, mental_health,
            // bariatric, ventilator_dependent, young_adults, youth).
            // Drives "show this facility for searches by X family"
            // logic + UI labels on the detail page.
            $table->json('accepted_populations')->nullable();

            // Payer programs the facility participates in. Codes:
            //   private_pay, medicaid_long_term_care,
            //   medicaid_hcbs_waiver, medicaid_idd_waiver (e.g. FL
            //   iBudget, CA SLS, TX HCS), medicare_part_a (SNF only),
            //   va_aid_attendance, ltc_insurance, state_supplement,
            //   ssi_state_supplement. Lets families filter by
            //   "facilities that accept my mom's funding source."
            $table->json('payer_programs')->nullable();

            // The agency or program that funds/sponsors residents.
            // Distinct from regulator — e.g. FL APD Group Homes are
            // *regulated* by APD (under AHCA) but *funded* via the
            // APD-administered iBudget Florida Medicaid waiver.
            $table->string('funding_authority', 191)->nullable();

            // Free-text eligibility notes for residents/families
            // (admission criteria, waiver requirements, age cutoffs).
            $table->text('eligibility_notes')->nullable();

            // Provenance.
            $table->string('regulator', 64)->nullable();      // 'AHCA', 'CDSS', 'DOH', 'APD' ...
            $table->text('notes')->nullable();
            $table->string('source_url', 500)->nullable();
            $table->boolean('is_seeded')->default(true);      // false when SuperAdmin added by hand

            $table->timestamps();

            $table->unique(['state', 'source_term_normalized'], 'state_license_categories_lookup_unique');
            $table->index(['canonical_type']);
            $table->index(['rejected']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('state_license_categories');
    }
};

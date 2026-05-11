<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\CmsFTag;
use App\Models\CredentialTemplate;
use App\Models\DiagnosisCode;
use App\Models\DocPreset;
use App\Models\LevelOfCare;
use App\Models\Payer;
use App\Models\ServiceCode;
use App\Models\ServiceType;
use App\Models\State;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Generic super-admin CRUD for master data types. Each type has a config
 * row defining its Eloquent model + validation rules + queryable
 * fields. New types are added by extending TYPE_CONFIGS, no new
 * controller required.
 *
 * Routes:
 *   GET    /api/superadmin/master-data/{type}
 *   POST   /api/superadmin/master-data/{type}
 *   PUT    /api/superadmin/master-data/{type}/{id}
 *   DELETE /api/superadmin/master-data/{type}/{id}
 */
class MasterDataController extends Controller
{
    /**
     * @var array<string, array{model: class-string<Model>, rules: array<string, array<int, string>>, master_only: bool}>
     */
    private const TYPE_CONFIGS = [
        'states' => [
            'model' => State::class,
            'master_only' => true,
            'rules' => [
                'code' => ['required', 'string', 'size:2'],
                'name' => ['required', 'string', 'max:120'],
                'ombudsman_phone' => ['nullable', 'string', 'max:30'],
                'ombudsman_email' => ['nullable', 'email', 'max:191'],
                'regulator_name' => ['nullable', 'string', 'max:191'],
                'regulator_url' => ['nullable', 'url', 'max:255'],
                'notes' => ['nullable', 'string'],
                'is_active' => ['boolean'],
            ],
        ],
        'payers' => [
            'model' => Payer::class,
            'master_only' => false,
            'rules' => [
                'name' => ['required', 'string', 'max:191'],
                'type' => ['required', 'in:medicare_a,medicare_b,medicare_advantage,medicaid,ltc_insurance,private_pay,va,other'],
                'code' => ['nullable', 'string', 'max:60'],
                'notes' => ['nullable', 'string'],
                'is_active' => ['boolean'],
            ],
        ],
        'levels-of-care' => [
            'model' => LevelOfCare::class,
            'master_only' => false,
            'rules' => [
                'code' => ['required', 'string', 'max:60'],
                'name' => ['required', 'string', 'max:120'],
                'description' => ['nullable', 'string'],
                'sort_order' => ['nullable', 'integer'],
                'is_active' => ['boolean'],
            ],
        ],
        'cms-f-tags' => [
            'model' => CmsFTag::class,
            'master_only' => true,
            'rules' => [
                'code' => ['required', 'string', 'max:10'],
                'title' => ['required', 'string', 'max:191'],
                'description' => ['nullable', 'string'],
                'category' => ['nullable', 'string', 'max:60'],
                'severity_max' => ['nullable', 'string', 'max:2'],
                'is_active' => ['boolean'],
            ],
        ],
        'credential-templates' => [
            'model' => CredentialTemplate::class,
            'master_only' => false,
            'rules' => [
                'code' => ['required', 'string', 'max:60'],
                'name' => ['required', 'string', 'max:120'],
                'description' => ['nullable', 'string'],
                'renewal_months' => ['nullable', 'integer', 'min:0', 'max:120'],
                'requires_state_license' => ['boolean'],
                'is_active' => ['boolean'],
            ],
        ],
        'diagnosis-codes' => [
            'model' => DiagnosisCode::class,
            'master_only' => false,
            'rules' => [
                'code' => ['required', 'string', 'max:12'],
                'description' => ['required', 'string', 'max:255'],
                'category' => ['nullable', 'string', 'max:60'],
                'is_chronic' => ['boolean'],
                'is_active' => ['boolean'],
            ],
        ],
        'service-codes' => [
            'model' => ServiceCode::class,
            'master_only' => false,
            'rules' => [
                'code' => ['required', 'string', 'max:12'],
                'description' => ['required', 'string', 'max:255'],
                'unit_type' => ['required', 'in:per_15_min,per_visit,per_day,per_hour'],
                'default_unit_amount_cents' => ['nullable', 'numeric'],
                'is_active' => ['boolean'],
            ],
        ],
        'service-types' => [
            'model' => ServiceType::class,
            'master_only' => false,
            'rules' => [
                'code' => ['required', 'string', 'max:60'],
                'name' => ['required', 'string', 'max:120'],
                'description' => ['nullable', 'string'],
                'requires_credential_code' => ['nullable', 'string', 'max:60'],
                'is_active' => ['boolean'],
            ],
        ],
        'doc-presets' => [
            'model' => DocPreset::class,
            'master_only' => false,
            'rules' => [
                'code' => ['required', 'string', 'max:60'],
                'name' => ['required', 'string', 'max:120'],
                'category' => ['nullable', 'in:admission,care_planning,regulatory,discharge'],
                'description' => ['nullable', 'string'],
                'requires_signature' => ['boolean'],
                'is_active' => ['boolean'],
            ],
        ],
    ];

    public function index(string $type): JsonResponse
    {
        $config = $this->config($type);
        /** @var class-string<Model> $modelClass */
        $modelClass = $config['model'];

        $query = $modelClass::query();
        if (! $config['master_only']) {
            $query->whereNull('facility_id')->where('source', 'master');
        }
        $query->orderBy('name');

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request, string $type): JsonResponse
    {
        $config = $this->config($type);
        $data = $request->validate($config['rules']);

        /** @var class-string<Model> $modelClass */
        $modelClass = $config['model'];

        if (! $config['master_only']) {
            $data['source'] = 'master';
            $data['facility_id'] = null;
        }

        $row = $modelClass::create($data);

        return response()->json(['data' => $row], 201);
    }

    public function update(Request $request, string $type, string $id): JsonResponse
    {
        $config = $this->config($type);
        /** @var class-string<Model> $modelClass */
        $modelClass = $config['model'];
        $row = $modelClass::findOrFail($id);

        // Master endpoint can only edit master rows.
        if (! $config['master_only'] && ($row->facility_id !== null || $row->source !== 'master')) {
            throw ValidationException::withMessages([
                'id' => 'This endpoint only edits master rows.',
            ]);
        }

        $data = $request->validate($this->rulesForUpdate($config['rules']));
        $row->update($data);

        return response()->json(['data' => $row->fresh()]);
    }

    public function destroy(string $type, string $id): JsonResponse
    {
        $config = $this->config($type);
        /** @var class-string<Model> $modelClass */
        $modelClass = $config['model'];
        $row = $modelClass::findOrFail($id);

        if (! $config['master_only'] && ($row->facility_id !== null || $row->source !== 'master')) {
            throw ValidationException::withMessages([
                'id' => 'This endpoint only deletes master rows.',
            ]);
        }

        $row->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * @return array{model: class-string<Model>, rules: array<string, array<int, string>>, master_only: bool}
     */
    private function config(string $type): array
    {
        if (! isset(self::TYPE_CONFIGS[$type])) {
            abort(404, "Unknown master data type: {$type}");
        }

        return self::TYPE_CONFIGS[$type];
    }

    /**
     * Make all rules nullable on update so partial updates work (PATCH-like).
     *
     * @param  array<string, array<int, string>>  $rules
     * @return array<string, array<int, string>>
     */
    private function rulesForUpdate(array $rules): array
    {
        return collect($rules)->map(function ($r) {
            return collect($r)
                ->map(fn ($rule) => $rule === 'required' ? 'sometimes' : $rule)
                ->all();
        })->all();
    }
}

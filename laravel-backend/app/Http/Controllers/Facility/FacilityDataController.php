<?php

namespace App\Http\Controllers\Facility;

use App\Http\Controllers\Controller;
use App\Models\CredentialTemplate;
use App\Models\DiagnosisCode;
use App\Models\DocPreset;
use App\Models\LevelOfCare;
use App\Models\Payer;
use App\Models\ServiceCode;
use App\Models\ServiceType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Facility-side reads of the provisioned master snapshots + any custom rows
 * the facility has added. Scoped by the FacilityScope middleware (which
 * pulls facility_id from the X-Facility-Id header or the authenticated
 * user's active_facility_id).
 *
 * Editing rules:
 *   - source='master' rows: only is_active may be toggled
 *   - source='custom' rows: full CRUD
 */
class FacilityDataController extends Controller
{
    /**
     * @var array<string, array{model: class-string<Model>, rules: array<string, array<int, string>>}>
     */
    private const TYPE_CONFIGS = [
        'payers' => [
            'model' => Payer::class,
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
            'rules' => [
                'code' => ['required', 'string', 'max:60'],
                'name' => ['required', 'string', 'max:120'],
                'description' => ['nullable', 'string'],
                'sort_order' => ['nullable', 'integer'],
                'is_active' => ['boolean'],
            ],
        ],
        'credential-templates' => [
            'model' => CredentialTemplate::class,
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

    public function index(Request $request, string $type): JsonResponse
    {
        $config = $this->config($type);
        $facilityId = $request->attributes->get('facility_id');

        /** @var class-string<Model> $modelClass */
        $modelClass = $config['model'];

        $rows = $modelClass::query()
            ->where('facility_id', $facilityId)
            ->orderBy('source') // master first (alphabetically before custom)
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request, string $type): JsonResponse
    {
        $config = $this->config($type);
        $facilityId = $request->attributes->get('facility_id');

        $data = $request->validate($config['rules']);
        $data['facility_id'] = $facilityId;
        $data['source'] = 'custom'; // facility-side creates are always custom

        /** @var class-string<Model> $modelClass */
        $modelClass = $config['model'];

        $row = $modelClass::create($data);

        return response()->json(['data' => $row], 201);
    }

    public function update(Request $request, string $type, string $id): JsonResponse
    {
        $config = $this->config($type);
        $facilityId = $request->attributes->get('facility_id');

        /** @var class-string<Model> $modelClass */
        $modelClass = $config['model'];

        $row = $modelClass::where('facility_id', $facilityId)->findOrFail($id);

        if ($row->source === 'master') {
            // Only is_active is mutable on master snapshots.
            $data = $request->validate(['is_active' => ['required', 'boolean']]);
            $row->update($data);
        } else {
            $rules = $this->rulesForUpdate($config['rules']);
            $data = $request->validate($rules);
            $row->update($data);
        }

        return response()->json(['data' => $row->fresh()]);
    }

    public function destroy(Request $request, string $type, string $id): JsonResponse
    {
        $config = $this->config($type);
        $facilityId = $request->attributes->get('facility_id');

        /** @var class-string<Model> $modelClass */
        $modelClass = $config['model'];

        $row = $modelClass::where('facility_id', $facilityId)->findOrFail($id);

        if ($row->source === 'master') {
            throw ValidationException::withMessages([
                'id' => 'Master snapshots cannot be deleted. Toggle is_active instead.',
            ]);
        }

        $row->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * @return array{model: class-string<Model>, rules: array<string, array<int, string>>}
     */
    private function config(string $type): array
    {
        if (! isset(self::TYPE_CONFIGS[$type])) {
            abort(404, "Unknown facility data type: {$type}");
        }

        return self::TYPE_CONFIGS[$type];
    }

    /**
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

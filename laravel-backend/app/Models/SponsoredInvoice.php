<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SponsoredInvoice extends Model
{
    use Auditable, HasUuids;

    protected $fillable = [
        'facility_id',
        'period_start', 'period_end',
        'total_clicks', 'subtotal_cents', 'discount_cents', 'amount_due_cents',
        'status',
        'stripe_invoice_id', 'stripe_invoice_url',
        'issued_at', 'paid_at',
        'notes', 'pdf_url', 'line_items',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'issued_at' => 'datetime',
        'paid_at' => 'datetime',
        'line_items' => 'array',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}

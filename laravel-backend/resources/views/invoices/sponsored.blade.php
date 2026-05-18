<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CarePath — Sponsored Invoice {{ $invoice->period_start->format('Y-m') }}</title>
    <style>
        /* Canonical CarePath palette + magazine rhythm — matches the
           guide template. */
        @page { margin: 0.6in 0.55in 0.7in 0.55in; }
        body {
            font-family: 'Helvetica', sans-serif;
            color: #1E3A5F;
            font-size: 10.5pt;
            line-height: 1.55;
            margin: 0;
        }
        .brandbar {
            border-bottom: 3px solid #2A7F7F;
            padding-bottom: 8pt;
            margin-bottom: 18pt;
        }
        .brandbar table { width: 100%; border-collapse: collapse; }
        .brandbar td { padding: 0; vertical-align: top; }
        .brandbar .logo {
            font-family: 'DejaVu Serif', Georgia, serif;
            font-size: 17pt;
            font-weight: bold;
            color: #1E3A5F;
            letter-spacing: -0.3pt;
        }
        .brandbar .tag {
            font-size: 8pt;
            color: #2A7F7F;
            text-transform: uppercase;
            letter-spacing: 1.2pt;
            margin-top: 2pt;
        }
        .brandbar .right { text-align: right; font-size: 9pt; color: #4B5563; }

        h1 {
            font-family: 'DejaVu Serif', Georgia, serif;
            font-size: 22pt;
            color: #1E3A5F;
            margin: 0 0 4pt 0;
            font-weight: bold;
        }
        .invoice-meta {
            background: #F4F4F2;
            border-radius: 8pt;
            padding: 12pt 14pt;
            margin: 14pt 0 18pt 0;
        }
        .invoice-meta table { width: 100%; border-collapse: collapse; }
        .invoice-meta td {
            font-size: 9pt;
            color: #4B5563;
            padding: 2pt 0;
            vertical-align: top;
        }
        .invoice-meta td strong { color: #1E3A5F; }

        .bill-to {
            border-left: 3px solid #2A7F7F;
            padding: 4pt 0 4pt 12pt;
            margin: 0 0 16pt 0;
        }
        .bill-to .label {
            font-size: 8pt;
            color: #2A7F7F;
            text-transform: uppercase;
            letter-spacing: 0.6pt;
            font-weight: bold;
        }
        .bill-to .who {
            font-size: 12pt;
            font-weight: bold;
            color: #1E3A5F;
            margin-top: 3pt;
        }
        .bill-to .addr {
            font-size: 9pt;
            color: #4B5563;
        }

        table.line-items {
            width: 100%;
            border-collapse: collapse;
            margin: 8pt 0 18pt 0;
            font-size: 10pt;
        }
        table.line-items th, table.line-items td {
            text-align: left;
            padding: 8pt 10pt;
            border-bottom: 1px solid #E5E7EB;
            vertical-align: top;
        }
        table.line-items th {
            background: #1E3A5F;
            color: #FFFFFF;
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
            font-weight: bold;
        }
        table.line-items td.amt { text-align: right; font-weight: bold; }
        table.line-items th.amt { text-align: right; }
        table.line-items tr:last-child td { border-bottom: 0; }

        .totals {
            margin-top: 6pt;
            background: #F4F4F2;
            border-radius: 8pt;
            padding: 12pt 14pt;
        }
        .totals table { width: 100%; border-collapse: collapse; }
        .totals td {
            padding: 4pt 0;
            font-size: 10pt;
        }
        .totals td:last-child { text-align: right; }
        .totals .grand {
            border-top: 2px solid #2A7F7F;
            padding-top: 8pt !important;
            margin-top: 4pt;
            font-size: 14pt;
            font-weight: bold;
            color: #1E3A5F;
        }

        .status-pill {
            display: inline-block;
            padding: 3pt 9pt;
            border-radius: 999pt;
            font-size: 8pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.7pt;
            color: #FFFFFF;
        }
        .status-draft { background: #6B7280; }
        .status-sent { background: #2A7F7F; }
        .status-paid { background: #10B981; }
        .status-failed { background: #DC2626; }
        .status-void { background: #6B7280; }

        .footer-note {
            margin-top: 22pt;
            font-size: 8pt;
            color: #6B7280;
            border-top: 1px solid #E5E7EB;
            padding-top: 10pt;
        }
        .contact {
            margin-top: 12pt;
            background: #1E3A5F;
            color: #FFFFFF;
            border-radius: 8pt;
        }
        .contact table { width: 100%; border-collapse: collapse; }
        .contact td {
            padding: 8pt 14pt;
            font-size: 9pt;
            color: #FFFFFF;
            border-right: 1px solid rgba(255,255,255,0.10);
            text-align: center;
        }
        .contact td:last-child { border-right: 0; }
        .contact .ico {
            display: inline-block;
            background: #2A7F7F;
            color: #FFFFFF;
            font-weight: bold;
            border-radius: 50%;
            width: 14pt; height: 14pt;
            text-align: center; line-height: 14pt;
            font-size: 8pt;
            margin-right: 5pt;
        }
    </style>
</head>
<body>
    <div class="brandbar">
        <table>
            <tr>
                <td>
                    <div class="logo">CarePath</div>
                    <div class="tag">Long-Term Care Directory · Sponsored Ad Invoice</div>
                </td>
                <td class="right">
                    Invoice #{{ strtoupper(substr($invoice->id, 0, 8)) }}<br>
                    Issued {{ $invoice->issued_at?->format('M j, Y') ?? '—' }}<br>
                    <span class="status-pill status-{{ $invoice->status }}">{{ $invoice->status }}</span>
                </td>
            </tr>
        </table>
    </div>

    <h1>Sponsored ads — {{ $invoice->period_start->format('F Y') }}</h1>

    <div class="bill-to">
        <div class="label">Billed to</div>
        <div class="who">{{ $facility->name }}</div>
        <div class="addr">
            {{ $facility->address_line_1 }}{{ $facility->address_line_2 ? ', ' . $facility->address_line_2 : '' }}<br>
            {{ $facility->city }}, {{ $facility->state }} {{ $facility->zip }}
        </div>
    </div>

    <div class="invoice-meta">
        <table>
            <tr>
                <td><strong>Period:</strong> {{ $invoice->period_start->format('M j') }}–{{ $invoice->period_end->format('M j, Y') }}</td>
                <td><strong>Total clicks:</strong> {{ number_format($invoice->total_clicks) }}</td>
                <td><strong>Avg CPC:</strong>
                    @if($invoice->total_clicks > 0)
                        ${{ number_format($invoice->subtotal_cents / $invoice->total_clicks / 100, 2) }}
                    @else — @endif
                </td>
            </tr>
        </table>
    </div>

    <table class="line-items">
        <thead>
            <tr>
                <th>Campaign</th>
                <th>Clicks</th>
                <th class="amt">Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->line_items ?? [] as $li)
                <tr>
                    <td>{{ $li['campaign_name'] }}</td>
                    <td>{{ number_format($li['clicks']) }}</td>
                    <td class="amt">${{ number_format($li['amount_cents'] / 100, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals">
        <table>
            <tr>
                <td>Subtotal</td>
                <td>${{ number_format($invoice->subtotal_cents / 100, 2) }}</td>
            </tr>
            @if($invoice->discount_cents > 0)
                <tr>
                    <td>Invalid-click discount</td>
                    <td>– ${{ number_format($invoice->discount_cents / 100, 2) }}</td>
                </tr>
            @endif
            <tr class="grand">
                <td>Amount due</td>
                <td>${{ number_format($invoice->amount_due_cents / 100, 2) }}</td>
            </tr>
        </table>
    </div>

    @if($invoice->stripe_invoice_url)
        <p style="margin-top: 14pt; font-size: 9pt; color: #4B5563;">
            <strong>Pay online:</strong> <a href="{{ $invoice->stripe_invoice_url }}" style="color: #2A7F7F;">{{ $invoice->stripe_invoice_url }}</a>
        </p>
    @endif

    <div class="footer-note">
        Charges reflect actual clicks served through CarePath's sponsored
        placement auction. Each click is verified against the impression
        log + HMAC click token before billing. Disputes:
        billing@carepath.io within 30 days.
    </div>

    <div class="contact">
        <table>
            <tr>
                <td><span class="ico">@</span> billing@carepath.io</td>
                <td><span class="ico">☎</span> (800) 555-0179</td>
                <td><span class="ico">⌂</span> carepath.io</td>
            </tr>
        </table>
    </div>
</body>
</html>

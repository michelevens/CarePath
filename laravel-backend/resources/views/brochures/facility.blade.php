<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $facility->name }} — CarePath brochure</title>
    <style>
        @page { margin: 0.55in 0.55in 0.7in 0.55in; }
        body {
            font-family: 'Helvetica', sans-serif;
            color: #1c1917;
            font-size: 10.5pt;
            line-height: 1.45;
            margin: 0;
        }
        .brandbar {
            border-bottom: 3px solid #7c3aed;
            padding-bottom: 7pt;
            margin-bottom: 14pt;
        }
        .brandbar table { width: 100%; border-collapse: collapse; }
        .brandbar td { padding: 0; vertical-align: top; }
        .brandbar .logo {
            font-size: 14pt;
            font-weight: bold;
            letter-spacing: -0.3pt;
            color: #1c1917;
        }
        .brandbar .meta {
            font-size: 8pt;
            color: #78716c;
            text-align: right;
        }
        h1 {
            font-size: 22pt;
            font-weight: bold;
            line-height: 1.15;
            letter-spacing: -0.4pt;
            margin: 0 0 4pt 0;
        }
        .address {
            font-size: 10pt;
            color: #57534e;
            margin-bottom: 12pt;
        }
        .topgrid { width: 100%; border-collapse: collapse; margin-bottom: 14pt; }
        .topgrid td { vertical-align: top; padding: 0; }
        .qs-tile {
            background: #f5f3ff;
            border: 1px solid #c4b5fd;
            border-radius: 8pt;
            padding: 12pt;
        }
        .qs-tile .qs-label {
            font-size: 7pt;
            font-weight: bold;
            color: #5b21b6;
            text-transform: uppercase;
            letter-spacing: 0.6pt;
        }
        .qs-tile .qs-score {
            font-size: 26pt;
            font-weight: bold;
            color: #5b21b6;
            line-height: 1;
            margin-top: 4pt;
        }
        .qs-tile .qs-denom { font-size: 12pt; color: #78716c; font-weight: normal; }
        .qs-tile .qs-tier { font-size: 9pt; color: #78716c; margin-top: 4pt; }
        .statbox { padding-left: 12pt; }
        .statbox .stat {
            display: inline-block;
            margin-right: 16pt;
            margin-bottom: 6pt;
        }
        .statbox .stat .v { font-size: 14pt; font-weight: bold; display: block; }
        .statbox .stat .l { font-size: 8pt; color: #78716c; display: block; }
        .badges { margin-top: 6pt; }
        .badge {
            display: inline-block;
            background: #f5f3ff;
            color: #5b21b6;
            padding: 2pt 8pt;
            border-radius: 10pt;
            font-size: 8pt;
            font-weight: bold;
            margin-right: 4pt;
        }
        h2 {
            font-size: 12pt;
            font-weight: bold;
            color: #1c1917;
            margin: 16pt 0 5pt 0;
            border-bottom: 1px solid #e7e5e4;
            padding-bottom: 3pt;
        }
        table.data { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 5pt; }
        table.data th, table.data td {
            text-align: left;
            padding: 5pt 7pt;
            border-bottom: 1px solid #f5f5f4;
            vertical-align: top;
        }
        table.data th {
            background: #fafaf9;
            font-weight: bold;
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 0.4pt;
            color: #57534e;
        }
        .amen-table { width: 100%; border-collapse: collapse; margin-top: 5pt; }
        .amen-table td {
            width: 50%;
            vertical-align: top;
            font-size: 9pt;
            padding: 2pt 8pt 2pt 0;
        }
        .check { color: #7c3aed; font-weight: bold; margin-right: 4pt; }
        .cms-line { font-size: 9pt; margin-top: 4pt; }
        .cms-line span { display: inline-block; margin-right: 12pt; }
        .cms-line strong { color: #1c1917; }
        .questions { font-size: 9pt; padding-left: 16pt; margin-top: 5pt; }
        .questions li { margin-bottom: 3pt; }
        .footer-callout {
            margin-top: 16pt;
            background: #f5f3ff;
            border: 1px solid #c4b5fd;
            border-radius: 6pt;
            padding: 10pt 12pt;
            font-size: 9pt;
            color: #1c1917;
        }
        .footer-callout strong { color: #5b21b6; }
        .small { font-size: 8pt; color: #78716c; }
        .pagefoot {
            position: fixed;
            bottom: -35pt;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 7.5pt;
            color: #78716c;
        }
        .pagefoot strong { color: #1c1917; }
    </style>
</head>
<body>
    <div class="brandbar">
        <table>
            <tr>
                <td><span class="logo">CarePath</span></td>
                <td class="meta">
                    Brochure · Generated {{ $today }}<br>
                    carepath.io/facility/{{ $facility->slug }}
                </td>
            </tr>
        </table>
    </div>

    <h1>{{ $facility->name }}</h1>
    <div class="address">
        @if($facility->address_line_1){{ $facility->address_line_1 }}@endif@if($facility->address_line_2), {{ $facility->address_line_2 }}@endif@if($facility->address_line_1 || $facility->address_line_2),@endif
        {{ $facility->city }}, {{ $facility->state }} {{ $facility->zip ?? '' }}
        @if($facility->phone) &nbsp;·&nbsp; {{ $facility->phone }} @endif
    </div>

    <table class="topgrid">
        <tr>
            @if($quality_score)
                @php
                    $s = (float) $quality_score['score'];
                    $tier = $s >= 8.5 ? 'Excellent' : ($s >= 7.0 ? 'Good' : ($s >= 5.5 ? 'Fair' : 'Needs work'));
                @endphp
                <td style="width: 35%;">
                    <div class="qs-tile">
                        <div class="qs-label">CarePath Quality Score</div>
                        <div class="qs-score">{{ number_format($s, 1) }}<span class="qs-denom"> / 10</span></div>
                        <div class="qs-tier">{{ $tier }} · methodology at carepath.io/why-carepath</div>
                    </div>
                </td>
            @endif
            <td class="statbox">
                <span class="stat">
                    <span class="v">{{ ucfirst(str_replace('_', ' ', (string) $facility->type)) }}</span>
                    <span class="l">Care type</span>
                </span>
                <span class="stat">
                    <span class="v">{{ (int) $facility->total_beds }}</span>
                    <span class="l">Total beds</span>
                </span>
                <span class="stat">
                    <span class="v">{{ (int) $available_beds }}</span>
                    <span class="l">Available now</span>
                </span>
                @if($facility->price_from_cents)
                    <span class="stat">
                        <span class="v">${{ number_format($facility->price_from_cents / 100, 0) }}</span>
                        <span class="l">From / mo</span>
                    </span>
                @endif

                @if($facility->cms_five_star_overall)
                    <div class="cms-line">
                        <span>CMS Overall: <strong>{{ $facility->cms_five_star_overall }}/5</strong></span>
                        @if($facility->cms_five_star_health_inspection)<span>Inspection: <strong>{{ $facility->cms_five_star_health_inspection }}/5</strong></span>@endif
                        @if($facility->cms_five_star_staffing)<span>Staffing: <strong>{{ $facility->cms_five_star_staffing }}/5</strong></span>@endif
                        @if($facility->cms_five_star_quality)<span>Quality: <strong>{{ $facility->cms_five_star_quality }}/5</strong></span>@endif
                    </div>
                @endif

                <div class="badges">
                    @if($facility->medicaid_certified)<span class="badge">Medicaid certified</span>@endif
                    @if($facility->medicare_certified)<span class="badge">Medicare certified</span>@endif
                </div>
            </td>
        </tr>
    </table>

    @if(isset($facility->pricingTiers) && $facility->pricingTiers->isNotEmpty())
        <h2>Pricing breakdown</h2>
        <table class="data">
            <thead>
                <tr>
                    <th>Item</th>
                    <th style="text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                @foreach($facility->pricingTiers as $tier)
                    <tr>
                        <td>
                            {{ $tier->name }}
                            @if($tier->notes)<br><span class="small">{{ $tier->notes }}</span>@endif
                        </td>
                        <td style="text-align: right;">
                            <strong>${{ number_format($tier->amount_cents / 100, 0) }}</strong>
                            <span class="small">@if($tier->billing_cadence === 'monthly')/mo@elseif($tier->billing_cadence === 'one_time') one-time@else/visit@endif</span>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    @if(isset($facility->amenities) && $facility->amenities->isNotEmpty())
        @php
            $amenList = $facility->amenities->take(20)->values();
            $half = (int) ceil($amenList->count() / 2);
            $col1 = $amenList->slice(0, $half);
            $col2 = $amenList->slice($half);
        @endphp
        <h2>Amenities &amp; services</h2>
        <table class="amen-table">
            <tr>
                <td>
                    @foreach($col1 as $a)
                        <div><span class="check">✓</span>{{ $a->name }}</div>
                    @endforeach
                </td>
                <td>
                    @foreach($col2 as $a)
                        <div><span class="check">✓</span>{{ $a->name }}</div>
                    @endforeach
                </td>
            </tr>
        </table>
        @if($facility->amenities->count() > 20)
            <div class="small" style="margin-top: 5pt;">+ {{ $facility->amenities->count() - 20 }} more on carepath.io/facility/{{ $facility->slug }}</div>
        @endif
    @endif

    <h2>Questions to ask on your tour</h2>
    <ol class="questions">
        <li>What is your nurse-to-resident ratio on day, night, and weekend shifts?</li>
        <li>What's your annual staff turnover?</li>
        <li>If care needs increase, do you transition residents in-house or do they have to move?</li>
        <li>What's not included in the monthly cost? (Meds, supplies, beauty, laundry, cable.)</li>
        <li>What's your discharge policy — under what conditions might my loved one have to leave?</li>
        <li>Can I see the last state inspection report?</li>
        <li>Do you accept Medicaid? Long-term care insurance? VA Aid &amp; Attendance?</li>
    </ol>
    <div class="small" style="margin-top: 4pt;">Full 47-question checklist: carepath.io/guides</div>

    <div class="footer-callout">
        <strong>How CarePath is different.</strong> We don't sell leads. When you
        request a tour, only this facility sees your info — not 30 others. Live
        bed availability, transparent pricing, federal CMS data refreshed daily.
        Take this brochure to your tour, your family meeting, or your elder-law
        attorney. Live data: carepath.io/facility/{{ $facility->slug }}
    </div>

    <div class="pagefoot">
        <strong>CarePath</strong> · carepath.io · Brochure for {{ $facility->name }} · Data current {{ $today }}
    </div>
</body>
</html>

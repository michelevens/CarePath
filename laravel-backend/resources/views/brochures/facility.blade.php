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
            overflow: hidden;
        }
        .brandbar .logo {
            float: left;
            font-size: 14pt;
            font-weight: bold;
            letter-spacing: -0.3pt;
            color: #1c1917;
        }
        .brandbar .meta {
            float: right;
            font-size: 8pt;
            color: #78716c;
            text-align: right;
            padding-top: 4pt;
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
            margin-bottom: 10pt;
        }
        .topgrid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14pt;
        }
        .topgrid td {
            vertical-align: top;
            padding: 0;
        }
        .qs-tile {
            background: #f5f3ff;
            border: 1px solid #c4b5fd;
            border-radius: 8pt;
            padding: 10pt 12pt;
            width: 100%;
        }
        .qs-tile .label {
            font-size: 7pt;
            font-weight: bold;
            color: #5b21b6;
            text-transform: uppercase;
            letter-spacing: 0.6pt;
        }
        .qs-tile .score {
            font-size: 26pt;
            font-weight: bold;
            color: #5b21b6;
            line-height: 1;
            margin-top: 3pt;
        }
        .qs-tile .score .denom {
            font-size: 12pt;
            color: #78716c;
            font-weight: normal;
        }
        .qs-tile .tier {
            font-size: 9pt;
            color: #78716c;
            margin-top: 3pt;
        }
        .stat-row {
            margin-top: 8pt;
            font-size: 9pt;
        }
        .stat-row .stat {
            display: inline-block;
            margin-right: 14pt;
            padding-right: 14pt;
            border-right: 1px solid #e7e5e4;
        }
        .stat-row .stat:last-child { border: 0; }
        .stat-row strong { color: #1c1917; font-size: 11pt; }

        h2 {
            font-size: 12pt;
            font-weight: bold;
            color: #1c1917;
            margin: 14pt 0 4pt 0;
            border-bottom: 1px solid #e7e5e4;
            padding-bottom: 3pt;
        }
        .col2 {
            width: 100%;
            border-collapse: collapse;
        }
        .col2 td {
            vertical-align: top;
            padding: 0;
            width: 50%;
        }
        .col2 td.l { padding-right: 8pt; }
        .col2 td.r { padding-left: 8pt; }

        table.data {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
            margin-top: 4pt;
        }
        table.data th, table.data td {
            text-align: left;
            padding: 4pt 6pt;
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
        ul.amenities {
            list-style: none;
            padding: 0;
            margin: 4pt 0 0 0;
            font-size: 9pt;
            column-count: 2;
            column-gap: 14pt;
        }
        ul.amenities li {
            margin-bottom: 3pt;
            -webkit-column-break-inside: avoid;
            page-break-inside: avoid;
        }
        ul.amenities li:before {
            content: "✓ ";
            color: #7c3aed;
            font-weight: bold;
            margin-right: 3pt;
        }
        .cms-row {
            display: block;
            margin-top: 4pt;
            font-size: 9pt;
        }
        .cms-row span {
            display: inline-block;
            margin-right: 12pt;
        }
        .cms-row strong { color: #1c1917; }
        .footer-callout {
            margin-top: 14pt;
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
        <span class="logo">CarePath</span>
        <span class="meta">
            Brochure · Generated {{ $today }}<br>
            carepath.io/facility/{{ $facility->slug }}
        </span>
    </div>

    <h1>{{ $facility->name }}</h1>
    <div class="address">
        {{ $facility->address_line_1 }}@if($facility->address_line_2), {{ $facility->address_line_2 }}@endif,
        {{ $facility->city }}, {{ $facility->state }} {{ $facility->zip }}
        @if($facility->phone) &nbsp;·&nbsp; {{ $facility->phone }} @endif
    </div>

    <table class="topgrid">
        <tr>
            @if($quality_score)
                <td style="width: 35%;">
                    <div class="qs-tile">
                        <div class="label">CarePath Quality Score</div>
                        <div class="score">{{ number_format($quality_score['score'], 1) }}<span class="denom"> / 10</span></div>
                        <div class="tier">
                            @php
                                $s = $quality_score['score'];
                                $tier = $s >= 8.5 ? 'Excellent' : ($s >= 7.0 ? 'Good' : ($s >= 5.5 ? 'Fair' : 'Needs work'));
                            @endphp
                            {{ $tier }} · methodology: carepath.io/why-carepath
                        </div>
                    </div>
                </td>
                <td style="width: 5%;"></td>
            @endif
            <td>
                <div class="stat-row">
                    <span class="stat">
                        <strong>{{ ucfirst(str_replace('_', ' ', $facility->type)) }}</strong><br>
                        <span class="small">Care type</span>
                    </span>
                    <span class="stat">
                        <strong>{{ $facility->total_beds }}</strong><br>
                        <span class="small">Total beds</span>
                    </span>
                    <span class="stat">
                        <strong>{{ $available_beds }}</strong><br>
                        <span class="small">Available now</span>
                    </span>
                    @if($facility->price_from_cents)
                        <span class="stat">
                            <strong>${{ number_format($facility->price_from_cents / 100, 0) }}</strong><br>
                            <span class="small">From / mo</span>
                        </span>
                    @endif
                </div>

                @if($facility->cms_five_star_overall)
                    <div class="cms-row">
                        <span>CMS Overall: <strong>{{ $facility->cms_five_star_overall }}/5</strong></span>
                        @if($facility->cms_five_star_health_inspection)
                            <span>Inspection: <strong>{{ $facility->cms_five_star_health_inspection }}/5</strong></span>
                        @endif
                        @if($facility->cms_five_star_staffing)
                            <span>Staffing: <strong>{{ $facility->cms_five_star_staffing }}/5</strong></span>
                        @endif
                        @if($facility->cms_five_star_quality)
                            <span>Quality: <strong>{{ $facility->cms_five_star_quality }}/5</strong></span>
                        @endif
                    </div>
                @endif

                <div class="cms-row">
                    @if($facility->medicaid_certified)
                        <span style="background: #f5f3ff; color: #5b21b6; padding: 1pt 6pt; border-radius: 8pt;">Medicaid certified</span>
                    @endif
                    @if($facility->medicare_certified)
                        <span style="background: #f5f3ff; color: #5b21b6; padding: 1pt 6pt; border-radius: 8pt;">Medicare certified</span>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    @if(! empty($facility->pricingTiers) && count($facility->pricingTiers) > 0)
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
                            @if($tier->notes)
                                <br><span class="small">{{ $tier->notes }}</span>
                            @endif
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

    @if(! empty($facility->amenities) && count($facility->amenities) > 0)
        <h2>Amenities &amp; services</h2>
        <ul class="amenities">
            @foreach($facility->amenities->take(20) as $a)
                <li>{{ $a->name }}</li>
            @endforeach
        </ul>
        @if(count($facility->amenities) > 20)
            <div class="small" style="margin-top: 4pt;">+ {{ count($facility->amenities) - 20 }} more on carepath.io/facility/{{ $facility->slug }}</div>
        @endif
    @endif

    <h2>Questions to ask on your tour</h2>
    <ul style="font-size: 9pt; padding-left: 14pt; margin-top: 4pt;">
        <li>What is your nurse-to-resident ratio on day, night, and weekend shifts?</li>
        <li>What's your annual staff turnover?</li>
        <li>If care needs increase, do you transition residents in-house or do they need to move?</li>
        <li>What's not included in the monthly cost? (Meds, supplies, beauty, laundry, cable.)</li>
        <li>What's your discharge policy — under what conditions might my loved one have to leave?</li>
        <li>Can I see the last state inspection report?</li>
        <li>Do you accept Medicaid? Long-term care insurance? VA Aid &amp; Attendance?</li>
    </ul>
    <div class="small" style="margin-top: 4pt;">
        Full 47-question checklist: carepath.io/guides
    </div>

    <div class="footer-callout">
        <strong>How CarePath is different.</strong> We don't sell leads. When you
        request a tour, only this facility sees your info — not 30 others. Live
        bed availability, transparent pricing, federal CMS data refreshed daily.
        Take this brochure to your tour, your family meeting, or your elder-law
        attorney. Updated facility data: carepath.io/facility/{{ $facility->slug }}
    </div>

    <div class="pagefoot">
        <strong>CarePath</strong> &nbsp;·&nbsp; carepath.io &nbsp;·&nbsp;
        Brochure for {{ $facility->name }} &nbsp;·&nbsp; Data current as of {{ $today }}
    </div>
</body>
</html>

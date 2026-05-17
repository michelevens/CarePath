<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CarePath — Facility comparison</title>
    <style>
        /* Visual system follows the canonical CarePathGuideTemplate:
           navy / teal / sage on cream. DomPDF doesn't ship web fonts,
           so we fall back to Helvetica which renders cleanly. */
        @page { margin: 0.4in 0.45in 0.55in 0.45in; }
        body {
            font-family: 'Helvetica', sans-serif;
            color: #1E3A5F;
            font-size: 9pt;
            line-height: 1.4;
            margin: 0;
            background: #F4F4F2;
        }

        /* Header band */
        .brandbar {
            border-bottom: 3px solid #2A7F7F;
            padding-bottom: 8pt;
            margin-bottom: 14pt;
        }
        .brandbar table { width: 100%; border-collapse: collapse; }
        .brandbar td { padding: 0; vertical-align: middle; }
        .brandbar .logo {
            font-size: 15pt;
            font-weight: bold;
            color: #1E3A5F;
            letter-spacing: -0.3pt;
        }
        .brandbar .eyebrow {
            font-size: 7pt;
            color: #2A7F7F;
            text-transform: uppercase;
            letter-spacing: 1.4pt;
            font-weight: bold;
        }
        .brandbar .right {
            text-align: right;
            color: #6B7280;
            font-size: 8pt;
        }

        h1 {
            font-size: 18pt;
            font-weight: bold;
            color: #1E3A5F;
            margin: 0 0 4pt 0;
        }
        .lede {
            color: #6B7280;
            font-size: 9pt;
            margin: 0 0 12pt 0;
        }

        /* Card grid */
        .cards { width: 100%; border-collapse: separate; border-spacing: 6pt 0; }
        .cards td { vertical-align: top; }
        .card {
            background: #FFFFFF;
            border: 1pt solid #E5E7EB;
            border-radius: 8pt;
            padding: 10pt;
        }
        .card .name {
            font-size: 11.5pt;
            font-weight: bold;
            color: #1E3A5F;
            margin: 0 0 2pt 0;
            line-height: 1.2;
        }
        .card .addr {
            font-size: 8pt;
            color: #6B7280;
            margin-bottom: 8pt;
        }

        .badges { margin: 6pt 0 8pt 0; }
        .badge {
            display: inline-block;
            font-size: 6.5pt;
            font-weight: bold;
            color: #1E3A5F;
            background: #F4F4F2;
            border: 1pt solid #E5E7EB;
            padding: 2pt 5pt;
            border-radius: 9pt;
            margin: 0 2pt 2pt 0;
        }
        .badge.verified { color: #FFFFFF; background: #2A7F7F; border-color: #2A7F7F; }
        .badge.cms      { color: #1E3A5F; background: #DBEAFE; border-color: #BFDBFE; }
        .badge.fresh    { color: #2A7F7F; background: #D1F4F4; border-color: #2A7F7F; }

        .row {
            border-top: 1pt dashed #E5E7EB;
            padding: 5pt 0;
            color: #1E3A5F;
            font-size: 8.5pt;
        }
        .row .k { color: #6B7280; font-weight: bold; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.5pt; }
        .row .v { display: block; margin-top: 2pt; font-weight: bold; font-size: 9.5pt; }

        .price-block {
            margin-top: 8pt;
            padding: 6pt;
            background: #F4F4F2;
            border-radius: 6pt;
        }
        .price-block .label {
            font-size: 7pt;
            color: #2A7F7F;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
        }
        .price-block .v {
            font-size: 13pt;
            font-weight: bold;
            color: #1E3A5F;
            margin-top: 1pt;
        }

        .projection {
            margin-top: 8pt;
            padding: 6pt;
            background: #1E3A5F;
            color: #FFFFFF;
            border-radius: 6pt;
        }
        .projection .label {
            font-size: 7pt;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
            font-weight: bold;
            color: #8FAF9F;
        }
        .projection .v {
            font-size: 12pt;
            font-weight: bold;
            margin-top: 2pt;
        }
        .projection .sub {
            font-size: 7pt;
            color: #BFDBFE;
            margin-top: 2pt;
        }

        .amen-list {
            list-style: none;
            padding: 0;
            margin: 6pt 0 0 0;
            font-size: 8pt;
            color: #1E3A5F;
        }
        .amen-list li {
            padding: 1pt 0;
            border-bottom: 1pt dotted #E5E7EB;
        }
        .amen-list li:last-child { border-bottom: 0; }

        /* Contact footer band (mirrors the canonical guide template) */
        .contact {
            margin-top: 18pt;
            background: #1E3A5F;
            color: #FFFFFF;
            border-radius: 8pt;
        }
        .contact table { width: 100%; border-collapse: collapse; }
        .contact td {
            padding: 9pt 14pt;
            font-size: 8.5pt;
            color: #FFFFFF;
            border-right: 1pt solid rgba(255,255,255,0.10);
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

        .scenario {
            margin-top: 10pt;
            font-size: 7.5pt;
            color: #6B7280;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="brandbar">
        <table>
            <tr>
                <td>
                    <div class="eyebrow">CarePath · Family decision report</div>
                    <div class="logo">Long-Term Care Comparison</div>
                </td>
                <td class="right">
                    Generated {{ $today }}<br>
                    {{ count($cards) }} facilit{{ count($cards) === 1 ? 'y' : 'ies' }} compared
                </td>
            </tr>
        </table>
    </div>

    <h1>Side-by-side: {{ count($cards) }} facilities</h1>
    <p class="lede">
        Five-year projected cost assumes <strong>{{ str_replace('_', ' ', $projection_inputs['level_of_care']) }} level of care</strong>,
        ${{ number_format($projection_inputs['starting_assets_cents'] / 100) }} starting assets,
        ${{ number_format($projection_inputs['monthly_income_cents'] / 100) }}/mo income,
        Medicare Part A eligible, no LTC insurance.
        @if($projection_inputs['va_aa_status'] !== 'none')
            VA: {{ str_replace('_', ' ', $projection_inputs['va_aa_status']) }}.
        @endif
    </p>

    <table class="cards">
        <tr>
            @foreach($cards as $card)
                @php
                    $f = $card['facility'];
                    $pricingBase = $f->price_from_cents ? '$' . number_format($f->price_from_cents / 100) . '/mo' : '—';
                    $totalOutOfPocket = $card['projection']['totals']['out_of_pocket_cents'] ?? null;
                    $totalCost = $card['projection']['totals']['facility_cost_cents'] ?? null;
                @endphp
                @php
                    $typeLabels = [
                        'assisted_living' => 'Assisted Living',
                        'memory_care' => 'Memory Care',
                        'snf' => 'Skilled Nursing',
                        'ccrc' => 'Continuing Care',
                        'independent_living' => 'Independent Living',
                        'group_home' => 'Group Home',
                        'adult_family_home' => 'Adult Family Home',
                        'icf_iid' => 'ICF/IID',
                    ];
                @endphp
                <td style="width: {{ floor(100 / count($cards)) }}%">
                    <div class="card">
                        <div class="name">{{ $f->name }}</div>
                        <div class="addr">
                            {{ $f->city }}, {{ $f->state }}{{ $f->zip ? ' ' . $f->zip : '' }}<br>
                            {{ $typeLabels[$f->type] ?? ucwords(str_replace('_', ' ', $f->type)) }}
                        </div>

                        <div class="badges">
                            @foreach($card['trust_badges'] as $b)
                                <span class="badge {{ $b['tone'] }}">{{ $b['label'] }}</span>
                            @endforeach
                        </div>

                        <div class="row">
                            <span class="k">CMS rating</span>
                            <span class="v">{{ $f->cms_five_star_overall ? $f->cms_five_star_overall . '/5 ★' : '—' }}</span>
                        </div>
                        <div class="row">
                            <span class="k">CarePath Quality Score</span>
                            <span class="v">{{ $card['quality_score']['score'] ?? '—' }}/10</span>
                        </div>
                        <div class="row">
                            <span class="k">Beds / available now</span>
                            <span class="v">
                                {{ $f->total_beds ?: '—' }}
                                / <span style="color: #2A7F7F;">{{ $card['arr']['available_beds'] }}</span>
                            </span>
                        </div>
                        <div class="row">
                            <span class="k">Payer access</span>
                            <span class="v">
                                @if($f->medicaid_certified) Medicaid @endif
                                @if($f->medicare_certified) {{ $f->medicaid_certified ? '· ' : '' }}Medicare @endif
                                @if(!$f->medicaid_certified && !$f->medicare_certified) Private only @endif
                            </span>
                        </div>

                        <div class="price-block">
                            <div class="label">Published base rate</div>
                            <div class="v">{{ $pricingBase }}</div>
                        </div>

                        @if($totalOutOfPocket !== null)
                            <div class="projection">
                                <div class="label">5-yr blended out-of-pocket</div>
                                <div class="v">${{ number_format($totalOutOfPocket / 100) }}</div>
                                @if($totalCost !== null)
                                    <div class="sub">
                                        Total facility cost ${{ number_format($totalCost / 100) }} ·
                                        Medicare/Medicaid/VA cover the difference
                                    </div>
                                @endif
                            </div>
                        @endif

                        @if($f->amenities->count() > 0)
                            <div class="row" style="border-top: 1pt dashed #E5E7EB; margin-top: 8pt;">
                                <span class="k">Top amenities</span>
                            </div>
                            <ul class="amen-list">
                                @foreach($f->amenities->take(5) as $a)
                                    <li>· {{ $a->name }}</li>
                                @endforeach
                            </ul>
                        @endif
                    </div>
                </td>
            @endforeach
        </tr>
    </table>

    <p class="scenario">
        Sourced from federal CMS data + state licensure files · CarePath does not sell your contact info to facilities ·
        Pricing breakdown and tour booking at carepath.io/facility/&lt;slug&gt;
    </p>

    <div class="contact">
        <table>
            <tr>
                <td><span class="ico">@</span> hello@carepath.io</td>
                <td><span class="ico">☎</span> (800) 555-0179</td>
                <td><span class="ico">⌂</span> carepath.io</td>
            </tr>
        </table>
    </div>
</body>
</html>

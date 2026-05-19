@extends('guides.layout')

@section('content')

<p class="lead">
    The single biggest reason families delay placement is the fear
    that long-term care will erase a lifetime of savings in two
    years. They're not wrong about the cost — but the math is more
    nuanced than most websites tell you. This guide is the honest
    5-year cost picture, broken down by care type, state, and
    funding source, with crossover-to-Medicaid math at the bottom.
</p>

<div class="callout">
    <div class="label">Numbers in this guide</div>
    Annual cost figures come from the 2026 Genworth Cost of Care
    Survey (the industry-standard benchmark, updated annually). State
    averages are medians of metro-area data; rural rates run 10-15%
    lower in most states, premium markets (San Francisco, Manhattan,
    Boston, suburban DC) run 20-40% higher. Always confirm with the
    facility directly — Genworth is a starting point, not a quote.
</div>

<h2>1. What the four care types actually cost</h2>

<table style="width:100%; margin-top: 10pt; border-collapse: collapse; font-size: 10pt;">
    <thead>
        <tr style="background:#F4F4F2;">
            <th style="padding:8pt; text-align:left; border-bottom: 1pt solid #1E3A5F;">Care type</th>
            <th style="padding:8pt; text-align:right; border-bottom: 1pt solid #1E3A5F;">Median monthly</th>
            <th style="padding:8pt; text-align:right; border-bottom: 1pt solid #1E3A5F;">5-year total</th>
        </tr>
    </thead>
    <tbody>
        <tr><td style="padding:7pt;">Adult day care</td><td style="padding:7pt; text-align:right;">$2,058</td><td style="padding:7pt; text-align:right;">$123,500</td></tr>
        <tr><td style="padding:7pt;">In-home caregiver (44 hrs/week)</td><td style="padding:7pt; text-align:right;">$6,292</td><td style="padding:7pt; text-align:right;">$377,500</td></tr>
        <tr><td style="padding:7pt;">Assisted living (1-bedroom)</td><td style="padding:7pt; text-align:right;">$5,511</td><td style="padding:7pt; text-align:right;">$330,700</td></tr>
        <tr><td style="padding:7pt;">Memory care (specialized AL)</td><td style="padding:7pt; text-align:right;">$7,063</td><td style="padding:7pt; text-align:right;">$423,800</td></tr>
        <tr><td style="padding:7pt;">Group home / AFH (small setting)</td><td style="padding:7pt; text-align:right;">$5,000</td><td style="padding:7pt; text-align:right;">$300,000</td></tr>
        <tr><td style="padding:7pt;">Nursing home (semi-private)</td><td style="padding:7pt; text-align:right;">$9,733</td><td style="padding:7pt; text-align:right;">$584,000</td></tr>
        <tr><td style="padding:7pt;">Nursing home (private room)</td><td style="padding:7pt; text-align:right;">$11,074</td><td style="padding:7pt; text-align:right;">$664,400</td></tr>
    </tbody>
</table>

<p style="margin-top: 12pt;">
    These numbers assume <strong>no</strong> rate increases.
    Annual increases run 3-5% on average. Build that into any
    projection longer than 24 months.
</p>

<h2>2. Where you live matters more than which type you pick</h2>

<table style="width:100%; margin-top: 10pt; border-collapse: collapse; font-size: 10pt;">
    <thead>
        <tr style="background:#F4F4F2;">
            <th style="padding:8pt; text-align:left; border-bottom: 1pt solid #1E3A5F;">Region</th>
            <th style="padding:8pt; text-align:right; border-bottom: 1pt solid #1E3A5F;">AL median</th>
            <th style="padding:8pt; text-align:right; border-bottom: 1pt solid #1E3A5F;">SNF (private)</th>
        </tr>
    </thead>
    <tbody>
        <tr><td style="padding:7pt;">Mississippi, Alabama, Louisiana</td><td style="padding:7pt; text-align:right;">$3,800</td><td style="padding:7pt; text-align:right;">$7,200</td></tr>
        <tr><td style="padding:7pt;">Florida, Georgia, Texas</td><td style="padding:7pt; text-align:right;">$4,500</td><td style="padding:7pt; text-align:right;">$9,000</td></tr>
        <tr><td style="padding:7pt;">National median</td><td style="padding:7pt; text-align:right;">$5,511</td><td style="padding:7pt; text-align:right;">$11,074</td></tr>
        <tr><td style="padding:7pt;">California (Bay / LA)</td><td style="padding:7pt; text-align:right;">$6,500</td><td style="padding:7pt; text-align:right;">$13,500</td></tr>
        <tr><td style="padding:7pt;">Massachusetts, New York</td><td style="padding:7pt; text-align:right;">$7,200</td><td style="padding:7pt; text-align:right;">$15,000</td></tr>
        <tr><td style="padding:7pt;">Alaska</td><td style="padding:7pt; text-align:right;">$8,000</td><td style="padding:7pt; text-align:right;">$36,000</td></tr>
    </tbody>
</table>

<p style="margin-top: 12pt;">
    The implication: <strong>moving 100 miles can save $30,000-50,000
    per year</strong>. Families with flexibility on location should
    cross state lines if they can. Florida, Arizona, Texas, and the
    Carolinas are the most common "move for care" destinations for
    that reason — combined with no state income tax and milder
    weather.
</p>

<h2>3. Who pays for what — the four funding sources</h2>

<h3>Medicare</h3>
<p>
    Pays for up to 100 days of <strong>skilled nursing</strong> after
    a 3-night hospital stay. Days 1-20 fully covered, days 21-100
    have a daily co-pay (~$200/day in 2026). After day 100, Medicare
    stops. Does <strong>not</strong> pay for assisted living, memory
    care, or custodial long-term care. Most families misunderstand
    this — see our Medicare-for-LTC cheat sheet for the full picture.
</p>

<h3>Medicaid</h3>
<p>
    Pays for <strong>nursing-home care</strong> for those who meet
    state income + asset limits (typically $2,000 in assets for an
    individual, marital home + one car exempt). In about 30 states,
    Medicaid <strong>HCBS waivers</strong> also pay for assisted
    living, group homes, and in-home care — but waivers have
    waitlists. See our state Medicaid waiver map.
</p>

<h3>Long-term care insurance</h3>
<p>
    Pays for assisted living, memory care, and SNF — but only if your
    loved one bought the policy in advance. New policies after a
    diagnosis are not available. Existing policies pay a daily
    benefit ($150-300/day common), often with a 90-day elimination
    period.
</p>
<div class="check-item"><span class="checkbox"></span> Most families with LTC insurance <strong>never file the claim</strong> — they don't know how. The claim is on the elder, not the family; their PCP completes the activities-of-daily-living (ADL) assessment that proves benefit eligibility. Worth ~$50,000-100,000 over an average stay.</div>

<h3>VA Aid & Attendance</h3>
<p>
    For wartime veterans and surviving spouses. Up to $2,727/month
    single, $3,232/month couple, $1,758/month surviving spouse
    (2026 rates). Pays the family directly — they spend it on any
    LTC arrangement they choose. About 60% of eligible families
    never apply.
</p>

<h3>Private pay (savings, home equity, family)</h3>
<p>
    The default until other sources kick in. Most families exhaust
    savings within 2-4 years of full-time care.
</p>

<h2>4. The crossover-to-Medicaid math (the 2-4 year wall)</h2>
<p>
    The pattern: family starts in assisted living paying privately,
    burns through retirement savings, then crosses over to either
    Medicaid SNF or a Medicaid-friendly assisted living once assets
    fall under the state's threshold. The "wall" is the moment
    private money runs out.
</p>
<div class="check-item"><span class="checkbox"></span> <strong>Couple with $250k savings, $4,000/mo Social Security, in $5,500/mo assisted living:</strong> private money runs out at month 35 (just under 3 years).</div>
<div class="check-item"><span class="checkbox"></span> <strong>Single person with $80k savings, $1,800/mo Social Security, in $4,500/mo memory care:</strong> private money runs out at month 30 (2.5 years).</div>
<div class="check-item"><span class="checkbox"></span> <strong>Plan for crossover from day 1.</strong> Pick a facility that accepts Medicaid for the long-term wing OR accepts the state's HCBS waiver — many private-pay facilities will keep a resident once approved if a spend-down was documented from the start.</div>

<h2>5. The cost-saving moves families miss</h2>
<div class="check-item"><span class="checkbox"></span> <strong>The medical-expense tax deduction</strong> — out-of-pocket LTC costs above 7.5% of AGI are tax-deductible. Worth $3,000-15,000/year for families paying privately. Often more than the cost of a CPA.</div>
<div class="check-item"><span class="checkbox"></span> <strong>HSA + FSA contributions</strong> — pre-tax dollars for medical / LTC expenses if your loved one has an HSA-qualifying plan.</div>
<div class="check-item"><span class="checkbox"></span> <strong>Veterans Pension</strong> — distinct from Aid & Attendance. Worth checking.</div>
<div class="check-item"><span class="checkbox"></span> <strong>Reverse mortgages</strong> — controversial. Works in narrow cases where the loved one will stay in the home. Bad fit if they're moving to a facility (mortgage becomes due).</div>
<div class="check-item"><span class="checkbox"></span> <strong>Life-insurance conversion</strong> — some whole-life policies can be converted to "long-term care benefit plans" that pay the facility directly. Worth a 30-min consult with an LTC insurance broker.</div>
<div class="check-item"><span class="checkbox"></span> <strong>Continuing Care Retirement Community (CCRC) refundable entrance fee</strong> — high upfront ($150-500k) but locks in cost certainty for life and refunds 80-90% to the estate. Math works for families with significant assets.</div>

<h2>6. The 60-second cost reality test</h2>
<p>
    Three numbers, one answer:
</p>
<div class="check-item"><span class="checkbox"></span> <strong>Monthly income</strong> (Social Security, pension, annuity): $______</div>
<div class="check-item"><span class="checkbox"></span> <strong>Liquid assets</strong> (savings, investments, anything sellable): $______</div>
<div class="check-item"><span class="checkbox"></span> <strong>Monthly care cost</strong> (your loved one's facility's quoted rate): $______</div>
<p style="margin-top: 10pt;">
    <strong>Months of private-pay runway</strong> = Liquid assets ÷
    (Monthly care cost − Monthly income).
</p>
<p>
    If the answer is under 24 months, file the Medicaid waiver
    application <strong>now</strong>. The wait list is typically 2-5
    years in most states; your application date is your priority.
</p>

<div class="callout" style="margin-top: 18pt; background:#F4F4F2;">
    <div class="label">The honest take</div>
    There is no version of this that's not expensive. But there's a
    huge difference between "expensive and planned for" and
    "expensive and panicked about." The 60-second test above —
    done today, not next year — is the difference.
</div>

@endsection

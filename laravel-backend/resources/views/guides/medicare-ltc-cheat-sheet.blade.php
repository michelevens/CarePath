@extends('guides.layout')

@section('content')

<p class="lead">
    Most families learn Medicare's long-term care limits the hard way — after a hospital stay, when discharge planners give 24 hours' notice. This guide is the rulebook they wish they'd had a year earlier.
</p>

<h2>The 30-second version</h2>
<ul>
    <li><strong>Medicare does not pay for long-term assisted living or memory care.</strong> Period.</li>
    <li>Medicare pays for <strong>short, skilled stays in a skilled nursing facility (SNF)</strong> after a qualifying hospitalization — up to 100 days, with strings attached.</li>
    <li><strong>Medicaid</strong> (not Medicare) is the federal/state program that pays for long-term custodial care if you qualify financially.</li>
    <li><strong>LTC insurance</strong>, <strong>VA Aid &amp; Attendance</strong>, and <strong>private pay</strong> fill the rest.</li>
</ul>

<h2>What Medicare A covers for SNF stays</h2>
<table>
    <thead>
        <tr>
            <th>Days</th>
            <th>Your share (2026)</th>
            <th>Medicare pays</th>
        </tr>
    </thead>
    <tbody>
        <tr><td>1–20</td><td>$0/day</td><td>100% of approved amount</td></tr>
        <tr><td>21–100</td><td>$209.50/day coinsurance</td><td>Rest of approved amount</td></tr>
        <tr><td>101+</td><td>All costs</td><td>$0 — coverage ends</td></tr>
    </tbody>
</table>
<p class="small">Amounts adjust annually; 2026 figures shown for planning. Verify current rates at medicare.gov.</p>

<h2>The 4 conditions that unlock Medicare SNF coverage</h2>
<p>All four must be true. Miss one and you pay 100% out of pocket.</p>
<ol>
    <li><strong>3-night qualifying hospital stay.</strong> Three consecutive midnights as an inpatient (observation status does <em>not</em> count — this is the #1 trap).</li>
    <li><strong>Admission to SNF within 30 days</strong> of hospital discharge.</li>
    <li><strong>Daily skilled care</strong> ordered by a physician — skilled nursing or rehab therapy that requires professional staff.</li>
    <li><strong>Medicare-certified SNF.</strong> Not all facilities are certified; ask before admission.</li>
</ol>

<div class="callout">
    <div class="label">The observation-status trap</div>
    If your loved one was admitted "under observation" rather than as an inpatient, those days do NOT count toward the 3-night requirement, even if they slept in a hospital bed. Always ask the hospital point-blank: "What is their admission status today — observation or inpatient?" Get it in writing.
</div>

<h2>What Medicare covers <em>during</em> a covered SNF stay</h2>
<ul>
    <li>Semi-private room and meals</li>
    <li>Skilled nursing care</li>
    <li>Physical, occupational, and speech therapy</li>
    <li>Medical social services</li>
    <li>Medications administered during the stay</li>
    <li>Medical supplies and equipment used in the facility</li>
    <li>Ambulance transport to other medical care if necessary</li>
    <li>Dietary counseling</li>
</ul>

<h2>What Medicare does NOT cover (the big gaps)</h2>
<ul>
    <li><strong>Custodial care</strong> — help with bathing, dressing, eating, toileting, if that's the <em>only</em> care needed.</li>
    <li><strong>Long-term residence</strong> in assisted living or memory care.</li>
    <li><strong>Private room</strong> (unless medically necessary).</li>
    <li><strong>Personal items</strong> — TV, telephone, toiletries.</li>
    <li><strong>Care after day 100</strong> in any given benefit period.</li>
</ul>

<h2>The "benefit period" reset</h2>
<p>A new benefit period starts when you've been out of the hospital and SNF for <strong>60 consecutive days</strong>. Then the 100-day clock resets. This is rare; most LTC residents do not get a second 100-day period.</p>

<h2>Medicare A vs. B vs. C vs. D for LTC</h2>
<table>
    <thead><tr><th>Part</th><th>What it covers for LTC</th></tr></thead>
    <tbody>
        <tr><td><strong>A</strong></td><td>SNF (above), hospice, home health</td></tr>
        <tr><td><strong>B</strong></td><td>Doctor visits in the facility, durable medical equipment, outpatient therapy</td></tr>
        <tr><td><strong>C</strong> (Medicare Advantage)</td><td>Replaces A+B; SNF rules may differ (often easier, sometimes stricter — read the plan)</td></tr>
        <tr><td><strong>D</strong></td><td>Prescription drugs; many SNFs have preferred pharmacies. Ask before admission.</td></tr>
    </tbody>
</table>

<h2>Hospice under Medicare</h2>
<p>Medicare Part A covers hospice fully if a doctor certifies a 6-month-or-less prognosis. Hospice covers medications related to the terminal illness, equipment, nursing visits, social work, chaplain, and respite care. <em>Room and board in a facility is not hospice</em> — that's still private pay or Medicaid.</p>

<h2>If Medicare denies coverage</h2>
<ol>
    <li>Ask for the denial in writing (a "Notice of Medicare Non-Coverage").</li>
    <li>You have the right to request an <strong>expedited review</strong> within 24 hours by the state Quality Improvement Organization (QIO) — number on the notice.</li>
    <li>If the QIO upholds the denial, you can appeal further. Coverage continues during the first appeal level.</li>
    <li>Call your <strong>State Health Insurance Assistance Program (SHIP)</strong> — free, unbiased help. Find yours at shiphelp.org.</li>
</ol>

<div class="callout">
    <div class="label">Bottom line</div>
    Medicare is a short-term bridge for skilled rehab, not a long-term care plan. If long-term residence is in your family's future, the question to start working on today is: "How will we pay for this in month 4, in year 2, in year 5?" CarePath's free 5-year cost projector helps with the math.
</div>

@endsection

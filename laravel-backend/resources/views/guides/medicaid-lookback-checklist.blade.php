@extends('guides.layout')

@section('content')

<p class="lead">
    The 60-month look-back is the single most-misunderstood rule in Medicaid LTC planning. Knowing what counts as a "transfer for less than fair market value" can save tens of thousands — or save your application from a denial.
</p>

<h2>What the look-back is, in plain English</h2>
<p>When you apply for Medicaid long-term care benefits, the state reviews <strong>every asset transfer made in the 60 months (5 years) before your application date</strong>. Any transfer for less than market value can trigger a <strong>penalty period</strong> — months during which Medicaid won't pay for your care, even if you'd otherwise qualify.</p>

<div class="callout">
    <div class="label">The math</div>
    Penalty period (months) = total uncompensated transfers ÷ your state's monthly average private-pay nursing-home cost. Example: $90,000 in unexplained transfers ÷ $9,000/mo state average = 10 months with no Medicaid coverage.
</div>

<h2>Transfers that trigger a penalty</h2>
<div class="check-item"><span class="checkbox"></span> Cash gifts to family or friends (yes, even small recurring ones)</div>
<div class="check-item"><span class="checkbox"></span> Adding a child as joint owner on a bank account or deed</div>
<div class="check-item"><span class="checkbox"></span> Selling a house, car, or business for less than fair market value</div>
<div class="check-item"><span class="checkbox"></span> Transferring property to family "for $1"</div>
<div class="check-item"><span class="checkbox"></span> Forgiving a loan you made to a family member</div>
<div class="check-item"><span class="checkbox"></span> Setting up certain trusts (revocable trusts are countable; some irrevocable trusts are not)</div>
<div class="check-item"><span class="checkbox"></span> Paying off an adult child's debts</div>
<div class="check-item"><span class="checkbox"></span> Buying a life-estate interest in someone else's home (unless you live there 12+ months)</div>

<h2>Transfers that DO NOT trigger a penalty</h2>
<div class="check-item"><span class="checkbox"></span> Transfers to your spouse (no limit)</div>
<div class="check-item"><span class="checkbox"></span> Transfers to a child who is blind or permanently disabled</div>
<div class="check-item"><span class="checkbox"></span> Transfers to a trust for a disabled person under age 65</div>
<div class="check-item"><span class="checkbox"></span> Transfer of the home to:
    <ul>
        <li>A child who is under 21, or blind/disabled</li>
        <li>A sibling who has equity in the home and lived there 1+ year before institutionalization</li>
        <li>A caretaker child who lived in the home 2+ years before institutionalization and provided care that delayed nursing home placement</li>
    </ul>
</div>
<div class="check-item"><span class="checkbox"></span> Spending down on goods/services you actually received for fair market value (legal fees, medical bills, home repairs, prepaid funeral)</div>
<div class="check-item"><span class="checkbox"></span> Bona fide loans with a signed promissory note, fair interest rate, and a fixed repayment schedule</div>

<h2>Assets the state won't count at all (exemptions)</h2>
<table>
    <thead><tr><th>Asset</th><th>Treatment</th></tr></thead>
    <tbody>
        <tr><td>Primary home</td><td>Exempt up to a state equity cap (often $713k–$1.07M in 2026) if applicant intends to return, or spouse/dependent lives there</td></tr>
        <tr><td>One vehicle</td><td>Exempt regardless of value</td></tr>
        <tr><td>Household goods, personal items</td><td>Exempt</td></tr>
        <tr><td>Burial plot &amp; irrevocable prepaid funeral</td><td>Exempt</td></tr>
        <tr><td>Term life insurance</td><td>Exempt</td></tr>
        <tr><td>Whole life insurance with face value ≤ $1,500</td><td>Exempt</td></tr>
        <tr><td>Retirement accounts in payout status</td><td>Exempt in most states (varies)</td></tr>
    </tbody>
</table>

<h2>Spend-down: what's allowed and smart</h2>
<p>Spending assets <em>on yourself</em> for fair value is not a penalty trigger. Common legitimate spend-down moves:</p>
<ul>
    <li>Pay off the mortgage on the (exempt) home</li>
    <li>Replace an old vehicle with a newer one (still the one-vehicle exemption)</li>
    <li>Home repairs and improvements (roof, accessibility ramps, HVAC)</li>
    <li>Pre-pay funeral and burial expenses with an irrevocable contract</li>
    <li>Pay off legitimate debts (credit cards, medical bills, taxes)</li>
    <li>Pay attorney fees for Medicaid planning</li>
    <li>Buy needed medical equipment not covered by insurance</li>
</ul>

<div class="callout">
    <div class="label">What you CAN'T do</div>
    Convert assets to cash and give the money away. Buy expensive items with the intent to immediately resell at a loss. Hide money in a safe deposit box. The state cross-checks bank records, tax returns, and recorded property transfers going back 5 years.
</div>

<h2>The community spouse</h2>
<p>If one spouse needs Medicaid LTC and the other stays at home (the "community spouse"), federal rules protect the community spouse from impoverishment:</p>
<ul>
    <li><strong>Community Spouse Resource Allowance (CSRA)</strong>: protects $30,828–$154,140 of countable assets in 2026 (state-specific within range).</li>
    <li><strong>Minimum Monthly Maintenance Needs Allowance (MMMNA)</strong>: protects $2,555–$3,853/mo of the institutionalized spouse's income for the community spouse.</li>
    <li>The primary home and one vehicle remain exempt while the community spouse occupies them.</li>
</ul>

<h2>5 steps to a clean application</h2>
<ol>
    <li><strong>Gather 60 months of bank statements</strong> for every account in the applicant's name. State will request these.</li>
    <li><strong>Document every transfer over $500</strong> — purpose, recipient, value received. Keep receipts.</li>
    <li><strong>Get appraisals</strong> for any major asset sold (house, vehicle, business). Sale price must match.</li>
    <li><strong>Identify exempt assets</strong> and assemble proof (deed, vehicle title, life insurance policy).</li>
    <li><strong>Talk to an elder-law attorney</strong> who is certified by the National Elder Law Foundation (CELA). The $2k–$5k fee typically saves multiples in protected assets and avoided penalties.</li>
</ol>

<div class="callout">
    <div class="label">Single most important rule</div>
    Do not give money away in the 5 years before you think you might need Medicaid. If you've already made gifts, do not panic — penalties are calculated on uncompensated transfers, and there are legal strategies (annuities, promissory notes, spousal refusal in some states) to mitigate. Get advice before applying.
</div>

@endsection

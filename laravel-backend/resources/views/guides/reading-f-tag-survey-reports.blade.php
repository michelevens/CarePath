@extends('guides.layout')

@section('content')

<p class="lead">
    Every Medicare-certified nursing home in America gets inspected
    by state surveyors at least annually. The resulting report —
    full of acronyms and severity codes — is public, free, and
    incredibly useful for separating a "had one bad inspection" from
    a "you should not place your loved one here." This guide makes
    it readable.
</p>

<div class="callout">
    <div class="label">Where to find the report</div>
    Every facility's CMS Care Compare page (medicare.gov/care-compare)
    links to the most recent state inspection. CarePath surfaces the
    same report directly on every facility detail page under
    "Compliance." Look for "Inspection Report" or "Survey Report."
    The state inspection happens 9-15 months apart by federal rule.
</div>

<h2>1. The 5-section anatomy of a survey report</h2>

<h3>Statement of Deficiencies (CMS-2567)</h3>
<p>
    The main document. Lists each "F-tag" finding (federal
    regulation cited), what the surveyors saw, who was affected,
    and the severity classification. Reads like a long, narrative
    police report. The good news: you only have to skim it for
    severity codes — most of the prose is process documentation.
</p>

<h3>Plan of Correction</h3>
<p>
    The facility's required written response: what they're going to
    do about each finding, by what date, who's accountable. Look
    for vague language ("staff will be re-educated") vs specific
    ("the DON will conduct unannounced 11pm med-pass audits weekly
    for 90 days") — the latter is a real fix.
</p>

<h3>Scope + Severity Matrix</h3>
<p>
    The grid that classifies every finding by how bad it was. The
    grid below is the key to reading the entire report. See
    section 2.
</p>

<h3>Resident Quality of Life summary</h3>
<p>
    Surveyors interview residents and families directly. Quotes
    from these conversations end up in the report (anonymized).
    These are gold — actual residents describing the facility in
    their own words.
</p>

<h3>Substantiated complaints</h3>
<p>
    A separate section that lists every complaint filed against
    the facility in the past year, whether it was substantiated,
    and what the corrective action was. If the same complaint
    theme repeats (e.g., medication errors, falls), the pattern
    matters more than any single incident.
</p>

<h2>2. The Scope + Severity matrix (the key to it all)</h2>

<p>Every F-tag finding is assigned a letter A through L. The letter
encodes two things: severity (rows) and scope (columns).</p>

<table style="width:100%; margin-top: 10pt; border-collapse: collapse; font-size: 10pt;">
    <thead>
        <tr style="background:#F4F4F2;">
            <th style="padding:8pt; text-align:left; border-bottom: 1pt solid #1E3A5F;">Severity ↓ / Scope →</th>
            <th style="padding:8pt; text-align:center; border-bottom: 1pt solid #1E3A5F;">Isolated</th>
            <th style="padding:8pt; text-align:center; border-bottom: 1pt solid #1E3A5F;">Pattern</th>
            <th style="padding:8pt; text-align:center; border-bottom: 1pt solid #1E3A5F;">Widespread</th>
        </tr>
    </thead>
    <tbody>
        <tr><td style="padding:7pt;"><strong>Immediate jeopardy</strong> (life or safety)</td><td style="padding:7pt; text-align:center; background:#FFE5E5;">J</td><td style="padding:7pt; text-align:center; background:#FFE5E5;">K</td><td style="padding:7pt; text-align:center; background:#FFE5E5;">L</td></tr>
        <tr><td style="padding:7pt;"><strong>Actual harm</strong></td><td style="padding:7pt; text-align:center; background:#FFE5C5;">G</td><td style="padding:7pt; text-align:center; background:#FFE5C5;">H</td><td style="padding:7pt; text-align:center; background:#FFE5C5;">I</td></tr>
        <tr><td style="padding:7pt;"><strong>Potential for more than minimal harm</strong></td><td style="padding:7pt; text-align:center;">D</td><td style="padding:7pt; text-align:center;">E</td><td style="padding:7pt; text-align:center;">F</td></tr>
        <tr><td style="padding:7pt;"><strong>Potential for minimal harm</strong></td><td style="padding:7pt; text-align:center;">A</td><td style="padding:7pt; text-align:center;">B</td><td style="padding:7pt; text-align:center;">C</td></tr>
    </tbody>
</table>

<p style="margin-top: 12pt;">
    <strong>The rule of thumb</strong>: any <strong>J / K / L</strong>
    is a serious red flag — federal regulators consider these
    "Immediate Jeopardy" findings and the facility had to act
    immediately. <strong>G / H / I</strong> are actual-harm
    findings and still very serious. <strong>D / E / F</strong> are
    common in virtually every facility report and aren't disqualifying
    on their own. <strong>A / B / C</strong> are minor.
</p>

<h2>3. The 10 F-tags families should know</h2>

<table style="width:100%; margin-top: 10pt; border-collapse: collapse; font-size: 10pt;">
    <thead>
        <tr style="background:#F4F4F2;">
            <th style="padding:6pt; text-align:left; border-bottom: 1pt solid #1E3A5F;">F-tag</th>
            <th style="padding:6pt; text-align:left; border-bottom: 1pt solid #1E3A5F;">What it means</th>
        </tr>
    </thead>
    <tbody>
        <tr><td style="padding:6pt;"><strong>F600</strong></td><td style="padding:6pt;">Free from abuse and neglect — citations here are extremely serious</td></tr>
        <tr><td style="padding:6pt;"><strong>F684</strong></td><td style="padding:6pt;">Quality of care — broad category, includes preventable pressure injuries, dehydration, weight loss</td></tr>
        <tr><td style="padding:6pt;"><strong>F689</strong></td><td style="padding:6pt;">Accidents — falls, especially repeated falls of the same resident</td></tr>
        <tr><td style="padding:6pt;"><strong>F726</strong></td><td style="padding:6pt;">Sufficient + competent staff — chronic understaffing</td></tr>
        <tr><td style="padding:6pt;"><strong>F740</strong></td><td style="padding:6pt;">Treatment / services for behavioral health (e.g., dementia management)</td></tr>
        <tr><td style="padding:6pt;"><strong>F755</strong></td><td style="padding:6pt;">Pharmacy services — medication errors, missing meds, unsafe storage</td></tr>
        <tr><td style="padding:6pt;"><strong>F761</strong></td><td style="padding:6pt;">Safe medication storage — locked carts, controlled substances handled correctly</td></tr>
        <tr><td style="padding:6pt;"><strong>F812</strong></td><td style="padding:6pt;">Food + nutrition — kitchen sanitation, foodborne illness risk</td></tr>
        <tr><td style="padding:6pt;"><strong>F880</strong></td><td style="padding:6pt;">Infection prevention + control — extremely scrutinized post-COVID</td></tr>
        <tr><td style="padding:6pt;"><strong>F908</strong></td><td style="padding:6pt;">Resident rooms + equipment — physical environment hazards</td></tr>
    </tbody>
</table>

<h2>4. How to interpret a real report in 5 minutes</h2>

<p><strong>Step 1.</strong> Open the report. Skip to the
<strong>summary page</strong> — it lists every F-tag cited with
its scope/severity letter, in a table.</p>

<p><strong>Step 2.</strong> Count by category:</p>
<div class="check-item"><span class="checkbox"></span> Number of J/K/L findings — should be <strong>zero</strong>. Even one is a hard pause.</div>
<div class="check-item"><span class="checkbox"></span> Number of G/H/I findings — anything more than 1-2 means real care problems.</div>
<div class="check-item"><span class="checkbox"></span> Number of D/E/F findings — most facilities have 5-15. By itself, not disqualifying.</div>

<p><strong>Step 3.</strong> Read the prose narrative for any G+
findings. The F-tag tells you the category; the prose tells you
what actually happened. Look for specifics — names redacted to
"Resident #12" or similar, but the situations are described in
detail. This is where you'll learn the most about what daily life
in this facility looks like at its worst.</p>

<p><strong>Step 4.</strong> Read the Plan of Correction for those
findings. Is it specific and time-bound? Or vague?</p>

<p><strong>Step 5.</strong> Check substantiated complaints in the
last 12 months. Look for repeated themes — same family / same
type of complaint multiple times.</p>

<h2>5. What the rating system actually weighs</h2>
<p>
    CMS's Five-Star ratings have three components:
</p>
<div class="check-item"><span class="checkbox"></span> <strong>Health Inspection Rating</strong> — the survey reports you're now reading. Recent severe deficiencies = low rating. 50% weighted.</div>
<div class="check-item"><span class="checkbox"></span> <strong>Staffing Rating</strong> — actual nurse hours per resident per day, audited via payroll data. Tougher to game than self-report.</div>
<div class="check-item"><span class="checkbox"></span> <strong>Quality Measures Rating</strong> — outcomes data: hospital readmissions, antipsychotic use, pressure injuries, etc. Most easily manipulated by selective admissions.</div>

<p style="margin-top: 12pt;">
    A 5-star Overall rating with a 3-star Health Inspection is
    suspicious — usually means the staffing + quality measures are
    lifting the overall above what the inspection findings would
    suggest. Always look at the components, not just the headline
    star.
</p>

<h2>6. The 5 things that should make you walk away</h2>
<div class="check-item"><span class="checkbox"></span> Any J/K/L "Immediate Jeopardy" finding in the last 18 months</div>
<div class="check-item"><span class="checkbox"></span> Multiple F600 (abuse/neglect) citations in the last 3 years</div>
<div class="check-item"><span class="checkbox"></span> Repeated F726 (staffing) citations — chronic, structural problem</div>
<div class="check-item"><span class="checkbox"></span> A 1-star Health Inspection rating with vague Plans of Correction</div>
<div class="check-item"><span class="checkbox"></span> Designation as a "Special Focus Facility" by CMS — the worst-of-the-worst list</div>

<div class="callout" style="margin-top: 18pt; background:#F4F4F2;">
    <div class="label">The honest take</div>
    Every facility in the country has D/E/F findings. The question
    isn't "is there any finding?" — it's "what kind, how many, and
    what did they do about it?" The 5 minutes to read the report
    properly is the single highest-leverage homework a family can do
    before signing a contract.
</div>

@endsection

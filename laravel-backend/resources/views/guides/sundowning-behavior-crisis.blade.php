@extends('guides.layout')

@section('content')

<p class="lead">
    Your dad just had an episode — agitated, paranoid, accusing you
    of stealing his wallet, trying to leave the house at 9pm. You're
    trying to decide between calling 911, driving to the ER, calling
    his doctor, or just holding the line until morning. This guide
    is the decision tree for that moment, and the longer-term plan
    for the inevitable next time.
</p>

<div class="callout">
    <div class="label">First, the calm reset</div>
    Behavioral crises in older adults — especially those with
    dementia, recent infections, recent medication changes, or
    delirium — almost always feel terrifying in the moment and
    almost always have a cause. Your job in the next 30 minutes is
    to keep them safe (and yourself), not to fix the underlying
    issue. The decision tree below filters which type of help
    matches the severity.
</div>

<h2>The 60-second triage</h2>

<h3>Call 911 / go to ER immediately if:</h3>
<div class="check-item"><span class="checkbox"></span> <strong>Threat of harm</strong> — to themselves, to others, to a child, to a caregiver. Real, present, actionable.</div>
<div class="check-item"><span class="checkbox"></span> <strong>Suicidal statements</strong> with means or plan</div>
<div class="check-item"><span class="checkbox"></span> <strong>Sudden onset confusion</strong> in someone previously oriented (could be a stroke, severe infection, hypoglycemia, medication overdose)</div>
<div class="check-item"><span class="checkbox"></span> <strong>Loss of consciousness</strong>, seizure, severe injury</div>
<div class="check-item"><span class="checkbox"></span> <strong>Acute breathing problems</strong>, chest pain, severe headache</div>

<h3>Call the on-call doctor / nurse line (not 911) if:</h3>
<div class="check-item"><span class="checkbox"></span> Agitation is severe but they're safe in the moment</div>
<div class="check-item"><span class="checkbox"></span> Hallucinations are new (visual hallucinations + confusion = strong UTI / delirium signal in elders)</div>
<div class="check-item"><span class="checkbox"></span> Recent medication change in the last 2 weeks</div>
<div class="check-item"><span class="checkbox"></span> They're refusing food / water for &gt;24h</div>
<div class="check-item"><span class="checkbox"></span> Sleep cycle has fully inverted (sleeping all day, awake all night)</div>

<h3>De-escalate and document if:</h3>
<div class="check-item"><span class="checkbox"></span> Agitated but talking, no threat</div>
<div class="check-item"><span class="checkbox"></span> Repeating accusations they've made before ("you stole my purse")</div>
<div class="check-item"><span class="checkbox"></span> Wandering attempts at predictable times (often sundown)</div>
<div class="check-item"><span class="checkbox"></span> Mood swings without violence</div>

<h2>Why ER is often the wrong call (but sometimes the right one)</h2>
<p>
    ERs are loud, bright, bewildering — exactly the worst
    environment for a confused elder. A 4-hour ER visit for
    "agitation" frequently sends them home worse than they
    arrived (delirium is contagious in ER settings).
</p>
<p>
    The ER is the right call when you suspect a medical cause and
    you need rapid diagnostics (CT, labs, UTI screen). It's the
    wrong call for purely behavioral episodes in someone with
    known dementia and no new medical signs. Geriatric
    psychiatry units (where they exist) are dramatically better
    for that — call your loved one's psychiatrist for guidance on
    the best inpatient option in your area.
</p>

<h2>Sundowning — the most common pattern</h2>
<p>
    Sundowning is a behavioral pattern (not a diagnosis) where
    confusion, agitation, and restlessness intensify in late
    afternoon / early evening — typically 4-8pm — in people with
    dementia. About 20-25% of dementia patients experience it.
</p>

<h3>What's actually happening</h3>
<div class="check-item"><span class="checkbox"></span> Circadian-rhythm disruption (the dementia brain doesn't track time-of-day well)</div>
<div class="check-item"><span class="checkbox"></span> Sensory overload after a full day of stimulation</div>
<div class="check-item"><span class="checkbox"></span> Caregiver shift changes if in a facility</div>
<div class="check-item"><span class="checkbox"></span> Diminished light cues (sundown literally)</div>
<div class="check-item"><span class="checkbox"></span> Hunger, fatigue, dehydration (often missed all day)</div>

<h3>The 6 interventions that actually work</h3>
<div class="check-item"><span class="checkbox"></span> <strong>Bright light therapy</strong> in the morning + bright indoor lights at 4pm to delay the dimming cue</div>
<div class="check-item"><span class="checkbox"></span> <strong>Snack + hydration at 3pm</strong> — pre-empt the hunger trigger</div>
<div class="check-item"><span class="checkbox"></span> <strong>Reduce stimulation in late afternoon</strong> — turn off TV, lower voices, no visitors after 3pm</div>
<div class="check-item"><span class="checkbox"></span> <strong>A predictable late-day routine</strong> — same caregiver, same activities, same sequence</div>
<div class="check-item"><span class="checkbox"></span> <strong>Calming music</strong> from their generation — usually surprisingly effective</div>
<div class="check-item"><span class="checkbox"></span> <strong>Daytime physical activity</strong> — walks in the morning correlate with reduced evening agitation</div>

<h3>Medication is the LAST resort</h3>
<p>
    Antipsychotics (risperidone, quetiapine) are commonly
    prescribed for dementia agitation and carry a black-box
    warning for elderly dementia patients (increased stroke + death
    risk). They sometimes help; they sometimes make things
    dramatically worse. Always pair with non-medication
    interventions first, and always with a geriatric
    psychiatrist's oversight — not a primary care prescription on
    a phone call.
</p>

<h2>Memory care vs staying home: the readiness signals</h2>
<p>
    For families managing dementia behavior at home, the
    transition to memory care is typically driven by one of these:
</p>
<div class="check-item"><span class="checkbox"></span> <strong>Wandering with elopement risk</strong> — left the house, got lost, found by police</div>
<div class="check-item"><span class="checkbox"></span> <strong>Caregiver burnout</strong> — the primary caregiver is showing health decline (depression, weight loss, hospitalization)</div>
<div class="check-item"><span class="checkbox"></span> <strong>Physical aggression</strong> directed at the caregiver, especially if the caregiver is the spouse</div>
<div class="check-item"><span class="checkbox"></span> <strong>Sleep cycle fully inverted</strong> — no one in the household is sleeping</div>
<div class="check-item"><span class="checkbox"></span> <strong>Incontinence + agitation combined</strong> — the hardest combination to manage at home</div>
<div class="check-item"><span class="checkbox"></span> <strong>The hospital won't discharge home</strong> — case manager says they need a higher level of care</div>

<div class="callout" style="margin-top: 8pt;">
    <div class="label">When the family says "we'll know when it's time"</div>
    The honest answer: in 60% of cases, the family doesn't know
    until the crisis forces the decision — by then, choice is gone.
    Memory care families who toured early (one year before they
    moved their loved one in) consistently report better outcomes:
    better facility match, better financial planning, better
    transition for the loved one. The signs above are a permission
    slip to tour before you're ready.
</div>

<h2>The 30-day "what changed" log</h2>
<p>
    Behavioral changes always have a reason. The log is how you
    find it:
</p>
<div class="check-item"><span class="checkbox"></span> <strong>Date + time of incident</strong></div>
<div class="check-item"><span class="checkbox"></span> <strong>What happened</strong> (specific behaviors, exact words if possible)</div>
<div class="check-item"><span class="checkbox"></span> <strong>What preceded it</strong> in the 2-4 hours before (meal, medication, visitor, TV, weather, sleep)</div>
<div class="check-item"><span class="checkbox"></span> <strong>What helped resolve it</strong></div>
<div class="check-item"><span class="checkbox"></span> <strong>Recent changes</strong> in medication, environment, routine, caregivers</div>

<p>
    Two weeks of this log is the single most valuable thing you
    can hand a geriatric psychiatrist or memory-care admissions
    team. It distinguishes pattern from event and pinpoints the
    triggers most likely to be modifiable.
</p>

<div class="callout" style="margin-top: 18pt; background:#F4F4F2;">
    <div class="label">Bottom line</div>
    A behavioral crisis isn't a moral failing of your loved one,
    your family, or you. It's a signal — usually about a fixable
    upstream cause. The triage above is for staying safe in the
    moment. The log + the readiness signals are for getting ahead
    of the next one.
</div>

@endsection

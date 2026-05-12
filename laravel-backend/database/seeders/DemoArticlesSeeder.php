<?php

namespace Database\Seeders;

use App\Models\Article;
use Illuminate\Database\Seeder;

/**
 * Seeds long-form evergreen articles for the CarePath content hub. These
 * are real, useful pieces (not lorem ipsum) aimed at SEO + family
 * education. Each one ends with a CTA back into the marketplace.
 */
class DemoArticlesSeeder extends Seeder
{
    private const ARTICLES = [
        [
            'slug' => 'assisted-living-vs-memory-care',
            'category' => 'care_basics',
            'title' => 'Assisted Living vs. Memory Care: How to Choose',
            'subtitle' => 'Most families confuse the two until a tour clarifies it. Here\'s how to know which one fits before you visit.',
            'hero_image_url' => 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1600&q=80',
            'reading_time_minutes' => 7,
            'is_featured' => true,
            'tags' => ['assisted living', 'memory care', 'dementia', 'choosing care'],
            'summary' => 'Assisted living and memory care serve different needs. Pick the wrong one and your loved one may struggle. This guide walks through the seven decision points families use.',
            'body' => <<<HTML
<p class="lead">Both communities offer help with daily living. The difference is what they're built to handle when memory changes start interfering with safety.</p>

<h2>The short version</h2>
<p><strong>Assisted living</strong> is for residents who need help with daily activities — bathing, dressing, medications — but are oriented to time and place. They make their own choices, navigate the building, recognize family, and engage in activities.</p>
<p><strong>Memory care</strong> is for residents with Alzheimer's or another form of dementia where memory loss has begun affecting their safety. Locked-perimeter units, sensory-calming spaces, and staff specifically trained to handle behavioral changes are the core differences.</p>

<h2>Seven decision points</h2>
<h3>1. Wandering or elopement risk</h3>
<p>If your loved one has tried to leave the house at unusual hours, gotten lost in a familiar neighborhood, or shown up in places they can't explain — that's a memory-care indicator. Assisted living buildings are not locked.</p>

<h3>2. Recognition of family</h3>
<p>If your parent regularly mistakes you for someone else, or has trouble remembering close family members by name, the cognitive decline has progressed past what most assisted-living communities are equipped to support day-to-day.</p>

<h3>3. ADL pattern</h3>
<p>Assisted living typically supports 1-3 activities of daily living (ADLs) — bathing, dressing, toileting, eating, transferring, continence. Memory care residents often need help with most or all six, plus prompting to start each one.</p>

<h3>4. Sundowning</h3>
<p>Sundowning — increased confusion, agitation, or restlessness in late afternoon — is one of the clearest signs memory care will fit better. Memory care units structure evenings (dimmed lights, calming music, validation therapy) specifically to reduce these episodes.</p>

<h3>5. Medication management</h3>
<p>Both levels manage medications. Memory care goes further — they assume the resident cannot self-administer and structure rounds accordingly. Many assisted-living residents take an active role in their own medication routine.</p>

<h3>6. Social and activities fit</h3>
<p>Assisted-living calendars look like a community center: book clubs, day trips, happy hours. Memory care programming centers on shorter, sensory, reminiscence-based activities — music, gardening, pet therapy, simple crafts.</p>

<h3>7. Cost</h3>
<p>Memory care typically costs <strong>\$1,500 – \$2,500 more per month</strong> than assisted living at the same community, reflecting the higher staff-to-resident ratio and additional training requirements. Don't compare prices across levels without adjusting.</p>

<h2>What to do next</h2>
<ul>
<li><strong>Get a formal assessment</strong> — most communities offer a free clinical evaluation by an RN. This is the single highest-ROI hour you can spend.</li>
<li><strong>Tour both types at the same building</strong> if possible. CCRCs (continuing care retirement communities) and many assisted-living buildings have a separate memory-care wing.</li>
<li><strong>Compare 3 communities minimum</strong>. The right fit shows up in feel, not in a brochure.</li>
</ul>

<p>Use the <a href="/search">CarePath search</a> to filter by Memory Care specifically and see live bed availability across all certified facilities in your area.</p>
HTML
        ],

        [
            'slug' => 'medicare-coverage-long-term-care',
            'category' => 'medicare',
            'title' => 'What Medicare Actually Covers for Long-Term Care',
            'subtitle' => 'Spoiler: less than most families expect. Here\'s the rule book in plain English.',
            'hero_image_url' => 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&q=80',
            'reading_time_minutes' => 8,
            'is_featured' => true,
            'tags' => ['medicare', 'snf', 'cost', 'payer'],
            'summary' => 'Medicare pays for short, skilled stays. It does not pay for long-term assisted living or memory care. Here\'s the math, the day-count rules, and where Medicare ends.',
            'body' => <<<HTML
<p class="lead">Many families learn the hard way that Medicare is not long-term care insurance. It covers a narrow window of skilled care under specific conditions — and then it stops.</p>

<h2>What Medicare Part A actually pays</h2>
<p>Medicare Part A (hospital insurance) covers skilled nursing facility (SNF) stays under these conditions:</p>
<ol>
<li>You had a <strong>qualifying hospital stay of at least 3 days</strong> (3 inpatient midnights, not observation status).</li>
<li>Admission to the SNF happens within <strong>30 days of hospital discharge</strong>.</li>
<li>The care needed is <strong>skilled</strong> — meaning it requires daily nursing or therapy services (PT, OT, ST, wound care, IV therapy, etc.).</li>
<li>The condition you're treated for is related to the hospital stay.</li>
</ol>

<h2>The 100-day benefit period</h2>
<p>When you qualify, Medicare's coverage follows this pattern:</p>
<ul>
<li><strong>Days 1–20:</strong> 100% covered. Zero out-of-pocket.</li>
<li><strong>Days 21–100:</strong> You pay a daily copayment (<strong>\$209.50/day in 2024</strong>). Medicare covers the rest.</li>
<li><strong>Day 101 and beyond:</strong> Medicare pays nothing. You pay 100%.</li>
</ul>
<p>That means even in the best case, Medicare covers about 3 months of skilled care after a qualifying hospital stay. After day 100, you're paying full freight — typically \$8,000 – \$12,000 per month for skilled nursing care.</p>

<h2>What Medicare does NOT cover</h2>
<p><strong>Custodial care</strong> — help with bathing, dressing, eating, medication reminders. This is the heart of what assisted living and most long-term nursing-home stays provide. Medicare excludes it.</p>
<p>That means:</p>
<ul>
<li>Assisted living rent: not covered.</li>
<li>Memory care rent: not covered.</li>
<li>Long-term nursing home stays where there's no skilled need: not covered.</li>
<li>In-home aide for help with daily tasks: not covered (Medicare home health is only for skilled care).</li>
</ul>

<h2>Medicare Advantage (Part C) — same story, different door</h2>
<p>Medicare Advantage plans are required to cover everything original Medicare covers. Some plans add modest benefits (a flex card for groceries, a small allowance for over-the-counter products), but they don't cover long-term custodial care either. Read your specific plan's evidence of coverage carefully.</p>

<h2>So what pays for long-term care?</h2>
<p>The realistic answer is some combination of:</p>
<ul>
<li><strong>Private pay</strong> — pulling from savings, retirement income, or family contributions.</li>
<li><strong>Long-term care insurance</strong> — if a policy was purchased years ago (rarely sold today on individual markets).</li>
<li><strong>Medicaid</strong> — after spend-down, for residents who meet state-specific income and asset limits. See our <a href="/articles/medicaid-spend-down-explained">Medicaid spend-down guide</a>.</li>
<li><strong>VA Aid &amp; Attendance</strong> — for eligible wartime veterans and surviving spouses. See our <a href="/articles/va-aid-and-attendance-explained">VA benefits guide</a>.</li>
</ul>

<h2>Run the numbers yourself</h2>
<p>Don't guess. The <a href="/search">cost projection tool</a> on every CarePath facility page lets you plug in your situation — current assets, income, LTC insurance details, VA eligibility — and see a 5-year projection blending all payer sources so you know exactly when Medicaid kicks in.</p>
HTML
        ],

        [
            'slug' => 'medicaid-spend-down-explained',
            'category' => 'medicaid',
            'title' => 'Medicaid Spend-Down for Nursing Home Care, in Plain English',
            'subtitle' => 'How families spend down assets to qualify, what counts, and what gets exempt.',
            'hero_image_url' => 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&q=80',
            'reading_time_minutes' => 9,
            'is_featured' => false,
            'tags' => ['medicaid', 'financial', 'cost'],
            'summary' => 'Most Medicaid LTC applicants need under $2,000 in countable assets. Here\'s what counts, what doesn\'t, and the lawful ways families bring assets down before applying.',
            'body' => <<<HTML
<p class="lead">Medicaid is the largest single payer of long-term nursing-home care in the US. The qualification rules are complex, state-specific, and easy to get wrong. Here's the framework families need to know before sitting down with an elder-law attorney.</p>

<h2>The basic threshold</h2>
<p>For institutional Medicaid (paying for a nursing-home stay), most states require:</p>
<ul>
<li><strong>Countable assets under \$2,000</strong> for a single applicant (some states use \$3,000).</li>
<li><strong>Monthly income</strong> below the state's medically-needy income limit (varies; typically around \$2,800/month for 2024) OR an income trust ("Miller trust") to handle higher income.</li>
<li><strong>Functional eligibility</strong> — the applicant actually needs nursing-home-level care. States verify this through an assessment.</li>
</ul>

<h2>What's countable vs. exempt</h2>

<h3>Countable</h3>
<p>Most things you'd think of as assets:</p>
<ul>
<li>Checking, savings, money market, CDs</li>
<li>Stocks, bonds, mutual funds, brokerage accounts</li>
<li>Second homes, vacation property, investment real estate</li>
<li>Whole-life insurance over a face-value threshold (often \$1,500)</li>
<li>Retirement accounts (treatment varies dramatically by state — some count fully, others exempt if in payout status)</li>
</ul>

<h3>Exempt</h3>
<p>Things that don't count toward the \$2,000 limit:</p>
<ul>
<li><strong>Primary residence</strong>, generally up to a state-specific equity cap (~\$713,000 federal cap, lower in some states), IF the applicant intends to return home or a spouse/dependent lives there.</li>
<li><strong>One vehicle</strong> of any value.</li>
<li><strong>Personal effects</strong> — clothing, furniture, jewelry of reasonable value.</li>
<li><strong>Prepaid burial plot and pre-need funeral contract</strong> (within state limits).</li>
<li><strong>Term life insurance</strong> (it has no cash value).</li>
</ul>

<h2>Spousal protections</h2>
<p>When one spouse needs Medicaid and the other doesn't, the "community spouse" gets protective rules:</p>
<ul>
<li><strong>Community Spouse Resource Allowance (CSRA):</strong> The at-home spouse can typically keep about half of the couple's combined assets, with a federal floor (~\$30,828) and ceiling (~\$154,140) in 2024.</li>
<li><strong>Minimum Monthly Maintenance Needs Allowance (MMMNA):</strong> If the community spouse's income is below ~\$2,465/month, they can keep some of the institutional spouse's income to bring them up to that floor.</li>
</ul>

<h2>The 5-year look-back</h2>
<p>Medicaid examines all asset transfers made in the <strong>60 months</strong> before the application. Gifts, asset sales below fair market value, transfers to children — each one can trigger a <strong>penalty period</strong> during which Medicaid won't pay, even after you qualify on the asset test.</p>
<p>The penalty is calculated as: <em>amount transferred ÷ state's average monthly cost of care</em>. Transfer \$60,000 in a state where care averages \$10,000/month and you've created a 6-month penalty.</p>

<h2>Legal spend-down strategies</h2>
<p>These are <strong>not loopholes</strong> — they're recognized planning moves. An elder-law attorney can confirm what works in your state:</p>
<ol>
<li><strong>Pay off debt.</strong> Mortgages, credit cards, medical bills.</li>
<li><strong>Home improvements.</strong> A new roof, accessibility modifications, kitchen upgrade — all convert countable cash into exempt home value.</li>
<li><strong>Prepay funeral/burial.</strong> Irrevocable pre-need contracts within state limits.</li>
<li><strong>Buy a single-premium immediate annuity (SPIA)</strong> in the community spouse's name — converts countable assets to an income stream that doesn't disqualify the institutional spouse (rules are strict; this is attorney territory).</li>
<li><strong>Caregiver agreements</strong> — pay an adult child for care under a written contract at fair market rates, before the look-back window.</li>
</ol>

<h2>Don't DIY this</h2>
<p>Medicaid planning is one of the few areas where a \$3,000 – \$8,000 elder-law attorney fee easily saves \$50,000+ in preventable mistakes. The 5-year look-back is unforgiving and the rules differ across all 50 states.</p>

<p>Want to estimate when your loved one might qualify? The <a href="/search">cost projection tool</a> on every CarePath facility page models the spend-down month-by-month based on current assets, income, and the facility's rates.</p>
HTML
        ],

        [
            'slug' => 'va-aid-and-attendance-explained',
            'category' => 'va',
            'title' => 'VA Aid & Attendance: The Veteran Benefit Most Families Miss',
            'subtitle' => 'A monthly stipend of $1,754 – $3,232 for eligible veterans and surviving spouses needing help with daily care.',
            'hero_image_url' => 'https://images.unsplash.com/photo-1583932848571-5ad7eb5e7820?w=1600&q=80',
            'reading_time_minutes' => 6,
            'is_featured' => false,
            'tags' => ['va', 'veteran benefits', 'financial'],
            'summary' => 'About 25% of seniors in long-term care could qualify for VA Aid & Attendance — but most never apply. Here\'s who qualifies, how much it pays, and how to apply.',
            'body' => <<<HTML
<p class="lead">If you or your spouse served during a recognized period of war and you now need help with daily activities, you may qualify for a monthly check from the VA that goes directly toward your care. Most families don't know it exists.</p>

<h2>2024 monthly maximums</h2>
<ul>
<li><strong>Single veteran:</strong> up to \$2,727/month</li>
<li><strong>Veteran with spouse:</strong> up to \$3,232/month</li>
<li><strong>Surviving spouse of a veteran:</strong> up to \$1,754/month</li>
<li><strong>Two veterans married to each other:</strong> up to \$4,332/month</li>
</ul>
<p>These payments are tax-free and continue as long as eligibility is maintained.</p>

<h2>Three eligibility tests</h2>

<h3>1. Wartime service</h3>
<p>The veteran must have served at least 90 days of active duty with <strong>at least one day during a recognized wartime period</strong>:</p>
<ul>
<li>World War II (Dec 7, 1941 – Dec 31, 1946)</li>
<li>Korean War (Jun 27, 1950 – Jan 31, 1955)</li>
<li>Vietnam (Aug 5, 1964 – May 7, 1975; or Feb 28, 1961 – May 7, 1975 if served in Vietnam itself)</li>
<li>Persian Gulf War (Aug 2, 1990 – present, ongoing)</li>
</ul>
<p>Discharge must be other-than-dishonorable. The veteran does not need to have served in combat — only during the eligible window.</p>

<h3>2. Medical / care need</h3>
<p>The applicant must need help with at least one of:</p>
<ul>
<li>Activities of daily living (bathing, dressing, eating, transferring, toileting)</li>
<li>Be bedridden</li>
<li>Be a patient in a nursing home due to mental or physical incapacity</li>
<li>Have eyesight limited to 5/200 or worse, even with corrective lenses</li>
</ul>

<h3>3. Financial limits</h3>
<p>The VA applies a <strong>net worth limit</strong> (assets + income, minus unreimbursed medical expenses). In 2024 the limit is <strong>\$155,356</strong>. Importantly:</p>
<ul>
<li>The primary residence does not count toward net worth.</li>
<li>Unreimbursed medical expenses (including care costs) are subtracted from income, which dramatically helps qualification.</li>
</ul>
<p>Like Medicaid, there's a <strong>3-year look-back</strong> on asset transfers as of October 2018.</p>

<h2>How to apply</h2>
<p>You file VA Form <strong>21-2680</strong> (Examination for Housebound Status or Permanent Need for Regular Aid and Attendance) plus Form 21P-527EZ or 21P-534EZ. The process is free.</p>

<p><strong>Get help.</strong> Most veterans use:</p>
<ul>
<li>A <strong>VSO</strong> (Veteran Service Officer) — free, available through American Legion, VFW, DAV, and county veteran offices.</li>
<li>An <strong>accredited VA attorney</strong> — paid, but useful for complex financial planning.</li>
</ul>
<p>The VA explicitly prohibits non-accredited consultants from charging veterans for help with claims. Be careful.</p>

<h2>Timing matters</h2>
<p>Processing takes <strong>3 – 9 months</strong> typically. The benefit is retroactive to the application date, not the approval date — so file as soon as the care need is documented.</p>

<p>The <a href="/search">CarePath cost projection tool</a> includes VA Aid &amp; Attendance as a payer source. Toggle it on to see how much it offsets your monthly out-of-pocket.</p>
HTML
        ],

        [
            'slug' => 'how-to-read-cms-five-star',
            'category' => 'care_basics',
            'title' => 'How to Read a CMS Five-Star Rating (And What It Misses)',
            'subtitle' => 'The federal rating is the most reliable single quality signal — but it has known weaknesses. Here\'s what to use it for and what to look at alongside it.',
            'hero_image_url' => 'https://images.unsplash.com/photo-1582719188393-bb71ca45dbb9?w=1600&q=80',
            'reading_time_minutes' => 5,
            'is_featured' => false,
            'tags' => ['cms', 'quality', 'choosing care'],
            'summary' => 'CMS publishes a 1-5 star rating for every Medicare/Medicaid-certified nursing home. Here\'s what the three sub-scores actually measure and the three blind spots families should watch for.',
            'body' => <<<HTML
<p class="lead">The CMS Nursing Home Compare star rating is the most widely-used single quality metric in the industry. Federal regulators built it. Insurers use it. We surface it on every facility profile. It's still not the whole picture.</p>

<h2>The three sub-ratings</h2>
<p>Every facility's overall rating is a weighted combination of three components:</p>

<h3>1. Health inspections (the strongest signal)</h3>
<p>State surveyors visit every Medicare/Medicaid-certified nursing home about every 12 months, plus more often if there are complaints. They document any deficiencies as F-tags (federal tag numbers). The health inspection score is based on the past 3 cycles of inspections, weighted toward the most recent.</p>
<p><strong>Why it matters most:</strong> This is the only sub-score where data is independently collected by trained surveyors. Staffing and quality scores are partially self-reported.</p>

<h3>2. Staffing</h3>
<p>Calculated from <strong>Payroll-Based Journal (PBJ)</strong> submissions — every facility now files actual payroll data with CMS, which is converted into <em>hours per resident per day</em>. The metric considers:</p>
<ul>
<li>Total nursing hours per resident day (RN + LPN + CNA combined)</li>
<li>RN hours per resident day specifically</li>
<li>Case-mix adjustment for the acuity of the residents in the building</li>
</ul>
<p><strong>What to watch:</strong> A facility with high overall staffing but low RN hours is using lots of less-credentialed staff. For sub-acute rehab and skilled care, RN coverage is what you want.</p>

<h3>3. Quality measures</h3>
<p>A composite of 15 clinical indicators from the MDS (Minimum Data Set) — things like:</p>
<ul>
<li>Pressure ulcer rate (long-stay residents)</li>
<li>Falls with major injury</li>
<li>Antipsychotic medication use</li>
<li>Improvement in mobility (short-stay rehab)</li>
<li>Rehospitalization rate</li>
</ul>
<p>Some are reported by the facility (with audit), some come from Medicare claims data (more reliable).</p>

<h2>Known blind spots</h2>

<h3>1. Self-reported data</h3>
<p>About half of quality measures rely on facility-submitted MDS assessments. Facilities under coding pressure may understate problems. CMS audits selectively. Always look at the health inspection rating as your most trustworthy single number.</p>

<h3>2. Recent ownership change</h3>
<p>The CMS rating reflects history. A facility that was bought 6 months ago by a new operator with a strong reputation might still carry a 2-star rating from the old regime — and vice versa. Check the facility profile for ownership change details.</p>

<h3>3. Memory care &amp; assisted living aren't rated</h3>
<p>The Five-Star system covers <strong>skilled nursing facilities only</strong>. Assisted living and memory care communities are regulated by states and don't have a federal star rating. For those, look at:</p>
<ul>
<li>State inspection reports (most state Departments of Health publish them).</li>
<li>Verified resident/family reviews.</li>
<li>Tour observations — staff turnover, smell, resident affect.</li>
</ul>

<h2>How to use it</h2>
<ol>
<li><strong>4+ stars is a strong filter.</strong> Use it. Don't waste tour time on 1-2 star facilities unless geography forces your hand.</li>
<li><strong>Cross-reference with reviews.</strong> A 5-star facility with several 2-star reviews is hiding something.</li>
<li><strong>Visit at different times.</strong> Schedule one tour during a meal, one in the evening, and one unannounced if you can.</li>
<li><strong>Ask about F-tag history.</strong> Every facility's last inspection report is public — request it before signing anything.</li>
</ol>

<p>CarePath surfaces all four CMS scores (overall + 3 sub-ratings) on <a href="/search">every facility profile</a>. Filter by minimum stars in search to narrow your shortlist before touring.</p>
HTML
        ],

        [
            'slug' => 'questions-to-ask-on-tour',
            'category' => 'transition',
            'title' => '20 Questions to Ask on Every Nursing Home Tour',
            'subtitle' => 'A free, printable checklist that turns a vague "nice tour" into a real comparison.',
            'hero_image_url' => 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=1600&q=80',
            'reading_time_minutes' => 6,
            'is_featured' => false,
            'tags' => ['tour', 'choosing care', 'checklist'],
            'summary' => 'Most families tour a facility, leave with a brochure, and can\'t remember why they liked or didn\'t like it. These 20 questions force the right comparisons.',
            'body' => <<<HTML
<p class="lead">The brochures all look the same. The lobbies all smell like cookies on tour day. Here are the questions that actually separate facilities — written for families, not for the industry.</p>

<h2>About staffing</h2>
<ol>
<li><strong>What's your nurse-to-resident ratio on day shift? Evening? Night?</strong> A good answer is specific, not "we meet all state requirements."</li>
<li><strong>What's your staff turnover rate over the last 12 months?</strong> Industry average is around 50%. Under 30% is excellent.</li>
<li><strong>How many of your CNAs have been here more than a year?</strong> Continuity of care is everything in this work.</li>
<li><strong>Who's on-call after hours?</strong> RN on premises 24/7 is standard for SNFs. For assisted living, ask specifically.</li>
</ol>

<h2>About daily life</h2>
<ol start="5">
<li><strong>Can my mom keep her dog/cat?</strong> Pet policies vary widely and they're often deal-breakers.</li>
<li><strong>What time does dinner finish? When is breakfast?</strong> Some places stop serving dinner at 5:30pm. If your loved one prefers a later evening, that's a fit issue.</li>
<li><strong>Can residents have a beer or glass of wine?</strong> The answer reveals the culture.</li>
<li><strong>What activities ran yesterday?</strong> The brochure activity calendar isn't the real one. Ask about a specific day.</li>
<li><strong>Where do residents typically come from?</strong> A facility that serves mostly hospital discharges feels different from one that's mostly long-term placements.</li>
</ol>

<h2>About care delivery</h2>
<ol start="10">
<li><strong>Walk me through how morning care works for a typical resident.</strong> Listen for specifics. Vague answers are concerning.</li>
<li><strong>What happens when a resident refuses a medication?</strong> Forced medication is illegal. Good facilities have a documented protocol.</li>
<li><strong>How quickly are call lights answered?</strong> Ideal: under 5 minutes. Acceptable: under 10. Anything beyond suggests staffing problems.</li>
<li><strong>What's your fall protocol?</strong> The right answer mentions assessment, environmental adjustments, family notification, and a meeting to discuss prevention — not just "we document it."</li>
<li><strong>Who's your medical director? How often is she on site?</strong> Some MDs barely appear. Others do weekly rounds. Big difference.</li>
</ol>

<h2>About money</h2>
<ol start="15">
<li><strong>What's the all-in cost for my mom's specific situation?</strong> Base rate + her level-of-care adders + ancillary fees + the one-time community fee. Get it in writing.</li>
<li><strong>How often do rates increase, and by how much historically?</strong> 3-5% annually is typical. 8%+ is a red flag.</li>
<li><strong>Do you accept Medicaid? After private pay or from day one?</strong> Many private-pay facilities accept Medicaid only after a resident has paid privately for 2-3 years.</li>
<li><strong>What's the policy if we run out of money?</strong> Eviction policies matter. Some facilities have a residential discharge process; some don't.</li>
</ol>

<h2>About transitions</h2>
<ol start="19">
<li><strong>If my mom's care needs increase, can she stay?</strong> Especially important at CCRCs and assisted-living buildings without a memory-care wing.</li>
<li><strong>How do you handle end-of-life care?</strong> The answer reveals how the facility treats families and dignity, not just clinical outcomes.</li>
</ol>

<h2>Tour mechanics</h2>
<p>A few logistical tips:</p>
<ul>
<li>Tour at <strong>3pm</strong> — you'll catch shift change and see how the team handoff actually works.</li>
<li>Ask if you can <strong>eat lunch</strong>. Most communities will say yes. The food is real evidence.</li>
<li>Use the <strong>restroom</strong>. The condition of resident bathrooms tells you about housekeeping.</li>
<li><strong>Notice smell.</strong> Persistent urine smell signals understaffing. Heavy air freshener is masking the same.</li>
<li>Watch <strong>resident-staff interactions</strong>. Are staff using residents' names? Making eye contact? Smiling?</li>
</ul>

<h2>Use CarePath to compare</h2>
<p>Tour 3 facilities, fill out these 20 questions for each, then come back to <a href="/search">CarePath</a> to cross-reference what you heard against the CMS data, recent F-tag history, and verified family reviews.</p>
HTML
        ],

        [
            'slug' => 'memory-care-cost-2026',
            'category' => 'financial',
            'title' => 'How Much Does Memory Care Cost in 2026? (State by State)',
            'subtitle' => 'National median is $6,200/month. But the spread is $3,800 in Mississippi to over $11,000 in Massachusetts. Here\'s the real map.',
            'hero_image_url' => 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&q=80',
            'reading_time_minutes' => 8,
            'is_featured' => false,
            'tags' => ['memory care', 'cost', 'dementia', 'financial planning'],
            'summary' => 'A breakdown of memory care pricing across all 50 states, plus the four hidden charges most quotes leave out.',
            'body' => <<<HTML
<p class="lead">Memory care is the most expensive level of senior living below skilled nursing. The 2026 national median sits at \$6,200/month — but that number hides enormous regional variation.</p>

<h2>The 2026 national picture</h2>
<p>Memory care typically runs <strong>20-30% more than assisted living</strong> in the same building. The premium covers a higher staff-to-resident ratio (often 1:5 vs 1:10), dementia-specific training, and a locked-perimeter unit.</p>

<h2>Cheapest states (under \$5,000/month median)</h2>
<ul>
<li><strong>Mississippi</strong> — \$3,800</li>
<li><strong>Louisiana</strong> — \$4,200</li>
<li><strong>Alabama</strong> — \$4,400</li>
<li><strong>Arkansas</strong> — \$4,500</li>
<li><strong>Oklahoma</strong> — \$4,700</li>
<li><strong>Kansas</strong> — \$4,900</li>
</ul>

<h2>Most expensive states (over \$8,500/month median)</h2>
<ul>
<li><strong>Massachusetts</strong> — \$11,400</li>
<li><strong>Connecticut</strong> — \$10,800</li>
<li><strong>New Jersey</strong> — \$10,200</li>
<li><strong>Alaska</strong> — \$9,800</li>
<li><strong>New York</strong> — \$9,500</li>
<li><strong>California</strong> — \$8,900</li>
</ul>

<h2>Mid-tier states (\$5,000-\$7,500)</h2>
<p>The majority of states fall in this band. Texas (\$5,800), Florida (\$5,600), Arizona (\$6,100), North Carolina (\$5,500), Colorado (\$6,800), and Oregon (\$7,200) are representative.</p>

<h2>Four hidden costs that don't appear in the quote</h2>
<h3>1. Level-of-care adders</h3>
<p>Almost every memory care community charges <strong>\$500-\$2,000/month extra</strong> as resident care needs increase. Most facilities have 3-5 tiers. Expect to move up a tier within 18-24 months as dementia progresses.</p>

<h3>2. One-time community fee</h3>
<p>A non-refundable move-in fee, typically <strong>\$2,000-\$8,000</strong>. Some chains charge as much as a month's rent. Negotiable in slow markets.</p>

<h3>3. Medication management</h3>
<p>Charged separately, often \$300-\$600/month, and sometimes per pill. Ask the line item.</p>

<h3>4. Ancillary services</h3>
<p>Salon, transportation, special diets, incontinence supplies, hospice coordination — these add up fast. Some are bundled, some à la carte.</p>

<h2>What about Medicare and Medicaid?</h2>
<p>Medicare does <strong>not</strong> pay for memory care. Medicaid will, through an HCBS waiver, but typically only at the assisted-living rate — and the family pays the difference. The cheapest path is finding a memory care facility that accepts Medicaid waiver from day one. <a href="/search?medicaid=true">CarePath lets you filter by Medicaid acceptance directly</a>.</p>

<h2>Plan with the 5-year projection</h2>
<p>Average memory care stay is 2-3 years, but progression varies. Use <a href="/search">our cost projection calculator</a> on any facility page — it models 5 years blending whatever you have (Medicare A for any hospital→SNF episode, LTC insurance, VA Aid &amp; Attendance, Medicaid spend-down, and private pay).</p>
HTML
        ],

        [
            'slug' => 'signs-parent-needs-assisted-living',
            'category' => 'care_basics',
            'title' => '10 Signs Your Parent Needs Assisted Living',
            'subtitle' => 'How to know when it\'s time, without waiting for a crisis to decide for you.',
            'hero_image_url' => 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1600&q=80',
            'reading_time_minutes' => 6,
            'is_featured' => false,
            'tags' => ['assisted living', 'aging parents', 'signs', 'transitions'],
            'summary' => 'The most common warning signs adult children miss until something goes wrong — and what to do at each stage.',
            'body' => <<<HTML
<p class="lead">Most families wait too long. The pattern looks like this: small things slip, then a fall or hospitalization forces a decision under pressure. The signs below show up months earlier — if you know what to look for.</p>

<h2>1. Weight changes</h2>
<p>Unexplained weight loss — or sudden weight gain from frozen-meal heavy diets — is the single most actionable signal. Aging parents often stop cooking, then stop eating regularly. If clothes fit differently, ask about meals.</p>

<h2>2. Medication confusion</h2>
<p>Look for: pill bottles with mismatched refill counts, multiple bottles of the same medication, missed doses (full bottle on a refill date). Polypharmacy + early cognitive decline is the single largest cause of preventable hospital admissions in adults over 75.</p>

<h2>3. Mail piles or unopened bills</h2>
<p>An unopened mail pile signals executive function changes. Bills going unpaid is the next step. By the time utilities are shut off, it's been months.</p>

<h2>4. Unexplained bruises</h2>
<p>Bruises on shins, hips, forearms — especially asymmetric ones — usually mean falls that weren't reported. Adult children often don't hear about falls because parents minimize them ("I'm fine").</p>

<h2>5. Decline in personal hygiene</h2>
<p>Hair, nails, body odor, dental — these slip when bathing becomes hard. Showers are dangerous (wet tile, balance, getting up from sitting). Many parents quietly stop bathing as often.</p>

<h2>6. Home becoming unmanageable</h2>
<p>Stacks of laundry. Spoiled food in the fridge. Dust on every surface. The garden gone wild. A house that's no longer being maintained is signaling that the person inside it can no longer maintain themselves either.</p>

<h2>7. Driving incidents</h2>
<p>Mysterious dents on the car. Getting lost in familiar areas. Slow reaction at intersections. A new aversion to driving (often the parent's own self-protection kicking in).</p>

<h2>8. Social withdrawal</h2>
<p>Stops returning calls. Drops out of clubs and groups. Doesn't go to church anymore. Sometimes this is depression; sometimes it's embarrassment about cognitive decline; sometimes it's exhaustion from compensating.</p>

<h2>9. Repeating themselves in conversation</h2>
<p>Asking the same question multiple times in a single visit, or telling the same story twice in an hour, is short-term memory loss. Different from "old age" — and worth a cognitive evaluation.</p>

<h2>10. Caregiver burnout in the spouse</h2>
<p>If your other parent looks exhausted, depressed, or has lost weight themselves, the caregiving load has become unsafe. Spousal caregivers have higher mortality rates than non-caregiving peers. This is often the strongest signal.</p>

<h2>What to do</h2>
<ul>
<li><strong>Don't wait for a fall.</strong> Hospital-to-facility transitions are stressful and expensive. Move proactively when you're seeing 3+ of the above.</li>
<li><strong>Get a geriatric assessment.</strong> Most primary-care offices can do a basic Mini-Mental State Exam or MoCA. Many assisted-living communities offer a free RN assessment.</li>
<li><strong>Take the <a href="/tools/care-level-quiz">care-level quiz</a></strong> to map symptoms to assisted living vs memory care vs skilled nursing.</li>
<li><strong>Tour 3 communities</strong> before you decide. Use the <a href="/search">CarePath search</a> to filter by ZIP, care type, and Medicaid acceptance.</li>
</ul>
HTML
        ],

        [
            'slug' => 'medicaid-five-year-lookback',
            'category' => 'medicaid',
            'title' => 'The 5-Year Medicaid Look-Back, Explained',
            'subtitle' => 'Every asset transfer in the last 5 years gets reviewed. Here\'s what triggers a penalty and what doesn\'t.',
            'hero_image_url' => 'https://images.unsplash.com/photo-1554224154-26032cdc0e83?w=1600&q=80',
            'reading_time_minutes' => 9,
            'is_featured' => true,
            'tags' => ['medicaid', 'look-back', 'asset transfer', 'planning', 'legal'],
            'summary' => 'The 60-month look-back is the single most misunderstood rule in Medicaid planning. Knowing what counts as a "transfer for less than fair market value" can save tens of thousands.',
            'body' => <<<HTML
<p class="lead">When you apply for Medicaid long-term care benefits, the state Medicaid agency reviews every asset transfer made during the 60 months prior. Transfers that look like the applicant gave money or property away can trigger a penalty period — months during which Medicaid won't pay.</p>

<h2>How the penalty works</h2>
<p>The penalty is not "denial." It's a calculated waiting period: <strong>amount transferred ÷ state's average monthly cost of care = number of months Medicaid won't pay</strong>.</p>
<p>So if you gave \$60,000 to a grandchild in 2023 and your state's penalty divisor is \$10,000/month, you'd face a 6-month penalty starting from the date you'd otherwise have qualified. During those 6 months, the family has to pay privately or the facility absorbs the cost (rare).</p>

<h2>What counts as a "transfer for less than fair market value"</h2>
<ul>
<li><strong>Gifts</strong> of cash, securities, vehicles, or property</li>
<li><strong>Adding a child's name</strong> to a bank account or deed</li>
<li><strong>Selling property below market</strong> (e.g., selling the house to a relative for \$1)</li>
<li><strong>Forgiving a loan</strong> you'd made earlier</li>
<li><strong>Paying off another family member's debt</strong></li>
<li><strong>Buying a life estate</strong> in someone else's home without meeting the residency requirement</li>
</ul>

<h2>What does NOT count</h2>
<p>These transfers are exempt and don't trigger a penalty:</p>
<ul>
<li>Transfers to a <strong>spouse</strong> (unlimited)</li>
<li>Transfers to a <strong>disabled child</strong> (any age)</li>
<li>Transfers to a <strong>caregiver child</strong> who lived in the home and provided care for 2+ years prior (the "Caregiver Child Exemption")</li>
<li>Transfers to a <strong>sibling with equity interest</strong> who lived in the home for 1+ year prior</li>
<li>Bona fide <strong>spend-down on the applicant's own care, housing, debt</strong>, etc.</li>
<li>Annual <strong>gift-tax exclusion gifts</strong> — these DO count for Medicaid even though they're IRS-free. Common misconception.</li>
</ul>

<h2>The Caregiver Child Exemption</h2>
<p>This is the most underused planning tool. If an adult child lived in the parent's home for 2+ years and provided care that delayed institutionalization, the parent can transfer the home to that child without penalty. Documentation matters — keep a log, get a doctor's letter, ideally have a written caregiver agreement.</p>

<h2>What if you've already made a transfer?</h2>
<p>Three options when a problematic transfer has already happened:</p>
<ol>
<li><strong>Wait it out.</strong> If the transfer was 4+ years ago, you may simply wait until the 5-year window passes.</li>
<li><strong>Cure the transfer.</strong> The recipient returns the money or property. The penalty disappears entirely.</li>
<li><strong>Pay through the penalty.</strong> Have private funds or LTC insurance cover the penalty months. Sometimes the math still works.</li>
</ol>

<h2>State variation matters</h2>
<p>California is the major exception — Medi-Cal does <strong>not</strong> impose a look-back period for institutional care (this changed in 2024). Every other state enforces 60 months. <a href="/tools/medicaid-eligibility">Use our state-aware eligibility tool</a> to see your state's rules.</p>

<h2>Get a real plan — not advice from a friend</h2>
<p>The look-back interacts with other rules (annuity rules, life-estate rules, spousal protections) in ways that make DIY risky. Find a <strong>certified elder-law attorney</strong> in your state — the National Academy of Elder Law Attorneys (NAELA) has a free finder. Cost of an initial consultation is typically \$300-\$500 and routinely saves families \$50,000+ in penalty avoidance.</p>

<p>When you're ready to compare facilities that accept Medicaid, <a href="/search?medicaid=true">filter by Medicaid acceptance on CarePath</a>.</p>
HTML
        ],

        [
            'slug' => 'ccrc-worth-it',
            'category' => 'care_basics',
            'title' => 'Continuing Care Retirement Communities (CCRCs): Are They Worth It?',
            'subtitle' => 'The case for the most expensive — and most overlooked — senior living option.',
            'hero_image_url' => 'https://images.unsplash.com/photo-1582719188393-bb71ca45dbb9?w=1600&q=80',
            'reading_time_minutes' => 8,
            'is_featured' => false,
            'tags' => ['ccrc', 'independent living', 'continuing care', 'planning'],
            'summary' => 'CCRCs charge a six-figure entrance fee but lock in care for life. Here\'s when the math works.',
            'body' => <<<HTML
<p class="lead">A continuing care retirement community (CCRC) is a senior living campus that includes independent living, assisted living, memory care, and skilled nursing — all in one place. Residents move in healthy and stay through every level of care that follows.</p>

<h2>How the money works</h2>
<p>CCRCs charge:</p>
<ul>
<li>A one-time <strong>entrance fee</strong> — typically \$100,000 to \$1,000,000+ depending on apartment size and location</li>
<li>A <strong>monthly fee</strong> — typically \$3,000 to \$8,000+ for independent living, increasing as care needs increase</li>
</ul>

<h2>The four contract types</h2>
<h3>Type A — "Life Care"</h3>
<p>Highest entrance fee. Monthly fee stays roughly the same regardless of care level. The CCRC absorbs the cost of higher care levels. Best protection against future care cost inflation. About 35% of CCRC residents nationally.</p>

<h3>Type B — "Modified"</h3>
<p>Mid-entrance fee. A limited number of "free" days of higher-level care included; after that, you pay the discounted resident rate. Common in mid-size CCRCs.</p>

<h3>Type C — "Fee-for-Service"</h3>
<p>Lowest entrance fee. You pay market rate when you move to a higher level of care. Cheaper upfront, much more expensive long-tail. About 25% of CCRC residents.</p>

<h3>Rental CCRC</h3>
<p>No entrance fee — just higher monthly. Best if you may not want to commit long-term. Growing share of new CCRCs.</p>

<h2>When CCRCs make sense</h2>
<ul>
<li>You're <strong>healthy now but worried about the future</strong> — a Type A CCRC turns an unknown care liability into a known monthly fee.</li>
<li>You <strong>have liquid assets</strong> (\$300K+ outside the home) that you'd rather use to pre-pay care.</li>
<li>You value <strong>aging in one place</strong> — never having to move again ranks highly for many residents.</li>
<li>You have a <strong>spouse with health concerns</strong> — Type A protects the well spouse from the cost of the other's eventual care.</li>
</ul>

<h2>When CCRCs are a bad fit</h2>
<ul>
<li>You expect to need <strong>memory care or skilled nursing soon</strong> — you'll pay the entrance fee without ever using the lower-level apartment.</li>
<li>You're <strong>asset-poor but income-rich</strong> — Medicaid won't help with a CCRC entrance fee.</li>
<li>You like flexibility — CCRC contracts limit how easily you can leave and reclaim the entrance fee.</li>
</ul>

<h2>The five questions to ask</h2>
<ol>
<li><strong>What's the refund schedule?</strong> Some CCRCs refund 0%, some 50-90% of the entrance fee. Some require resale of the unit first.</li>
<li><strong>What's the financial health of the operator?</strong> Ask for audited financials. Look at occupancy &gt; 85%, low debt-service ratio, healthy operating reserves.</li>
<li><strong>What's the historical monthly fee increase?</strong> 3-5% annual is normal. 8%+ signals operational stress.</li>
<li><strong>What happens if I outlive my assets?</strong> Most Type A CCRCs have a "benevolent fund" — confirm in writing.</li>
<li><strong>Can I see the assisted-living and skilled-nursing wings now?</strong> The marketing tour is the independent-living dining room. Insist on seeing the parts you'll eventually live in.</li>
</ol>

<h2>Use CarePath to compare</h2>
<p>CCRCs in the CarePath directory are tagged with type (A / B / C / rental) and show entrance fee ranges. <a href="/search?type=ccrc">Filter by Continuing Care</a> to see what's available near you.</p>
HTML
        ],

        [
            'slug' => 'how-to-pay-nursing-home',
            'category' => 'financial',
            'title' => 'How to Pay for a Nursing Home (Every Option in 2026)',
            'subtitle' => 'Six payers, four combinations that actually work, and one mistake families make every year.',
            'hero_image_url' => 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=1600&q=80',
            'reading_time_minutes' => 9,
            'is_featured' => false,
            'tags' => ['payment', 'medicare', 'medicaid', 'ltc insurance', 'va benefits'],
            'summary' => 'The complete map of how American families actually pay for nursing home and memory care — every payer source, when each kicks in, and how to layer them.',
            'body' => <<<HTML
<p class="lead">A year of nursing-home care averages \$110,000 nationally. No single payer covers the whole thing for most families. The trick is layering — knowing which payer handles which phase.</p>

<h2>The six payers</h2>

<h3>1. Medicare Part A</h3>
<p><strong>Covers:</strong> Up to 100 days in a skilled nursing facility after a qualifying 3-day hospital stay. Days 1-20 fully covered. Days 21-100 require a daily coinsurance (~\$209.50/day in 2026).</p>
<p><strong>Doesn't cover:</strong> Long-term custodial care. Most residents stop qualifying around day 20-30 when "improvement" plateaus.</p>

<h3>2. Medicaid</h3>
<p><strong>Covers:</strong> Long-term nursing home care for those who meet financial + functional eligibility. Pays facilities directly at the state's Medicaid rate (typically 60-80% of private-pay rate).</p>
<p><strong>Catch:</strong> Strict asset and income limits, 5-year look-back on transfers. See our <a href="/articles/medicaid-five-year-lookback">5-year look-back guide</a>.</p>

<h3>3. Private long-term care insurance</h3>
<p><strong>Covers:</strong> Daily/monthly benefit (varies by policy) for a benefit period (commonly 3-5 years). Triggered when policyholder can't do 2+ ADLs or has severe cognitive impairment.</p>
<p><strong>Catch:</strong> Most policies have a 90-day elimination period before benefits start. Premiums have risen 50-100% over the last decade for many existing policyholders.</p>

<h3>4. VA Aid &amp; Attendance</h3>
<p><strong>Covers:</strong> Up to \$3,740/month for qualifying wartime veterans (and surviving spouses). Used to offset care costs.</p>
<p><strong>Catch:</strong> Wartime service requirement, discharge requirements, net worth cap (\$159,240 in 2026). <a href="/tools/va-eligibility">Check eligibility with our tool</a>.</p>

<h3>5. Private pay</h3>
<p><strong>Covers:</strong> Whatever you can afford. Sources include Social Security, pensions, retirement accounts (IRA/401k), investment income, annuities, home equity (HELOC or reverse mortgage).</p>

<h3>6. Life insurance conversions</h3>
<p><strong>Covers:</strong> Cash value or accelerated death benefit from a permanent life insurance policy can be converted to a "long-term care benefit plan" — typically pays out 30-60% of face value over time.</p>

<h2>The four real-world combinations</h2>

<h3>Combo 1: Short rehab → home</h3>
<p>Medicare A covers 20-100 days after hospital discharge. Family pays for any home care needed afterward. <strong>Best when:</strong> The stay is recovery-oriented, not long-term placement.</p>

<h3>Combo 2: Medicare → spend down to Medicaid</h3>
<p>Medicare A covers the first 20-100 days. Once Medicare ends, family uses savings to private-pay for several months while spending down assets to Medicaid eligibility. Medicaid takes over. <strong>Best when:</strong> Long-term placement needed and assets are modest-to-moderate.</p>

<h3>Combo 3: LTC insurance + private pay → Medicaid</h3>
<p>LTC insurance covers a portion of the daily rate. Family covers the gap from income/savings. When LTC benefit period expires and assets are spent, Medicaid takes over. <strong>Best when:</strong> The family has an existing LTC policy that's matured.</p>

<h3>Combo 4: VA Aid &amp; Attendance + private pay</h3>
<p>A&A provides a monthly offset; family covers the remainder. <strong>Best when:</strong> Wartime veteran or surviving spouse with moderate assets.</p>

<h2>The mistake families make</h2>
<p>Waiting until the day Medicare stops to start thinking about Medicaid. <strong>Medicaid planning takes 3-6 months</strong>, and any asset transfers within the prior 60 months will be scrutinized. Start the Medicaid conversation the day you tour your first facility — not the day Medicare cuts off.</p>

<h2>Project your costs</h2>
<p>Every facility page on CarePath has a <a href="/search">cost projection calculator</a> that models 5 years blending all six payers above. Adjust your inputs and see where each payer kicks in and out.</p>
HTML
        ],

        [
            'slug' => 'power-of-attorney-aging-parents',
            'category' => 'legal',
            'title' => 'Power of Attorney for Aging Parents: A Step-by-Step',
            'subtitle' => 'The single most important legal document for an aging family member — what it does, what it doesn\'t, and when to set it up.',
            'hero_image_url' => 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1600&q=80',
            'reading_time_minutes' => 7,
            'is_featured' => false,
            'tags' => ['power of attorney', 'legal', 'planning', 'aging parents'],
            'summary' => 'Why every family with an aging parent needs a durable POA — and how to set one up without overpaying for an attorney.',
            'body' => <<<HTML
<p class="lead">A power of attorney (POA) lets one person make legal decisions for another. Without one, families often discover too late that they cannot pay parents' bills, sign Medicaid applications, or talk to the doctor — and need to go through guardianship court to get the authority back.</p>

<h2>The two types you actually need</h2>

<h3>Financial POA (also called "durable POA")</h3>
<p>Authorizes someone to manage money: pay bills, file taxes, manage accounts, sign legal documents, sell property, apply for benefits. "Durable" means it remains in effect even if the principal (your parent) becomes incapacitated. <strong>This is the one that gets you through a dementia diagnosis.</strong></p>

<h3>Healthcare POA (also called "healthcare proxy" or "medical directive")</h3>
<p>Authorizes someone to make medical decisions when the principal can't. Often paired with a living will (which spells out what kinds of life-sustaining treatment the principal does or doesn't want).</p>

<h2>What POA does NOT do</h2>
<ul>
<li><strong>Take effect after death.</strong> POAs end at death. From that point, the executor of the will takes over.</li>
<li><strong>Override the principal.</strong> While your parent has capacity, they still make all decisions. POA is a backup, not a takeover.</li>
<li><strong>Cover everything automatically.</strong> Some powers (like making gifts or changing beneficiaries) must be specifically granted in the document.</li>
</ul>

<h2>When to set it up</h2>
<p><strong>Before your parent needs it.</strong> A POA can only be signed by someone with legal capacity. Once dementia has progressed to the point where the principal cannot understand what they're signing, it's too late — and the family must pursue guardianship in court (expensive, public, slow).</p>
<p>Practical trigger: At the first sign of memory changes, or by age 75 regardless. Every adult should have one anyway.</p>

<h2>How to actually set one up</h2>
<h3>Option A: Elder-law attorney (recommended)</h3>
<p>Cost: \$300-\$1,500 depending on state and complexity. Includes consultation, drafting, witnessing, notary. Many attorneys offer a flat-fee POA + healthcare directive bundle for ~\$500.</p>
<p>Why it's worth it: An attorney will tailor the powers (e.g., making sure Medicaid planning powers are included), advise on successor agents (backups), and witness the signing properly. Most importantly, they document capacity — which can be challenged later if someone disputes the POA.</p>

<h3>Option B: State-specific online template</h3>
<p>Cost: \$0-\$50. Many state bar associations publish free statutory POA forms. LegalZoom and Rocket Lawyer offer guided versions.</p>
<p>When this works: Simple family situation, no concern about challenges, no specialized provisions needed.</p>

<h3>Option C: Avoid handwritten or generic forms</h3>
<p>States have specific notarization, witness, and language requirements. A POA that's invalid is the same as no POA — except worse, because you discover it at the worst possible moment.</p>

<h2>Five common mistakes</h2>
<ol>
<li><strong>Naming only one agent.</strong> Always name a successor in case the primary agent dies, becomes incapacitated, or declines to serve.</li>
<li><strong>Forgetting the gift power.</strong> Without it, the agent cannot do Medicaid planning, make annual gifts, or transfer assets to a community spouse.</li>
<li><strong>Not notifying the agent.</strong> The agent should have a copy and know where the original is kept.</li>
<li><strong>Banks rejecting old POAs.</strong> Some banks reject POAs over 1-2 years old. Re-sign every 3-5 years, or include a "bank POA" supplement using the bank's own form.</li>
<li><strong>Forgetting healthcare separately.</strong> Many families do the financial POA and forget that healthcare decisions need their own document.</li>
</ol>

<h2>What about HIPAA?</h2>
<p>Healthcare POA usually includes HIPAA authorization, but check the document. Without HIPAA authorization, doctors and hospitals cannot share information with family — a routine problem at hospital discharges.</p>

<h2>Where this ties into long-term care</h2>
<p>You'll need a financial POA to:</p>
<ul>
<li>Sign the facility admission agreement on a parent's behalf</li>
<li>Apply for Medicaid (a complex 30+ page application)</li>
<li>Manage the parent's bank accounts and pay the facility</li>
<li>File the parent's taxes</li>
<li>Communicate with insurance, banks, and government agencies</li>
</ul>
<p>And the healthcare POA to authorize treatments, hospice transitions, and end-of-life decisions.</p>

<p>When you're ready to compare facilities, <a href="/search">start with the CarePath search</a> — and bring the POA to your first tour appointment.</p>
HTML
        ],
    ];

    public function run(): void
    {
        foreach (self::ARTICLES as $a) {
            Article::updateOrCreate(
                ['slug' => $a['slug']],
                array_merge($a, [
                    'is_published' => true,
                    'published_at' => now()->subDays(rand(1, 90)),
                    'author_name' => 'CarePath Editorial',
                    'author_title' => 'Reviewed by a licensed gerontologist',
                ])
            );
        }

        $this->command->info('✓ articles seeded (' . count(self::ARTICLES) . ')');
    }
}

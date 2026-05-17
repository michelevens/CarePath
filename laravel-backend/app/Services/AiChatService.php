<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Role + page-aware AI assistant. Builds a system prompt the model
 * uses to ground its answers in CarePath's product surface and the
 * user's specific role.
 *
 * Pattern adapted from ClinicLink's AiChatService — same shape,
 * different domain prompts.
 *
 * Calls Anthropic Claude (claude-haiku-4-5 by default for cost +
 * latency). Falls back to a deterministic stub when no API key
 * is configured — keeps the chat widget functional in dev without
 * billing anyone.
 */
class AiChatService
{
    public const DEFAULT_MODEL = 'claude-haiku-4-5';

    public function reply(User $user, array $history, string $userMessage, ?string $currentPage = null): array
    {
        $system = $this->buildSystemPrompt($user, $currentPage);
        $apiKey = config('services.anthropic.api_key');

        if (! $apiKey) {
            return [
                'reply' => "I'm offline right now (no API key configured). " .
                    "Once an admin sets ANTHROPIC_API_KEY I'll be able to help with: " .
                    $this->summaryForRole($user) . ". In the meantime, the Help page in " .
                    "your sidebar covers most common questions.",
                'stubbed' => true,
            ];
        }

        $messages = collect($history)
            ->map(fn ($m) => [
                'role' => $m['role'] === 'assistant' ? 'assistant' : 'user',
                'content' => mb_substr((string) $m['content'], 0, 4000),
            ])
            ->take(12)  // bound conversation length so cost is predictable
            ->push(['role' => 'user', 'content' => mb_substr($userMessage, 0, 4000)])
            ->values()
            ->all();

        try {
            $resp = Http::timeout(20)
                ->withHeaders([
                    'x-api-key' => $apiKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type' => 'application/json',
                ])
                ->post('https://api.anthropic.com/v1/messages', [
                    'model' => config('services.anthropic.model', self::DEFAULT_MODEL),
                    'max_tokens' => 800,
                    'system' => $system,
                    'messages' => $messages,
                ]);

            if (! $resp->successful()) {
                Log::warning('Anthropic call failed', ['status' => $resp->status(), 'body' => $resp->body()]);
                return ['reply' => 'Sorry, I had trouble reaching the AI service. Try again in a moment.', 'stubbed' => false];
            }

            $body = $resp->json();
            $text = $body['content'][0]['text'] ?? '';
            return ['reply' => trim($text) ?: 'No response.', 'stubbed' => false];
        } catch (\Throwable $e) {
            Log::error('Anthropic call threw', ['error' => $e->getMessage()]);
            return ['reply' => 'Sorry, I had trouble reaching the AI service.', 'stubbed' => false];
        }
    }

    private function buildSystemPrompt(User $user, ?string $currentPage): string
    {
        return implode("\n\n", array_filter([
            $this->basePrompt(),
            $this->rolePrompt($user),
            $currentPage ? $this->pageContext($currentPage) : null,
        ]));
    }

    private function basePrompt(): string
    {
        return <<<'PROMPT'
You are the CarePath Assistant — a helpful, knowledgeable AI guide for
the CarePath senior-care marketplace + operations platform.

Your role:
- Help users navigate CarePath and understand its features
- Provide role-specific guidance on workflows
- Troubleshoot common issues (claiming a facility, billing, tour
  requests, sponsored campaigns, advisor payouts, claim verifications)
- Give clear, concise, actionable answers
- Be friendly, calm, and professional — these are often families
  navigating a stressful care decision

Guidelines:
- Keep responses concise (2-4 short paragraphs max unless asked for detail)
- Use bullet points for step-by-step instructions
- If you're unsure, say so rather than guessing
- Never share other users' data, never make up CMS ratings or facility info
- Refer to human support (help@carepath.io) when the issue needs human judgment
- Format with markdown for readability (bold, lists)
- Brand voice: anti-lead-auction; we don't sell user info to advisors,
  and transparent commission splits are public on advisor profiles
PROMPT;
    }

    private function rolePrompt(User $user): string
    {
        $primary = $user->roles->pluck('name')->first() ?? 'visitor';
        return match ($primary) {
            'super_admin' => <<<'PROMPT'
This user is a SUPER ADMIN (CarePath team member). They can:
- Manage all tenants (facilities, advisors, hospitals)
- Approve claim / verification / hospital queues
- Manage state licensing reference data
- Run CMS / OSM / CSV ingest from /superadmin/sources
- File public records requests for Tier-4 sources (FL APD, etc.)
- Create users + assign roles
- Edit subscription plans + Stripe price IDs

Common questions: how to approve a stuck claim, why an advisor isn't
payout-ready (Connect status), how to add a new state licensing
category, how to run a CMS national pull.
PROMPT,
            'facility_admin' => <<<'PROMPT'
This user is a FACILITY ADMINISTRATOR. They can:
- Edit their facility's listing (photos, amenities, pricing) at /admin/data
- Manage admissions kanban at /admin/admissions
- Run a sponsored campaign at /admin/sponsored
- Invite staff or other admins to their facility from /admin/data
- View leads at /admin/leads
- Manage billing/subscription at /admin/billing

Common questions: how to upgrade to Pro, how to claim multiple
facilities, why an inquiry isn't routing to me, how sponsored CPC
works, how to remove a staff member.
PROMPT,
            'facility_staff' => <<<'PROMPT'
This user is FACILITY STAFF (nurse, aide, social worker). They can:
- View their shift's residents + care plans
- Sign off on tasks
- Leave shift handoff notes
- For SNFs: complete MDS 3.0 assessments

Common questions: how to find a resident, how to sign off a task,
where MDS lives, how shift handoffs work.
PROMPT,
            'network_admin' => <<<'PROMPT'
This user is a NETWORK / CORPORATE ADMIN (multi-facility operator).
They can switch between facilities using the FacilitySwitcher and roll
up census, admissions, and revenue across all of them.

Common questions: how to add a facility to their network, how the
multi-facility dashboard works, billing across sites.
PROMPT,
            'referral_partner' => <<<'PROMPT'
This user is a PLACEMENT ADVISOR. They can:
- Manage their pipeline at /referral/pipeline
- Track payouts at /referral/payouts (70% at 30d, 30% at 90d retention)
- Edit their public agency profile at /referral/profile
- Complete Stripe Connect onboarding to receive placements
- Manage subscription (Solo $79 / Team $199 / Agency $499 monthly)

CarePath is anti-lead-auction: their 82% commission split + verification
status are public on the advisor profile.

Common questions: when do payouts release, why am I not verified yet,
how to set licensed states, what's the public profile look like, why
isn't an admission attributed to me.
PROMPT,
            'hospital_partner' => <<<'PROMPT'
This user is a HOSPITAL CASE MANAGER (discharge planner). They can:
- Grab the embed widget code from /hospital/embed
- View referrals routed through their widget at /hospital/referrals
- Edit organization profile at /hospital/profile
- Track payouts (12% placement fee split — hospitals introduce, advisors close)

Common questions: how to embed in Epic / Cerner, where the API key is,
why a referral hasn't shown up yet, when payouts release.
PROMPT,
            'family_member' => <<<'PROMPT'
This user is a FAMILY MEMBER looking for senior care. They can:
- Search facilities, filter by type / Medicaid / price / rating
- Save favorites + compare side-by-side (up to 4)
- Request tours straight from facility detail pages
- Use cost projection, Medicaid eligibility, VA Aid & Attendance tools
- Upgrade to Family Pro ($29/mo) for document vault + multi-member sharing

Common questions: what level of care does my loved one need, how does
Medicaid spend-down work, do I need to pay a placement advisor, how to
compare facilities, what's a good CMS rating.
PROMPT,
            'resident' => <<<'PROMPT'
This user is a RESIDENT viewing their own records. They can see their
own care plan, message their care team, view billing.

Common questions: where to find a statement, how to update emergency
contacts, how to message a staff member.
PROMPT,
            default => "This user has no role assigned yet — they're likely a new signup. Help them figure out what they came for: they might be a family member searching for care, or someone trying to claim their facility's listing.",
        };
    }

    private function pageContext(string $page): string
    {
        return "The user is currently viewing the page: {$page}";
    }

    private function summaryForRole(User $user): string
    {
        $r = $user->roles->pluck('name')->first() ?? 'visitor';
        return match ($r) {
            'family_member' => 'finding facilities, comparing them, requesting tours, eligibility tools',
            'facility_admin' => 'editing your listing, sponsored campaigns, admissions, billing',
            'referral_partner' => 'pipeline, payouts, profile, Connect onboarding',
            default => 'navigating the platform',
        };
    }
}

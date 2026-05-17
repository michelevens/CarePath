<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Inbox + thread reader + sender. All endpoints require auth and
 * scope rigorously to the authenticated user — a user can only
 * see conversations they're a participant in.
 */
class MessagingController extends Controller
{
    /**
     * GET /api/messaging/conversations
     *
     * The user's inbox: every thread they're a participant in,
     * with last-message preview + unread count.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $rows = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('users.id', $user->id))
            ->with([
                'participants:id,name,email,profile_picture',
                'latestMessage.sender:id,name',
                'facility:id,name,slug',
            ])
            ->orderByDesc('last_message_at')
            ->limit(100)
            ->get();

        // Get this user's per-conversation read state.
        $reads = DB::table('conversation_participants')
            ->where('user_id', $user->id)
            ->whereIn('conversation_id', $rows->pluck('id'))
            ->get()
            ->keyBy('conversation_id');

        return response()->json([
            'data' => $rows->map(function (Conversation $c) use ($reads, $user) {
                $lastRead = $reads[$c->id]?->last_read_at;
                $unread = $c->messages()
                    ->where('sender_user_id', '!=', $user->id)
                    ->when($lastRead, fn ($q) => $q->where('sent_at', '>', $lastRead))
                    ->count();
                $latest = $c->latestMessage->first();
                $otherParticipants = $c->participants
                    ->filter(fn ($p) => $p->id !== $user->id)
                    ->take(3)
                    ->values();
                return [
                    'id' => $c->id,
                    'subject' => $c->subject,
                    'is_broadcast' => $c->is_broadcast,
                    'facility' => $c->facility ? [
                        'name' => $c->facility->name, 'slug' => $c->facility->slug,
                    ] : null,
                    'last_message_at' => $c->last_message_at,
                    'unread_count' => $unread,
                    'latest_preview' => $latest ? [
                        'body' => mb_substr($latest->body, 0, 120),
                        'sender_name' => $latest->sender?->name,
                    ] : null,
                    'other_participants' => $otherParticipants->map(fn ($p) => [
                        'id' => $p->id, 'name' => $p->name, 'profile_picture' => $p->profile_picture,
                    ]),
                ];
            }),
        ]);
    }

    /**
     * GET /api/messaging/conversations/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $conversation = Conversation::with(['participants:id,name,email,profile_picture'])->findOrFail($id);

        if (! $conversation->participants->contains('id', $user->id)) {
            abort(403);
        }

        // Mark as read.
        DB::table('conversation_participants')
            ->where('conversation_id', $id)
            ->where('user_id', $user->id)
            ->update(['last_read_at' => now()]);

        $messages = $conversation->messages()->with('sender:id,name,profile_picture')->get();

        return response()->json([
            'data' => [
                'id' => $conversation->id,
                'subject' => $conversation->subject,
                'is_broadcast' => $conversation->is_broadcast,
                'facility_id' => $conversation->facility_id,
                'participants' => $conversation->participants->map(fn ($p) => [
                    'id' => $p->id, 'name' => $p->name, 'email' => $p->email,
                    'profile_picture' => $p->profile_picture,
                ]),
                'messages' => $messages->map(fn (Message $m) => [
                    'id' => $m->id,
                    'body' => $m->body,
                    'sent_at' => $m->sent_at,
                    'sender' => $m->sender ? [
                        'id' => $m->sender->id,
                        'name' => $m->sender->name,
                        'profile_picture' => $m->sender->profile_picture,
                    ] : null,
                    'is_you' => $m->sender_user_id === $user->id,
                ]),
            ],
        ]);
    }

    /**
     * POST /api/messaging/conversations
     *
     * Start a new conversation. Accepts an array of participant
     * user_ids + the first message. The author is added
     * automatically.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject' => ['nullable', 'string', 'max:191'],
            'facility_id' => ['nullable', 'uuid', 'exists:facilities,id'],
            'participant_ids' => ['required', 'array', 'min:1'],
            'participant_ids.*' => ['integer', 'exists:users,id'],
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $user = Auth::user();

        $conversation = DB::transaction(function () use ($data, $user) {
            $conv = Conversation::create([
                'subject' => $data['subject'] ?? null,
                'facility_id' => $data['facility_id'] ?? null,
                'started_by_user_id' => $user->id,
                'last_message_at' => now(),
            ]);

            $participantIds = array_unique(array_merge($data['participant_ids'], [$user->id]));
            foreach ($participantIds as $pid) {
                DB::table('conversation_participants')->insert([
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'conversation_id' => $conv->id,
                    'user_id' => $pid,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            Message::create([
                'conversation_id' => $conv->id,
                'sender_user_id' => $user->id,
                'body' => $data['body'],
                'sent_at' => now(),
            ]);

            return $conv;
        });

        return response()->json(['data' => ['id' => $conversation->id]], 201);
    }

    /**
     * POST /api/messaging/conversations/{id}/messages
     */
    public function sendMessage(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $user = Auth::user();
        $conversation = Conversation::findOrFail($id);

        $isParticipant = DB::table('conversation_participants')
            ->where('conversation_id', $id)
            ->where('user_id', $user->id)
            ->whereNull('left_at')
            ->exists();
        if (! $isParticipant) abort(403);

        // Broadcasts disallow replies from non-author participants
        // (matches the "announcement" UX users expect).
        if ($conversation->is_broadcast && $conversation->started_by_user_id !== $user->id) {
            abort(403, "You can't reply to a broadcast announcement.");
        }

        $message = Message::create([
            'conversation_id' => $id,
            'sender_user_id' => $user->id,
            'body' => $data['body'],
            'sent_at' => now(),
        ]);
        $conversation->update(['last_message_at' => now()]);

        // Mark author's read state up to this message.
        DB::table('conversation_participants')
            ->where('conversation_id', $id)
            ->where('user_id', $user->id)
            ->update(['last_read_at' => now()]);

        return response()->json([
            'data' => [
                'id' => $message->id,
                'body' => $message->body,
                'sent_at' => $message->sent_at,
            ],
        ], 201);
    }

    /**
     * POST /api/messaging/broadcast
     *
     * Send a broadcast to a target audience. Currently:
     *   audience = 'facility_families' → families with current
     *     residents at the user's active facility
     *   audience = 'platform_admins'   → all facility_admin users
     *     (super_admin only)
     */
    public function broadcast(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:191'],
            'body' => ['required', 'string', 'max:5000'],
            'audience' => ['required', 'in:facility_families,platform_admins'],
        ]);

        $user = Auth::user();
        $recipientIds = [];

        if ($data['audience'] === 'facility_families') {
            if (! $user->hasRole('facility_admin')) abort(403);
            if (! $user->active_facility_id) abort(422, 'No active facility');

            // Adult-child users tied to current admissions on this
            // facility — admission.inquirer_email is the lookup key.
            $emails = DB::table('admissions')
                ->where('facility_id', $user->active_facility_id)
                ->where('stage', 'admitted')
                ->whereNotNull('inquirer_email')
                ->pluck('inquirer_email')
                ->unique()
                ->all();
            $recipientIds = User::whereIn('email', $emails)->pluck('id')->all();
        } elseif ($data['audience'] === 'platform_admins') {
            if (! $user->hasRole('super_admin')) abort(403);
            $recipientIds = User::role('facility_admin')->pluck('id')->all();
        }

        if (empty($recipientIds)) {
            return response()->json(['ok' => false, 'message' => 'No recipients found.'], 422);
        }

        $conversation = DB::transaction(function () use ($data, $user, $recipientIds) {
            $conv = Conversation::create([
                'subject' => $data['subject'],
                'is_broadcast' => true,
                'facility_id' => $user->active_facility_id,
                'started_by_user_id' => $user->id,
                'last_message_at' => now(),
            ]);
            $participantIds = array_unique(array_merge($recipientIds, [$user->id]));
            foreach ($participantIds as $pid) {
                DB::table('conversation_participants')->insert([
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'conversation_id' => $conv->id,
                    'user_id' => $pid,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            Message::create([
                'conversation_id' => $conv->id,
                'sender_user_id' => $user->id,
                'body' => $data['body'],
                'sent_at' => now(),
            ]);
            return $conv;
        });

        return response()->json([
            'data' => [
                'id' => $conversation->id,
                'recipients_count' => count($recipientIds),
            ],
        ], 201);
    }
}

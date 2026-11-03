# The Guildhall — D&D Campaign Hub

A parchment-themed, responsive multiplayer campaign chat application built with Next.js and Supabase.

## Included
- Email/password account creation and sign-in
- Campaign creation and invite-code joining
- Dungeon Master / Player roles and DM promotion/demotion controls
- Campaign channels with real-time message updates
- Public dice roller (`1d20+4`, `2d6`, etc.) and roll history
- Character records (name, ancestry, class, level, HP, AC)
- Campaign image uploads and a gallery
- Supabase Row Level Security policies and storage bucket setup

## Requirements
- Node.js 20+
- A Supabase project (free tier is sufficient to test)

## Setup

1. Create a Supabase project at https://supabase.com/dashboard.
2. In **SQL Editor**, run all of `supabase/schema.sql`.
3. In **Project Settings → API**, copy the Project URL and anon/public key.
4. Copy `.env.example` to `.env.local` and fill in those two values.
5. Install and run:

   ```bash
   npm install
   npm run dev
   ```

6. Open http://localhost:3000 and create your account.
7. Create a campaign. The creator is assigned Dungeon Master automatically.
8. Share the invite code with players. They create accounts and choose **Join with code**.

## Deploy
Deploy the repository to Vercel (or another Next.js host). Add the same two environment variables in the host's project settings, then deploy. In Supabase Authentication settings, configure the Site URL and allowed redirect URLs for your deployed domain.

## Important production notes
- This is a deployable starter application, not a hosted service. You must create and configure the Supabase project and hosting account.
- For a public launch, add email verification, password reset, rate limiting, abuse reporting, and moderation/audit logs.
- The starter stores character basics and an extensible `details` JSON field. It does not yet implement every official 5e sheet field, PDF import/export, voice/video, or private/whisper rolls.
- Image uploads are limited to 10 MB and common web image formats. Public image URLs are used for simple campaign sharing; do not upload sensitive/private material.
- Dice are rolled in the browser for convenience. For competitive or audited play, move dice generation to a trusted server-side function.
- Keep Supabase Row Level Security enabled. Never put a Supabase service-role key in a browser environment variable.
- Supabase free-tier quotas and limits apply; monitor usage as your group grows.

## Roles
- DM: campaign creator; can view party, change other members' DM/Player role, and manage all characters.
- Player: can chat, roll, upload images, create their own characters, and view campaign records.

## Suggested next enhancements
- Full D&D 5e ability/skill/spell/inventory sheet editor
- DM-only private notes and whisper rolls
- PDF sheet upload/attachment storage
- Channel creation and moderation tools
- Message editing/deletion, reactions, and search

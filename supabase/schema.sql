-- ============================================================
-- Accountability App — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id)
);

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  challenger_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenged_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  goal TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  consequence_type TEXT CHECK (consequence_type IN ('embarrassing_post', 'dare_forfeit')) NOT NULL,
  consequence_details TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'active', 'completed', 'failed', 'rejected')) NOT NULL DEFAULT 'pending',
  consequence_revealed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.updates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.proofs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT,
  content TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  verified_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  related_id UUID,
  read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::TEXT, 8)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Notify challenged user when a challenge is created
CREATE OR REPLACE FUNCTION public.handle_new_challenge()
RETURNS TRIGGER AS $$
DECLARE
  challenger_username TEXT;
BEGIN
  SELECT username INTO challenger_username FROM public.profiles WHERE id = NEW.challenger_id;
  INSERT INTO public.notifications (user_id, type, title, body, related_id)
  VALUES (
    NEW.challenged_id,
    'challenge_received',
    'New Challenge from ' || COALESCE(challenger_username, 'someone') || '!',
    LEFT(NEW.goal, 100),
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_challenge_created ON public.challenges;
CREATE TRIGGER on_challenge_created
  AFTER INSERT ON public.challenges
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_challenge();

-- Notify challenger when proof is submitted
CREATE OR REPLACE FUNCTION public.handle_proof_submitted()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, title, body, related_id)
    SELECT
      c.challenger_id,
      'proof_submitted',
      'Proof submitted — time to judge!',
      'Your challenge has proof ready for review.',
      NEW.challenge_id
    FROM public.challenges c
    WHERE c.id = NEW.challenge_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_proof_submitted ON public.proofs;
CREATE TRIGGER on_proof_submitted
  AFTER INSERT ON public.proofs
  FOR EACH ROW EXECUTE PROCEDURE public.handle_proof_submitted();

-- Notify challenged user when proof verdict is given, update challenge status
CREATE OR REPLACE FUNCTION public.handle_proof_verdict()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND OLD.status = 'pending' THEN
    UPDATE public.challenges
    SET
      status = CASE WHEN NEW.status = 'approved' THEN 'completed' ELSE 'failed' END,
      consequence_revealed = CASE WHEN NEW.status = 'rejected' THEN TRUE ELSE FALSE END
    WHERE id = NEW.challenge_id;

    INSERT INTO public.notifications (user_id, type, title, body, related_id)
    VALUES (
      NEW.user_id,
      CASE WHEN NEW.status = 'approved' THEN 'proof_approved' ELSE 'proof_rejected' END,
      CASE WHEN NEW.status = 'approved' THEN 'Challenge Complete! 🎉' ELSE 'Proof Rejected 💀' END,
      CASE WHEN NEW.status = 'approved'
        THEN 'Your proof was approved. Challenge complete!'
        ELSE 'Your proof was rejected. The consequence has been revealed to your friends.'
      END,
      NEW.challenge_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_proof_verdict ON public.proofs;
CREATE TRIGGER on_proof_verdict
  AFTER UPDATE ON public.proofs
  FOR EACH ROW EXECUTE PROCEDURE public.handle_proof_verdict();

-- Notify recipient of a friend request; notify sender when accepted
CREATE OR REPLACE FUNCTION public.handle_friendship_change()
RETURNS TRIGGER AS $$
DECLARE
  sender_username TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT username INTO sender_username FROM public.profiles WHERE id = NEW.user_id;
    INSERT INTO public.notifications (user_id, type, title, body, related_id)
    VALUES (
      NEW.friend_id,
      'friend_request',
      COALESCE(sender_username, 'Someone') || ' wants to be your friend',
      'Accept their request to start challenging each other.',
      NEW.id
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, title, body, related_id)
    VALUES (
      NEW.user_id,
      'friend_accepted',
      'Friend request accepted!',
      'You can now challenge each other.',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friendship_change ON public.friendships;
CREATE TRIGGER on_friendship_change
  AFTER INSERT OR UPDATE ON public.friendships
  FOR EACH ROW EXECUTE PROCEDURE public.handle_friendship_change();

-- RPC: expire overdue active challenges (call from dashboard or cron)
CREATE OR REPLACE FUNCTION public.expire_overdue_challenges()
RETURNS void AS $$
BEGIN
  UPDATE public.challenges
  SET status = 'failed', consequence_revealed = TRUE
  WHERE status = 'active'
    AND deadline < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM public.proofs p
      WHERE p.challenge_id = challenges.id AND p.status IN ('pending', 'approved')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- FRIENDSHIPS
CREATE POLICY "friendships_select_participant" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "friendships_insert_sender" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "friendships_update_recipient" ON public.friendships
  FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);

CREATE POLICY "friendships_delete_participant" ON public.friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- CHALLENGES
CREATE POLICY "challenges_select" ON public.challenges
  FOR SELECT USING (
    auth.uid() = challenger_id
    OR auth.uid() = challenged_id
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = auth.uid() AND f.friend_id IN (challenger_id, challenged_id))
          OR (f.friend_id = auth.uid() AND f.user_id IN (challenger_id, challenged_id))
        )
    )
  );

CREATE POLICY "challenges_insert_friends_only" ON public.challenges
  FOR INSERT WITH CHECK (
    auth.uid() = challenger_id
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = auth.uid() AND f.friend_id = challenged_id)
          OR (f.friend_id = auth.uid() AND f.user_id = challenged_id)
        )
    )
  );

CREATE POLICY "challenges_update_participant" ON public.challenges
  FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

-- UPDATES
CREATE POLICY "updates_select" ON public.updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND (
          c.challenger_id = auth.uid()
          OR c.challenged_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND (
                (f.user_id = auth.uid() AND f.friend_id IN (c.challenger_id, c.challenged_id))
                OR (f.friend_id = auth.uid() AND f.user_id IN (c.challenger_id, c.challenged_id))
              )
          )
        )
    )
  );

CREATE POLICY "updates_insert_challenged" ON public.updates
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND c.challenged_id = auth.uid()
        AND c.status = 'active'
    )
  );

-- PROOFS
CREATE POLICY "proofs_select_participant" ON public.proofs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND (c.challenger_id = auth.uid() OR c.challenged_id = auth.uid())
    )
  );

CREATE POLICY "proofs_insert_challenged" ON public.proofs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND c.challenged_id = auth.uid()
        AND c.status = 'active'
    )
  );

CREATE POLICY "proofs_update_challenger" ON public.proofs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.challenger_id = auth.uid()
    )
  );

-- NOTIFICATIONS
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('updates', 'updates', false, 52428800, ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']),
  ('proofs',  'proofs',  false, 52428800, ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- Avatars: public read, owner write
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- Updates: auth users read, owner write
CREATE POLICY "updates_auth_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'updates' AND auth.role() = 'authenticated');

CREATE POLICY "updates_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'updates'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- Proofs: auth users read, owner write
CREATE POLICY "proofs_auth_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'proofs' AND auth.role() = 'authenticated');

CREATE POLICY "proofs_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'proofs'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

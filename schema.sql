-- SQL Schema for ArthaVerse - Financial Risk & Signal Dashboard

-- Enable Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    subscription_tier TEXT CHECK (subscription_tier IN ('free', 'premium')) DEFAULT 'free',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WATCHLISTS TABLE
CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    symbol TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, symbol)
);

-- SIGNAL SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.signal_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    whatsapp_number TEXT NOT NULL,
    symbol TEXT NOT NULL,
    take_profit NUMERIC,
    stop_loss NUMERIC,
    dca_frequency TEXT CHECK (dca_frequency IN ('off', 'daily', 'weekly', 'monthly')) DEFAULT 'off',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, symbol)
);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_settings ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Watchlist policies
CREATE POLICY "Users can view their own watchlist" 
    ON public.watchlists FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own watchlist" 
    ON public.watchlists FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own watchlist" 
    ON public.watchlists FOR DELETE 
    USING (auth.uid() = user_id);

-- Signal Settings policies
CREATE POLICY "Users can view their own signal settings" 
    ON public.signal_settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own signal settings" 
    ON public.signal_settings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own signal settings" 
    ON public.signal_settings FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own signal settings" 
    ON public.signal_settings FOR DELETE 
    USING (auth.uid() = user_id);

-- AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, subscription_tier)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        'free'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

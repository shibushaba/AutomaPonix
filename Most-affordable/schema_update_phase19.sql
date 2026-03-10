-- Create the requests table to store general chatbot inquiries
CREATE TABLE public.requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (so the n8n bot can insert via anon key if configured that way, or just rely on service_role)
-- If using anon key in n8n for inserts:
CREATE POLICY "Enable insert for anonymous users" ON public.requests
    FOR INSERT WITH CHECK (true);

-- Allow admins to read/update the requests
CREATE POLICY "Enable read access for all users" ON public.requests
    FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON public.requests
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON public.requests
    FOR DELETE USING (true);

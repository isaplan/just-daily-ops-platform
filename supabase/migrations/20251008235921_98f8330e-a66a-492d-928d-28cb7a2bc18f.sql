-- Create financial chat sessions table
CREATE TABLE public.financial_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'New Financial Chat',
  month TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial chat messages table
CREATE TABLE public.financial_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.financial_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial insights table (saved conclusions)
CREATE TABLE public.financial_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.financial_chat_sessions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  month TEXT NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial reports table
CREATE TABLE public.financial_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  month_start TEXT NOT NULL,
  month_end TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report insights junction table
CREATE TABLE public.report_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.financial_reports(id) ON DELETE CASCADE,
  insight_id UUID NOT NULL REFERENCES public.financial_insights(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, insight_id)
);

-- Enable RLS
ALTER TABLE public.financial_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat sessions
CREATE POLICY "Users can view their own chat sessions"
  ON public.financial_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions"
  ON public.financial_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
  ON public.financial_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
  ON public.financial_chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for chat messages
CREATE POLICY "Users can view messages from their sessions"
  ON public.financial_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.financial_chat_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their sessions"
  ON public.financial_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.financial_chat_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for insights
CREATE POLICY "Users can view their own insights and shared insights"
  ON public.financial_insights FOR SELECT
  USING (auth.uid() = user_id OR is_shared = true);

CREATE POLICY "Users can create their own insights"
  ON public.financial_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights"
  ON public.financial_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights"
  ON public.financial_insights FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for reports
CREATE POLICY "Users can view their own reports"
  ON public.financial_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports"
  ON public.financial_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
  ON public.financial_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
  ON public.financial_reports FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for report_insights
CREATE POLICY "Users can view report insights for their reports"
  ON public.report_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.financial_reports
      WHERE id = report_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage insights in their reports"
  ON public.report_insights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.financial_reports
      WHERE id = report_id AND user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_chat_sessions_user ON public.financial_chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_location ON public.financial_chat_sessions(location_id);
CREATE INDEX idx_chat_messages_session ON public.financial_chat_messages(session_id);
CREATE INDEX idx_insights_user ON public.financial_insights(user_id);
CREATE INDEX idx_insights_location ON public.financial_insights(location_id);
CREATE INDEX idx_reports_user ON public.financial_reports(user_id);
CREATE INDEX idx_report_insights_report ON public.report_insights(report_id);

-- Trigger for updating timestamps
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.financial_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insights_updated_at
  BEFORE UPDATE ON public.financial_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.financial_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- AI 회의록 메이커 Supabase 스키마
-- Supabase SQL Editor에서 실행하세요

-- 팀원 테이블
CREATE TABLE team_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by    UUID REFERENCES auth.users(id),
  invited_at    TIMESTAMPTZ DEFAULT now(),
  joined_at     TIMESTAMPTZ
);

-- 녹음 테이블
CREATE TABLE recordings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'team_meeting'
                   CHECK (type IN ('team_meeting', 'client_meeting', 'one_on_one', 'other')),
  visibility     TEXT NOT NULL DEFAULT 'team'
                   CHECK (visibility IN ('team', 'private')),
  output_format  TEXT NOT NULL DEFAULT 'minutes'
                   CHECK (output_format IN ('minutes', 'summary')),
  status         TEXT NOT NULL DEFAULT 'uploading'
                   CHECK (status IN (
                     'uploading', 'stt_pending', 'stt_processing',
                     'speaker_mapping', 'ai_processing', 'saving',
                     'completed', 'failed'
                   )),
  duration_seconds INTEGER,
  file_key       TEXT NOT NULL,
  rtzr_job_id    TEXT,
  stt_result     JSONB,
  speaker_map    JSONB,
  ai_result      TEXT,
  notion_page_url TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recordings_updated_at
  BEFORE UPDATE ON recordings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security) 설정
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- team_members: 팀원만 조회 가능
CREATE POLICY "team_members_select"
  ON team_members FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM team_members WHERE user_id IS NOT NULL)
  );

-- team_members: 어드민만 삽입/수정
CREATE POLICY "team_members_insert"
  ON team_members FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM team_members WHERE role = 'admin'
    )
  );

CREATE POLICY "team_members_update"
  ON team_members FOR UPDATE
  USING (
    -- 본인 joined_at 업데이트 OR 어드민
    auth.uid() = user_id OR
    auth.uid() IN (SELECT user_id FROM team_members WHERE role = 'admin')
  );

-- recordings: 팀 공유는 팀원 전체, private은 본인만
CREATE POLICY "recordings_select"
  ON recordings FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      visibility = 'team'
      AND auth.uid() IN (
        SELECT user_id FROM team_members WHERE user_id IS NOT NULL
      )
    )
  );

CREATE POLICY "recordings_insert"
  ON recordings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "recordings_update"
  ON recordings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "recordings_delete"
  ON recordings FOR DELETE
  USING (user_id = auth.uid());

-- 인덱스
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_status ON recordings(status);
CREATE INDEX idx_recordings_visibility ON recordings(visibility);
CREATE INDEX idx_recordings_created_at ON recordings(created_at DESC);

-- 어드민 계정 초기 설정 (본인 이메일로 변경 후 실행)
-- INSERT INTO team_members (email, role) VALUES ('your@email.com', 'admin');

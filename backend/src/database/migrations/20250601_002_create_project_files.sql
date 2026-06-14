CREATE TABLE IF NOT EXISTS project_files (
  id            SERIAL        PRIMARY KEY,
  project_id    INTEGER       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by   INTEGER       NOT NULL REFERENCES users(id),
  file_name     VARCHAR(255)  NOT NULL,
  file_size     BIGINT,
  mime_type     VARCHAR(127),
  drive_file_id VARCHAR(255)  NOT NULL,
  drive_url     TEXT          NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
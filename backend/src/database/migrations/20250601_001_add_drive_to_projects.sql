ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS drive_folder_id  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS drive_folder_url TEXT;
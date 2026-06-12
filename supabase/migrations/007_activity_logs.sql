CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_name varchar(150),
  actor_email varchar(150),
  actor_role varchar(50),
  action varchar(30) NOT NULL,
  entity varchar(50) NOT NULL,
  entity_id uuid,
  entity_label text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_email ON activity_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

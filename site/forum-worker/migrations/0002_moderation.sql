CREATE TABLE IF NOT EXISTS reactions (topic_id INTEGER NOT NULL REFERENCES topics(id), wallet TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(topic_id,wallet));
CREATE TABLE IF NOT EXISTS moderators (wallet TEXT PRIMARY KEY, active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)));
CREATE TABLE IF NOT EXISTS moderation_actions (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, target_type TEXT NOT NULL CHECK(target_type IN ('topic','reply')), target_id INTEGER NOT NULL, hidden INTEGER NOT NULL CHECK(hidden IN (0,1)), reason TEXT NOT NULL CHECK(length(reason) BETWEEN 1 AND 500), created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS reports_queue ON reports(id);
CREATE INDEX IF NOT EXISTS moderation_target ON moderation_actions(target_type,target_id,id);
CREATE TRIGGER IF NOT EXISTS apply_topic_moderation AFTER INSERT ON moderation_actions WHEN NEW.target_type='topic' BEGIN UPDATE topics SET hidden=NEW.hidden WHERE id=NEW.target_id; END;
CREATE TRIGGER IF NOT EXISTS apply_reply_moderation AFTER INSERT ON moderation_actions WHEN NEW.target_type='reply' BEGIN UPDATE replies SET hidden=NEW.hidden WHERE id=NEW.target_id; END;

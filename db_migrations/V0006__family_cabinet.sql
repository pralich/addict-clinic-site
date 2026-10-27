CREATE TABLE family_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  phone VARCHAR(50),
  relation VARCHAR(50),
  password_hash VARCHAR(300) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP
);
CREATE TABLE family_sessions (
  token VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES family_users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
CREATE TABLE family_questions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES family_users(id),
  topic VARCHAR(100),
  question TEXT NOT NULL,
  answer TEXT,
  answered_by INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMP
);
CREATE INDEX idx_family_questions_user ON family_questions(user_id, created_at DESC);
CREATE INDEX idx_family_questions_status ON family_questions(status);
CREATE TABLE family_events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  kind VARCHAR(20) NOT NULL DEFAULT 'webinar',
  starts_at TIMESTAMP NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 90,
  location VARCHAR(300),
  link VARCHAR(500),
  host VARCHAR(200),
  capacity INTEGER,
  cover_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_family_events_starts ON family_events(status, starts_at);
CREATE TABLE family_event_regs (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES family_events(id),
  user_id INTEGER NOT NULL REFERENCES family_users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);
CREATE TABLE family_ai_chats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES family_users(id),
  mode VARCHAR(30) NOT NULL,
  title VARCHAR(200),
  settings TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_family_ai_chats_user ON family_ai_chats(user_id, updated_at DESC);
CREATE TABLE family_ai_messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES family_ai_chats(id),
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_family_ai_messages_chat ON family_ai_messages(chat_id, id);

INSERT INTO family_events (title, description, kind, starts_at, duration_min, location, link, host, capacity, status) VALUES
('Как говорить с зависимым, чтобы он услышал', 'Вебинар для родственников: почему уговоры и угрозы не работают, какие фразы снижают сопротивление и как подготовить первый разговор о лечении. В конце — ответы на вопросы в чате.', 'webinar', '2026-10-15 19:00', 90, NULL, NULL, 'Семейный психолог клиники', NULL, 'published'),
('Группа поддержки для родственников', 'Офлайн-встреча в закрытой группе до 12 человек. Делимся опытом, учимся выходить из созависимости и заботиться о себе. Анонимно, можно прийти впервые.', 'offline', '2026-10-18 12:00', 120, 'Москва, центр addict.clinic (адрес сообщим после записи)', NULL, 'Психолог-консультант по созависимости', 12, 'published'),
('Созависимость: как перестать спасать и начать помогать', 'Разбираем роли «спасатель», «преследователь», «жертва», учимся ставить границы без чувства вины. Практические упражнения во время эфира.', 'webinar', '2026-10-22 19:30', 75, NULL, NULL, 'Психотерапевт клиники', NULL, 'published'),
('Встреча с наркологом: вопросы о лечении и реабилитации', 'Открытая встреча с врачом: как проходит детокс, что происходит в реабилитационном центре, как распознать срыв и что делать. Можно задать любые вопросы.', 'offline', '2026-10-29 18:30', 90, 'Москва, центр addict.clinic (адрес сообщим после записи)', NULL, 'Врач психиатр-нарколог', 25, 'published'),
('Подросток и зависимость: игры, вейпы, вещества', 'Вебинар для родителей: тревожные признаки, как разговаривать без конфликта, правила для семьи и когда пора к специалисту.', 'webinar', '2026-11-05 19:00', 90, NULL, NULL, 'Детский психиатр клиники', NULL, 'published'),
('Жизнь после реабилитации: как семье поддержать ремиссию', 'Что меняется, когда близкий возвращается домой. Профилактика срывов, доверие, контроль без контроля.', 'webinar', '2026-11-12 19:00', 90, NULL, NULL, 'Руководитель реабилитационной программы', NULL, 'published');
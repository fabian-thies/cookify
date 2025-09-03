INSERT INTO difficulty (id, difficulty)
VALUES (1, 'easy'),
       (2, 'medium'),
       (3, 'hard') ON CONFLICT (id) DO NOTHING;
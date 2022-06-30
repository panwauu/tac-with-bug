INSERT INTO users (username, email, password, token, locale) VALUES 
    ('UserA', 'user.a@fake-mail.de', '12341234', 'token', 'de'),
    ('UserB', 'user.b@fake-mail.de', '12341234', 'token', 'de'),
    ('UserC', 'user.c@fake-mail.de', '12341234', 'token', 'de'),
    ('UserD', 'user.d@fake-mail.de', '12341234', 'token', 'de'),
    ('UserE', 'user.e@fake-mail.de', '12341234', 'token', 'en'),
    ('UserF', 'user.f@fake-mail.de', '12341234', 'token', 'ru');

INSERT INTO hof (userid, status) VALUES
    (1, 'verlag'),
    (2, 'spende'),
    (3, 'translation'),
    (4, 'family'),
    (5, 'family');
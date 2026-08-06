insert into churches (slug, name, sort_order) values
  ('st-george',        'St. George',        1),
  ('st-mary',          'St. Mary',          2),
  ('st-mark',          'St. Mark',          3),
  ('st-meena',         'St. Meena',         4),
  ('st-abanoub',       'St. Abanoub',       5),
  ('st-philopateer',   'St. Philopateer',   6),
  ('archangel-michael','Archangel Michael', 7),
  ('pope-kyrillos',    'Pope Kyrillos',     8),
  ('st-marina',        'St. Marina',        9);

-- Field specs drive both the rendered form and the validation. Bounds come
-- straight from the posted rules, so a five-person team is rejected as it is
-- typed rather than discovered the week of the event.
insert into requests (slug, title, description, due_date, event_slug, sort_order, fields) values
(
  'ms-jeopardy-counts',
  'MS Jeopardy team count and attendees',
  'Team counts and total attendees for both Middle School Jeopardy days.',
  '2026-08-06', 'ms-girls-jeopardy', 1,
  '[
    {"key":"girls_teams","label":"Girls teams","type":"number","min":1,"max":2,"required":true,
     "help":"Two teams per church is the limit."},
    {"key":"girls_youth","label":"Girls competing","type":"number","min":7,"max":20,"required":true,
     "help":"A team is 7 youth minimum, 10 maximum."},
    {"key":"boys_teams","label":"Boys teams","type":"number","min":1,"max":2,"required":true,
     "help":"Two teams per church is the limit."},
    {"key":"boys_youth","label":"Boys competing","type":"number","min":7,"max":20,"required":true,
     "help":"A team is 7 youth minimum, 10 maximum."},
    {"key":"total_attendees","label":"Total attendees, both days","type":"number","min":0,"required":true}
  ]'::jsonb
),
(
  'ms-jeopardy-roster',
  'MS Jeopardy roster',
  'The youth competing. Verify every name with the youth before sending — do not copy from the sign-up sheet.',
  '2026-08-06', 'ms-girls-jeopardy', 2,
  '[
    {"key":"girls_roster","label":"Girls roster","type":"name_list","min_items":7,"max_items":10,"required":true,
     "help":"7 minimum, 10 maximum. First name and last initial is enough."},
    {"key":"boys_roster","label":"Boys roster","type":"name_list","min_items":7,"max_items":10,"required":true,
     "help":"7 minimum, 10 maximum. First name and last initial is enough."}
  ]'::jsonb
),
(
  'volleyball-roster',
  'MS & HS Girls Volleyball roster',
  'Players attending. Only servants and playing youth may attend.',
  '2026-08-08', 'ms-hs-girls-volleyball', 3,
  '[
    {"key":"players","label":"Players","type":"name_list","required":true,
     "help":"First name and last initial is enough."},
    {"key":"servants","label":"Servants attending","type":"number","min":1,"required":true}
  ]'::jsonb
),
(
  'hymn-judges',
  'Hymn judge names',
  'One judge for the online round and one for Jeopardy day.',
  '2026-08-10', 'hs-jeopardy-hymns', 4,
  '[
    {"key":"online_judge","label":"Online round judge","type":"text","required":true},
    {"key":"jeopardy_day_judge","label":"Jeopardy day judge","type":"text","required":true}
  ]'::jsonb
);

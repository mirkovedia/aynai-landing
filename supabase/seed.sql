-- AynAI — seed de perfiles demo para cold-start. Idempotente. Solo desarrollo/demo.

-- Usuarios mínimos en auth (ids fijos para idempotencia).
insert into auth.users (id, email, created_at, updated_at, aud, role)
values
  ('aaaaaaaa-0000-4000-8000-000000000001','mara.demo@aynai.dev', now(), now(), 'authenticated','authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000002','luis.demo@aynai.dev', now(), now(), 'authenticated','authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000003','sofia.demo@aynai.dev', now(), now(), 'authenticated','authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000004','diego.demo@aynai.dev', now(), now(), 'authenticated','authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000005','valen.demo@aynai.dev', now(), now(), 'authenticated','authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000006','carlos.demo@aynai.dev', now(), now(), 'authenticated','authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000007','ana.demo@aynai.dev', now(), now(), 'authenticated','authenticated'),
  ('aaaaaaaa-0000-4000-8000-000000000008','jorge.demo@aynai.dev', now(), now(), 'authenticated','authenticated')
on conflict (id) do nothing;

insert into public.profiles (id, full_name, email, username, bio, location, availability, modality, links)
values
  ('aaaaaaaa-0000-4000-8000-000000000001','María Quispe','mara.demo@aynai.dev','maria','Diseñadora UX/UI','La Paz','available','remoto','{"linkedin":"https://linkedin.com/in/demo"}'),
  ('aaaaaaaa-0000-4000-8000-000000000002','Luis Mamani','luis.demo@aynai.dev','luis','Desarrollador frontend','El Alto','available','remoto','{"github":"https://github.com/demo"}'),
  ('aaaaaaaa-0000-4000-8000-000000000003','Sofía Vargas','sofia.demo@aynai.dev','sofia','Marketing digital','Cochabamba','busy','híbrido','{}'),
  ('aaaaaaaa-0000-4000-8000-000000000004','Diego Rojas','diego.demo@aynai.dev','diego','Fotógrafo','Santa Cruz','available','presencial','{}'),
  ('aaaaaaaa-0000-4000-8000-000000000005','Valentina Cruz','valen.demo@aynai.dev','valentina','Redactora de contenidos','La Paz','available','remoto','{}'),
  ('aaaaaaaa-0000-4000-8000-000000000006','Carlos Flores','carlos.demo@aynai.dev','carlos','Contador','Sucre','busy','remoto','{}'),
  ('aaaaaaaa-0000-4000-8000-000000000007','Ana Torrez','ana.demo@aynai.dev','ana','Traductora ES/EN','Tarija','available','remoto','{}'),
  ('aaaaaaaa-0000-4000-8000-000000000008','Jorge Aliaga','jorge.demo@aynai.dev','jorge','Profesor de guitarra','Oruro','available','presencial','{}')
on conflict (id) do nothing;

insert into public.user_skills (user_id, name, kind, level)
values
  ('aaaaaaaa-0000-4000-8000-000000000001','Diseño UI','offer','experto'),
  ('aaaaaaaa-0000-4000-8000-000000000001','Inglés','seek','basico'),
  ('aaaaaaaa-0000-4000-8000-000000000002','React','offer','experto'),
  ('aaaaaaaa-0000-4000-8000-000000000002','Diseño UI','seek','basico'),
  ('aaaaaaaa-0000-4000-8000-000000000003','Marketing','offer','intermedio'),
  ('aaaaaaaa-0000-4000-8000-000000000003','Fotografía','seek','basico'),
  ('aaaaaaaa-0000-4000-8000-000000000004','Fotografía','offer','experto'),
  ('aaaaaaaa-0000-4000-8000-000000000004','Marketing','seek','intermedio'),
  ('aaaaaaaa-0000-4000-8000-000000000005','Redacción','offer','experto'),
  ('aaaaaaaa-0000-4000-8000-000000000006','Contabilidad','offer','experto'),
  ('aaaaaaaa-0000-4000-8000-000000000007','Traducción','offer','experto'),
  ('aaaaaaaa-0000-4000-8000-000000000008','Guitarra','offer','experto')
on conflict (user_id, name, kind) do nothing;

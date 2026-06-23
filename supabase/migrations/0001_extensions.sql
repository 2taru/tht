-- 0001_extensions.sql
create extension if not exists "pgcrypto";    -- gen_random_uuid()
create extension if not exists "btree_gist";  -- EXCLUDE для заборони перетину

-- Two staff members can have the same name. The old (role, name) unique
-- index only existed because login used to be "portal + full name"; logins
-- are usernames now (002_accounts.sql), and usernames stay unique.
DROP INDEX IF EXISTS staff_role_name;

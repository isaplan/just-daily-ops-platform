-- Assign owner role to user-admin@juststock.app
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'owner'::app_role
FROM auth.users
WHERE email = 'user-admin@juststock.app'
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign member role to user-member@juststock.app
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'member'::app_role
FROM auth.users
WHERE email = 'user-member@juststock.app'
ON CONFLICT (user_id, role) DO NOTHING;
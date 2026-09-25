-- ============================================================
-- Migration: Add super_admin role
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Alter the user_role enum to include super_admin
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Update the is_admin() helper to include super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Add is_super_admin() helper
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Drop and recreate profiles RLS policies to cover super_admin properly
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- View: own profile OR admin/super_admin can see all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());

-- Update: own basic info OR admin updating user-role profiles OR super_admin can update anyone
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (
    id = auth.uid()
    OR is_super_admin()
    OR (is_admin() AND (SELECT role FROM profiles p2 WHERE p2.id = profiles.id) = 'user')
  );

-- Insert: only admin or super_admin can insert new profiles
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT WITH CHECK (is_admin());

-- Delete: only super_admin can delete profiles
CREATE POLICY "Super admins can delete profiles"
  ON profiles FOR DELETE USING (is_super_admin());

-- 5. Promote kuldeepsingh343@gmail.com to super_admin
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'kuldeepsingh343@gmail.com';

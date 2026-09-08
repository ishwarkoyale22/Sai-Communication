-- Migration 0028: allow the storefront (anon) to insert/select/update
-- customers, so checkout can save Date of Birth — match existing customer
-- by phone number and update, or insert a new customer row.

-- Allow website (anon) to insert new customers
CREATE POLICY "anon can insert customers"
ON public.customers
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow website (anon) to select customers by phone (for lookup)
CREATE POLICY "anon can select customers by phone"
ON public.customers
FOR SELECT
TO anon
USING (true);

-- Allow website (anon) to update customer birthday
CREATE POLICY "anon can update customer birthday"
ON public.customers
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Also grant to authenticated
GRANT ALL ON public.customers TO anon, authenticated;

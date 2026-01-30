-- Allow compliance officers to update order status (approve/reject)
CREATE POLICY "Compliance officers can update orders"
ON public.orders
FOR UPDATE
USING (is_compliance_officer())
WITH CHECK (is_compliance_officer());
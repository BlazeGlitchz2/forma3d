ALTER TABLE orders ADD payment_status text NOT NULL DEFAULT 'unpaid';
--> statement-breakpoint
ALTER TABLE orders ADD payment_location text NOT NULL DEFAULT 'huwaylat';
--> statement-breakpoint
ALTER TABLE orders ADD paid_amount real NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE orders ADD payment_reference text;
--> statement-breakpoint
ALTER TABLE orders ADD paid_at integer;
--> statement-breakpoint
ALTER TABLE orders ADD paid_by text;
--> statement-breakpoint
INSERT INTO history (order_id,status,message,created) SELECT id,'awaiting_payment','Payment policy updated. Staff must verify full payment before production continues.',updated FROM orders WHERE status IN ('pending','queued','printing','finishing','ready');
--> statement-breakpoint
UPDATE orders SET status = 'awaiting_payment' WHERE status IN ('pending','queued','printing','finishing','ready');

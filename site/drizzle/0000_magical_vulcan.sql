CREATE TABLE `catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` text NOT NULL,
	`status` text NOT NULL,
	`message` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `history_order` ON `history` (`order_id`);--> statement-breakpoint
CREATE TABLE `limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`secret` text NOT NULL,
	`customer` text NOT NULL,
	`phone` text NOT NULL,
	`fulfillment` text NOT NULL,
	`area` text NOT NULL,
	`notes` text NOT NULL,
	`items` text NOT NULL,
	`quote` text NOT NULL,
	`total` real NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `orders_owner` ON `orders` (`owner`);--> statement-breakpoint
CREATE INDEX `orders_created` ON `orders` (`created`);--> statement-breakpoint
CREATE INDEX `orders_status` ON `orders` (`status`);--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`object_key` text NOT NULL,
	`name` text NOT NULL,
	`stats` text NOT NULL,
	`bytes` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `uploads_owner` ON `uploads` (`owner`);
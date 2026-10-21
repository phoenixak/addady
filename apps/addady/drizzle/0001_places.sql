ALTER TABLE `homes` ADD `kind` text DEFAULT 'home' NOT NULL;--> statement-breakpoint
ALTER TABLE `homes` ADD `customer_class` text DEFAULT 'residential' NOT NULL;--> statement-breakpoint
ALTER TABLE `homes` ADD `power_factor` real;
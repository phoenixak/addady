CREATE TABLE `appliances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`home_id` integer NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`params` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`home_id`) REFERENCES `homes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `homes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`meter_type` text NOT NULL,
	`governorate` text NOT NULL,
	`meter_month_start_day` integer DEFAULT 1 NOT NULL,
	`contracted_load_kw` real,
	`low_balance_piasters` integer,
	`other_charges_piasters` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`home_id` integer NOT NULL,
	`at` integer NOT NULL,
	`register_kwh` real,
	`month_kwh` real,
	`balance_piasters` integer,
	`note` text,
	FOREIGN KEY (`home_id`) REFERENCES `homes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `readings_home_at` ON `readings` (`home_id`,`at`);--> statement-breakpoint
CREATE TABLE `recharges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`home_id` integer NOT NULL,
	`at` integer NOT NULL,
	`amount_piasters` integer NOT NULL,
	FOREIGN KEY (`home_id`) REFERENCES `homes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recharges_home_at` ON `recharges` (`home_id`,`at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tariff_cache` (
	`id` integer PRIMARY KEY NOT NULL,
	`json` text NOT NULL,
	`signature` text NOT NULL,
	`fetched_at` integer NOT NULL
);

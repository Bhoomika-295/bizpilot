CREATE TABLE `foresightSignals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'EARLY_SIGNAL',
	`status` varchar(30) NOT NULL DEFAULT 'WATCH',
	`priority` varchar(20) NOT NULL DEFAULT 'MEDIUM',
	`confidence` varchar(30) NOT NULL DEFAULT 'MEDIUM',
	`horizon` varchar(50) NOT NULL DEFAULT '30–90 DAYS',
	`sourceType` varchar(50),
	`sourceId` int,
	`evidenceJson` text NOT NULL,
	`strategyImpact` varchar(20) NOT NULL DEFAULT 'MEDIUM',
	`possibleResponse` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `foresightSignals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `foresightWatchlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`targetType` varchar(50) NOT NULL DEFAULT 'SIGNAL',
	`targetId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`currentValue` varchar(100),
	`previousValue` varchar(100),
	`changeSummary` varchar(100),
	`status` varchar(30) NOT NULL DEFAULT 'WATCHING',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `foresightWatchlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `foresightSignals_businessId_idx` ON `foresightSignals` (`businessId`);--> statement-breakpoint
CREATE INDEX `foresightSignals_status_idx` ON `foresightSignals` (`status`);--> statement-breakpoint
CREATE INDEX `foresightSignals_priority_idx` ON `foresightSignals` (`priority`);--> statement-breakpoint
CREATE INDEX `foresightWatchlist_businessId_idx` ON `foresightWatchlist` (`businessId`);--> statement-breakpoint
CREATE INDEX `foresightWatchlist_target_idx` ON `foresightWatchlist` (`businessId`,`targetType`,`targetId`);
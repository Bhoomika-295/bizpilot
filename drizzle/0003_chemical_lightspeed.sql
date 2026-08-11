CREATE TABLE `marketSignals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`source` varchar(255) NOT NULL,
	`sourceUrl` text NOT NULL,
	`publishedAt` timestamp,
	`discoveredAt` timestamp NOT NULL DEFAULT (now()),
	`relatedEntity` varchar(255) NOT NULL,
	`snippet` text,
	`relevanceStatus` varchar(100) NOT NULL DEFAULT 'relevant',
	`externalId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketSignals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `marketSignals_businessId_idx` ON `marketSignals` (`businessId`);--> statement-breakpoint
CREATE INDEX `marketSignals_publishedAt_idx` ON `marketSignals` (`publishedAt`);
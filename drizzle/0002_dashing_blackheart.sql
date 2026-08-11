CREATE TABLE `competitors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`industry` varchar(100),
	`website` varchar(255),
	`location` varchar(255),
	`notes` text,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`intelligenceStatus` varchar(100) NOT NULL DEFAULT 'Not connected yet',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `competitors_businessId_idx` ON `competitors` (`businessId`);
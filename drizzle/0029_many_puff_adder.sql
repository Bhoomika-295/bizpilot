CREATE TABLE `scenarioAssumptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`scenarioId` int NOT NULL,
	`metric` varchar(100) NOT NULL,
	`baselineValue` varchar(100) NOT NULL,
	`scenarioValue` varchar(100) NOT NULL,
	`percentageChange` varchar(50),
	`unit` varchar(50) NOT NULL DEFAULT 'INR',
	`source` varchar(50) NOT NULL DEFAULT 'USER_ASSUMPTION',
	`confidence` varchar(30) NOT NULL DEFAULT 'MEDIUM',
	`rationale` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scenarioAssumptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scenarioReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`scenarioId` int NOT NULL,
	`metric` varchar(100) NOT NULL,
	`predictedChange` varchar(50) NOT NULL,
	`actualChange` varchar(50) NOT NULL,
	`difference` varchar(50) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'CLOSE',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scenarioReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `scenarioAssumptions_businessId_idx` ON `scenarioAssumptions` (`businessId`);--> statement-breakpoint
CREATE INDEX `scenarioAssumptions_scenarioId_idx` ON `scenarioAssumptions` (`businessId`,`scenarioId`);--> statement-breakpoint
CREATE INDEX `scenarioReviews_businessId_idx` ON `scenarioReviews` (`businessId`);--> statement-breakpoint
CREATE INDEX `scenarioReviews_scenarioId_idx` ON `scenarioReviews` (`businessId`,`scenarioId`);
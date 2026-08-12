CREATE TABLE `monitoringEventHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`eventId` int NOT NULL,
	`eventType` varchar(50) NOT NULL,
	`previousStatus` varchar(20),
	`newStatus` varchar(20),
	`previousSeverity` varchar(20),
	`newSeverity` varchar(20),
	`previousPriority` varchar(20),
	`newPriority` varchar(20),
	`detailsJson` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monitoringEventHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `monitoringEventHistory_businessId_idx` ON `monitoringEventHistory` (`businessId`);--> statement-breakpoint
CREATE INDEX `monitoringEventHistory_eventId_idx` ON `monitoringEventHistory` (`eventId`);--> statement-breakpoint
CREATE INDEX `monitoringEventHistory_timestamp_idx` ON `monitoringEventHistory` (`timestamp`);
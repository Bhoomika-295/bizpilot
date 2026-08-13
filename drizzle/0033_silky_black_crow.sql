CREATE TABLE `businessRelationships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`fromType` varchar(60) NOT NULL,
	`fromId` int,
	`toType` varchar(60) NOT NULL,
	`toId` int,
	`relationshipType` varchar(50) NOT NULL,
	`evidenceStrength` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`confidence` varchar(20) NOT NULL DEFAULT 'UNKNOWN',
	`evidenceSummary` text NOT NULL,
	`sourceType` varchar(60),
	`sourceId` int,
	`observedAt` timestamp,
	`status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessRelationships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `businessRelationships_businessId_idx` ON `businessRelationships` (`businessId`);--> statement-breakpoint
CREATE INDEX `businessRelationships_from_idx` ON `businessRelationships` (`businessId`,`fromType`,`fromId`);--> statement-breakpoint
CREATE INDEX `businessRelationships_to_idx` ON `businessRelationships` (`businessId`,`toType`,`toId`);--> statement-breakpoint
CREATE INDEX `businessRelationships_type_idx` ON `businessRelationships` (`businessId`,`relationshipType`);
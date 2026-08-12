CREATE TABLE `opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`category` varchar(50) NOT NULL DEFAULT 'GROWTH',
	`priority` varchar(20) NOT NULL DEFAULT 'MEDIUM',
	`evidenceStrength` varchar(50) NOT NULL DEFAULT 'MEDIUM EVIDENCE',
	`potentialImpact` varchar(20) NOT NULL DEFAULT 'MEDIUM',
	`urgency` varchar(20) NOT NULL DEFAULT 'MEDIUM',
	`status` enum('NEW','ACTIVE','MONITORING','PURSUED','DISMISSED','EXPIRED') NOT NULL DEFAULT 'NEW',
	`supportingSignalsJson` text,
	`supportingSituationsJson` text,
	`supportingMetricsJson` text,
	`potentialNextStep` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `opportunities_businessId_idx` ON `opportunities` (`businessId`);--> statement-breakpoint
CREATE INDEX `opportunities_status_idx` ON `opportunities` (`status`);--> statement-breakpoint
CREATE INDEX `opportunities_category_idx` ON `opportunities` (`category`);
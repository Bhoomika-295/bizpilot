CREATE TABLE `businessEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`entity` varchar(100),
	`entityId` int,
	`metadata` json,
	`source` varchar(100) DEFAULT 'system',
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `businessEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `businessGoals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`goal` varchar(255) NOT NULL,
	`priority` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessGoals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`industry` varchar(100),
	`businessType` varchar(100),
	`country` varchar(100),
	`location` varchar(255),
	`currency` varchar(3) DEFAULT 'USD',
	`businessSize` varchar(50),
	`numberOfEmployees` int,
	`description` text,
	`isDemo` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `csvImports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`totalRows` int,
	`importedRows` int,
	`skippedRows` int,
	`warnings` json,
	`status` enum('pending','processing','completed','failed') DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `csvImports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`company` varchar(255),
	`location` varchar(255),
	`status` enum('active','inactive','prospect') DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` varchar(255),
	`amount` decimal(12,2) NOT NULL,
	`expenseDate` timestamp NOT NULL,
	`status` enum('completed','pending') DEFAULT 'completed',
	`source` varchar(100) DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `externalDataSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`source` varchar(100) NOT NULL,
	`sourceType` enum('api','webhook','polling','manual','other') DEFAULT 'manual',
	`dataType` varchar(100),
	`status` enum('connected','disconnected','error','pending') DEFAULT 'pending',
	`lastFetched` timestamp,
	`lastUpdated` timestamp,
	`freshness` enum('live','near-real-time','periodic','historical','unknown') DEFAULT 'unknown',
	`reliability` decimal(3,2),
	`provenance` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `externalDataSources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`recommendationId` int,
	`strategyId` int,
	`predictedValue` decimal(12,2),
	`actualValue` decimal(12,2),
	`metric` varchar(255),
	`timeframe` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `outcomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('product','service') DEFAULT 'product',
	`price` decimal(12,2),
	`cost` decimal(12,2),
	`status` enum('active','inactive') DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100),
	`evidence` text,
	`confidence` decimal(3,2),
	`assumptions` text,
	`expectedImpact` text,
	`risk` text,
	`status` enum('pending','accepted','rejected','completed') DEFAULT 'pending',
	`actionTaken` text,
	`outcome` text,
	`outcomeValue` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`objective` varchar(255) NOT NULL,
	`targetMetric` varchar(255),
	`baseline` decimal(12,2),
	`proposedActions` text,
	`expectedOutcome` text,
	`timeframe` varchar(100),
	`assumptions` text,
	`risks` text,
	`confidence` decimal(3,2),
	`status` enum('planning','active','completed','abandoned') DEFAULT 'planning',
	`actualOutcome` text,
	`actualValue` decimal(12,2),
	`success` boolean,
	`lessonsLearned` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strategies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`customerId` int,
	`productId` int,
	`type` enum('sale','refund','payment','other') DEFAULT 'sale',
	`amount` decimal(12,2) NOT NULL,
	`description` varchar(255),
	`transactionDate` timestamp NOT NULL,
	`status` enum('completed','pending','failed') DEFAULT 'completed',
	`source` varchar(100) DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `businessId_idx` ON `businessEvents` (`businessId`);--> statement-breakpoint
CREATE INDEX `eventType_idx` ON `businessEvents` (`eventType`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `businessEvents` (`timestamp`);--> statement-breakpoint
CREATE INDEX `businessId_idx` ON `businessGoals` (`businessId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `businesses` (`userId`);--> statement-breakpoint
CREATE INDEX `businessId_idx` ON `csvImports` (`businessId`);--> statement-breakpoint
CREATE INDEX `businessId_idx` ON `customers` (`businessId`);--> statement-breakpoint
CREATE INDEX `businessId_idx` ON `expenses` (`businessId`);--> statement-breakpoint
CREATE INDEX `expenseDate_idx` ON `expenses` (`expenseDate`);--> statement-breakpoint
CREATE INDEX `businessId_idx` ON `externalDataSources` (`businessId`);--> statement-breakpoint
CREATE INDEX `source_idx` ON `externalDataSources` (`source`);--> statement-breakpoint
CREATE INDEX `businessId_idx` ON `outcomes` (`businessId`);--> statement-breakpoint
CREATE INDEX `businessId_idx` ON `products` (`businessId`);--> statement-breakpoint
CREATE INDEX `businessId_idx` ON `recommendations` (`businessId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `recommendations` (`status`);--> statement-breakpoint
CREATE INDEX `businessId_idx` ON `strategies` (`businessId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `strategies` (`status`);--> statement-breakpoint
CREATE INDEX `businessId_idx` ON `transactions` (`businessId`);--> statement-breakpoint
CREATE INDEX `transactionDate_idx` ON `transactions` (`transactionDate`);--> statement-breakpoint
CREATE INDEX `openId_idx` ON `users` (`openId`);
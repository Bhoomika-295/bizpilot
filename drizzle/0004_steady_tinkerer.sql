ALTER TABLE `marketSignals` ADD `relevanceLevel` varchar(50) DEFAULT 'LOW' NOT NULL;--> statement-breakpoint
ALTER TABLE `marketSignals` ADD `impactArea` varchar(100) DEFAULT 'General Market' NOT NULL;--> statement-breakpoint
ALTER TABLE `marketSignals` ADD `importanceScore` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `marketSignals` ADD `explanation` text;
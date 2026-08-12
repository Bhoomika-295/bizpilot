ALTER TABLE `outcomes` ADD `actionPlanId` int;--> statement-breakpoint
CREATE INDEX `outcomes_actionPlan_idx` ON `outcomes` (`businessId`,`actionPlanId`);

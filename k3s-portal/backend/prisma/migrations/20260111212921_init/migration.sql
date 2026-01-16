-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'operator', 'viewer');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('cpu_usage', 'memory_usage', 'pod_restart', 'pod_crash', 'deployment_failed', 'node_not_ready', 'pvc_capacity', 'custom');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "googleId" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "avatarUrl" VARCHAR(500),
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "resourceName" VARCHAR(255) NOT NULL,
    "namespace" VARCHAR(100) NOT NULL,
    "details" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "status" VARCHAR(20) NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_history" (
    "id" SERIAL NOT NULL,
    "deploymentName" VARCHAR(255) NOT NULL,
    "namespace" VARCHAR(100) NOT NULL,
    "revision" INTEGER NOT NULL,
    "image" VARCHAR(500) NOT NULL,
    "replicas" INTEGER NOT NULL,
    "configSnapshot" JSONB NOT NULL,
    "triggeredById" INTEGER,
    "status" VARCHAR(50) NOT NULL,
    "rollbackOf" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_configurations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "namespace" VARCHAR(100),
    "alertType" "AlertType" NOT NULL,
    "threshold" DECIMAL(10,2) NOT NULL,
    "comparison" VARCHAR(10) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifySlack" BOOLEAN NOT NULL DEFAULT false,
    "slackWebhook" VARCHAR(500),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "alert_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "configurationId" INTEGER NOT NULL,
    "namespace" VARCHAR(100) NOT NULL,
    "resourceName" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMPTZ(6),
    "resolvedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_log_filters" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "namespace" VARCHAR(100),
    "podName" VARCHAR(255),
    "container" VARCHAR(255),
    "searchQuery" TEXT,
    "logLevel" VARCHAR(20),
    "timeRange" VARCHAR(50),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "saved_log_filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uptime_records" (
    "id" SERIAL NOT NULL,
    "namespace" VARCHAR(100) NOT NULL,
    "serviceName" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "responseMs" INTEGER,
    "checkType" VARCHAR(50) NOT NULL,
    "message" TEXT,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uptime_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" SERIAL NOT NULL,
    "namespace" VARCHAR(100) NOT NULL,
    "podName" VARCHAR(255) NOT NULL,
    "container" VARCHAR(255),
    "cpuUsage" DECIMAL(10,4) NOT NULL,
    "cpuLimit" DECIMAL(10,4) NOT NULL,
    "memoryUsage" BIGINT NOT NULL,
    "memoryLimit" BIGINT NOT NULL,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_googleId_idx" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_namespace_idx" ON "audit_logs"("namespace");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "deployment_history_deploymentName_namespace_idx" ON "deployment_history"("deploymentName", "namespace");

-- CreateIndex
CREATE INDEX "deployment_history_createdAt_idx" ON "deployment_history"("createdAt");

-- CreateIndex
CREATE INDEX "alerts_configurationId_idx" ON "alerts"("configurationId");

-- CreateIndex
CREATE INDEX "alerts_namespace_idx" ON "alerts"("namespace");

-- CreateIndex
CREATE INDEX "alerts_createdAt_idx" ON "alerts"("createdAt");

-- CreateIndex
CREATE INDEX "alerts_acknowledged_idx" ON "alerts"("acknowledged");

-- CreateIndex
CREATE INDEX "saved_log_filters_userId_idx" ON "saved_log_filters"("userId");

-- CreateIndex
CREATE INDEX "uptime_records_namespace_serviceName_idx" ON "uptime_records"("namespace", "serviceName");

-- CreateIndex
CREATE INDEX "uptime_records_recordedAt_idx" ON "uptime_records"("recordedAt");

-- CreateIndex
CREATE INDEX "metric_snapshots_namespace_podName_idx" ON "metric_snapshots"("namespace", "podName");

-- CreateIndex
CREATE INDEX "metric_snapshots_recordedAt_idx" ON "metric_snapshots"("recordedAt");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment_history" ADD CONSTRAINT "deployment_history_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_configurations" ADD CONSTRAINT "alert_configurations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "alert_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_log_filters" ADD CONSTRAINT "saved_log_filters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

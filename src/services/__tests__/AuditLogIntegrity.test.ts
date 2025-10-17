/**
 * Tests d'intégrité des logs d'audit pour le système d'import JSON
 * Valide la traçabilité complète et la sécurité des logs d'audit
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSONImportAuditService } from '../JSONImportAuditService';
import { AuditLogService } from '../AuditLogService';

// TODO: Ces tests nécessitent une vraie DB ou des mocks très sophistiqués
// À convertir en tests d'intégration ou refactorer avec des mocks appropriés
describe.skip('Audit Log Integrity Tests', () => {
  let auditService: JSONImportAuditService;
  let mockPayload: any;
  let mockAuditLogService: any;

  beforeEach(() => {
    // Mock Payload instance
    mockPayload = {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
      },
      find: vi.fn(),
      findByID: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    };

    // Mock AuditLogService
    mockAuditLogService = {
      logAction: vi.fn(),
      logError: vi.fn(),
      logSecurityEvent: vi.fn(),
      getAuditTrail: vi.fn(),
      validateLogIntegrity: vi.fn()
    };

    auditService = new JSONImportAuditService(mockPayload);
    // Inject mock audit service
    (auditService as any).auditLogService = mockAuditLogService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Audit Log Creation', () => {
    it('should create complete audit log for import start', async () => {
      const userId = 'admin-123';
      const fileName = 'test-questions.json';
      const importType = 'questions';
      const metadata = {
        fileSize: 1024,
        estimatedItems: 10,
        options: { dryRun: false }
      };

      await auditService.logImportStarted(userId, fileName, importType, metadata);

      expect(mockAuditLogService.logAction).toHaveBeenCalledWith({
        action: 'json_import_started',
        userId,
        resourceType: 'import_job',
        resourceId: expect.any(String),
        details: {
          fileName,
          importType,
          metadata,
          timestamp: expect.any(Date),
          userAgent: expect.any(String),
          ipAddress: expect.any(String)
        },
        severity: 'info'
      });
    });

    it('should create audit log with security context', async () => {
      const userId = 'admin-123';
      const securityContext = {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
        sessionId: 'session-abc-123',
        requestId: 'req-xyz-789'
      };

      await auditService.logImportStarted(userId, 'test.json', 'questions', {}, securityContext);

      expect(mockAuditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            securityContext
          })
        })
      );
    });

    it('should log validation failures with detailed context', async () => {
      const userId = 'admin-123';
      const fileName = 'invalid.json';
      const validationErrors = [
        { type: 'schema', message: 'Missing required field: questionText', line: 5 },
        { type: 'security', message: 'XSS attempt detected', line: 12 }
      ];

      await auditService.logValidationFailed(userId, fileName, validationErrors);

      expect(mockAuditLogService.logError).toHaveBeenCalledWith({
        action: 'json_import_validation_failed',
        userId,
        resourceType: 'import_validation',
        error: 'Validation failed',
        details: {
          fileName,
          validationErrors,
          errorCount: 2,
          securityIssues: 1,
          timestamp: expect.any(Date)
        },
        severity: 'warning'
      });
    });

    it('should log security events separately', async () => {
      const userId = 'admin-123';
      const securityEvent = {
        type: 'xss_attempt',
        description: 'Script tag detected in question text',
        severity: 'high',
        blocked: true,
        details: {
          fileName: 'malicious.json',
          line: 15,
          content: '<script>alert("xss")</script>'
        }
      };

      await auditService.logSecurityEvent(userId, securityEvent);

      expect(mockAuditLogService.logSecurityEvent).toHaveBeenCalledWith({
        userId,
        eventType: securityEvent.type,
        description: securityEvent.description,
        severity: securityEvent.severity,
        blocked: securityEvent.blocked,
        details: securityEvent.details,
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Audit Trail Integrity', () => {
    it('should maintain chronological order of events', async () => {
      const userId = 'admin-123';
      const jobId = 'job-123';

      // Simulate sequence of events
      await auditService.logImportStarted(userId, 'test.json', 'questions', {});
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await auditService.logValidationCompleted(userId, 'test.json', { isValid: true });
      await new Promise(resolve => setTimeout(resolve, 10));
      await auditService.logImportCompleted(userId, jobId, { successful: 10, failed: 0 });

      // Mock the audit trail retrieval
      const mockAuditTrail = [
        { action: 'json_import_started', timestamp: new Date('2025-01-01T10:00:00Z') },
        { action: 'json_import_validation_completed', timestamp: new Date('2025-01-01T10:00:01Z') },
        { action: 'json_import_completed', timestamp: new Date('2025-01-01T10:00:02Z') }
      ];

      mockAuditLogService.getAuditTrail.mockResolvedValue(mockAuditTrail);

      const auditTrail = await auditService.getJobAuditHistory(jobId);

      // Verify chronological order
      for (let i = 1; i < auditTrail.length; i++) {
        expect(auditTrail[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          auditTrail[i - 1].timestamp.getTime()
        );
      }
    });

    it('should detect and report audit log tampering', async () => {
      const jobId = 'job-123';
      
      // Mock tampered audit trail (missing events, wrong order, etc.)
      const tamperedAuditTrail = [
        { 
          id: 'audit-1',
          action: 'json_import_started', 
          timestamp: new Date('2025-01-01T10:00:00Z'),
          checksum: 'invalid-checksum'
        },
        { 
          id: 'audit-3', // Missing audit-2
          action: 'json_import_completed', 
          timestamp: new Date('2025-01-01T09:59:00Z'), // Wrong chronological order
          checksum: 'another-invalid-checksum'
        }
      ];

      mockAuditLogService.getAuditTrail.mockResolvedValue(tamperedAuditTrail);
      mockAuditLogService.validateLogIntegrity.mockResolvedValue({
        isValid: false,
        issues: [
          'Missing audit log entries detected',
          'Chronological order violation',
          'Checksum validation failed'
        ]
      });

      const integrityCheck = await auditService.validateAuditIntegrity(jobId);

      expect(integrityCheck.isValid).toBe(false);
      expect(integrityCheck.issues).toContain('Missing audit log entries detected');
      expect(integrityCheck.issues).toContain('Chronological order violation');
      expect(integrityCheck.issues).toContain('Checksum validation failed');
    });

    it('should generate cryptographic checksums for audit entries', async () => {
      const userId = 'admin-123';
      const auditData = {
        action: 'json_import_started',
        userId,
        timestamp: new Date(),
        details: { fileName: 'test.json' }
      };

      await auditService.logImportStarted(userId, 'test.json', 'questions', {});

      expect(mockAuditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          checksum: expect.stringMatching(/^[a-f0-9]{64}$/), // SHA-256 hash
          previousChecksum: expect.any(String)
        })
      );
    });
  });

  describe('Audit Data Protection', () => {
    it('should redact sensitive information in audit logs', async () => {
      const userId = 'admin-123';
      const sensitiveData = {
        fileName: 'medical-data.json',
        content: {
          questions: [{
            questionText: 'Patient John Doe has condition X',
            patientId: '12345',
            socialSecurityNumber: '123-45-6789'
          }]
        }
      };

      await auditService.logImportStarted(userId, sensitiveData.fileName, 'questions', sensitiveData);

      expect(mockAuditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            metadata: expect.objectContaining({
              content: expect.not.objectContaining({
                patientId: '12345',
                socialSecurityNumber: '123-45-6789'
              })
            })
          })
        })
      );
    });

    it('should encrypt audit logs containing sensitive operations', async () => {
      const userId = 'admin-123';
      const rollbackData = {
        jobId: 'job-123',
        reason: 'Data breach - immediate rollback required',
        affectedRecords: 1000,
        sensitiveCategories: ['patient-data', 'medical-records']
      };

      await auditService.logRollbackExecuted(userId, rollbackData);

      expect(mockAuditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          encrypted: true,
          details: expect.any(String) // Encrypted details
        })
      );
    });

    it('should maintain audit log retention policies', async () => {
      const retentionPeriod = 7 * 365 * 24 * 60 * 60 * 1000; // 7 years in milliseconds
      const oldDate = new Date(Date.now() - retentionPeriod - 1000);

      mockPayload.find.mockResolvedValue({
        docs: [
          { id: 'old-audit-1', createdAt: oldDate },
          { id: 'old-audit-2', createdAt: oldDate }
        ]
      });

      const cleanupResult = await auditService.cleanupExpiredAuditLogs();

      expect(cleanupResult.deletedCount).toBe(0); // Should not delete, only archive
      expect(cleanupResult.archivedCount).toBe(2);
      expect(mockPayload.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('Audit Reporting and Analysis', () => {
    it('should generate comprehensive activity reports', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockAuditData = [
        { action: 'json_import_started', userId: 'admin-1', timestamp: new Date('2025-01-15') },
        { action: 'json_import_completed', userId: 'admin-1', timestamp: new Date('2025-01-15') },
        { action: 'json_import_started', userId: 'admin-2', timestamp: new Date('2025-01-20') },
        { action: 'json_import_failed', userId: 'admin-2', timestamp: new Date('2025-01-20') },
        { action: 'security_event', userId: 'admin-3', timestamp: new Date('2025-01-25') }
      ];

      mockPayload.find.mockResolvedValue({ docs: mockAuditData });

      const report = await auditService.generateActivityReport(startDate, endDate);

      expect(report).toEqual({
        period: { startDate, endDate },
        totalEvents: 5,
        eventsByType: {
          'json_import_started': 2,
          'json_import_completed': 1,
          'json_import_failed': 1,
          'security_event': 1
        },
        userActivity: {
          'admin-1': { events: 2, successRate: 100 },
          'admin-2': { events: 2, successRate: 50 },
          'admin-3': { events: 1, successRate: 0 }
        },
        securityEvents: 1,
        anomalies: expect.any(Array),
        recommendations: expect.any(Array)
      });
    });

    it('should detect suspicious activity patterns', async () => {
      const suspiciousAuditData = [
        // Rapid successive failed attempts
        { action: 'json_import_failed', userId: 'user-1', timestamp: new Date('2025-01-01T10:00:00Z') },
        { action: 'json_import_failed', userId: 'user-1', timestamp: new Date('2025-01-01T10:00:30Z') },
        { action: 'json_import_failed', userId: 'user-1', timestamp: new Date('2025-01-01T10:01:00Z') },
        { action: 'json_import_failed', userId: 'user-1', timestamp: new Date('2025-01-01T10:01:30Z') },
        { action: 'json_import_failed', userId: 'user-1', timestamp: new Date('2025-01-01T10:02:00Z') },
        // Unusual time access
        { action: 'json_import_started', userId: 'user-2', timestamp: new Date('2025-01-01T03:00:00Z') },
        // Large volume import
        { action: 'json_import_started', userId: 'user-3', timestamp: new Date('2025-01-01T14:00:00Z'), details: { estimatedItems: 5000 } }
      ];

      mockPayload.find.mockResolvedValue({ docs: suspiciousAuditData });

      const anomalies = await auditService.detectAnomalies(new Date('2025-01-01'), new Date('2025-01-02'));

      expect(anomalies).toContainEqual(
        expect.objectContaining({
          type: 'rapid_failures',
          userId: 'user-1',
          severity: 'high',
          description: expect.stringContaining('Multiple failed attempts in short time')
        })
      );

      expect(anomalies).toContainEqual(
        expect.objectContaining({
          type: 'unusual_time_access',
          userId: 'user-2',
          severity: 'medium',
          description: expect.stringContaining('Access during unusual hours')
        })
      );

      expect(anomalies).toContainEqual(
        expect.objectContaining({
          type: 'large_volume_import',
          userId: 'user-3',
          severity: 'medium',
          description: expect.stringContaining('Unusually large import volume')
        })
      );
    });

    it('should provide audit trail export functionality', async () => {
      const jobId = 'job-123';
      const auditTrail = [
        { id: 'audit-1', action: 'json_import_started', timestamp: new Date() },
        { id: 'audit-2', action: 'json_import_completed', timestamp: new Date() }
      ];

      mockAuditLogService.getAuditTrail.mockResolvedValue(auditTrail);

      const exportData = await auditService.exportAuditTrail(jobId, 'json');

      expect(exportData).toEqual({
        format: 'json',
        data: JSON.stringify(auditTrail, null, 2),
        filename: `audit-trail-${jobId}-${expect.any(String)}.json`,
        contentType: 'application/json'
      });
    });

    it('should support CSV export for audit data', async () => {
      const jobId = 'job-123';
      const auditTrail = [
        { id: 'audit-1', action: 'json_import_started', userId: 'admin-1', timestamp: new Date('2025-01-01T10:00:00Z') },
        { id: 'audit-2', action: 'json_import_completed', userId: 'admin-1', timestamp: new Date('2025-01-01T10:05:00Z') }
      ];

      mockAuditLogService.getAuditTrail.mockResolvedValue(auditTrail);

      const exportData = await auditService.exportAuditTrail(jobId, 'csv');

      expect(exportData.format).toBe('csv');
      expect(exportData.data).toContain('id,action,userId,timestamp');
      expect(exportData.data).toContain('audit-1,json_import_started,admin-1,2025-01-01T10:00:00.000Z');
      expect(exportData.contentType).toBe('text/csv');
    });
  });

  describe('Compliance and Legal Requirements', () => {
    it('should maintain immutable audit records', async () => {
      const auditId = 'audit-123';
      
      // Attempt to modify existing audit record
      const modificationAttempt = auditService.modifyAuditRecord(auditId, {
        action: 'modified_action'
      });

      await expect(modificationAttempt).rejects.toThrow('Audit records are immutable');
    });

    it('should support legal hold functionality', async () => {
      const jobId = 'job-123';
      const legalHoldReason = 'Investigation case #2025-001';

      await auditService.applyLegalHold(jobId, legalHoldReason);

      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: 'audit-logs',
        where: { jobId },
        data: {
          legalHold: true,
          legalHoldReason,
          legalHoldAppliedAt: expect.any(Date),
          retentionOverride: true
        }
      });
    });

    it('should generate compliance reports', async () => {
      const complianceReport = await auditService.generateComplianceReport('GDPR', {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31')
      });

      expect(complianceReport).toEqual({
        standard: 'GDPR',
        period: expect.any(Object),
        dataProcessingActivities: expect.any(Array),
        dataSubjectRequests: expect.any(Array),
        securityIncidents: expect.any(Array),
        retentionCompliance: expect.any(Object),
        accessControls: expect.any(Object),
        recommendations: expect.any(Array)
      });
    });

    it('should handle data subject access requests', async () => {
      const userId = 'user-123';
      const requestType = 'data_export';

      const userAuditData = await auditService.handleDataSubjectRequest(userId, requestType);

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'audit-logs',
        where: { userId },
        sort: '-createdAt'
      });

      expect(userAuditData).toEqual({
        userId,
        requestType,
        data: expect.any(Array),
        generatedAt: expect.any(Date),
        retentionPeriod: expect.any(String),
        dataCategories: expect.any(Array)
      });
    });
  });
});
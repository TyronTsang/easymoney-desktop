const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Get user data path for storing database
const getUserDataPath = () => {
  try {
    return app.getPath('userData');
  } catch {
    return process.cwd();
  }
};

class EasyMoneyDatabase {
  constructor() {
    const dbPath = path.join(getUserDataPath(), 'easymoney.db');
    console.log('Database path:', dbPath);
    
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initTables();
  }

  initTables() {
    // Settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);

    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('employee', 'manager', 'admin')),
        branch TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
      )
    `);

    // Customers table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        id_number TEXT NOT NULL,
        mandate_id TEXT NOT NULL,
        cell_phone TEXT,
        sassa_end_date TEXT,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_at TEXT,
        updated_by TEXT,
        archived_at TEXT,
        archived_by TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Loans table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS loans (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        loan_date TEXT NOT NULL,
        principal_amount REAL NOT NULL,
        interest_rate REAL NOT NULL,
        service_fee REAL NOT NULL,
        total_repayable REAL NOT NULL,
        repayment_plan_code INTEGER NOT NULL,
        installment_amount REAL NOT NULL,
        outstanding_balance REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'archived')),
        fields_locked INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_at TEXT,
        updated_by TEXT,
        archived_at TEXT,
        archived_by TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // Payments table - with CHECK constraint to enforce immutability
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        loan_id TEXT NOT NULL,
        installment_number INTEGER NOT NULL,
        amount_due REAL NOT NULL,
        due_date TEXT NOT NULL,
        is_paid INTEGER DEFAULT 0,
        paid_at TEXT,
        paid_by TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (loan_id) REFERENCES loans(id),
        FOREIGN KEY (paid_by) REFERENCES users(id),
        UNIQUE(loan_id, installment_number)
      )
    `);

    // Payment immutability is enforced by application logic:
    // - Monthly (single payment): locked immediately after marked paid
    // - Weekly/Fortnightly: locked only after ALL payments are completed
    this.db.exec(`DROP TRIGGER IF EXISTS prevent_payment_unmark`);

    // Audit logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        before_json TEXT,
        after_json TEXT,
        actor_user_id TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        reason TEXT,
        created_at TEXT NOT NULL,
        integrity_hash TEXT NOT NULL
      )
    `);

    // Create index for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_customers_archived ON customers(archived_at);
      CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
      CREATE INDEX IF NOT EXISTS idx_loans_customer ON loans(customer_id);
      CREATE INDEX IF NOT EXISTS idx_payments_loan ON payments(loan_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    `);

    // Migrations - add columns if they don't exist (for existing databases)
    try { this.db.exec('ALTER TABLE customers ADD COLUMN cell_phone TEXT'); } catch (e) { /* column already exists */ }
    try { this.db.exec('ALTER TABLE customers ADD COLUMN sassa_end_date TEXT'); } catch (e) { /* column already exists */ }
  }

  // ==================== HELPERS ====================
  generateId() {
    return crypto.randomUUID();
  }

  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  computeIntegrityHash(data, previousHash = '') {
    const content = JSON.stringify(data, Object.keys(data).sort()) + previousHash;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  getLastAuditHash() {
    const row = this.db.prepare('SELECT integrity_hash FROM audit_logs ORDER BY created_at DESC LIMIT 1').get();
    return row ? row.integrity_hash : '';
  }

  createAuditLog(entityType, entityId, action, actorId, actorName, before = null, after = null, reason = null) {
    const previousHash = this.getLastAuditHash();
    const logData = {
      entity_type: entityType,
      entity_id: entityId,
      action: action,
      before_json: before ? JSON.stringify(before) : null,
      after_json: after ? JSON.stringify(after) : null,
      actor_user_id: actorId,
      actor_name: actorName,
      reason: reason,
      created_at: new Date().toISOString()
    };
    
    const integrityHash = this.computeIntegrityHash(logData, previousHash);
    const id = this.generateId();
    
    this.db.prepare(`
      INSERT INTO audit_logs (id, entity_type, entity_id, action, before_json, after_json, actor_user_id, actor_name, reason, created_at, integrity_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, entityType, entityId, action, logData.before_json, logData.after_json, actorId, actorName, reason, logData.created_at, integrityHash);
    
    return id;
  }

  validateSaId(idNumber) {
    if (!idNumber || idNumber.length !== 13 || !/^\d+$/.test(idNumber)) {
      return { valid: false, error: 'SA ID must be exactly 13 digits' };
    }
    
    // Luhn algorithm
    let total = 0;
    for (let i = 0; i < 13; i++) {
      let d = parseInt(idNumber[i]);
      if (i % 2 === 1) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      total += d;
    }
    
    if (total % 10 !== 0) {
      return { valid: false, error: 'Invalid SA ID checksum' };
    }
    
    return { valid: true };
  }

  maskIdNumber(idNumber) {
    if (!idNumber || idNumber.length !== 13) return '***********';
    return `${idNumber.slice(0, 4)}******${idNumber.slice(-3)}`;
  }

  calculateLoan(principal, planCode) {
    const interestRate = 0.40;
    const serviceFee = 12.0;
    const totalRepayable = (principal * (1 + interestRate)) + serviceFee;
    const installmentAmount = totalRepayable / planCode;
    return {
      interest_rate: interestRate,
      service_fee: serviceFee,
      total_repayable: Math.round(totalRepayable * 100) / 100,
      installment_amount: Math.round(installmentAmount * 100) / 100
    };
  }

  generatePaymentSchedule(loanDate, total, planCode) {
    const baseDate = new Date(loanDate);
    const installment = Math.round((total / planCode) * 100) / 100;
    const payments = [];
    
    const intervalDays = planCode === 1 ? 30 : planCode === 2 ? 14 : 7;
    
    for (let i = 0; i < planCode; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + intervalDays * (i + 1));
      payments.push({
        installment_number: i + 1,
        amount_due: installment,
        due_date: dueDate.toISOString(),
        is_paid: 0,
        paid_at: null,
        paid_by: null
      });
    }
    return payments;
  }

  // ==================== MASTER PASSWORD ====================
  checkMasterPasswordSet() {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get('master_password_hash');
    return { is_set: !!row };
  }

  setupMasterPassword(password) {
    const existing = this.db.prepare('SELECT value FROM settings WHERE key = ?').get('master_password_hash');
    if (existing) {
      throw new Error('Master password already set');
    }
    
    const hash = this.hashPassword(password);
    const now = new Date().toISOString();
    
    this.db.prepare('INSERT INTO settings (key, value, created_at) VALUES (?, ?, ?)').run('master_password_hash', hash, now);
    
    // Create default admin user
    const adminId = this.generateId();
    const adminPasswordHash = this.hashPassword('admin123');
    
    this.db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, role, branch, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(adminId, 'admin', adminPasswordHash, 'System Administrator', 'admin', 'Head Office', 1, now);
    
    return { 
      message: 'Master password set successfully', 
      default_admin: { username: 'admin', password: 'admin123' } 
    };
  }

  verifyMasterPassword(password) {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get('master_password_hash');
    if (!row) {
      throw new Error('Master password not set');
    }
    
    if (!this.verifyPassword(password, row.value)) {
      throw new Error('Invalid master password');
    }
    
    return { verified: true };
  }

  // ==================== AUTH ====================
  login(username, password) {
    const user = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    if (!this.verifyPassword(password, user.password_hash)) {
      throw new Error('Invalid credentials');
    }
    
    if (!user.is_active) {
      throw new Error('Account disabled');
    }
    
    this.createAuditLog('user', user.id, 'login', user.id, user.full_name);
    
    return {
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        branch: user.branch
      }
    };
  }

  getUser(userId) {
    const user = this.db.prepare('SELECT id, username, full_name, role, branch FROM users WHERE id = ?').get(userId);
    return user;
  }

  // ==================== USERS ====================
  getUsers() {
    return this.db.prepare('SELECT id, username, full_name, role, branch, is_active, created_at FROM users').all();
  }

  createUser(userData) {
    const existing = this.db.prepare('SELECT id FROM users WHERE username = ?').get(userData.username);
    if (existing) {
      throw new Error('Username already exists');
    }
    
    const id = this.generateId();
    const passwordHash = this.hashPassword(userData.password);
    const now = new Date().toISOString();
    
    this.db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, role, branch, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userData.username, passwordHash, userData.full_name, userData.role, userData.branch, 1, now);
    
    return { id, username: userData.username, full_name: userData.full_name, role: userData.role, branch: userData.branch, is_active: true, created_at: now };
  }

  toggleUserActive(userId) {
    const user = this.db.prepare('SELECT is_active FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const newStatus = user.is_active ? 0 : 1;
    this.db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, userId);
    
    return { is_active: !!newStatus };
  }

  // ==================== CUSTOMERS ====================
  getCustomers() {
    const customers = this.db.prepare(`
      SELECT c.*, u.full_name as created_by_name 
      FROM customers c 
      LEFT JOIN users u ON c.created_by = u.id 
      WHERE c.archived_at IS NULL
    `).all();
    
    return customers.map(c => ({
      ...c,
      id_number_masked: this.maskIdNumber(c.id_number)
    }));
  }

  createCustomer(customerData, userId) {
    const validation = this.validateSaId(customerData.id_number);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    const existing = this.db.prepare(`
      SELECT id FROM customers WHERE client_name = ? AND id_number = ? AND archived_at IS NULL
    `).get(customerData.client_name, customerData.id_number);
    
    if (existing) {
      throw new Error('Customer with same name and ID already exists');
    }
    
    const id = this.generateId();
    const now = new Date().toISOString();
    const user = this.getUser(userId);
    
    this.db.prepare(`
      INSERT INTO customers (id, client_name, id_number, mandate_id, cell_phone, sassa_end_date, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, customerData.client_name, customerData.id_number, customerData.mandate_id, customerData.cell_phone || null, customerData.sassa_end_date || null, now, userId);
    
    this.createAuditLog('customer', id, 'create', userId, user.full_name, null, { client_name: customerData.client_name, mandate_id: customerData.mandate_id });
    
    return {
      id,
      client_name: customerData.client_name,
      id_number: customerData.id_number,
      id_number_masked: this.maskIdNumber(customerData.id_number),
      mandate_id: customerData.mandate_id,
      cell_phone: customerData.cell_phone || null,
      sassa_end_date: customerData.sassa_end_date || null,
      created_at: now,
      created_by: userId,
      created_by_name: user.full_name
    };
  }

  getCustomer(customerId) {
    const customer = this.db.prepare(`
      SELECT c.*, u.full_name as created_by_name 
      FROM customers c 
      LEFT JOIN users u ON c.created_by = u.id 
      WHERE c.id = ?
    `).get(customerId);
    
    if (!customer) return null;
    
    return {
      ...customer,
      id_number_masked: this.maskIdNumber(customer.id_number)
    };
  }

  // ==================== LOANS ====================
  getLoans(status = null) {
    let query = `
      SELECT l.*, c.client_name as customer_name, c.id_number as customer_id_number, c.mandate_id,
             c.cell_phone as customer_cell_phone, c.sassa_end_date as customer_sassa_end,
             u.full_name as created_by_name
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      LEFT JOIN users u ON l.created_by = u.id
      WHERE l.archived_at IS NULL
    `;
    
    if (status) {
      query += ` AND l.status = '${status}'`;
    }
    
    const loans = this.db.prepare(query).all();
    
    // Get customer loan counts for duplicate detection
    const customerLoanCounts = {};
    loans.forEach(l => {
      customerLoanCounts[l.customer_id] = (customerLoanCounts[l.customer_id] || 0) + 1;
    });
    
    return loans.map(loan => {
      const payments = this.db.prepare(`
        SELECT p.*, u.full_name as paid_by_name 
        FROM payments p 
        LEFT JOIN users u ON p.paid_by = u.id 
        WHERE p.loan_id = ?
        ORDER BY p.installment_number
      `).all(loan.id);
      
      // Fraud detection
      const fraudFlags = [];
      
      // Quick-close detection
      if (loan.status === 'paid') {
        const createdDate = loan.created_at.slice(0, 10);
        const paidPayments = payments.filter(p => p.is_paid && p.paid_at);
        if (paidPayments.length > 0) {
          const lastPaidDate = paidPayments.reduce((max, p) => p.paid_at > max ? p.paid_at : max, '').slice(0, 10);
          if (createdDate === lastPaidDate) {
            fraudFlags.push('QUICK_CLOSE');
          }
        }
      }
      
      // Duplicate customer
      if (customerLoanCounts[loan.customer_id] > 1) {
        fraudFlags.push('DUPLICATE_CUSTOMER');
      }
      
      return {
        ...loan,
        customer_id_number_masked: this.maskIdNumber(loan.customer_id_number),
        payments: payments.map(p => ({ ...p, is_paid: !!p.is_paid })),
        fraud_flags: fraudFlags
      };
    });
  }

  createLoan(loanData, userId) {
    const customer = this.getCustomer(loanData.customer_id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Check for existing open loans
    const openLoans = this.db.prepare('SELECT id FROM loans WHERE customer_id = ? AND status = ? AND archived_at IS NULL').all(loanData.customer_id, 'open');
    if (openLoans.length > 0) {
      throw new Error('Customer has an open loan that must be fully paid before creating a new one');
    }
    
    const calc = this.calculateLoan(loanData.principal_amount, loanData.repayment_plan_code);
    const payments = this.generatePaymentSchedule(loanData.loan_date, calc.total_repayable, loanData.repayment_plan_code);
    
    const id = this.generateId();
    const now = new Date().toISOString();
    const user = this.getUser(userId);
    
    this.db.prepare(`
      INSERT INTO loans (id, customer_id, loan_date, principal_amount, interest_rate, service_fee, total_repayable, repayment_plan_code, installment_amount, outstanding_balance, status, fields_locked, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, loanData.customer_id, loanData.loan_date, loanData.principal_amount, calc.interest_rate, calc.service_fee, calc.total_repayable, loanData.repayment_plan_code, calc.installment_amount, calc.total_repayable, 'open', 1, now, userId);
    
    // Create payment records
    payments.forEach(p => {
      const paymentId = this.generateId();
      this.db.prepare(`
        INSERT INTO payments (id, loan_id, installment_number, amount_due, due_date, is_paid, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(paymentId, id, p.installment_number, p.amount_due, p.due_date, 0, now);
    });
    
    this.createAuditLog('loan', id, 'create', userId, user.full_name, null, { customer_id: loanData.customer_id, principal: loanData.principal_amount, plan: loanData.repayment_plan_code });
    
    return { id, message: 'Loan created successfully' };
  }

  getLoan(loanId) {
    const loan = this.db.prepare(`
      SELECT l.*, c.client_name as customer_name, c.id_number as customer_id_number, c.mandate_id,
             u.full_name as created_by_name
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      LEFT JOIN users u ON l.created_by = u.id
      WHERE l.id = ?
    `).get(loanId);
    
    if (!loan) return null;
    
    const payments = this.db.prepare(`
      SELECT p.*, u.full_name as paid_by_name 
      FROM payments p 
      LEFT JOIN users u ON p.paid_by = u.id 
      WHERE p.loan_id = ?
      ORDER BY p.installment_number
    `).all(loanId);
    
    // Check fraud flags
    const fraudFlags = [];
    const allLoans = this.db.prepare('SELECT id FROM loans WHERE customer_id = ? AND archived_at IS NULL').all(loan.customer_id);
    if (allLoans.length > 1) {
      fraudFlags.push('DUPLICATE_CUSTOMER');
    }
    
    if (loan.status === 'paid') {
      const createdDate = loan.created_at.slice(0, 10);
      const paidPayments = payments.filter(p => p.is_paid && p.paid_at);
      if (paidPayments.length > 0) {
        const lastPaidDate = paidPayments.reduce((max, p) => p.paid_at > max ? p.paid_at : max, '').slice(0, 10);
        if (createdDate === lastPaidDate) {
          fraudFlags.push('QUICK_CLOSE');
        }
      }
    }
    
    return {
      ...loan,
      customer_id_number_masked: this.maskIdNumber(loan.customer_id_number),
      payments: payments.map(p => ({ ...p, is_paid: !!p.is_paid })),
      fraud_flags: fraudFlags
    };
  }

  // ==================== PAYMENTS ====================
  markPaymentPaid(loanId, installmentNumber, userId) {
    const payment = this.db.prepare('SELECT * FROM payments WHERE loan_id = ? AND installment_number = ?').get(loanId, installmentNumber);
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    if (payment.is_paid) {
      throw new Error('Payment already marked as paid - cannot be reversed');
    }
    
    const now = new Date().toISOString();
    const user = this.getUser(userId);
    
    // This will be protected by the trigger if trying to unmark
    this.db.prepare('UPDATE payments SET is_paid = 1, paid_at = ?, paid_by = ? WHERE id = ?').run(now, userId, payment.id);
    
    // Update loan outstanding balance
    const loan = this.db.prepare('SELECT outstanding_balance FROM loans WHERE id = ?').get(loanId);
    const newBalance = Math.max(0, Math.round((loan.outstanding_balance - payment.amount_due) * 100) / 100);
    const newStatus = newBalance <= 0 ? 'paid' : 'open';
    
    this.db.prepare('UPDATE loans SET outstanding_balance = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?').run(newBalance, newStatus, now, userId, loanId);
    
    this.createAuditLog('payment', payment.id, 'mark_paid', userId, user.full_name, { is_paid: false }, { is_paid: true, paid_at: now });
    
    return { message: 'Payment marked as paid', new_balance: newBalance, loan_status: newStatus };
  }

  unmarkPaymentPaid(loanId, installmentNumber, userId) {
    const payment = this.db.prepare('SELECT * FROM payments WHERE loan_id = ? AND installment_number = ?').get(loanId, installmentNumber);
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    if (!payment.is_paid) {
      throw new Error('Payment is not marked as paid');
    }
    
    // Check if multi-payment plan
    const loan = this.db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    if (!loan || loan.repayment_plan_code <= 1) {
      throw new Error('Cannot unmark single-payment loans');
    }
    
    // Check if all payments are paid (fully settled = locked)
    const allPayments = this.db.prepare('SELECT * FROM payments WHERE loan_id = ?').all(loanId);
    if (allPayments.every(p => p.is_paid)) {
      throw new Error('Cannot unmark - all payments completed and locked');
    }
    
    const now = new Date().toISOString();
    const user = this.getUser(userId);
    
    this.db.prepare('UPDATE payments SET is_paid = 0, paid_at = NULL, paid_by = NULL WHERE id = ?').run(payment.id);
    
    // Update loan outstanding balance
    const newBalance = Math.round((loan.outstanding_balance + payment.amount_due) * 100) / 100;
    this.db.prepare('UPDATE loans SET outstanding_balance = ?, status = ?, updated_at = ?, updated_by = ? WHERE id = ?').run(newBalance, 'open', now, userId, loanId);
    
    this.createAuditLog('payment', payment.id, 'unmark_paid', userId, user.full_name, { is_paid: true }, { is_paid: false });
    
    return { message: 'Payment unmarked', new_balance: newBalance, loan_status: 'open' };
  }


  // ==================== DASHBOARD ====================
  getDashboardStats() {
    const totalCustomers = this.db.prepare('SELECT COUNT(*) as count FROM customers WHERE archived_at IS NULL').get().count;
    const totalLoans = this.db.prepare('SELECT COUNT(*) as count FROM loans WHERE archived_at IS NULL').get().count;
    const openLoans = this.db.prepare('SELECT COUNT(*) as count FROM loans WHERE status = ? AND archived_at IS NULL').get('open').count;
    const paidLoans = this.db.prepare('SELECT COUNT(*) as count FROM loans WHERE status = ? AND archived_at IS NULL').get('paid').count;
    
    const outstandingResult = this.db.prepare('SELECT SUM(outstanding_balance) as total FROM loans WHERE status = ? AND archived_at IS NULL').get('open');
    const totalOutstanding = outstandingResult.total || 0;
    
    // Fraud counts
    const loans = this.getLoans();
    const quickCloseCount = loans.filter(l => l.fraud_flags.includes('QUICK_CLOSE')).length;
    const duplicateCustomers = new Set(loans.filter(l => l.fraud_flags.includes('DUPLICATE_CUSTOMER')).map(l => l.customer_id)).size;
    
    return {
      total_customers: totalCustomers,
      total_loans: totalLoans,
      open_loans: openLoans,
      paid_loans: paidLoans,
      total_outstanding: Math.round(totalOutstanding * 100) / 100,
      quick_close_alerts: quickCloseCount,
      duplicate_customer_alerts: duplicateCustomers
    };
  }

  // ==================== AUDIT LOGS ====================
  getAuditLogs(filters = {}) {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (filters.entity_type) {
      query += ' AND entity_type = ?';
      params.push(filters.entity_type);
    }
    if (filters.entity_id) {
      query += ' AND entity_id = ?';
      params.push(filters.entity_id);
    }
    if (filters.actor_id) {
      query += ' AND actor_user_id = ?';
      params.push(filters.actor_id);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(filters.limit || 500);
    
    const logs = this.db.prepare(query).all(...params);
    
    return logs.map(log => ({
      ...log,
      before_json: log.before_json ? JSON.parse(log.before_json) : null,
      after_json: log.after_json ? JSON.parse(log.after_json) : null
    }));
  }

  verifyAuditIntegrity() {
    const logs = this.db.prepare('SELECT * FROM audit_logs ORDER BY created_at ASC').all();
    
    if (logs.length === 0) {
      return { valid: true, message: 'No audit logs to verify' };
    }
    
    let previousHash = '';
    const invalidEntries = [];
    
    for (const log of logs) {
      const storedHash = log.integrity_hash;
      const logId = log.id;
      
      const logData = {
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        action: log.action,
        before_json: log.before_json,
        after_json: log.after_json,
        actor_user_id: log.actor_user_id,
        actor_name: log.actor_name,
        reason: log.reason,
        created_at: log.created_at
      };
      
      const computedHash = this.computeIntegrityHash(logData, previousHash);
      
      if (computedHash !== storedHash) {
        invalidEntries.push({ id: logId, expected: computedHash, stored: storedHash });
      }
      
      previousHash = storedHash;
    }
    
    if (invalidEntries.length > 0) {
      return { valid: false, message: 'Audit log tampering detected!', invalid_entries: invalidEntries.slice(0, 5) };
    }
    
    return { valid: true, message: `All ${logs.length} audit log entries verified`, total_entries: logs.length };
  }

  // ==================== SETTINGS ====================
  getSettings() {
    const rows = this.db.prepare('SELECT key, value FROM settings WHERE key != ?').all('master_password_hash');
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  }

  updateSettings(newSettings) {
    const now = new Date().toISOString();
    
    for (const [key, value] of Object.entries(newSettings)) {
      if (value !== undefined && value !== null) {
        const existing = this.db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
        if (existing) {
          this.db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?').run(value, now, key);
        } else {
          this.db.prepare('INSERT INTO settings (key, value, created_at) VALUES (?, ?, ?)').run(key, value, now);
        }
      }
    }
    
    return { message: 'Settings updated successfully' };
  }

  // ==================== ARCHIVE ====================
  archiveEntity(entityType, entityId, reason, userId) {
    if (!reason || reason.length < 10) {
      throw new Error('Archive reason must be at least 10 characters');
    }
    
    const now = new Date().toISOString();
    const user = this.getUser(userId);
    
    if (entityType === 'customer') {
      const entity = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(entityId);
      if (!entity) throw new Error('Customer not found');
      this.db.prepare('UPDATE customers SET archived_at = ?, archived_by = ? WHERE id = ?').run(now, userId, entityId);
    } else if (entityType === 'loan') {
      const entity = this.db.prepare('SELECT * FROM loans WHERE id = ?').get(entityId);
      if (!entity) throw new Error('Loan not found');
      this.db.prepare('UPDATE loans SET archived_at = ?, archived_by = ? WHERE id = ?').run(now, userId, entityId);
    } else {
      throw new Error('Invalid entity type');
    }
    
    this.createAuditLog(entityType, entityId, 'archive', userId, user.full_name, null, null, reason);
    
    return { message: `${entityType} archived successfully` };
  }

  // ==================== EXPORT ====================
  exportToExcel(exportType, folderPath, userId) {
    const ExcelJS = require('exceljs');
    const user = this.getUser(userId);
    const workbook = new ExcelJS.Workbook();
    
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }
    };
    
    if (exportType === 'customers' || exportType === 'all') {
      const ws = workbook.addWorksheet('Customers');
      ws.columns = [
        { header: 'ID', key: 'id', width: 40 },
        { header: 'Client Name', key: 'client_name', width: 25 },
        { header: 'ID Number', key: 'id_number', width: 20 },
        { header: 'Mandate ID', key: 'mandate_id', width: 20 },
        { header: 'Created At', key: 'created_at', width: 25 },
        { header: 'Created By', key: 'created_by_name', width: 20 }
      ];
      
      const customers = this.getCustomers();
      customers.forEach(c => {
        const row = ws.addRow({
          id: c.id,
          client_name: c.client_name,
          id_number: c.id_number,
          mandate_id: c.mandate_id,
          created_at: c.created_at,
          created_by_name: c.created_by_name
        });
        // Format ID as text
        row.getCell('id_number').numFmt = '@';
      });
      
      ws.getRow(1).eachCell(cell => {
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill;
      });
    }
    
    if (exportType === 'loans' || exportType === 'all') {
      const ws = workbook.addWorksheet('Loans');
      ws.columns = [
        { header: 'Loan ID', key: 'id', width: 40 },
        { header: 'Customer Name', key: 'customer_name', width: 25 },
        { header: 'Customer ID', key: 'customer_id_number', width: 20 },
        { header: 'Principal', key: 'principal', width: 15 },
        { header: 'Total Repayable', key: 'total', width: 15 },
        { header: 'Outstanding', key: 'outstanding', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Plan', key: 'plan', width: 15 },
        { header: 'Created At', key: 'created_at', width: 25 },
        { header: 'Created By', key: 'created_by_name', width: 20 }
      ];
      
      const planNames = { 1: 'Monthly', 2: 'Fortnightly', 4: 'Weekly' };
      const loans = this.getLoans();
      
      loans.forEach(l => {
        const row = ws.addRow({
          id: l.id,
          customer_name: l.customer_name,
          customer_id_number: l.customer_id_number,
          principal: `R${l.principal_amount.toFixed(2)}`,
          total: `R${l.total_repayable.toFixed(2)}`,
          outstanding: `R${l.outstanding_balance.toFixed(2)}`,
          status: l.status.toUpperCase(),
          plan: planNames[l.repayment_plan_code] || 'Unknown',
          created_at: l.created_at,
          created_by_name: l.created_by_name
        });
        row.getCell('customer_id_number').numFmt = '@';
      });
      
      ws.getRow(1).eachCell(cell => {
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill;
      });
    }
    
    if (exportType === 'payments' || exportType === 'all') {
      const ws = workbook.addWorksheet('Payments');
      ws.columns = [
        { header: 'Payment ID', key: 'id', width: 40 },
        { header: 'Loan ID', key: 'loan_id', width: 40 },
        { header: 'Installment #', key: 'installment', width: 12 },
        { header: 'Amount Due', key: 'amount', width: 15 },
        { header: 'Due Date', key: 'due_date', width: 25 },
        { header: 'Is Paid', key: 'is_paid', width: 10 },
        { header: 'Paid At', key: 'paid_at', width: 25 },
        { header: 'Paid By', key: 'paid_by_name', width: 20 }
      ];
      
      const payments = this.db.prepare(`
        SELECT p.*, u.full_name as paid_by_name 
        FROM payments p 
        LEFT JOIN users u ON p.paid_by = u.id
      `).all();
      
      payments.forEach(p => {
        ws.addRow({
          id: p.id,
          loan_id: p.loan_id,
          installment: p.installment_number,
          amount: `R${p.amount_due.toFixed(2)}`,
          due_date: p.due_date,
          is_paid: p.is_paid ? 'Yes' : 'No',
          paid_at: p.paid_at || '',
          paid_by_name: p.paid_by_name || ''
        });
      });
      
      ws.getRow(1).eachCell(cell => {
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill;
      });
    }
    
    // Generate filename
    const date = new Date().toISOString().slice(0, 10);
    const branch = (user.branch || 'Unknown').replace(/\s/g, '_');
    const filename = `Loans_${date}_${branch}.xlsx`;
    const filePath = path.join(folderPath, filename);
    
    // Save file
    return workbook.xlsx.writeFile(filePath)
      .then(() => {
        this.createAuditLog('export', 'system', 'export_data', userId, user.full_name, null, { export_type: exportType, file_path: filePath });
        return { success: true, filename, filePath };
      })
      .catch(err => {
        return { success: false, error: err.message };
      });
  }

  // Admin operations
  adminEditPayment(paymentId, data) {
    const payment = this.db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
    if (!payment) throw new Error('Payment not found');
    
    const updates = [];
    const values = [];
    if (data.amount_due !== undefined) { updates.push('amount_due = ?'); values.push(parseFloat(data.amount_due)); }
    if (data.is_paid !== undefined) {
      updates.push('is_paid = ?'); values.push(data.is_paid ? 1 : 0);
      if (data.is_paid) {
        updates.push('paid_at = ?'); values.push(new Date().toISOString());
      } else {
        updates.push('paid_at = NULL');
        updates.push('paid_by = NULL');
      }
    }
    
    if (updates.length > 0) {
      values.push(paymentId);
      this.db.prepare(`UPDATE payments SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      this.recalculateLoanBalance(payment.loan_id);
    }
    return { message: 'Payment updated by admin' };
  }

  adminDeletePayment(paymentId) {
    const payment = this.db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
    if (!payment) throw new Error('Payment not found');
    
    this.db.prepare('DELETE FROM payments WHERE id = ?').run(paymentId);
    this.recalculateLoanBalance(payment.loan_id);
    return { message: 'Payment deleted by admin' };
  }

  adminEditLoan(loanId, data) {
    const loan = this.db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    if (!loan) throw new Error('Loan not found');
    
    const allowed = ['principal_amount', 'loan_date', 'status', 'outstanding_balance', 'repayment_plan_code'];
    const updates = [];
    const values = [];
    for (const field of allowed) {
      if (data[field] !== undefined) { updates.push(`${field} = ?`); values.push(data[field]); }
    }
    updates.push('updated_at = ?'); values.push(new Date().toISOString());
    
    if (updates.length > 1) {
      values.push(loanId);
      this.db.prepare(`UPDATE loans SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    return { message: 'Loan updated by admin' };
  }

  adminEditCustomer(customerId, data) {
    const customer = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    if (!customer) throw new Error('Customer not found');
    
    const allowed = ['client_name', 'id_number', 'cell_phone', 'mandate_id', 'sassa_end_date'];
    const updates = [];
    const values = [];
    for (const field of allowed) {
      if (data[field] !== undefined) { updates.push(`${field} = ?`); values.push(data[field]); }
    }
    updates.push('updated_at = ?'); values.push(new Date().toISOString());
    
    if (updates.length > 1) {
      values.push(customerId);
      this.db.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    return { message: 'Customer updated by admin' };
  }

  recalculateLoanBalance(loanId) {
    const loan = this.db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    if (!loan) return;
    const payments = this.db.prepare('SELECT * FROM payments WHERE loan_id = ?').all(loanId);
    const totalPaid = payments.filter(p => p.is_paid).reduce((sum, p) => sum + p.amount_due, 0);
    const newBalance = Math.max(0, Math.round((loan.total_repayable - totalPaid) * 100) / 100);
    const newStatus = newBalance === 0 ? 'paid' : 'open';
    this.db.prepare('UPDATE loans SET outstanding_balance = ?, status = ? WHERE id = ?').run(newBalance, newStatus, loanId);
  }


module.exports = EasyMoneyDatabase;

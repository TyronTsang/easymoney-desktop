"""
Comprehensive API tests for EasyMoneyLoans Staff Portal
Tests: Auth, Dashboard, Customers, Loans, Payments, Fraud Alerts, Admin, Audit Logs, Export
"""
import pytest
import requests
import os
from datetime import datetime

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MASTER_PASSWORD = "TestMaster123!"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"


class TestMasterPassword:
    """Master password flow tests"""
    
    def test_master_password_status(self):
        """Check master password is set"""
        response = requests.get(f"{BASE_URL}/api/master-password/status")
        assert response.status_code == 200
        data = response.json()
        assert "is_set" in data
        print(f"Master password is_set: {data['is_set']}")
    
    def test_master_password_verify_success(self):
        """Verify correct master password"""
        response = requests.post(f"{BASE_URL}/api/master-password/verify", json={
            "password": MASTER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("verified") == True
        print("SUCCESS: Master password verified")
    
    def test_master_password_verify_invalid(self):
        """Verify incorrect master password fails"""
        response = requests.post(f"{BASE_URL}/api/master-password/verify", json={
            "password": "WrongPassword123"
        })
        assert response.status_code == 401
        print("SUCCESS: Invalid master password rejected")


class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == ADMIN_USERNAME
        assert data["user"]["role"] == "admin"
        print(f"SUCCESS: Login successful for {data['user']['full_name']}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Login with invalid credentials fails"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "wronguser",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("SUCCESS: Invalid credentials rejected")
    
    def test_get_me(self):
        """Get current user info"""
        token = self.get_token()
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["username"] == ADMIN_USERNAME
        print(f"SUCCESS: Current user: {data['full_name']} ({data['role']})")
    
    def get_token(self):
        """Helper to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]


class TestDashboard:
    """Dashboard stats tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_stats(self):
        """Get dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected stats are present
        assert "total_customers" in data
        assert "total_loans" in data
        assert "open_loans" in data
        assert "paid_loans" in data
        assert "total_outstanding" in data
        assert "quick_close_alerts" in data
        assert "duplicate_customer_alerts" in data
        
        print(f"Dashboard Stats:")
        print(f"  Total Customers: {data['total_customers']}")
        print(f"  Open Loans: {data['open_loans']}")
        print(f"  Paid Loans: {data['paid_loans']}")
        print(f"  Outstanding: R{data['total_outstanding']:.2f}")
        print(f"  Quick-Close Alerts: {data['quick_close_alerts']}")
        print(f"  Duplicate Customer Alerts: {data['duplicate_customer_alerts']}")


class TestCustomers:
    """Customer management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_customers(self):
        """List all customers"""
        response = requests.get(f"{BASE_URL}/api/customers", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Found {len(data)} customers")
        
        # Verify customer structure
        if data:
            customer = data[0]
            assert "id" in customer
            assert "client_name" in customer
            assert "id_number" in customer
            assert "mandate_id" in customer
    
    def test_get_customer(self):
        """Get a specific customer"""
        # First get list of customers
        response = requests.get(f"{BASE_URL}/api/customers", headers=self.headers)
        customers = response.json()
        
        if customers:
            customer_id = customers[0]["id"]
            response = requests.get(f"{BASE_URL}/api/customers/{customer_id}", headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == customer_id
            print(f"SUCCESS: Retrieved customer: {data['client_name']}")


class TestLoans:
    """Loan management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_loans(self):
        """List all loans"""
        response = requests.get(f"{BASE_URL}/api/loans", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Found {len(data)} loans")
        
        # Verify loan structure
        if data:
            loan = data[0]
            assert "id" in loan
            assert "customer_name" in loan
            assert "principal_amount" in loan
            assert "status" in loan
            assert "payments" in loan
            assert "fraud_flags" in loan
    
    def test_list_loans_by_status(self):
        """List loans filtered by status"""
        # Test open loans
        response = requests.get(f"{BASE_URL}/api/loans?loan_status=open", headers=self.headers)
        assert response.status_code == 200
        open_loans = response.json()
        print(f"SUCCESS: Found {len(open_loans)} open loans")
        
        # Test paid loans
        response = requests.get(f"{BASE_URL}/api/loans?loan_status=paid", headers=self.headers)
        assert response.status_code == 200
        paid_loans = response.json()
        print(f"SUCCESS: Found {len(paid_loans)} paid loans")
    
    def test_get_loan(self):
        """Get a specific loan"""
        # First get list of loans
        response = requests.get(f"{BASE_URL}/api/loans", headers=self.headers)
        loans = response.json()
        
        if loans:
            loan_id = loans[0]["id"]
            response = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == loan_id
            assert "payments" in data
            print(f"SUCCESS: Retrieved loan for {data['customer_name']}: R{data['principal_amount']:.2f}")


class TestUsers:
    """User management tests (Admin only)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_users(self):
        """List all users"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Found {len(data)} users")
        
        # Verify user structure (no password_hash exposed)
        if data:
            user = data[0]
            assert "id" in user
            assert "username" in user
            assert "full_name" in user
            assert "role" in user
            assert "password_hash" not in user  # Security check


class TestAuditLogs:
    """Audit log tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_audit_logs(self):
        """List audit logs"""
        response = requests.get(f"{BASE_URL}/api/audit-logs", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Found {len(data)} audit log entries")
        
        if data:
            log = data[0]
            assert "entity_type" in log
            assert "action" in log
            assert "actor_name" in log
            assert "integrity_hash" in log
    
    def test_verify_audit_integrity(self):
        """Verify audit log integrity"""
        response = requests.get(f"{BASE_URL}/api/audit-logs/verify-integrity", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert "message" in data
        print(f"Audit Integrity: {data['valid']} - {data['message']}")


class TestSettings:
    """Settings tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_settings(self):
        """Get application settings"""
        response = requests.get(f"{BASE_URL}/api/settings", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"SUCCESS: Retrieved settings: {list(data.keys())}")
    
    def test_get_ad_config(self):
        """Get AD configuration"""
        response = requests.get(f"{BASE_URL}/api/settings/ad-config", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        assert "ldap_available" in data
        print(f"AD Config: enabled={data['enabled']}, ldap_available={data['ldap_available']}")


class TestExport:
    """Export functionality tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_export_customers(self):
        """Export customers data"""
        response = requests.post(f"{BASE_URL}/api/export", headers=self.headers, json={
            "export_type": "customers"
        })
        assert response.status_code == 200
        data = response.json()
        assert "filename" in data
        assert "data" in data  # Base64 encoded Excel
        print(f"SUCCESS: Exported customers to {data['filename']}")
    
    def test_export_loans(self):
        """Export loans data"""
        response = requests.post(f"{BASE_URL}/api/export", headers=self.headers, json={
            "export_type": "loans"
        })
        assert response.status_code == 200
        data = response.json()
        assert "filename" in data
        print(f"SUCCESS: Exported loans to {data['filename']}")


class TestBackupStatus:
    """Backup status tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_backup_status(self):
        """Get backup status"""
        response = requests.get(f"{BASE_URL}/api/backup/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "backup_folder_path" in data
        assert "auto_backup_enabled" in data
        print(f"Backup status: folder={data['backup_folder_path']}, auto={data['auto_backup_enabled']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

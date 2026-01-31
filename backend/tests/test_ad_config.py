"""
Backend tests for Active Directory configuration endpoints
Tests: /api/settings/ad-config GET/PUT, /api/settings/ad-config/test POST
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestADConfiguration:
    """Active Directory configuration endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - authenticate and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # First verify master password
        verify_res = self.session.post(f"{BASE_URL}/api/master-password/verify", json={
            "password": "TestMaster123!"
        })
        assert verify_res.status_code == 200, f"Master password verification failed: {verify_res.text}"
        
        # Login as admin
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        
        token = login_res.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def test_get_ad_config_returns_default_values(self):
        """Test GET /api/settings/ad-config returns default configuration"""
        response = self.session.get(f"{BASE_URL}/api/settings/ad-config")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "enabled" in data
        assert "server_url" in data
        assert "domain" in data
        assert "base_dn" in data
        assert "default_role" in data
        assert "default_branch" in data
        assert "ldap_available" in data
        
        # Verify ldap_available is boolean
        assert isinstance(data["ldap_available"], bool)
        print(f"AD Config: enabled={data['enabled']}, ldap_available={data['ldap_available']}")
        
    def test_update_ad_config_success(self):
        """Test PUT /api/settings/ad-config updates configuration"""
        update_data = {
            "enabled": False,
            "server_url": "ldap://test.company.com:389",
            "domain": "TESTCOMPANY",
            "base_dn": "OU=Users,DC=test,DC=company,DC=com",
            "default_role": "employee",
            "default_branch": "Test Branch"
        }
        
        response = self.session.put(f"{BASE_URL}/api/settings/ad-config", json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "successfully" in data["message"].lower()
        print(f"Update response: {data['message']}")
        
        # Verify the update persisted
        get_response = self.session.get(f"{BASE_URL}/api/settings/ad-config")
        assert get_response.status_code == 200
        
        saved_data = get_response.json()
        assert saved_data["server_url"] == update_data["server_url"]
        assert saved_data["domain"] == update_data["domain"]
        assert saved_data["base_dn"] == update_data["base_dn"]
        assert saved_data["default_role"] == update_data["default_role"]
        assert saved_data["default_branch"] == update_data["default_branch"]
        print("AD config update persisted correctly")
        
    def test_test_ad_connection_without_server_url(self):
        """Test POST /api/settings/ad-config/test fails without server URL"""
        test_data = {
            "enabled": True,
            "server_url": "",
            "domain": "TESTCOMPANY"
        }
        
        response = self.session.post(f"{BASE_URL}/api/settings/ad-config/test", json=test_data)
        
        # Should return 400 because server_url is required
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data
        print(f"Test connection error (expected): {data['detail']}")
        
    def test_test_ad_connection_without_domain(self):
        """Test POST /api/settings/ad-config/test fails without domain"""
        test_data = {
            "enabled": True,
            "server_url": "ldap://test.company.com:389",
            "domain": ""
        }
        
        response = self.session.post(f"{BASE_URL}/api/settings/ad-config/test", json=test_data)
        
        # Should return 400 because domain is required
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data
        print(f"Test connection error (expected): {data['detail']}")
        
    def test_test_ad_connection_with_invalid_server(self):
        """Test POST /api/settings/ad-config/test returns failure for unreachable server"""
        test_data = {
            "enabled": True,
            "server_url": "ldap://nonexistent.server.local:389",
            "domain": "TESTCOMPANY",
            "base_dn": "DC=test,DC=com"
        }
        
        response = self.session.post(f"{BASE_URL}/api/settings/ad-config/test", json=test_data)
        
        # Should return 200 with success=false (connection test result)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data
        assert data["success"] == False, "Expected connection to fail for nonexistent server"
        assert "message" in data
        print(f"Test connection result: success={data['success']}, message={data['message']}")
        
    def test_ad_config_requires_admin_role(self):
        """Test that AD config endpoints require admin role"""
        # Create a non-admin session
        non_admin_session = requests.Session()
        non_admin_session.headers.update({"Content-Type": "application/json"})
        
        # Try to access without auth
        response = non_admin_session.get(f"{BASE_URL}/api/settings/ad-config")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("AD config correctly requires authentication")
        
    def test_enable_ad_config(self):
        """Test enabling AD configuration"""
        update_data = {
            "enabled": True,
            "server_url": "ldap://ad.company.com:389",
            "domain": "COMPANY",
            "base_dn": "OU=Users,DC=company,DC=com",
            "default_role": "employee",
            "default_branch": "Head Office"
        }
        
        response = self.session.put(f"{BASE_URL}/api/settings/ad-config", json=update_data)
        assert response.status_code == 200
        
        # Verify enabled state
        get_response = self.session.get(f"{BASE_URL}/api/settings/ad-config")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["enabled"] == True
        print("AD config enabled successfully")
        
    def test_disable_ad_config(self):
        """Test disabling AD configuration"""
        update_data = {
            "enabled": False,
            "server_url": "ldap://ad.company.com:389",
            "domain": "COMPANY"
        }
        
        response = self.session.put(f"{BASE_URL}/api/settings/ad-config", json=update_data)
        assert response.status_code == 200
        
        # Verify disabled state
        get_response = self.session.get(f"{BASE_URL}/api/settings/ad-config")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["enabled"] == False
        print("AD config disabled successfully")


class TestLocalAuthenticationStillWorks:
    """Verify local authentication still works after AD integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_local_login_with_admin_credentials(self):
        """Test local login still works with admin/admin123"""
        # First verify master password
        verify_res = self.session.post(f"{BASE_URL}/api/master-password/verify", json={
            "password": "TestMaster123!"
        })
        assert verify_res.status_code == 200
        
        # Login with local credentials
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        
        data = login_res.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == "admin"
        assert data["auth_method"] == "local"
        print(f"Local login successful: user={data['user']['username']}, auth_method={data['auth_method']}")
        
    def test_dashboard_loads_after_login(self):
        """Test dashboard stats endpoint works after login"""
        # Login
        verify_res = self.session.post(f"{BASE_URL}/api/master-password/verify", json={
            "password": "TestMaster123!"
        })
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        token = login_res.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get dashboard stats
        stats_res = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        
        assert stats_res.status_code == 200, f"Dashboard stats failed: {stats_res.text}"
        
        data = stats_res.json()
        assert "total_customers" in data
        assert "total_loans" in data
        assert "open_loans" in data
        print(f"Dashboard stats: customers={data['total_customers']}, loans={data['total_loans']}")


class TestLoanCreationFlow:
    """Test loan creation flow still works"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - authenticate"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        verify_res = self.session.post(f"{BASE_URL}/api/master-password/verify", json={
            "password": "TestMaster123!"
        })
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        token = login_res.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def test_create_customer_and_loan(self):
        """Test creating a customer and loan"""
        # Create customer with valid SA ID (using Luhn-valid ID)
        customer_data = {
            "client_name": "TEST_AD_Customer",
            "id_number": "8001015009087",  # Valid SA ID
            "mandate_id": "TEST_MANDATE_001"
        }
        
        customer_res = self.session.post(f"{BASE_URL}/api/customers", json=customer_data)
        
        if customer_res.status_code == 400 and "already exists" in customer_res.text:
            # Customer exists, get from list
            list_res = self.session.get(f"{BASE_URL}/api/customers")
            customers = list_res.json()
            customer = next((c for c in customers if c["client_name"] == "TEST_AD_Customer"), None)
            if customer:
                customer_id = customer["id"]
                print(f"Using existing customer: {customer_id}")
            else:
                pytest.skip("Could not find or create customer")
        else:
            assert customer_res.status_code in [200, 201], f"Customer creation failed: {customer_res.text}"
            customer_id = customer_res.json()["id"]
            print(f"Created customer: {customer_id}")
        
        # Create loan
        from datetime import datetime
        loan_data = {
            "customer_id": customer_id,
            "principal_amount": 1000.0,
            "repayment_plan_code": 1,  # Monthly
            "loan_date": datetime.now().isoformat()
        }
        
        loan_res = self.session.post(f"{BASE_URL}/api/loans", json=loan_data)
        assert loan_res.status_code in [200, 201], f"Loan creation failed: {loan_res.text}"
        
        loan_id = loan_res.json()["id"]
        print(f"Created loan: {loan_id}")
        
        # Verify loan in list
        loans_res = self.session.get(f"{BASE_URL}/api/loans")
        assert loans_res.status_code == 200
        
        loans = loans_res.json()
        created_loan = next((l for l in loans if l["id"] == loan_id), None)
        assert created_loan is not None
        assert created_loan["principal_amount"] == 1000.0
        print(f"Loan verified: principal={created_loan['principal_amount']}, total_repayable={created_loan['total_repayable']}")


class TestPaymentMarking:
    """Test payment marking still works"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - authenticate"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        verify_res = self.session.post(f"{BASE_URL}/api/master-password/verify", json={
            "password": "TestMaster123!"
        })
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        
        token = login_res.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def test_mark_payment_as_paid(self):
        """Test marking a payment as paid"""
        # Get loans with open status
        loans_res = self.session.get(f"{BASE_URL}/api/loans?loan_status=open")
        assert loans_res.status_code == 200
        
        loans = loans_res.json()
        if not loans:
            pytest.skip("No open loans to test payment marking")
            
        # Find a loan with unpaid payments
        loan_with_unpaid = None
        for loan in loans:
            unpaid_payments = [p for p in loan.get("payments", []) if not p.get("is_paid")]
            if unpaid_payments:
                loan_with_unpaid = loan
                break
                
        if not loan_with_unpaid:
            pytest.skip("No loans with unpaid payments found")
            
        # Get first unpaid payment
        unpaid_payment = next(p for p in loan_with_unpaid["payments"] if not p.get("is_paid"))
        
        # Mark as paid
        mark_res = self.session.post(f"{BASE_URL}/api/payments/mark-paid", json={
            "loan_id": loan_with_unpaid["id"],
            "installment_number": unpaid_payment["installment_number"]
        })
        
        assert mark_res.status_code == 200, f"Mark payment failed: {mark_res.text}"
        
        data = mark_res.json()
        assert "message" in data
        assert "new_balance" in data
        print(f"Payment marked: {data['message']}, new_balance={data['new_balance']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

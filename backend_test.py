#!/usr/bin/env python3
"""
EasyMoneyLoans Backend API Test Suite
Tests all endpoints for the loan management system
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class EasyMoneyLoansAPITester:
    def __init__(self, base_url="https://secureloans-desk.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.master_password = "TestMaster123!"
        self.admin_credentials = {"username": "admin", "password": "admin123"}
        self.test_customer_id = None
        self.test_loan_id = None
        
    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
            
            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_master_password_flow(self):
        """Test master password setup and verification"""
        print("\n🔐 Testing Master Password Flow...")
        
        # Check master password status
        success, data = self.make_request('GET', 'master-password/status')
        if success:
            self.log_result("Master Password Status Check", True)
            
            # If not set, set it up
            if not data.get('is_set'):
                success, setup_data = self.make_request('POST', 'master-password/setup', 
                                                      {"password": self.master_password})
                if success and setup_data.get('default_admin'):
                    self.log_result("Master Password Setup", True)
                    self.admin_credentials = setup_data['default_admin']
                else:
                    self.log_result("Master Password Setup", False, str(setup_data))
                    return False
            else:
                self.log_result("Master Password Already Set", True)
        else:
            self.log_result("Master Password Status Check", False, str(data))
            return False

        # Verify master password
        success, data = self.make_request('POST', 'master-password/verify', 
                                        {"password": self.master_password})
        if success and data.get('verified'):
            self.log_result("Master Password Verification", True)
            return True
        else:
            self.log_result("Master Password Verification", False, str(data))
            return False

    def test_authentication(self):
        """Test user authentication"""
        print("\n👤 Testing Authentication...")
        
        # Login with admin credentials
        success, data = self.make_request('POST', 'auth/login', self.admin_credentials)
        if success and data.get('token'):
            self.token = data['token']
            self.log_result("Admin Login", True)
            
            # Test /auth/me endpoint
            success, user_data = self.make_request('GET', 'auth/me')
            if success and user_data.get('username') == 'admin':
                self.log_result("Get Current User", True)
                return True
            else:
                self.log_result("Get Current User", False, str(user_data))
                return False
        else:
            self.log_result("Admin Login", False, str(data))
            return False

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📊 Testing Dashboard Stats...")
        
        success, data = self.make_request('GET', 'dashboard/stats')
        if success:
            required_fields = ['total_customers', 'total_loans', 'open_loans', 'paid_loans', 
                             'total_outstanding', 'quick_close_alerts', 'duplicate_customer_alerts']
            
            missing_fields = [field for field in required_fields if field not in data]
            if not missing_fields:
                self.log_result("Dashboard Stats Structure", True)
                return True
            else:
                self.log_result("Dashboard Stats Structure", False, f"Missing fields: {missing_fields}")
                return False
        else:
            self.log_result("Dashboard Stats API", False, str(data))
            return False

    def test_customer_management(self):
        """Test customer CRUD operations"""
        print("\n👥 Testing Customer Management...")
        
        # Test valid SA ID (using Luhn algorithm valid ID)
        timestamp = datetime.now().strftime("%H%M%S")
        test_customer = {
            "client_name": f"Test Customer {timestamp}",
            "id_number": "8001015009087",  # Valid SA ID
            "mandate_id": f"TEST{timestamp}"
        }
        
        # Create customer
        success, data = self.make_request('POST', 'customers', test_customer, 200)
        if success and data.get('id'):
            self.test_customer_id = data['id']
            self.log_result("Create Customer", True)
            
            # Verify ID masking for admin (should see full ID)
            if data.get('id_number') == test_customer['id_number']:
                self.log_result("Admin ID Visibility", True)
            else:
                self.log_result("Admin ID Visibility", False, "Admin should see full ID")
        else:
            self.log_result("Create Customer", False, str(data))
            return False

        # Test invalid SA ID
        invalid_customer = {
            "client_name": "Invalid Customer",
            "id_number": "1234567890123",  # Invalid SA ID
            "mandate_id": "INVALID001"
        }
        
        success, data = self.make_request('POST', 'customers', invalid_customer, 422)
        if not success:  # Should fail with 422
            self.log_result("SA ID Validation", True)
        else:
            self.log_result("SA ID Validation", False, "Invalid SA ID was accepted")

        # List customers
        success, data = self.make_request('GET', 'customers')
        if success and isinstance(data, list):
            self.log_result("List Customers", True)
            
            # Find our test customer
            test_customer_found = any(c.get('id') == self.test_customer_id for c in data)
            if test_customer_found:
                self.log_result("Customer in List", True)
            else:
                self.log_result("Customer in List", False, "Created customer not found in list")
        else:
            self.log_result("List Customers", False, str(data))

        # Get specific customer
        if self.test_customer_id:
            success, data = self.make_request('GET', f'customers/{self.test_customer_id}')
            if success and data.get('id') == self.test_customer_id:
                self.log_result("Get Customer Details", True)
                return True
            else:
                self.log_result("Get Customer Details", False, str(data))
                return False

        return True

    def test_loan_management(self):
        """Test loan creation and management"""
        print("\n💰 Testing Loan Management...")
        
        if not self.test_customer_id:
            self.log_result("Loan Creation", False, "No test customer available")
            return False

        # Create loan
        test_loan = {
            "customer_id": self.test_customer_id,
            "principal_amount": 1000.0,
            "repayment_plan_code": 2,  # Fortnightly
            "loan_date": datetime.now().isoformat()
        }
        
        success, data = self.make_request('POST', 'loans', test_loan, 200)
        if success and data.get('id'):
            self.test_loan_id = data['id']
            self.log_result("Create Loan", True)
        else:
            self.log_result("Create Loan", False, str(data))
            return False

        # List loans
        success, data = self.make_request('GET', 'loans')
        if success and isinstance(data, list):
            self.log_result("List Loans", True)
            
            # Find our test loan and verify calculation
            test_loan_data = next((l for l in data if l.get('id') == self.test_loan_id), None)
            if test_loan_data:
                # Verify loan calculation (40% interest + R12 service fee)
                expected_total = (1000 * 1.40) + 12  # 1412
                expected_installment = expected_total / 2  # 706
                
                if (abs(test_loan_data.get('total_repayable', 0) - expected_total) < 0.01 and
                    abs(test_loan_data.get('installment_amount', 0) - expected_installment) < 0.01):
                    self.log_result("Loan Calculation", True)
                else:
                    self.log_result("Loan Calculation", False, 
                                  f"Expected total: {expected_total}, got: {test_loan_data.get('total_repayable')}")
            else:
                self.log_result("Loan in List", False, "Created loan not found in list")
        else:
            self.log_result("List Loans", False, str(data))

        # Get loan details
        if self.test_loan_id:
            success, data = self.make_request('GET', f'loans/{self.test_loan_id}')
            if success and data.get('id') == self.test_loan_id:
                self.log_result("Get Loan Details", True)
                
                # Verify payment schedule
                payments = data.get('payments', [])
                if len(payments) == 2:  # Fortnightly = 2 payments
                    self.log_result("Payment Schedule Generation", True)
                else:
                    self.log_result("Payment Schedule Generation", False, 
                                  f"Expected 2 payments, got {len(payments)}")
                return True
            else:
                self.log_result("Get Loan Details", False, str(data))
                return False

        return True

    def test_payment_management(self):
        """Test payment marking functionality"""
        print("\n💳 Testing Payment Management...")
        
        if not self.test_loan_id:
            self.log_result("Payment Management", False, "No test loan available")
            return False

        # Mark first payment as paid
        payment_request = {
            "loan_id": self.test_loan_id,
            "installment_number": 1
        }
        
        success, data = self.make_request('POST', 'payments/mark-paid', payment_request)
        if success:
            self.log_result("Mark Payment as Paid", True)
            
            # Verify payment immutability - try to mark same payment again
            success, data = self.make_request('POST', 'payments/mark-paid', payment_request, 400)
            if not success:  # Should fail with 400
                self.log_result("Payment Immutability", True)
            else:
                self.log_result("Payment Immutability", False, "Payment was marked paid twice")
        else:
            self.log_result("Mark Payment as Paid", False, str(data))
            return False

        # Verify loan balance update
        success, loan_data = self.make_request('GET', f'loans/{self.test_loan_id}')
        if success:
            original_total = loan_data.get('total_repayable', 0)
            outstanding = loan_data.get('outstanding_balance', 0)
            installment = loan_data.get('installment_amount', 0)
            
            expected_outstanding = original_total - installment
            if abs(outstanding - expected_outstanding) < 0.01:
                self.log_result("Loan Balance Update", True)
            else:
                self.log_result("Loan Balance Update", False, 
                              f"Expected outstanding: {expected_outstanding}, got: {outstanding}")
        else:
            self.log_result("Loan Balance Update", False, "Could not fetch updated loan")

        return True

    def test_fraud_detection(self):
        """Test fraud detection features"""
        print("\n🚨 Testing Fraud Detection...")
        
        # Mark second payment to complete the loan (for quick-close detection)
        if self.test_loan_id:
            payment_request = {
                "loan_id": self.test_loan_id,
                "installment_number": 2
            }
            
            success, data = self.make_request('POST', 'payments/mark-paid', payment_request)
            if success:
                self.log_result("Complete Loan for Fraud Test", True)
                
                # Check if quick-close flag is detected
                success, loan_data = self.make_request('GET', f'loans/{self.test_loan_id}')
                if success:
                    fraud_flags = loan_data.get('fraud_flags', [])
                    if 'QUICK_CLOSE' in fraud_flags:
                        self.log_result("Quick-Close Detection", True)
                    else:
                        self.log_result("Quick-Close Detection", False, "Quick-close flag not detected")
                else:
                    self.log_result("Quick-Close Detection", False, "Could not fetch loan for fraud check")
            else:
                self.log_result("Complete Loan for Fraud Test", False, str(data))

        return True

    def test_user_management(self):
        """Test user management (admin functions)"""
        print("\n👨‍💼 Testing User Management...")
        
        # List users
        success, data = self.make_request('GET', 'users')
        if success and isinstance(data, list):
            self.log_result("List Users", True)
            
            # Should have at least the admin user
            admin_user = next((u for u in data if u.get('username') == 'admin'), None)
            if admin_user:
                self.log_result("Admin User Exists", True)
            else:
                self.log_result("Admin User Exists", False, "Admin user not found")
        else:
            self.log_result("List Users", False, str(data))

        # Create test user
        timestamp = datetime.now().strftime("%H%M%S")
        test_user = {
            "username": f"testemployee{timestamp}",
            "password": "testpass123",
            "full_name": f"Test Employee {timestamp}",
            "role": "employee",
            "branch": "Test Branch"
        }
        
        success, data = self.make_request('POST', 'users', test_user)
        if success and data.get('id'):
            test_user_id = data['id']
            self.log_result("Create User", True)
            
            # Toggle user status
            success, toggle_data = self.make_request('PUT', f'users/{test_user_id}/toggle-active')
            if success:
                self.log_result("Toggle User Status", True)
            else:
                self.log_result("Toggle User Status", False, str(toggle_data))
        else:
            self.log_result("Create User", False, str(data))

        return True

    def test_export_functionality(self):
        """Test data export functionality"""
        print("\n📤 Testing Export Functionality...")
        
        export_request = {
            "export_type": "all"
        }
        
        success, data = self.make_request('POST', 'export', export_request)
        if success and data.get('filename') and data.get('data'):
            self.log_result("Export All Data", True)
            
            # Test specific exports
            for export_type in ['customers', 'loans', 'payments']:
                success, data = self.make_request('POST', 'export', {"export_type": export_type})
                if success and data.get('filename'):
                    self.log_result(f"Export {export_type.title()}", True)
                else:
                    self.log_result(f"Export {export_type.title()}", False, str(data))
        else:
            self.log_result("Export All Data", False, str(data))

        return True

    def test_audit_logs(self):
        """Test audit log functionality"""
        print("\n📋 Testing Audit Logs...")
        
        # List audit logs
        success, data = self.make_request('GET', 'audit-logs')
        if success and isinstance(data, list):
            self.log_result("List Audit Logs", True)
            
            # Should have logs from our test activities
            if len(data) > 0:
                self.log_result("Audit Logs Generated", True)
                
                # Test integrity verification
                success, integrity_data = self.make_request('GET', 'audit-logs/verify-integrity')
                if success and integrity_data.get('valid'):
                    self.log_result("Audit Log Integrity", True)
                else:
                    self.log_result("Audit Log Integrity", False, str(integrity_data))
            else:
                self.log_result("Audit Logs Generated", False, "No audit logs found")
        else:
            self.log_result("List Audit Logs", False, str(data))

        return True

    def test_settings_management(self):
        """Test settings management"""
        print("\n⚙️ Testing Settings Management...")
        
        # Get settings
        success, data = self.make_request('GET', 'settings')
        if success and isinstance(data, dict):
            self.log_result("Get Settings", True)
            
            # Update settings
            settings_update = {
                "export_folder_path": "/test/path",
                "branch_name": "Test Branch"
            }
            
            success, update_data = self.make_request('PUT', 'settings', settings_update)
            if success:
                self.log_result("Update Settings", True)
            else:
                self.log_result("Update Settings", False, str(update_data))
        else:
            self.log_result("Get Settings", False, str(data))

        return True

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting EasyMoneyLoans API Test Suite")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Test basic connectivity
        success, data = self.make_request('GET', '')
        if success:
            self.log_result("API Connectivity", True)
        else:
            self.log_result("API Connectivity", False, str(data))
            print("❌ Cannot connect to API. Stopping tests.")
            return False

        # Run test sequence
        test_methods = [
            self.test_master_password_flow,
            self.test_authentication,
            self.test_dashboard_stats,
            self.test_customer_management,
            self.test_loan_management,
            self.test_payment_management,
            self.test_fraud_detection,
            self.test_user_management,
            self.test_export_functionality,
            self.test_audit_logs,
            self.test_settings_management
        ]

        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                self.log_result(f"{test_method.__name__}", False, f"Exception: {str(e)}")

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

    def get_test_results(self):
        """Return detailed test results"""
        return {
            "summary": {
                "total_tests": self.tests_run,
                "passed_tests": self.tests_passed,
                "failed_tests": self.tests_run - self.tests_passed,
                "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
            },
            "results": self.test_results
        }

def main():
    """Main test execution"""
    tester = EasyMoneyLoansAPITester()
    success = tester.run_all_tests()
    
    # Save results to file
    results = tester.get_test_results()
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
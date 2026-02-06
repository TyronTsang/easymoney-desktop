"""
Test suite for NEW features in EasyMoneyLoans Staff Portal
- Admin edit/delete endpoints
- Open loan blocking
- Unmark-paid functionality
- Phone number in loan response
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
MASTER_PASSWORD = "TestMaster123!"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    # First verify master password
    verify_res = requests.post(f"{BASE_URL}/api/master-password/verify", json={"password": MASTER_PASSWORD})
    assert verify_res.status_code == 200, f"Master password verify failed: {verify_res.text}"
    
    # Login as admin
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
    return login_res.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestOpenLoanBlocking:
    """Test that customers with open loans cannot get new loans"""
    
    def test_get_loans_shows_status(self, admin_headers):
        """GET /api/loans should return loans with status field"""
        res = requests.get(f"{BASE_URL}/api/loans", headers=admin_headers)
        assert res.status_code == 200
        loans = res.json()
        assert isinstance(loans, list)
        if loans:
            assert "status" in loans[0], "Loan should have status field"
            assert loans[0]["status"] in ["open", "paid"], f"Invalid status: {loans[0]['status']}"
    
    def test_create_loan_with_open_loan_returns_400(self, admin_headers):
        """POST /api/loans with customer who has open loan should return 400"""
        # First get a customer with an open loan
        res = requests.get(f"{BASE_URL}/api/loans?loan_status=open", headers=admin_headers)
        assert res.status_code == 200
        open_loans = res.json()
        
        if not open_loans:
            pytest.skip("No open loans found to test blocking")
        
        customer_id = open_loans[0]["customer_id"]
        
        # Try to create a new loan for this customer
        new_loan_data = {
            "customer_id": customer_id,
            "principal_amount": 500,
            "repayment_plan_code": 1,
            "loan_date": datetime.now().strftime("%Y-%m-%d")
        }
        
        res = requests.post(f"{BASE_URL}/api/loans", json=new_loan_data, headers=admin_headers)
        assert res.status_code == 400, f"Expected 400 for customer with open loan, got {res.status_code}: {res.text}"
        
        # Check error message
        error_detail = res.json().get("detail", "")
        assert "open loan" in error_detail.lower(), f"Expected 'open loan' in error: {error_detail}"


class TestLoanResponseWithPhone:
    """Test that GET /api/loans returns customer_cell_phone field"""
    
    def test_loans_include_customer_cell_phone(self, admin_headers):
        """GET /api/loans should include customer_cell_phone field"""
        res = requests.get(f"{BASE_URL}/api/loans", headers=admin_headers)
        assert res.status_code == 200
        loans = res.json()
        
        if not loans:
            pytest.skip("No loans found to test phone field")
        
        # Check first loan has customer_cell_phone field
        loan = loans[0]
        assert "customer_cell_phone" in loan, f"Missing customer_cell_phone in loan response. Keys: {loan.keys()}"
        print(f"customer_cell_phone value: {loan.get('customer_cell_phone')}")


class TestUnmarkPaidEndpoint:
    """Test POST /api/payments/unmark-paid endpoint"""
    
    def test_unmark_paid_endpoint_exists(self, admin_headers):
        """POST /api/payments/unmark-paid endpoint should exist"""
        # Use invalid data to test endpoint existence (expect 404 or 400, not 405)
        res = requests.post(f"{BASE_URL}/api/payments/unmark-paid", 
                           json={"loan_id": "nonexistent", "installment_number": 1},
                           headers=admin_headers)
        
        # 404 = payment not found, 400 = validation error, both mean endpoint exists
        assert res.status_code in [400, 404, 422], f"Unexpected status {res.status_code}: {res.text}"
        print(f"Unmark-paid endpoint response: {res.status_code} - {res.text}")
    
    def test_unmark_paid_on_multi_payment_plan(self, admin_headers):
        """Test unmark-paid on multi-payment plan (weekly/fortnightly)"""
        # Get loans with multi-payment plans
        res = requests.get(f"{BASE_URL}/api/loans", headers=admin_headers)
        assert res.status_code == 200
        loans = res.json()
        
        # Find a loan with multi-payment plan (repayment_plan_code > 1)
        multi_payment_loans = [l for l in loans if l.get("repayment_plan_code", 1) > 1]
        
        if not multi_payment_loans:
            pytest.skip("No multi-payment loans found to test unmark-paid")
        
        loan = multi_payment_loans[0]
        
        # Find a paid payment that can be unmarked
        paid_payments = [p for p in loan.get("payments", []) if p.get("is_paid")]
        if not paid_payments:
            pytest.skip("No paid payments found on multi-payment loan")
        
        # Check if all payments are paid (locked state)
        all_paid = all(p.get("is_paid") for p in loan.get("payments", []))
        if all_paid:
            # Should fail with "locked" message
            payment = paid_payments[0]
            res = requests.post(f"{BASE_URL}/api/payments/unmark-paid",
                               json={"loan_id": loan["id"], "installment_number": payment["installment_number"]},
                               headers=admin_headers)
            assert res.status_code == 400, f"Expected 400 for fully paid loan, got {res.status_code}"
            print(f"Correctly blocked unmark on fully paid loan: {res.text}")


class TestAdminPaymentEndpoints:
    """Test admin payment edit/delete endpoints"""
    
    def test_admin_edit_payment_exists(self, admin_headers):
        """PUT /api/admin/payments/{id} endpoint should exist"""
        res = requests.put(f"{BASE_URL}/api/admin/payments/nonexistent-id",
                          json={"amount_due": 100},
                          headers=admin_headers)
        
        # 404 = payment not found, which means endpoint exists
        assert res.status_code == 404, f"Expected 404 for nonexistent payment, got {res.status_code}: {res.text}"
        print(f"Admin edit payment endpoint exists - 404 for nonexistent ID")
    
    def test_admin_delete_payment_exists(self, admin_headers):
        """DELETE /api/admin/payments/{id} endpoint should exist"""
        res = requests.delete(f"{BASE_URL}/api/admin/payments/nonexistent-id",
                             headers=admin_headers)
        
        # 404 = payment not found, which means endpoint exists
        assert res.status_code == 404, f"Expected 404 for nonexistent payment, got {res.status_code}: {res.text}"
        print(f"Admin delete payment endpoint exists - 404 for nonexistent ID")
    
    def test_admin_edit_payment_real(self, admin_headers):
        """Test actual admin edit payment on real payment"""
        # Get a loan with payments
        res = requests.get(f"{BASE_URL}/api/loans", headers=admin_headers)
        assert res.status_code == 200
        loans = res.json()
        
        if not loans:
            pytest.skip("No loans to test admin edit payment")
        
        # Find a loan with payments
        loan_with_payments = None
        for loan in loans:
            if loan.get("payments"):
                loan_with_payments = loan
                break
        
        if not loan_with_payments:
            pytest.skip("No loan with payments found")
        
        payment = loan_with_payments["payments"][0]
        payment_id = payment["id"]
        original_amount = payment["amount_due"]
        
        # Edit the payment amount
        new_amount = original_amount + 10
        res = requests.put(f"{BASE_URL}/api/admin/payments/{payment_id}",
                          json={"amount_due": new_amount},
                          headers=admin_headers)
        
        assert res.status_code == 200, f"Admin edit payment failed: {res.status_code} - {res.text}"
        print(f"Admin edit payment success - changed amount from {original_amount} to {new_amount}")
        
        # Restore original amount
        requests.put(f"{BASE_URL}/api/admin/payments/{payment_id}",
                    json={"amount_due": original_amount},
                    headers=admin_headers)


class TestAdminLoanEndpoint:
    """Test admin loan edit endpoint"""
    
    def test_admin_edit_loan_exists(self, admin_headers):
        """PUT /api/admin/loans/{id} endpoint should exist"""
        res = requests.put(f"{BASE_URL}/api/admin/loans/nonexistent-id",
                          json={"status": "open"},
                          headers=admin_headers)
        
        # 404 = loan not found, which means endpoint exists
        assert res.status_code == 404, f"Expected 404 for nonexistent loan, got {res.status_code}: {res.text}"
        print(f"Admin edit loan endpoint exists - 404 for nonexistent ID")
    
    def test_admin_edit_loan_real(self, admin_headers):
        """Test actual admin edit loan on real loan"""
        # Get a loan
        res = requests.get(f"{BASE_URL}/api/loans", headers=admin_headers)
        assert res.status_code == 200
        loans = res.json()
        
        if not loans:
            pytest.skip("No loans to test admin edit")
        
        loan = loans[0]
        loan_id = loan["id"]
        
        # Edit the loan (just set same status to verify endpoint works)
        res = requests.put(f"{BASE_URL}/api/admin/loans/{loan_id}",
                          json={"status": loan["status"]},
                          headers=admin_headers)
        
        assert res.status_code == 200, f"Admin edit loan failed: {res.status_code} - {res.text}"
        print(f"Admin edit loan success for loan {loan_id}")


class TestAdminCustomerEndpoint:
    """Test admin customer edit endpoint"""
    
    def test_admin_edit_customer_exists(self, admin_headers):
        """PUT /api/admin/customers/{id} endpoint should exist"""
        res = requests.put(f"{BASE_URL}/api/admin/customers/nonexistent-id",
                          json={"client_name": "Test"},
                          headers=admin_headers)
        
        # 404 = customer not found, which means endpoint exists
        assert res.status_code == 404, f"Expected 404 for nonexistent customer, got {res.status_code}: {res.text}"
        print(f"Admin edit customer endpoint exists - 404 for nonexistent ID")
    
    def test_admin_edit_customer_real(self, admin_headers):
        """Test actual admin edit customer on real customer"""
        # Get a customer
        res = requests.get(f"{BASE_URL}/api/customers", headers=admin_headers)
        assert res.status_code == 200
        customers = res.json()
        
        if not customers:
            pytest.skip("No customers to test admin edit")
        
        customer = customers[0]
        customer_id = customer["id"]
        original_name = customer["client_name"]
        
        # Edit the customer (set same name to verify endpoint)
        res = requests.put(f"{BASE_URL}/api/admin/customers/{customer_id}",
                          json={"client_name": original_name},
                          headers=admin_headers)
        
        assert res.status_code == 200, f"Admin edit customer failed: {res.status_code} - {res.text}"
        print(f"Admin edit customer success for customer {customer_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

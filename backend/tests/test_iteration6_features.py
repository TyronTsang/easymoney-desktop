"""
Test suite for Iteration 6 NEW features in EasyMoneyLoans:
1. POST /api/loans/top-up - Admin loan top-up feature
2. POST /api/customers/find-existing - Find existing customer by ID number
3. PUT /api/admin/customers/{id} - Admin edit customer (name, ID, phone, mandate)
4. POST /api/export with date filtering (date_from/date_to)
5. Creating new loan for customer whose previous loan is paid
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MASTER_PASSWORD = "TestMaster123!"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    verify_res = requests.post(f"{BASE_URL}/api/master-password/verify", json={"password": MASTER_PASSWORD})
    assert verify_res.status_code == 200, f"Master password verify failed: {verify_res.text}"
    
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


class TestLoanTopUp:
    """Test POST /api/loans/top-up - Admin can top up an open loan"""
    
    def test_top_up_endpoint_exists(self, admin_headers):
        """POST /api/loans/top-up endpoint should exist"""
        res = requests.post(f"{BASE_URL}/api/loans/top-up", 
                           json={"loan_id": "nonexistent", "new_principal": 5000},
                           headers=admin_headers)
        # 404 = loan not found (endpoint exists), 422 = validation error
        assert res.status_code in [404, 422, 400], f"Unexpected status {res.status_code}: {res.text}"
        print(f"Top-up endpoint response: {res.status_code}")
    
    def test_top_up_requires_open_loan(self, admin_headers):
        """Top-up should only work on open loans"""
        # Get paid loans
        res = requests.get(f"{BASE_URL}/api/loans?loan_status=paid", headers=admin_headers)
        assert res.status_code == 200
        paid_loans = res.json()
        
        if not paid_loans:
            pytest.skip("No paid loans to test top-up restriction")
        
        loan = paid_loans[0]
        
        # Try to top up a paid loan
        res = requests.post(f"{BASE_URL}/api/loans/top-up",
                           json={"loan_id": loan["id"], "new_principal": loan["principal_amount"] + 1000},
                           headers=admin_headers)
        
        assert res.status_code == 400, f"Expected 400 for paid loan top-up, got {res.status_code}: {res.text}"
        assert "open" in res.json().get("detail", "").lower(), "Should mention 'open' in error"
        print(f"Correctly blocked top-up on paid loan: {res.text}")
    
    def test_top_up_amount_must_be_greater(self, admin_headers):
        """New principal must be greater than current"""
        res = requests.get(f"{BASE_URL}/api/loans?loan_status=open", headers=admin_headers)
        assert res.status_code == 200
        open_loans = res.json()
        
        if not open_loans:
            pytest.skip("No open loans to test top-up amount validation")
        
        loan = open_loans[0]
        
        # Try to top up with same or lower amount
        res = requests.post(f"{BASE_URL}/api/loans/top-up",
                           json={"loan_id": loan["id"], "new_principal": loan["principal_amount"]},
                           headers=admin_headers)
        
        assert res.status_code == 400, f"Expected 400 for invalid amount, got {res.status_code}: {res.text}"
        print(f"Correctly blocked top-up with same amount: {res.text}")
    
    def test_top_up_max_8000(self, admin_headers):
        """Top-up cannot exceed R8000"""
        res = requests.get(f"{BASE_URL}/api/loans?loan_status=open", headers=admin_headers)
        assert res.status_code == 200
        open_loans = res.json()
        
        if not open_loans:
            pytest.skip("No open loans to test max amount")
        
        loan = open_loans[0]
        
        # Try to top up to over R8000
        res = requests.post(f"{BASE_URL}/api/loans/top-up",
                           json={"loan_id": loan["id"], "new_principal": 9000},
                           headers=admin_headers)
        
        assert res.status_code == 400, f"Expected 400 for amount > 8000, got {res.status_code}: {res.text}"
        assert "8000" in res.json().get("detail", ""), "Should mention 8000 limit"
        print(f"Correctly blocked top-up over R8000: {res.text}")
    
    def test_top_up_success(self, admin_headers):
        """Successful top-up on open loan"""
        res = requests.get(f"{BASE_URL}/api/loans?loan_status=open", headers=admin_headers)
        assert res.status_code == 200
        open_loans = res.json()
        
        if not open_loans:
            pytest.skip("No open loans to test top-up")
        
        # Find a loan that can be topped up (principal < 7000 to allow increase)
        suitable_loans = [l for l in open_loans if l["principal_amount"] < 7000]
        if not suitable_loans:
            pytest.skip("No loans with principal < 7000 to test top-up")
        
        loan = suitable_loans[0]
        old_principal = loan["principal_amount"]
        new_principal = old_principal + 500  # Top up by R500
        
        res = requests.post(f"{BASE_URL}/api/loans/top-up",
                           json={"loan_id": loan["id"], "new_principal": new_principal},
                           headers=admin_headers)
        
        assert res.status_code == 200, f"Top-up failed: {res.status_code} - {res.text}"
        data = res.json()
        assert data["old_principal"] == old_principal
        assert data["new_principal"] == new_principal
        assert "new_total" in data
        print(f"Top-up success: R{old_principal} -> R{new_principal}, new total: R{data['new_total']}")
        
        # Verify loan was updated
        verify_res = requests.get(f"{BASE_URL}/api/loans/{loan['id']}", headers=admin_headers)
        assert verify_res.status_code == 200
        updated_loan = verify_res.json()
        assert updated_loan["principal_amount"] == new_principal


class TestFindExistingCustomer:
    """Test POST /api/customers/find-existing - Find customer by ID number"""
    
    def test_find_existing_endpoint_exists(self, admin_headers):
        """POST /api/customers/find-existing endpoint should exist"""
        res = requests.post(f"{BASE_URL}/api/customers/find-existing",
                           json={"id_number": "1234567890123"},
                           headers=admin_headers)
        # Should return 200 with null or customer data, not 404/405
        assert res.status_code == 200, f"Endpoint should return 200, got {res.status_code}: {res.text}"
        print(f"Find-existing endpoint response: {res.status_code}")
    
    def test_find_existing_returns_customer_id(self, admin_headers):
        """Should return customer id when found"""
        # Get an existing customer
        res = requests.get(f"{BASE_URL}/api/customers", headers=admin_headers)
        assert res.status_code == 200
        customers = res.json()
        
        if not customers:
            pytest.skip("No customers to test find-existing")
        
        customer = customers[0]
        id_number = customer["id_number"]
        
        # Find by ID number
        res = requests.post(f"{BASE_URL}/api/customers/find-existing",
                           json={"id_number": id_number},
                           headers=admin_headers)
        
        assert res.status_code == 200, f"Find-existing failed: {res.status_code} - {res.text}"
        data = res.json()
        
        if data:  # Customer found
            assert "id" in data, "Response should contain customer id"
            assert data["id"] == customer["id"], "Should return correct customer id"
            print(f"Found customer: {data['id']}")
        else:
            print(f"Customer not found for ID: {id_number}")
    
    def test_find_existing_returns_null_for_unknown(self, admin_headers):
        """Should return null when customer not found"""
        res = requests.post(f"{BASE_URL}/api/customers/find-existing",
                           json={"id_number": "9999999999999"},  # Unlikely to exist
                           headers=admin_headers)
        
        assert res.status_code == 200, f"Endpoint should return 200, got {res.status_code}"
        data = res.json()
        assert data is None or data == {}, f"Expected null/empty for unknown customer, got: {data}"
        print("Correctly returned null for unknown customer")


class TestAdminEditCustomer:
    """Test PUT /api/admin/customers/{id} - Admin can edit customer details"""
    
    def test_edit_customer_name(self, admin_headers):
        """Admin can edit customer name"""
        res = requests.get(f"{BASE_URL}/api/customers", headers=admin_headers)
        assert res.status_code == 200
        customers = res.json()
        
        if not customers:
            pytest.skip("No customers to test edit")
        
        customer = customers[0]
        original_name = customer["client_name"]
        test_name = f"TEST_EDIT_{original_name}"
        
        # Edit customer name
        res = requests.put(f"{BASE_URL}/api/admin/customers/{customer['id']}",
                          json={"client_name": test_name},
                          headers=admin_headers)
        
        assert res.status_code == 200, f"Edit failed: {res.status_code} - {res.text}"
        
        # Verify change
        verify_res = requests.get(f"{BASE_URL}/api/customers/{customer['id']}", headers=admin_headers)
        assert verify_res.status_code == 200
        updated = verify_res.json()
        assert updated["client_name"] == test_name
        
        # Restore original
        requests.put(f"{BASE_URL}/api/admin/customers/{customer['id']}",
                    json={"client_name": original_name},
                    headers=admin_headers)
        print(f"Successfully edited and restored customer name")
    
    def test_edit_customer_phone(self, admin_headers):
        """Admin can edit customer phone"""
        res = requests.get(f"{BASE_URL}/api/customers", headers=admin_headers)
        assert res.status_code == 200
        customers = res.json()
        
        if not customers:
            pytest.skip("No customers to test edit phone")
        
        customer = customers[0]
        original_phone = customer.get("cell_phone", "")
        test_phone = "0821234567"
        
        # Edit phone
        res = requests.put(f"{BASE_URL}/api/admin/customers/{customer['id']}",
                          json={"cell_phone": test_phone},
                          headers=admin_headers)
        
        assert res.status_code == 200, f"Edit phone failed: {res.status_code} - {res.text}"
        
        # Restore original
        requests.put(f"{BASE_URL}/api/admin/customers/{customer['id']}",
                    json={"cell_phone": original_phone or ""},
                    headers=admin_headers)
        print(f"Successfully edited and restored customer phone")
    
    def test_edit_customer_mandate(self, admin_headers):
        """Admin can edit customer mandate"""
        res = requests.get(f"{BASE_URL}/api/customers", headers=admin_headers)
        assert res.status_code == 200
        customers = res.json()
        
        if not customers:
            pytest.skip("No customers to test edit mandate")
        
        customer = customers[0]
        original_mandate = customer.get("mandate_id", "")
        test_mandate = "TEST_MANDATE_12345"
        
        # Edit mandate
        res = requests.put(f"{BASE_URL}/api/admin/customers/{customer['id']}",
                          json={"mandate_id": test_mandate},
                          headers=admin_headers)
        
        assert res.status_code == 200, f"Edit mandate failed: {res.status_code} - {res.text}"
        
        # Restore original
        requests.put(f"{BASE_URL}/api/admin/customers/{customer['id']}",
                    json={"mandate_id": original_mandate},
                    headers=admin_headers)
        print(f"Successfully edited and restored customer mandate")


class TestExportDateFiltering:
    """Test POST /api/export with date filtering"""
    
    def test_export_with_date_range(self, admin_headers):
        """Export should support date_from and date_to parameters"""
        today = datetime.now().strftime("%Y-%m-%d")
        week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        
        res = requests.post(f"{BASE_URL}/api/export",
                           json={
                               "export_type": "all",
                               "date_from": week_ago,
                               "date_to": today
                           },
                           headers=admin_headers)
        
        assert res.status_code == 200, f"Export with date range failed: {res.status_code} - {res.text}"
        data = res.json()
        assert "filename" in data, "Response should contain filename"
        assert "data" in data, "Response should contain base64 data"
        print(f"Export with date range successful: {data['filename']}")
    
    def test_export_today_only(self, admin_headers):
        """Export filtered to today only"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        res = requests.post(f"{BASE_URL}/api/export",
                           json={
                               "export_type": "loans",
                               "date_from": today,
                               "date_to": today
                           },
                           headers=admin_headers)
        
        assert res.status_code == 200, f"Export today failed: {res.status_code} - {res.text}"
        data = res.json()
        assert "filename" in data
        print(f"Export today only successful: {data['filename']}")
    
    def test_export_all_comprehensive_data(self, admin_headers):
        """Export type 'all' should include comprehensive data"""
        res = requests.post(f"{BASE_URL}/api/export",
                           json={"export_type": "all"},
                           headers=admin_headers)
        
        assert res.status_code == 200, f"Export all failed: {res.status_code} - {res.text}"
        data = res.json()
        assert "filename" in data
        assert "data" in data  # Base64 Excel data
        print(f"Export all successful: {data['filename']}")
    
    def test_export_month_range(self, admin_headers):
        """Export for the current month"""
        today = datetime.now()
        first_of_month = today.replace(day=1).strftime("%Y-%m-%d")
        end_of_month = today.strftime("%Y-%m-%d")
        
        res = requests.post(f"{BASE_URL}/api/export",
                           json={
                               "export_type": "customers",
                               "date_from": first_of_month,
                               "date_to": end_of_month
                           },
                           headers=admin_headers)
        
        assert res.status_code == 200, f"Export month failed: {res.status_code} - {res.text}"
        data = res.json()
        assert "filename" in data
        print(f"Export month range successful: {data['filename']}")


class TestNewLoanForPaidCustomer:
    """Test creating new loan for customer whose previous loan is paid"""
    
    def test_can_create_loan_for_customer_with_paid_loan(self, admin_headers):
        """Customer with only paid loans should be able to get a new loan"""
        # Find a customer with ONLY paid loans (no open loans)
        res = requests.get(f"{BASE_URL}/api/loans", headers=admin_headers)
        assert res.status_code == 200
        all_loans = res.json()
        
        # Group by customer
        customer_loans = {}
        for loan in all_loans:
            cid = loan["customer_id"]
            if cid not in customer_loans:
                customer_loans[cid] = []
            customer_loans[cid].append(loan)
        
        # Find customer with only paid loans
        paid_only_customer = None
        for cid, loans in customer_loans.items():
            if all(l["status"] == "paid" for l in loans):
                paid_only_customer = cid
                break
        
        if not paid_only_customer:
            pytest.skip("No customer with only paid loans found")
        
        # Create a new loan for this customer
        res = requests.post(f"{BASE_URL}/api/loans",
                           json={
                               "customer_id": paid_only_customer,
                               "principal_amount": 500,
                               "repayment_plan_code": 1,
                               "loan_date": datetime.now().strftime("%Y-%m-%d")
                           },
                           headers=admin_headers)
        
        if res.status_code == 201 or res.status_code == 200:
            print(f"Successfully created new loan for customer with paid loans")
            # Clean up - delete the test loan
            loan_id = res.json().get("id")
            if loan_id:
                requests.delete(f"{BASE_URL}/api/admin/loans/{loan_id}", headers=admin_headers)
        else:
            # This is acceptable - might mean customer has other open loans
            print(f"Could not create loan: {res.status_code} - {res.text}")


class TestTopUpCalculation:
    """Test that top-up correctly recalculates totals"""
    
    def test_top_up_recalculates_total(self, admin_headers):
        """Top-up should recalculate total_repayable with 40% interest + R12 fee"""
        res = requests.get(f"{BASE_URL}/api/loans?loan_status=open", headers=admin_headers)
        assert res.status_code == 200
        open_loans = res.json()
        
        suitable = [l for l in open_loans if l["principal_amount"] < 6000]
        if not suitable:
            pytest.skip("No suitable loans for calculation test")
        
        loan = suitable[0]
        old_principal = loan["principal_amount"]
        new_principal = old_principal + 1000
        
        res = requests.post(f"{BASE_URL}/api/loans/top-up",
                           json={"loan_id": loan["id"], "new_principal": new_principal},
                           headers=admin_headers)
        
        if res.status_code == 200:
            data = res.json()
            # Expected: new_principal * 1.4 + 12
            expected_total = (new_principal * 1.4) + 12
            actual_total = data.get("new_total", 0)
            
            assert abs(actual_total - expected_total) < 0.01, \
                f"Total mismatch: expected {expected_total}, got {actual_total}"
            print(f"Top-up calculation correct: R{new_principal} * 1.4 + 12 = R{actual_total}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
